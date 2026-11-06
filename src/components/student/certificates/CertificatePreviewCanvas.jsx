"use client";

import React from "react";

function formatDate(date) {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Universal Signature SVG for Prasad Kulkarni
 */
export function SignatureSvg({ color = "currentColor" }) {
  return (
    <svg
      viewBox="0 0 240 60"
      className="w-36 h-9 sm:w-44 sm:h-11"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M 25,48 C 28,32 32,14 34,8 C 35,5 33,6 30,12 C 27,18 20,44 18,52 M 32,10 C 44,6 56,12 50,24 C 44,32 30,30 25,30" />
      <path d="M 45,30 C 50,26 55,27 58,32 C 60,35 63,28 67,27 C 71,26 73,32 75,34 C 77,29 82,28 85,32 C 87,35 88,33 92,27 C 95,22 98,28 99,34 C 101,27 103,12 105,8 C 105,16 106,30 109,33" />
      <path d="M 125,12 C 127,24 128,40 127,50 M 142,16 C 137,24 130,31 127,33 C 133,35 140,42 145,50 M 145,32 C 148,30 152,31 154,35 C 156,33 160,30 163,34 C 165,22 168,14 169,12 C 169,18 168,32 171,35 C 174,31 178,30 181,34 C 183,28 186,30 188,34 C 191,24 195,14 196,12 C 196,20 197,32 200,34" />
      <path d="M 20,54 C 60,50 140,52 220,46 C 225,45 220,50 205,53" strokeWidth="1.6" opacity="0.8" />
    </svg>
  );
}

/**
 * Universal Corner Flourish SVG
 */
export function CornerFlourishSvg({ color = "#B8860B" }) {
  return (
    <svg viewBox="0 0 100 100" className="w-12 h-12 sm:w-16 sm:h-16 pointer-events-none" fill={color}>
      <path d="M 0,0 L 40,0 C 40,15 35,28 25,38 C 15,48 5,50 0,55 L 0,0 Z" opacity="0.15" />
      <path d="M 5,5 L 85,5 C 80,15 65,25 50,30 C 35,35 25,48 20,65 C 15,75 5,85 5,85 L 5,5 Z" fill="none" stroke={color} strokeWidth="2" />
      <path d="M 12,12 C 25,25 35,40 40,60 M 18,18 C 30,30 45,38 65,42" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="14" cy="14" r="4" />
      <circle cx="32" cy="12" r="2.5" />
      <circle cx="12" cy="32" r="2.5" />
    </svg>
  );
}

/**
 * Heraldic Watermark SVG for Version C (Premium Ornamental)
 */
export function WatermarkEmblemSvg() {
  return (
    <svg viewBox="0 0 400 400" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 opacity-[0.04] pointer-events-none z-0" fill="none" stroke="#B45309" strokeWidth="2">
      <circle cx="200" cy="200" r="180" strokeWidth="3" strokeDasharray="6,4" />
      <circle cx="200" cy="200" r="150" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="120" strokeWidth="2" />
      <path d="M 120,240 C 90,190 105,130 150,100 C 140,120 145,150 160,170 C 145,180 130,210 135,240 Z" fill="#B45309" opacity="0.4" />
      <path d="M 280,240 C 310,190 295,130 250,100 C 260,120 255,150 240,170 C 255,180 270,210 265,240 Z" fill="#B45309" opacity="0.4" />
      <polygon points="200,130 212,175 258,175 220,202 235,245 200,218 165,245 180,202 142,175 188,175" fill="#B45309" opacity="0.6" />
    </svg>
  );
}

/**
 * Seals specific to the 4 approved templates
 */
export function CertificateSeal({ templateId }) {
  if (templateId === "CLASSIC_GOLD_V2") {
    // Version B: Clean Modern Gold Coin Seal
    return (
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="#fffbeb" stroke="#c89d35" strokeWidth="2" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#d97706" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="34" fill="#92400e" />
          <path d="M 40,50 L 47,57 L 62,42" fill="none" stroke="#fef08a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="50" y="72" textAnchor="middle" fontSize="6.5" fontFamily="sans-serif" fontWeight="bold" fill="#fef3c7" letterSpacing="1">
            VERIFIED
          </text>
        </svg>
      </div>
    );
  }

  if (templateId === "CLASSIC_GOLD_V3") {
    // Version C: 32-Point Radiant Starburst Gold Seal with Ribbons
    return (
      <div className="relative w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center shrink-0">
        <svg className="absolute -bottom-2 w-7 h-5 z-0" viewBox="0 0 60 40">
          <polygon points="12,0 8,36 22,28 30,0" fill="#92400e" />
          <polygon points="48,0 52,36 38,28 30,0" fill="#d97706" />
        </svg>
        <svg className="relative w-full h-full z-10" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="47" fill="#d97706" stroke="#b45309" strokeWidth="2" />
          <circle cx="50" cy="50" r="40" fill="#332007" stroke="#ffd700" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="32" fill="none" stroke="#fef08a" strokeDasharray="2,2" strokeWidth="1" />
          <polygon points="50,28 53,38 64,38 55,45 58,56 50,49 42,56 45,45 36,38 47,38" fill="#ffd700" />
          <text x="50" y="68" textAnchor="middle" fontSize="7" fontFamily="serif" fontWeight="bold" fill="#fef08a" letterSpacing="1">
            PRESTIGE
          </text>
        </svg>
      </div>
    );
  }

  if (templateId === "CLASSIC_GOLD_V4") {
    // Version D: Delicate Royal Minimal Gold Ring Seal
    return (
      <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="#fafaf9" stroke="#d4af37" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#e4e4e7" strokeWidth="0.8" />
          <polygon points="50,34 53,44 63,44 55,50 58,60 50,54 42,60 45,50 37,44 47,44" fill="#d4af37" />
          <text x="50" y="74" textAnchor="middle" fontSize="6" fontFamily="serif" fontWeight="600" fill="#71717a" letterSpacing="1.5">
            ROYAL SEAL
          </text>
        </svg>
      </div>
    );
  }

  // Version A: Traditional Academic Wafer Seal with Ribbons (CLASSIC_GOLD_V1 default)
  return (
    <div className="relative w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center shrink-0">
      <svg className="absolute -bottom-2 w-7 h-5 z-0" viewBox="0 0 60 40">
        <polygon points="12,0 8,36 22,28 30,0" fill="#78350f" />
        <polygon points="48,0 52,36 38,28 30,0" fill="#b8860b" />
      </svg>
      <svg className="relative w-full h-full z-10" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="#b8860b" stroke="#8c6b32" strokeWidth="2" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" strokeDasharray="3,2" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="32" fill="#4a3311" />
        <polygon points="50,26 54,38 67,38 56,46 60,58 50,51 40,58 44,46 33,38 46,38" fill="#ffd700" />
        <text x="50" y="70" textAnchor="middle" fontSize="7.5" fontFamily="serif" fontWeight="bold" fill="#fff" letterSpacing="1">
          ACADEMIC
        </text>
      </svg>
    </div>
  );
}

/**
 * Main Landscape Certificate Canvas Component
 * Renders any of the 4 approved Classic Gold designs with pixel precision.
 */
export default function CertificatePreviewCanvas({
  cert,
  templateId = "CLASSIC_GOLD_V1",
  isGraded = true,
  scale = 1,
  className = "",
}) {
  const studentName = cert?.student?.user?.name || cert?.user?.name || cert?.studentName || "Naitik Ganvir";
  const courseTitle = cert?.course?.title || cert?.courseTitle || "Web Development Basics";
  const brandingName = cert?.brandingName || "COURSE RANGER";
  const brandingPoweredBy = cert?.brandingPoweredBy || "Powered by SPIPL";
  const certificateTitle = cert?.certificateTitle || cert?.course?.certificateTitle || "CERTIFICATE OF COMPLETION";
  const courseMemo = cert?.courseMemo || cert?.course?.courseMemo;
  const signatoryName = cert?.signatoryName || cert?.course?.creator?.name || cert?.instructorName || "Prasad Kulkarni";
  const signatoryTitle = cert?.signatoryTitle || "Lead Instructor & Evaluator";
  const credentialId = cert?.certificateNo || "CR-01OKK6";
  const enrolledAt = cert?.enrolledAt ? formatDate(cert.enrolledAt) : "November 4, 2026";
  const completedAt = cert?.completedAt ? formatDate(cert.completedAt) : "November 5, 2026";
  const issuedOn = cert?.issuedAt ? formatDate(cert.issuedAt) : "November 5, 2026";

  const grade = cert?.grade || "A";
  const score = cert?.score !== null && cert?.score !== undefined ? cert.score : 85;
  const performance = cert?.performanceDescription || "Excellent";

  const showGrading = isGraded && grade && grade !== "Completed" && score !== null && score !== undefined;

  const TEMPLATE_THEMES = {
    CLASSIC_GOLD_V1: {
      bg: "#FAF9F1",
      ink: "#2B1F0D",
      border: "#3D2A0F",
      outerBorder: "#B8860B",
    },
    CLASSIC_GOLD_V2: {
      bg: "#FCFBF9",
      ink: "#111827",
      border: "#E5E7EB",
      outerBorder: "#C89D35",
    },
    CLASSIC_GOLD_V3: {
      bg: "#FAF5EB",
      ink: "#261907",
      border: "#332007",
      outerBorder: "#B45309",
    },
    CLASSIC_GOLD_V4: {
      bg: "#FBFBFA",
      ink: "#18181B",
      border: "#F4F4F5",
      outerBorder: "#D4AF37",
    },
  };

  const theme = TEMPLATE_THEMES[templateId] || TEMPLATE_THEMES.CLASSIC_GOLD_V1;
  const outerBorderColor = theme.outerBorder;

  return (
    <div
      className={`relative w-full aspect-[1.414/1] rounded-sm overflow-hidden select-none shadow-xl border flex flex-col justify-between ${className}`}
      style={{
        backgroundColor: theme.bg,
        color: theme.ink,
        borderColor: theme.border,
        boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Decorative Borders & Ornaments per Template */}
      {templateId === "CLASSIC_GOLD_V1" && (
        <>
          <div className="absolute inset-2 sm:inset-3 border-2 border-double border-[#B8860B] pointer-events-none z-10" />
          <div className="absolute inset-3 sm:inset-4 border border-[#B8860B]/40 pointer-events-none z-10" />
          {/* Corner blocks */}
          <div className="absolute top-2 left-2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#3D2A0F] border border-[#B8860B] flex items-center justify-center z-20">
            <div className="w-1.5 h-1.5 bg-[#FFD700]" />
          </div>
          <div className="absolute top-2 right-2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#3D2A0F] border border-[#B8860B] flex items-center justify-center z-20">
            <div className="w-1.5 h-1.5 bg-[#FFD700]" />
          </div>
          <div className="absolute bottom-2 left-2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#3D2A0F] border border-[#B8860B] flex items-center justify-center z-20">
            <div className="w-1.5 h-1.5 bg-[#FFD700]" />
          </div>
          <div className="absolute bottom-2 right-2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#3D2A0F] border border-[#B8860B] flex items-center justify-center z-20">
            <div className="w-1.5 h-1.5 bg-[#FFD700]" />
          </div>
        </>
      )}

      {templateId === "CLASSIC_GOLD_V2" && (
        <>
          <div className="absolute inset-3 sm:inset-4 border-2 border-[#C89D35] pointer-events-none z-10" />
          <div className="absolute inset-4 sm:inset-5 border border-[#C89D35]/30 pointer-events-none z-10" />
        </>
      )}

      {templateId === "CLASSIC_GOLD_V3" && (
        <>
          <WatermarkEmblemSvg />
          <div className="absolute inset-2 sm:inset-3 border-2 border-[#B45309] pointer-events-none z-10" />
          <div className="absolute inset-3 sm:inset-4 border border-dashed border-[#B45309]/40 pointer-events-none z-10" />
          <div className="absolute top-3 left-3 z-20">
            <CornerFlourishSvg color="#B45309" />
          </div>
          <div className="absolute top-3 right-3 scale-x-[-1] z-20">
            <CornerFlourishSvg color="#B45309" />
          </div>
          <div className="absolute bottom-3 left-3 scale-y-[-1] z-20">
            <CornerFlourishSvg color="#B45309" />
          </div>
          <div className="absolute bottom-3 right-3 scale-[-1] z-20">
            <CornerFlourishSvg color="#B45309" />
          </div>
        </>
      )}

      {templateId === "CLASSIC_GOLD_V4" && (
        <div className="absolute inset-5 sm:inset-7 border border-[#D4AF37] pointer-events-none z-10" />
      )}

      {/* Inner Padding Frame */}
      <div className="relative z-10 w-full h-full p-3.5 sm:p-4.5 md:p-5.5 flex flex-col justify-between">
        
        {/* HEADER: Institution & Title */}
        <div className="text-center space-y-0.5">
          <div className="flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <h3
              className="text-[11px] sm:text-[13px] md:text-[14px] font-black tracking-[0.24em] uppercase"
              style={{ color: theme.ink }}
            >
              {brandingName}
            </h3>
          </div>
          <p
            className="text-[7.5px] sm:text-[8.5px] font-bold tracking-widest uppercase opacity-75"
            style={{ color: theme.ink }}
          >
            {brandingPoweredBy}
          </p>

          <div className="pt-1">
            <h2
              className="text-[13px] sm:text-[16px] md:text-[18px] font-black tracking-[0.14em] uppercase"
              style={{ color: theme.ink }}
            >
              {certificateTitle}
            </h2>
            <div className="w-24 sm:w-32 h-[1.5px] bg-gradient-to-r from-transparent via-[#B8860B] to-transparent mx-auto mt-0.5" />
          </div>
        </div>

        {/* BODY: Recipient Name & Course Details */}
        <div className="text-center my-auto py-0.5 sm:py-1">
          <p
            className="text-[8.5px] sm:text-[10px] font-serif italic opacity-75 mb-0.5"
            style={{ color: theme.ink }}
          >
            This is proudly presented to
          </p>
          <h1
            className="text-[20px] sm:text-[25px] md:text-[28px] font-black tracking-tight leading-none mb-1"
            style={{
              fontFamily: templateId === "CLASSIC_GOLD_V2" ? "sans-serif" : "serif",
              color: theme.ink,
            }}
          >
            {studentName}
          </h1>

          <p
            className="text-[8px] sm:text-[9.5px] opacity-80 max-w-md mx-auto leading-tight mb-0.5"
            style={{ color: theme.ink }}
          >
            for successfully mastering the curriculum and meeting all criteria for completion of the professional program in
          </p>

          <h2
            className="text-[12px] sm:text-[14px] md:text-[16px] font-bold tracking-wide"
            style={{ color: "#78350f" }}
          >
            {courseTitle}
          </h2>

          {/* Optional Course Memo */}
          {courseMemo && (
            <p
              className="text-[7.5px] sm:text-[8.5px] italic opacity-75 max-w-md mx-auto line-clamp-1 mt-0.5"
              style={{ color: theme.ink }}
            >
              &ldquo;{courseMemo}&rdquo;
            </p>
          )}

          {/* Grade, Score & Performance Section (Omitted when ungraded) */}
          {showGrading && (
            <div className="inline-flex items-center gap-2.5 sm:gap-4 px-3 py-0.5 rounded-md bg-[#B8860B]/10 border border-[#B8860B]/30 mt-1 text-[8.5px] sm:text-[10px] font-bold">
              <span>Grade: <strong className="text-amber-900 font-black">{grade}</strong></span>
              <span className="opacity-40">•</span>
              <span>Score: <strong className="text-amber-900 font-black">{score}%</strong></span>
              <span className="opacity-40">•</span>
              <span>Performance: <strong className="text-amber-900 font-black">{performance}</strong></span>
            </div>
          )}

          {/* DATES ROW: Enrollment Date and Completion Date aligned in ONE single horizontal row */}
          <div
            className="flex items-center justify-center gap-3.5 sm:gap-6 pt-1.5 sm:pt-2 text-[8px] sm:text-[9.5px] font-semibold opacity-85"
            style={{ color: theme.ink }}
          >
            <div className="flex items-center gap-1">
              <span className="opacity-70 uppercase tracking-wider text-[7px] sm:text-[8px]">Enrollment Date:</span>
              <span className="font-bold">{enrolledAt}</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#B8860B] opacity-60" />
            <div className="flex items-center gap-1">
              <span className="opacity-70 uppercase tracking-wider text-[7px] sm:text-[8px]">Completion Date:</span>
              <span className="font-bold">{completedAt}</span>
            </div>
          </div>
        </div>

        {/* FOOTER: Issued On, Seal, Signatures */}
        <div className="flex items-end justify-between border-t border-[#B8860B]/20 pt-1.5 sm:pt-2 mt-0.5">
          {/* Left: Issued On */}
          <div className="text-left space-y-0.5" style={{ color: theme.ink }}>
            <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider opacity-70 block">
              Issued On:
            </span>
            <span className="text-[8.5px] sm:text-[10px] font-bold block">
              {issuedOn}
            </span>
            <span className="text-[6.5px] sm:text-[7.5px] opacity-60 block">
              Verified Academic Record
            </span>
          </div>

          {/* Center: Decorative Seal */}
          <div className="flex flex-col items-center justify-center">
            <CertificateSeal templateId={templateId} />
          </div>

          {/* Right: Signature Block */}
          <div className="text-center flex flex-col items-center min-w-[110px] sm:min-w-[140px]" style={{ color: theme.ink }}>
            <SignatureSvg color={outerBorderColor} />
            <div className="w-24 sm:w-30 h-[1px] bg-current opacity-40 mt-0.5 mb-0.5" style={{ backgroundColor: theme.ink }} />
            <span className="text-[9px] sm:text-[10.5px] font-bold leading-tight block">
              {signatoryName}
            </span>
            <span className="text-[7px] sm:text-[8px] uppercase tracking-wider opacity-70 block">
              {signatoryTitle}
            </span>
          </div>
        </div>

        {/* SUBFOOTER: Discreet Credential ID */}
        <div
          className="flex items-center justify-between text-[7px] sm:text-[8px] opacity-60 pt-0.5 border-t border-current/10"
          style={{ color: theme.ink }}
        >
          <span>Credential ID: <strong className="font-mono font-bold tracking-wider">{credentialId}</strong></span>
          <span>Verify: <em>courseranger.com/verify/{credentialId}</em></span>
          <span>Orange Tree LMS</span>
        </div>

      </div>
    </div>
  );
}
