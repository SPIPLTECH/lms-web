import { Marp } from "@marp-team/marp-core";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

/** Shared by SlideshowBlockView and SlideshowBlockEdit so both render slides identically. */
export function renderSlides(markdown) {
  if (!markdown) return { slides: [], css: "" };

  try {
    const marp = new Marp({ script: false });
    const { html, css } = marp.render(markdown);

    if (typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const sections = Array.from(doc.querySelectorAll("section"));
      if (sections.length > 0) {
        return { slides: sections.map((s) => s.outerHTML), css };
      }
    }
  } catch (error) {
    console.error("Marp rendering error, falling back to naive split:", error);
  }

  // Fallback: naive split on a line containing only `---`.
  const parts = markdown.split(/\n---\n|\n---\r\n/);
  return {
    slides: parts.map(
      (part) => `<section>${DOMPurify.sanitize(marked.parse(part))}</section>`,
    ),
    css: "",
  };
}
