"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Lock, Maximize2, Minus, Play, Plus, Star, Trophy } from "lucide-react";

/**
 * The student's course map page (/student/courses/[id]/map): the course as a
 * quest map. The course details page links here.
 *
 * One path runs across the middle of the screen — START, one stage per
 * module, GOAL. Picking a stage springs its lessons out of it in a wheel of
 * arrows (the path spreads apart to make room and the camera glides to frame
 * them); picking a lesson moves it out, fades its siblings and springs its
 * topics out around it the same way. Picking it again, or empty space, folds
 * it back. A topic opens the player at that topic.
 *
 * Locks come from the player's own learning sequence, so the map never offers
 * a topic the player would refuse. The map shows no counts or progress; the
 * Continue button lands on the server's resume step, as before.
 *
 * Colours are the LMS theme's map tokens (--map-* in globals.css), so the map
 * follows the app's light/dark switch.
 *
 * @param {object} props
 * @param {object} props.course          normalized course (normalizeCourseHierarchy)
 * @param {object} [props.sequence]      GET /progress/learning-sequence payload
 * @param {string} props.actionLabel     the Continue button's words
 * @param {boolean} props.hasNoContent   nothing to open yet (Continue disabled)
 * @param {() => void} props.onContinue  opens the player at the resume step
 * @param {(itemId: string) => void} props.onOpenItem  opens the player at an item (a topic's first open step)
 * @param {() => void} props.onBack      back to the course details page
 */

// World geometry, in map units; the path runs along y = 0.
const BASE = 330; // gap between stops when nothing is open
const R1 = 255; // lessons wheel radius
const PICK = 470; // how far an opened lesson moves out
const R2X = 280; // topics wheel radii: wider than tall, as the tiles are
const R2Y = 190;
const MARGIN = 70; // clearance from neighbouring stops
const STAGE_R = 76;
const LESSON = { w: 200, h: 66 };
const TOPIC = { w: 178, h: 70 };
const AMP = 44; // path wave height
const SPRING = "cubic-bezier(.34,1.56,.64,1)";
const GLIDE = "cubic-bezier(.22,1,.36,1)";
const HUD_TOP = 84;
const HUD_BOTTOM = 92;

const GLASS = {
  background: "var(--map-glass)",
  WebkitBackdropFilter: "blur(16px) saturate(160%)",
  backdropFilter: "blur(16px) saturate(160%)",
  border: "1px solid var(--map-glass-border)",
};
const HUD = {
  ...GLASS,
  boxShadow: "inset 0 1px 0 var(--map-rim), 0 14px 34px -20px var(--map-lift)",
};
const mix = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const r1 = (n) => Math.round(n * 10) / 10;
const place = (x, y, k = 1) => `translate(${r1(x)}px, ${r1(y)}px) translate(-50%, -50%) scale(${k})`;
const lessonAngle = (n, i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
// Topics wheel round the lesson, leaving a gap where the arrow from the stage arrives.
const topicAngle = (a, m, j) => {
  if (m === 1) return a;
  const back = a + Math.PI;
  const gap = 0.95;
  return back + gap + ((2 * Math.PI - 2 * gap) * j) / (m - 1);
};
// Distance from a w×h box's centre to its edge along a unit direction.
const boxEdge = (hw, hh, ux, uy) => Math.min(hw / (Math.abs(ux) || 1e-6), hh / (Math.abs(uy) || 1e-6));

const STARS = [
  [6, 12, 1.3], [18, 30, 1], [27, 8, 1.5], [39, 22, 1], [52, 10, 1.3], [63, 27, 1], [74, 6, 1.6], [86, 18, 1.1],
  [94, 34, 1.3], [9, 78, 1.1], [23, 90, 1.4], [44, 84, 1], [58, 94, 1.3], [71, 80, 1], [88, 88, 1.5],
];

export default function CourseQuestMap({ course, sequence, actionLabel, hasNoContent, onContinue, onOpenItem, onBack }) {
  const [openMod, setOpenMod] = useState(null);
  const [openLes, setOpenLes] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ w: 1200, h: 720 });
  const [calm, setCalm] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const fit = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setCalm(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, []);

  const modules = (course.modules || []).filter((m) => (m.lessons || []).length > 0);
  const lessons = modules.flatMap((m) => m.lessons || []);
  const steps = sequence?.steps || null;

  // Where each lesson / topic opens in the player, and whether it can yet.
  const stepsWhere = (pred) => (steps ? steps.filter(pred) : null);
  const firstItem = (own) => {
    const open = own.find((s) => !s.locked) || own[0];
    return open?.contentIds?.[0] || open?.quizId || open?.assignmentId || null;
  };
  const lessonInfo = (lesson) => {
    const own = stepsWhere((s) => s.path?.lessonId === lesson.id);
    return { locked: !!own && own.length > 0 && own.every((s) => s.locked) };
  };
  const topicInfo = (topic) => {
    const own = stepsWhere((s) => s.path?.topicId === topic.id);
    if (!own) return { locked: false, canOpen: false, item: null, empty: false };
    const locked = own.length > 0 && own.every((s) => s.locked);
    return { locked, canOpen: own.length > 0 && !locked, item: own.length ? firstItem(own) : null, empty: own.length === 0 };
  };


  const openStage = (mi) => {
    setOpenMod((cur) => (cur === mi && openLes == null ? null : mi));
    setOpenLes(null);
    setZoom(1);
  };
  const openLesson = (li) => {
    setOpenLes((cur) => (cur === li ? null : li));
    setZoom(1);
  };
  const backOne = () => {
    if (openLes != null) setOpenLes(null);
    else if (openMod != null) setOpenMod(null);
    setZoom(1);
  };
  const goCourse = () => {
    setOpenMod(null);
    setOpenLes(null);
    setZoom(1);
  };

  // ── Route: START, stages, GOAL; gaps widen round the open stage.
  const reach = (mi, sign) => {
    let r = R1 + LESSON.w / 2 + MARGIN;
    if (openLes != null && openMod === mi) {
      const a = lessonAngle(modules[mi].lessons.length, openLes);
      r = Math.max(r, sign * Math.cos(a) * PICK + R2X + TOPIC.w / 2 + MARGIN);
    }
    return r;
  };
  const route = ["start", ...modules.map((_, i) => i), "goal"];
  const rx = [];
  route.reduce((x, n, i) => {
    let next = x;
    if (i) {
      let gap = BASE;
      if (route[i - 1] === openMod) gap = Math.max(gap, reach(route[i - 1], 1));
      if (n === openMod) gap = Math.max(gap, reach(n, -1));
      next = x + gap;
    }
    rx.push(next);
    return next;
  }, 0);
  const stageX = modules.map((_, i) => rx[i + 1]);

  // ── Every lesson and topic has a place; closed ones sit inside their parent.
  const t = (prop, delay = 0, how = SPRING, dur = 0.62) => (calm ? "none" : `${prop} ${dur}s ${how} ${delay}s`);
  const boxes = [];
  const addBox = (x, y, hw, hh) => boxes.push([x - hw, x + hw, y - hh, y + hh]);
  const spokes = [];
  const lessonNodes = [];
  const topicNodes = [];

  modules.forEach((mod, mi) => {
    const isOpen = openMod === mi;
    const mx = stageX[mi];
    const n = mod.lessons.length;
    if (isOpen) addBox(mx, 0, STAGE_R, STAGE_R);
    mod.lessons.forEach((lesson, li) => {
      const a = lessonAngle(n, li);
      const picked = isOpen && openLes === li;
      const dist = picked ? PICK : R1;
      const lx = isOpen ? mx + Math.cos(a) * dist : mx;
      const ly = isOpen ? Math.sin(a) * dist : 0;
      const dim = isOpen && openLes != null && !picked;
      const delay = isOpen && openLes == null ? 0.04 + li * 0.045 : 0;
      const info = lessonInfo(lesson);
      if (isOpen && (openLes == null || picked)) addBox(lx, ly, LESSON.w / 2, LESSON.h / 2);

      lessonNodes.push({ lesson, li, isOpen, picked, dim, delay, x: lx, y: ly, info });

      const from = STAGE_R + 8;
      const to = dist - boxEdge(LESSON.w / 2, LESSON.h / 2, Math.cos(a), Math.sin(a)) - 8;
      spokes.push({
        key: `s-${lesson.id}`,
        x: mx + Math.cos(a) * from,
        y: Math.sin(a) * from,
        angle: a,
        len: isOpen ? Math.max(0, to - from) : 0,
        color: "var(--map-accent)",
        thick: picked ? 3.5 : 2.5,
        opacity: isOpen ? (dim ? 0.25 : 0.95) : 0,
        delay,
        head: 12,
      });

      const topics = lesson.topics || [];
      topics.forEach((topic, tj) => {
        const b = topicAngle(a, topics.length, tj);
        const tox = Math.cos(b) * R2X;
        const toy = Math.sin(b) * R2Y;
        const tdist = Math.hypot(tox, toy) || 1;
        const px = picked ? lx + tox : lx;
        const py = picked ? ly + toy : ly;
        const tdelay = picked ? 0.12 + tj * 0.05 : 0;
        if (picked) addBox(px, py, TOPIC.w / 2, TOPIC.h / 2);
        topicNodes.push({ topic, picked, delay: tdelay, x: px, y: py, info: topicInfo(topic) });
        const ux = tox / tdist;
        const uy = toy / tdist;
        const tfrom = boxEdge(LESSON.w / 2, LESSON.h / 2, ux, uy) + 6;
        const tto = tdist - boxEdge(TOPIC.w / 2, TOPIC.h / 2, ux, uy) - 8;
        spokes.push({
          key: `t-${topic.id}`,
          x: lx + ux * tfrom,
          y: ly + uy * tfrom,
          angle: Math.atan2(uy, ux),
          len: picked ? Math.max(0, tto - tfrom) : 0,
          color: "var(--map-link)",
          thick: 2,
          opacity: picked ? 0.9 : 0,
          delay: tdelay,
          head: 10,
        });
      });
    });
  });

  // ── Camera: frame what is open, or the whole route with the path centred.
  if (openMod == null) boxes.push([rx[0] - 90, rx[rx.length - 1] + 70, -110, 110]);
  const L = Math.min(...boxes.map((q) => q[0]));
  const R = Math.max(...boxes.map((q) => q[1]));
  const T = Math.min(...boxes.map((q) => q[2]));
  const B = Math.max(...boxes.map((q) => q[3]));
  const side = 24;
  const vw = Math.max(size.w - side * 2, 200);
  const vh = Math.max(size.h - HUD_TOP - HUD_BOTTOM, 200);
  const scale = Math.min(vw / (R - L), vh / (B - T), 1.15) * zoom;
  const camX = size.w / 2 - ((L + R) / 2) * scale;
  const camY = HUD_TOP + vh / 2 - ((T + B) / 2) * scale;

  const crumbMod = openMod != null ? modules[openMod] : null;
  const crumbLes = crumbMod && openLes != null ? crumbMod.lessons[openLes] : null;
  const hint = openMod == null ? "Select a stage to see its lessons" : openLes == null ? "Select a lesson to see its topics" : "Select a topic to start it";

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full overflow-clip"
      style={{ background: "var(--map-bg)" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") backOne();
      }}
    >
      {/* backdrop: glows behind the glass, a faint grid, stars in dark mode */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          ["var(--map-glow-1)", "-8%", "-12%", 620],
          ["var(--map-glow-2)", "58%", "52%", 640],
          ["var(--map-glow-3)", "28%", "30%", 460],
        ].map(([c, left, top, s]) => (
          <div
            key={left}
            className="absolute rounded-full"
            style={{ left, top, width: s, height: s, background: c, filter: "blur(110px)", opacity: "var(--map-glow-opacity)" }}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(var(--map-grid) 1px, transparent 1px), linear-gradient(90deg, var(--map-grid) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <svg className="absolute inset-0 h-full w-full" style={{ opacity: "var(--map-stars)" }}>
          {STARS.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={`${x}%`} cy={`${y}%`} r={r} fill="#FFFFFF" />
          ))}
        </svg>
      </div>

      {/* empty space folds one level back */}
      <button
        type="button"
        aria-label="Close one level"
        tabIndex={-1}
        onClick={backOne}
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent p-0"
      />

      {/* the world, moved and scaled by the camera */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-0 w-0"
        style={{
          transformOrigin: "0 0",
          transform: `translate(${r1(camX)}px, ${r1(camY)}px) scale(${Math.round(scale * 1000) / 1000})`,
          transition: t("transform", 0, GLIDE, 0.7),
        }}
      >
        {/* the path, one wave per gap; it stretches as stages make room */}
        {rx.slice(0, -1).map((ax, i) => (
          <div
            key={`seg-${i}`}
            aria-hidden="true"
            className="absolute left-0 top-0"
            style={{
              height: AMP * 2,
              width: r1(rx[i + 1] - ax),
              transform: `translate(${r1(ax)}px, ${-AMP}px)`,
              opacity: openMod != null ? 0.45 : 1,
              filter: "drop-shadow(0 0 6px var(--map-accent))",
              transition: calm ? "none" : `transform .6s ${GLIDE}, width .6s ${GLIDE}, opacity .3s ease`,
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none" className="block overflow-visible">
              {[16, 3.5].map((w) => (
                <path
                  key={w}
                  d={i % 2 ? "M0 20 C 33 46, 67 46, 100 20" : "M0 20 C 33 -6, 67 -6, 100 20"}
                  fill="none"
                  stroke="var(--map-accent)"
                  strokeWidth={w}
                  strokeOpacity={w > 4 ? 0.16 : 1}
                  strokeDasharray={w < 4 && openMod != null ? "1 9" : undefined}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>
        ))}

        {/* arrows: stage → lesson, lesson → topic */}
        {spokes.map((s) => (
          <div
            key={s.key}
            aria-hidden="true"
            className="absolute left-0 top-0 rounded-full"
            style={{
              height: s.thick,
              width: r1(s.len),
              background: s.color,
              boxShadow: `0 0 10px ${mix(s.color, 60)}`,
              transformOrigin: "0 50%",
              transform: `translate(${r1(s.x)}px, ${r1(s.y)}px) rotate(${r1((s.angle * 180) / Math.PI)}deg) translateY(-50%)`,
              opacity: s.opacity,
              transition: calm ? "none" : `width .55s ${GLIDE} ${s.delay}s, transform .62s ${GLIDE}, opacity .3s ease ${s.delay}s`,
            }}
          >
            <span
              className="absolute top-1/2 h-0 w-0"
              style={{
                right: -s.head + 1,
                marginTop: -s.head / 2,
                borderTop: `${s.head / 2}px solid transparent`,
                borderBottom: `${s.head / 2}px solid transparent`,
                borderLeft: `${s.head}px solid ${s.color}`,
              }}
            />
          </div>
        ))}

        {/* START and GOAL */}
        <div
          className="absolute left-0 top-0 rounded-full px-5 py-3 font-display text-[15px] font-bold tracking-[0.18em]"
          style={{
            ...GLASS,
            color: "var(--map-accent)",
            boxShadow: "inset 0 1px 0 var(--map-rim), 0 0 22px -8px var(--map-accent), 0 14px 30px -18px var(--map-lift)",
            transform: place(rx[0], 0),
            transition: t("transform", 0, GLIDE, 0.6),
          }}
        >
          START
        </div>
        <div
          className="absolute left-0 top-0 flex h-[104px] w-[104px] flex-col items-center justify-center gap-1 rounded-[28px]"
          style={{
            ...GLASS,
            color: "var(--map-goal)",
            border: `1.5px solid ${mix("var(--map-goal)", 60)}`,
            boxShadow: "inset 0 1px 0 var(--map-rim), 0 0 34px -8px var(--map-goal), 0 16px 34px -18px var(--map-lift)",
            transform: place(rx[rx.length - 1], 0),
            transition: t("transform", 0, GLIDE, 0.6),
          }}
        >
          <Trophy size={32} strokeWidth={2} aria-hidden="true" />
          <span className="font-display text-xs font-bold tracking-[0.2em]">GOAL</span>
        </div>

        {/* topics */}
        {topicNodes.map(({ topic, picked, delay, x, y, info }) => {
          const clickable = picked && info.canOpen && info.item;
          return (
            <button
              key={topic.id}
              type="button"
              disabled={!clickable}
              tabIndex={picked ? 0 : -1}
              aria-hidden={!picked}
              aria-label={`Topic: ${topic.title}${info.locked ? " (locked — finish the earlier lessons first)" : info.empty ? " (no content yet)" : ", open it"}`}
              onClick={() => clickable && onOpenItem(info.item)}
              className={`absolute left-0 top-0 flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left text-[13px] font-medium leading-snug text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current ${
                clickable ? "cursor-pointer hover:brightness-110" : "cursor-default"
              }`}
              style={{
                ...GLASS,
                borderRadius: 14,
                width: TOPIC.w,
                minHeight: TOPIC.h,
                boxShadow: `inset 0 1px 0 var(--map-rim), inset 0 0 0 1px ${mix("var(--map-link)", 20)}, 0 12px 26px -14px var(--map-lift)`,
                transform: place(x, y, picked ? 1 : 0.3),
                opacity: picked ? (info.locked || info.empty ? 0.6 : 1) : 0,
                pointerEvents: picked ? "auto" : "none",
                transition: calm ? "none" : `transform .6s ${SPRING} ${delay}s, opacity .3s ease ${delay}s`,
              }}
            >
              {info.locked ? (
                <Lock size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : (
                <Star size={14} className="shrink-0" fill="var(--map-link)" stroke="var(--map-link)" aria-hidden="true" />
              )}
              <span className="min-w-0">{topic.title}</span>
            </button>
          );
        })}

        {/* lessons */}
        {lessonNodes.map(({ lesson, li, isOpen, picked, dim, delay, x, y, info }) => (
          <button
            key={lesson.id}
            type="button"
            tabIndex={isOpen ? 0 : -1}
            aria-hidden={!isOpen}
            aria-expanded={picked}
            aria-label={`Lesson: ${lesson.title}${info.locked ? " (locked)" : ""}${picked ? ", topics shown" : ", show its topics"}`}
            onClick={() => openLesson(li)}
            className="absolute left-0 top-0 flex cursor-pointer items-center gap-2.5 rounded-[18px] px-4 py-2.5 text-left font-display text-[15px] font-semibold leading-tight text-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
            style={{
              ...GLASS,
              borderRadius: 18,
              width: LESSON.w,
              minHeight: LESSON.h,
              ...(picked
                ? {
                    background: "var(--map-glass-strong)",
                    border: "1.5px solid var(--map-accent)",
                    boxShadow: "inset 0 1px 0 var(--map-rim), 0 0 26px -6px var(--map-accent), 0 16px 36px -16px var(--map-lift)",
                  }
                : {
                    boxShadow: `inset 0 1px 0 var(--map-rim), inset 0 0 0 1px ${mix("var(--map-accent)", 27)}, 0 0 18px -8px var(--map-accent), 0 14px 30px -16px var(--map-lift)`,
                  }),
              transform: place(x, y, isOpen ? 1 : 0.35),
              opacity: isOpen ? (dim ? 0.32 : 1) : 0,
              pointerEvents: isOpen ? "auto" : "none",
              transition: calm ? "none" : `transform .62s ${SPRING} ${delay}s, opacity .32s ease ${delay}s`,
            }}
          >
            {info.locked ? (
              <Lock size={13} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rotate-45 rounded-[2px]"
                style={{ background: "var(--map-accent)", boxShadow: "0 0 10px var(--map-accent)" }}
              />
            )}
            <span className="min-w-0">{lesson.title}</span>
          </button>
        ))}

        {/* stages */}
        {modules.map((mod, mi) => {
          const isOpen = openMod === mi;
          const faded = openMod != null && !isOpen;
          return (
            <button
              key={mod.id}
              type="button"
              aria-expanded={isOpen}
              aria-label={`Stage ${mi + 1}: ${mod.title}${isOpen ? ", lessons shown" : ", show its lessons"}`}
              onClick={() => openStage(mi)}
              className="pointer-events-auto absolute left-0 top-0 flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full p-3.5 text-center text-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
              style={{
                ...GLASS,
                borderRadius: "50%",
                width: STAGE_R * 2,
                height: STAGE_R * 2,
                ...(isOpen
                  ? {
                      background: "var(--map-glass-strong)",
                      border: "2px solid var(--map-accent)",
                      boxShadow: `inset 0 1px 0 var(--map-rim), 0 0 0 6px ${mix("var(--map-accent)", 14)}, 0 0 40px -6px var(--map-accent), 0 20px 44px -18px var(--map-lift)`,
                    }
                  : {
                      boxShadow: `inset 0 1px 0 var(--map-rim), inset 0 0 0 2px ${mix("var(--map-accent)", 55)}, 0 0 26px -10px var(--map-accent), 0 18px 40px -18px var(--map-lift)`,
                    }),
                transform: place(stageX[mi], 0, isOpen ? 1.06 : 1),
                opacity: faded ? 0.38 : 1,
                transition: calm ? "none" : `transform .6s ${GLIDE}, opacity .3s ease`,
              }}
            >
              <BookOpen size={22} style={{ color: "var(--map-accent)" }} aria-hidden="true" />
              <span className="font-mono text-[10.5px] font-medium tracking-[0.14em]" style={{ color: "var(--map-accent)" }}>
                STAGE {mi + 1}
              </span>
              <span
                className="font-display font-bold leading-[1.12]"
                style={{ fontSize: mod.title.length > 30 ? 12.5 : 14.5 }}
              >
                {mod.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── HUD ─────────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-5">
        <div className="pointer-events-auto flex min-w-0 flex-col gap-0.5 rounded-2xl px-4 py-2.5" style={HUD}>
          <button
            type="button"
            onClick={onBack}
            className="mb-1 inline-flex cursor-pointer items-center gap-1.5 self-start rounded text-[13px] font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Course details
          </button>
          <span className="font-mono text-[11px] font-medium tracking-[0.14em]" style={{ color: "var(--map-accent)" }}>
            COURSE MAP
          </span>
          <h1 className="truncate font-display text-lg font-bold leading-tight text-foreground sm:text-xl">{course.title}</h1>
        </div>
        <button
          type="button"
          onClick={onContinue}
          disabled={hasNoContent}
          className="pointer-events-auto inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={14} className="fill-current" aria-hidden="true" />
          {actionLabel}
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-5">
        <nav
          aria-label="Where you are on the map"
          className="pointer-events-auto flex min-h-[42px] min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-full px-4 py-1.5 font-display text-sm text-foreground"
          style={HUD}
        >
          <button
            type="button"
            onClick={goCourse}
            className={`cursor-pointer rounded px-0.5 ${openMod == null ? "font-bold" : "text-muted-foreground underline underline-offset-4 hover:text-foreground"}`}
          >
            Course
          </button>
          {crumbMod && (
            <>
              <span aria-hidden="true" className="text-muted-foreground">›</span>
              <button
                type="button"
                onClick={() => {
                  setOpenLes(null);
                  setZoom(1);
                }}
                className={`cursor-pointer rounded px-0.5 ${crumbLes ? "text-muted-foreground underline underline-offset-4 hover:text-foreground" : "font-bold"}`}
              >
                {crumbMod.title}
              </button>
            </>
          )}
          {crumbLes && (
            <>
              <span aria-hidden="true" className="text-muted-foreground">›</span>
              <span className="font-semibold">{crumbLes.title}</span>
            </>
          )}
        </nav>

        <p
          className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] text-muted-foreground lg:block"
          style={HUD}
        >
          {hint}
        </p>

        <div role="group" aria-label="Map zoom" className="pointer-events-auto flex shrink-0 overflow-hidden rounded-xl" style={HUD}>
          {[
            ["Zoom out", Minus, () => setZoom((z) => Math.max(0.4, z / 1.25))],
            ["Zoom in", Plus, () => setZoom((z) => Math.min(2, z * 1.25))],
            ["Fit the map to the screen", Maximize2, () => setZoom(1)],
          ].map(([label, Icon, go]) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={go}
              className="flex h-[42px] w-[42px] cursor-pointer items-center justify-center text-foreground hover:bg-foreground/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
            >
              <Icon size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {lessons.length === 0 && (
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-16 rounded-full px-4 py-2 text-sm text-muted-foreground" style={HUD}>
          Your instructor hasn&apos;t added any lessons yet.
        </p>
      )}
    </div>
  );
}
