import type { NextConfig } from "next";

// Next blocks cross-origin requests to dev-only resources (/_next/* assets
// and the HMR websocket) unless the requesting host is allowlisted, so a
// phone or laptop opening the dev server over the Wi-Fi gets 403s and no hot
// reload. The requesting host is this PC's LAN IP, which DHCP hands out and
// which changes between networks, so the allowlist covers the private ranges
// instead of one pinned address. Matching is per dot-segment, which is why
// 172.16.0.0/12 has to be spelled out a segment at a time.
// Development only — `next start` ignores this.
const PRIVATE_LAN_DEV_ORIGINS = [
    "10.*.*.*",
    "192.168.*.*",
    ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
];

const nextConfig: NextConfig = {
    allowedDevOrigins: PRIVATE_LAN_DEV_ORIGINS,
    experimental: {
        // Without this, Turbopack/webpack was emitting a separate ~330KB
        // recharts chunk per route that imports it (verified via `next build`:
        // 4 identical 329,038-byte chunks) instead of one shared chunk.
        optimizePackageImports: ["recharts"],
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "miro.medium.com",
            },
            {
                protocol: "https",
                hostname: "www.devprojournal.com",
            },
            {
                protocol: "https",
                hostname: "encrypted-tbn0.gstatic.com",
            },
            {
                protocol: "https",
                hostname: "wildlearner.com",
            },
            {
                protocol: "https",
                hostname: "www.cnet.com",
            },
        ],
    },
    async rewrites() {
        return [
            // ==========================
            // Modules (Specific first, then general)
            // ==========================
            // Nested module create
            {
                source: "/instructor/courses/:courseId/modules/create",
                destination: "/instructor/modules/create/:courseId",
            },
            // Nested module edit
            {
                source: "/instructor/courses/:courseId/modules/edit/:moduleId",
                destination: "/instructor/modules/edit/:moduleId",
            },
            // Nested module details
            {
                source: "/instructor/courses/:courseId/modules/:moduleId",
                destination: "/instructor/modules/:moduleId",
            },

            // ==========================
            // Lessons (Specific first, then general)
            // ==========================
            // Nested lesson create
            {
                source: "/instructor/courses/:courseId/modules/:moduleId/lessons/create",
                destination: "/instructor/lessons/create/:moduleId",
            },
            // Nested lesson edit
            {
                source: "/instructor/courses/:courseId/modules/:moduleId/lessons/edit/:lessonId",
                destination: "/instructor/lessons/edit/:lessonId",
            },
            // Nested lesson details
            {
                source: "/instructor/courses/:courseId/modules/:moduleId/lessons/:lessonId",
                destination: "/instructor/lessons/:lessonId",
            },

            // ==========================
            // Contents (Specific first, then general)
            // ==========================
            // Nested content create
            {
                source: "/instructor/courses/:courseId/modules/:moduleId/lessons/:lessonId/contents/create",
                destination: "/instructor/contents/create/:lessonId",
            },
            // Nested content edit
            {
                source: "/instructor/courses/:courseId/modules/:moduleId/lessons/:lessonId/contents/edit/:contentId",
                destination: "/instructor/contents/edit/:contentId",
            },
            // Nested content details
            {
                source: "/instructor/courses/:courseId/modules/:moduleId/lessons/:lessonId/contents/:contentId",
                destination: "/instructor/contents/view/:contentId",
            },

            // ==========================
            // Quizzes (Specific first, then general)
            // ==========================
            // Nested quiz create
            {
                source: "/instructor/courses/:courseId/quizzes/create",
                destination: "/instructor/quizzes/create/:courseId",
            },
            // Nested quiz edit
            {
                source: "/instructor/courses/:courseId/quizzes/edit/:quizId",
                destination: "/instructor/quizzes/edit/:quizId",
            },
            // Nested quiz details
            {
                source: "/instructor/courses/:courseId/quizzes/:quizId",
                destination: "/instructor/quizzes/view/:quizId",
            },
            // Nested quizzes list
            {
                source: "/instructor/courses/:courseId/quizzes",
                destination: "/instructor/quizzes/:courseId",
            },

            // ==========================
            // Questions
            // ==========================
            // Nested question create
            {
                source: "/instructor/courses/:courseId/quizzes/:quizId/questions/create",
                destination: "/instructor/questions/create/:quizId",
            },
            // Nested question edit
            {
                source: "/instructor/courses/:courseId/quizzes/:quizId/questions/edit/:questionId",
                destination: "/instructor/questions/edit/:questionId",
            },
            // Nested question view
            {
                source: "/instructor/courses/:courseId/quizzes/:quizId/questions/view/:questionId",
                destination: "/instructor/questions/view/:questionId",
            },
            // Nested questions list
            {
                source: "/instructor/courses/:courseId/quizzes/:quizId/questions",
                destination: "/instructor/questions/:quizId",
            },
        ];
    },
};

export default nextConfig;