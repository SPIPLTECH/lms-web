import JSZip from "jszip";
import { DOMParser as XmlDomParser } from "@xmldom/xmldom";

function getDomParser() {
  if (typeof window !== "undefined" && window.DOMParser) {
    return new window.DOMParser();
  }
  if (typeof globalThis !== "undefined" && globalThis.DOMParser) {
    return new globalThis.DOMParser();
  }
  return new XmlDomParser();
}

function getElements(node, tagName) {
  if (!node || typeof node.getElementsByTagName !== "function") return [];
  let list = node.getElementsByTagName(tagName);
  if (list && list.length > 0) return Array.from(list);

  const localName = tagName.includes(":") ? tagName.split(":")[1] : tagName;
  list = node.getElementsByTagName(localName);
  if (list && list.length > 0) return Array.from(list);

  return [];
}

function getFirstElement(node, tagName) {
  const list = getElements(node, tagName);
  return list.length > 0 ? list[0] : null;
}

const SLIDE_FILE_PATTERN = /^ppt\/slides\/slide\d+\.xml$/i;

/**
 * Lightweight check for whether a file's bytes are a real OOXML PowerPoint
 * archive (has at least one ppt/slides/slideN.xml entry), without doing the
 * full slide parse. Lets upload flows reject non-presentation files (wrong
 * file, renamed .zip, legacy binary .ppt) immediately instead of only
 * failing later when a viewer tries to render them.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<boolean>}
 */
export async function hasPptxSlides(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) return false;
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    let found = false;
    zip.forEach((relativePath) => {
      if (SLIDE_FILE_PATTERN.test(relativePath)) found = true;
    });
    return found;
  } catch {
    return false;
  }
}

/**
 * Pure client-side PPTX parser utility.
 * Unpacks PowerPoint OpenXML archives (.pptx) in the browser using JSZip & DOMParser.
 * Extracts slide dimensions, background, text boxes, font styles, embedded images, and tables.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<{
 *   slides: Array<{
 *     slideNumber: number,
 *     width: number,
 *     height: number,
 *     background: string,
 *     elements: Array<any>
 *   }>
 * }>}
 */
export async function parsePptxArrayBuffer(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error("Empty ArrayBuffer provided for PPTX parsing.");
  }

  const domParser = getDomParser();

  let zip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (err) {
    throw new Error(`Failed to decompress PPTX archive: ${err?.message || "Invalid file format"}`);
  }

  // 1. Determine presentation slide dimensions (EMUs -> CSS Pixels)
  let slideWidthEmu = 9144000; // Default 16:9 widescreen (10 inches)
  let slideHeightEmu = 5143500; // Default 16:9 widescreen (5.625 inches)

  const presFile = zip.file("ppt/presentation.xml");
  if (presFile) {
    try {
      const presXmlText = await presFile.async("string");
      const presDoc = domParser.parseFromString(presXmlText, "text/xml");
      const sldSz = getFirstElement(presDoc, "p:sldSz");
      if (sldSz) {
        const cx = parseInt(sldSz.getAttribute("cx") || "0", 10);
        const cy = parseInt(sldSz.getAttribute("cy") || "0", 10);
        if (cx > 0 && cy > 0) {
          slideWidthEmu = cx;
          slideHeightEmu = cy;
        }
      }
    } catch {
      // Use defaults if presentation.xml parsing fails
    }
  }

  // Base canvas dimensions in CSS pixels (960px x 540px standard canvas ratio)
  const slideWidthPx = 960;
  const slideHeightPx = Math.round((slideHeightEmu / slideWidthEmu) * 960);

  // 2. Discover and sort slide files (ppt/slides/slide1.xml, slide2.xml, etc.)
  const slideFiles = [];
  zip.forEach((relativePath) => {
    if (SLIDE_FILE_PATTERN.test(relativePath)) {
      slideFiles.push(relativePath);
    }
  });

  // Sort slides numerically (slide1.xml, slide2.xml, slide10.xml...)
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
    const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
    return numA - numB;
  });

  if (slideFiles.length === 0) {
    throw new Error("No slide XML files found in PowerPoint presentation archive.");
  }

  // 3. Cache media files as Data URLs
  const mediaCache = {};
  const mediaFiles = [];
  zip.forEach((relativePath) => {
    if (relativePath.startsWith("ppt/media/")) {
      mediaFiles.push(relativePath);
    }
  });

  await Promise.all(
    mediaFiles.map(async (mediaPath) => {
      try {
        const file = zip.file(mediaPath);
        if (!file) return;
        const ext = mediaPath.split(".").pop()?.toLowerCase() || "";
        let mimeType = "image/png";
        if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
        if (ext === "gif") mimeType = "image/gif";
        if (ext === "svg") mimeType = "image/svg+xml";

        const base64 = await file.async("base64");
        const filename = mediaPath.split("/").pop() || "";
        const dataUrl = `data:${mimeType};base64,${base64}`;
        mediaCache[filename] = dataUrl;
        mediaCache[mediaPath] = dataUrl;
      } catch (err) {
        console.warn(`[PPTX PARSER] Failed to load media ${mediaPath}:`, err);
      }
    })
  );

  // 3b. Helpers for reaching the parts a slide inherits from.
  //
  // The colour a run or a background actually takes is usually not written on
  // the shape at all: it comes from the theme's colour scheme, indirected
  // through the master's <p:clrMap>. Parsing the slide alone is what left the
  // overwhelming majority of runs with no colour to use, and an invented
  // white standing in for them.
  const xmlCache = {};
  const readXml = async (path) => {
    if (path in xmlCache) return xmlCache[path];
    let doc = null;
    const file = path ? zip.file(path) : null;
    if (file) {
      try {
        doc = domParser.parseFromString(await file.async("string"), "text/xml");
      } catch {
        doc = null;
      }
    }
    xmlCache[path] = doc;
    return doc;
  };

  /** Resolve a relationship target ("../slideLayouts/x.xml") against its owning part. */
  const resolvePartPath = (fromPart, target) => {
    if (!target) return null;
    if (target.startsWith("/")) return target.replace(/^\/+/, "");
    const segments = fromPart.split("/").slice(0, -1);
    target.split("/").forEach((segment) => {
      if (segment === "..") segments.pop();
      else if (segment && segment !== ".") segments.push(segment);
    });
    return segments.join("/");
  };

  /** Path of the first related part of a given relationship type. */
  const relatedPart = async (partPath, typeSuffix) => {
    if (!partPath) return null;
    const segments = partPath.split("/");
    const relsPath = `${segments.slice(0, -1).join("/")}/_rels/${segments[segments.length - 1]}.rels`;
    const relsDoc = await readXml(relsPath);
    if (!relsDoc) return null;
    const match = getElements(relsDoc, "Relationship").find((rel) =>
      (rel.getAttribute("Type") || "").endsWith(typeSuffix)
    );
    return match ? resolvePartPath(partPath, match.getAttribute("Target")) : null;
  };

  // 4. Parse each slide
  const slides = [];

  for (let index = 0; index < slideFiles.length; index++) {
    const slidePath = slideFiles[index];
    const slideXmlText = await zip.file(slidePath).async("string");
    const slideDoc = domParser.parseFromString(slideXmlText, "text/xml");

    // Parse slide relationship file for images (ppt/slides/_rels/slideX.xml.rels)
    const relsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/").concat(".rels");
    const relsMap = {};
    const relsFile = zip.file(relsPath);
    if (relsFile) {
      try {
        const relsXmlText = await relsFile.async("string");
        const relsDoc = domParser.parseFromString(relsXmlText, "text/xml");
        const relationships = getElements(relsDoc, "Relationship");
        relationships.forEach((rel) => {
          const id = rel.getAttribute("Id");
          const target = rel.getAttribute("Target");
          if (id && target) {
            const filename = target.split("/").pop() || "";
            relsMap[id] = mediaCache[filename] || mediaCache[`ppt/media/${filename}`] || target;
          }
        });
      } catch {
        // Skip relationship file if missing
      }
    }

    // Colour inheritance chain: slide -> layout -> master -> theme.
    const layoutPath = await relatedPart(slidePath, "slideLayout");
    const layoutDoc = await readXml(layoutPath);
    const masterPath = await relatedPart(layoutPath, "slideMaster");
    const masterDoc = await readXml(masterPath);
    const themeDoc = await readXml(await relatedPart(masterPath, "theme"));

    // <a:clrScheme> is the deck's named palette (dk1, lt1, accent1…). dk1/lt1
    // are often written as a system colour, which carries its resolved value
    // in lastClr.
    const themeColors = {};
    const clrScheme = themeDoc ? getFirstElement(themeDoc, "a:clrScheme") : null;
    Array.from(clrScheme?.childNodes || []).forEach((node) => {
      if (node.nodeType !== 1) return;
      const name = (node.nodeName || "").split(":").pop();
      const value =
        getFirstElement(node, "a:srgbClr")?.getAttribute("val") ||
        getFirstElement(node, "a:sysClr")?.getAttribute("lastClr");
      if (name && value) themeColors[name] = `#${value}`;
    });

    // <p:clrMap> maps the "background/text" slots onto that palette — bg1
    // normally means lt1, tx1 normally means dk1.
    const clrMapNode = masterDoc ? getFirstElement(masterDoc, "p:clrMap") : null;
    const clrMap = {};
    Array.from(clrMapNode?.attributes || []).forEach((attr) => {
      clrMap[attr.name] = attr.value;
    });

    const elements = [];

    // Helper to extract transform position/size percentages
    const parseTransform = (node) => {
      const off = getFirstElement(node, "a:off");
      const ext = getFirstElement(node, "a:ext");

      if (!off || !ext) return null;

      const x = parseInt(off.getAttribute("x") || "0", 10);
      const y = parseInt(off.getAttribute("y") || "0", 10);
      const cx = parseInt(ext.getAttribute("cx") || "0", 10);
      const cy = parseInt(ext.getAttribute("cy") || "0", 10);

      return {
        left: Math.max(0, Math.min(100, (x / slideWidthEmu) * 100)),
        top: Math.max(0, Math.min(100, (y / slideHeightEmu) * 100)),
        width: Math.max(5, Math.min(100, (cx / slideWidthEmu) * 100)),
        height: Math.max(3, Math.min(100, (cy / slideHeightEmu) * 100)),
      };
    };

    /**
     * Direct-child lookup. A colour holder nests others — <a:rPr> can carry an
     * outline with its own fill, <p:spPr> always carries <a:ln> — and those
     * come first in document order, so a descendant search returns a border
     * colour and paints the shape or the text with it.
     */
    const directChild = (node, tagName) => {
      const local = tagName.split(":").pop();
      const children = node?.childNodes || [];
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.nodeType === 1 && (child.nodeName || "").split(":").pop() === local) {
          return child;
        }
      }
      return null;
    };

    /** The colour a holder such as <a:solidFill> or <a:fontRef> resolves to. */
    const colorFrom = (holder) => {
      if (!holder) return null;
      const srgb = getFirstElement(holder, "a:srgbClr")?.getAttribute("val");
      if (srgb) return `#${srgb}`;
      const sys = getFirstElement(holder, "a:sysClr")?.getAttribute("lastClr");
      if (sys) return `#${sys}`;
      const scheme = getFirstElement(holder, "a:schemeClr")?.getAttribute("val");
      if (!scheme) return null;
      return themeColors[clrMap[scheme] || scheme] || themeColors[scheme] || null;
    };

    /** A node's own <a:solidFill>, ignoring fills belonging to its children. */
    const fillColor = (node) => colorFrom(directChild(node, "a:solidFill"));

    // What unstyled text is: the theme's text colour, black in a default deck.
    const defaultTextColor = themeColors[clrMap.tx1 || "dk1"] || "#000000";

    /** A slide's own background, else the one it inherits. */
    const backgroundFrom = (doc) => {
      const bg = doc ? getFirstElement(doc, "p:bg") : null;
      if (!bg) return null;
      const bgPr = getFirstElement(bg, "p:bgPr");
      const direct = bgPr ? fillColor(bgPr) : null;
      if (direct) return direct;
      // <p:bgRef> names one of the theme's background fill styles together
      // with the colour it is built from. The first style is a plain solid
      // fill, so that colour is the background; the gradient styles degrade to
      // their base colour rather than being reproduced.
      const bgRef = getFirstElement(bg, "p:bgRef");
      return bgRef ? colorFrom(bgRef) : null;
    };

    const background =
      backgroundFrom(slideDoc) ||
      backgroundFrom(layoutDoc) ||
      backgroundFrom(masterDoc) ||
      // PowerPoint's own default for a deck that names no background at all.
      "#FFFFFF";

    // A. Parse Pictures (<p:pic>)
    const picNodes = getElements(slideDoc, "p:pic");
    picNodes.forEach((pic) => {
      const transform = parseTransform(pic);
      const blip = getFirstElement(pic, "a:blip");
      const embedId = blip?.getAttribute("r:embed");

      if (transform && embedId && relsMap[embedId]) {
        elements.push({
          type: "image",
          id: `img_${elements.length}`,
          ...transform,
          src: relsMap[embedId],
        });
      }
    });

    // B. Parse Shapes & Text Boxes (<p:sp>)
    const spNodes = getElements(slideDoc, "p:sp");
    spNodes.forEach((sp) => {
      const transform = parseTransform(sp);
      if (!transform) return;

      // <p:style><a:fontRef> sets the text colour for everything in the shape,
      // and it is how a filled shape gets legible type without any run saying
      // so: a banner sets lt1 (white) here and leaves its runs unstyled.
      const shapeTextColor = colorFrom(getFirstElement(sp, "a:fontRef"));

      const pNodes = getElements(sp, "a:p");
      const paragraphs = [];

      pNodes.forEach((p) => {
        const pPr = getFirstElement(p, "a:pPr");
        const align = pPr?.getAttribute("algn");
        let textAlign = "left";
        if (align === "ctr") textAlign = "center";
        if (align === "r") textAlign = "right";
        if (align === "j") textAlign = "justify";

        const runs = [];
        const rNodes = getElements(p, "a:r");
        rNodes.forEach((r) => {
          const tNode = getFirstElement(r, "a:t");
          const text = tNode?.textContent;
          if (!text) return;

          const rPr = getFirstElement(r, "a:rPr");
          const defRPr = getFirstElement(p, "a:defRPr");
          const sz = rPr?.getAttribute("sz") || defRPr?.getAttribute("sz");
          const bold = (rPr || defRPr)?.getAttribute("b") === "1";
          const italic = (rPr || defRPr)?.getAttribute("i") === "1";

          runs.push({
            text,
            fontSize: sz ? Math.max(12, Math.round(parseInt(sz, 10) / 100)) : 16,
            bold,
            italic,
            // Resolved, never invented: the run's own fill, else the
            // paragraph's default, else the shape's, else the theme's text
            // colour. Defaulting to white instead made unstyled text — which
            // is most of it — invisible on the light background these decks
            // actually have.
            color: fillColor(rPr) || fillColor(defRPr) || shapeTextColor || defaultTextColor,
          });
        });

        if (runs.length > 0) {
          paragraphs.push({ textAlign, runs });
        }
      });

      const spPr = getFirstElement(sp, "p:spPr");
      const bgColor = fillColor(spPr);

      if (paragraphs.length > 0 || bgColor) {
        elements.push({
          type: "text",
          id: `sp_${elements.length}`,
          ...transform,
          bgColor,
          paragraphs,
        });
      }
    });

    // C. Parse Tables (a <a:tbl> inside a <p:graphicFrame>)
    //
    // The geometry is on the *frame*, never on <a:tbl> — a table element
    // carries no <a:off>/<a:ext> of its own at all. Reading the transform off
    // the table node therefore always returned null, and every table on every
    // slide was dropped before it could be rendered.
    const frameNodes = getElements(slideDoc, "p:graphicFrame");
    frameNodes.forEach((frame) => {
      const tbl = getFirstElement(frame, "a:tbl");
      // A graphic frame also hosts charts, SmartArt and embedded objects;
      // those aren't tables and aren't handled here.
      if (!tbl) return;

      const transform = parseTransform(frame);
      if (!transform) return;

      // Column widths are authored in EMU. Kept as percentages so the rendered
      // table keeps the proportions the slide was designed with instead of
      // letting the browser size columns by their text.
      const gridWidths = getElements(tbl, "a:gridCol").map((col) =>
        parseInt(col.getAttribute("w") || "0", 10)
      );
      const totalGridWidth = gridWidths.reduce((sum, w) => sum + w, 0);
      const columnWidths =
        totalGridWidth > 0 ? gridWidths.map((w) => (w / totalGridWidth) * 100) : [];

      const rows = getElements(tbl, "a:tr").map((tr) =>
        getElements(tr, "a:tc")
          // Continuation cells of a merge carry no content of their own; the
          // origin cell spans over them via gridSpan/rowSpan below.
          .filter((tc) => tc.getAttribute("hMerge") !== "1" && tc.getAttribute("vMerge") !== "1")
          .map((tc) => {
            // Cell text is styled through the paragraph's <a:defRPr> far more
            // often than through an <a:rPr> on each run, so both are consulted
            // — reading only <a:rPr> loses the colour, weight and size of a
            // typical table.
            const pNode = getFirstElement(tc, "a:p");
            const pPr = pNode ? getFirstElement(pNode, "a:pPr") : null;
            const styleNode = getFirstElement(tc, "a:rPr") || (pPr ? getFirstElement(pPr, "a:defRPr") : null);
            const sz = styleNode?.getAttribute("sz");
            const algn = pPr?.getAttribute("algn");
            const colSpan = parseInt(tc.getAttribute("gridSpan") || "1", 10);
            const rowSpan = parseInt(tc.getAttribute("rowSpan") || "1", 10);

            let textAlign = "left";
            if (algn === "ctr") textAlign = "center";
            if (algn === "r") textAlign = "right";
            if (algn === "j") textAlign = "justify";

            return {
              text: getElements(tc, "a:t")
                .map((t) => t.textContent || "")
                .join("")
                .trim(),
              bgColor: fillColor(getFirstElement(tc, "a:tcPr")),
              color: fillColor(styleNode) || defaultTextColor,
              bold: styleNode?.getAttribute("b") === "1",
              italic: styleNode?.getAttribute("i") === "1",
              fontSize: sz ? Math.max(8, Math.round(parseInt(sz, 10) / 100)) : 14,
              textAlign,
              colSpan: colSpan > 1 ? colSpan : undefined,
              rowSpan: rowSpan > 1 ? rowSpan : undefined,
            };
          })
      );

      elements.push({
        type: "table",
        id: `tbl_${elements.length}`,
        ...transform,
        columnWidths,
        rows,
      });
    });

    // Fallback: If no elements extracted, grab raw slide text so no content is missed
    if (elements.length === 0) {
      const rawText = slideDoc.textContent?.trim();
      if (rawText) {
        elements.push({
          type: "text",
          id: `raw_0`,
          left: 5,
          top: 10,
          width: 90,
          height: 80,
          paragraphs: [
            {
              textAlign: "left",
              runs: [{ text: rawText, fontSize: 18, color: defaultTextColor }],
            },
          ],
        });
      }
    }

    slides.push({
      slideNumber: index + 1,
      width: slideWidthPx,
      height: slideHeightPx,
      background,
      defaultTextColor,
      elements,
    });
  }

  return { slides };
}

