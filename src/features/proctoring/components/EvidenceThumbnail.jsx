"use client";

import { useEffect, useState } from "react";
import { Eye, ImageIcon } from "lucide-react";

import { fetchEvidenceImage } from "@/services/proctoring.service";

/**
 * Loads a kept image with the viewer's own sign-in, through the authorised route. Staff views are
 * audited by the server. `onOpen` receives a blob URL for the lightbox.
 */
export default function EvidenceThumbnail({ evidenceId, explanation, capturedAt, onOpen, large = false }) {
    const [url, setUrl] = useState(null);
    const [failed, setFailed] = useState(false);
    const size = large ? "h-24 w-32" : "h-12 w-16";

    useEffect(() => {
        let cancelled = false;
        let created = null;
        fetchEvidenceImage(evidenceId)
            .then((blob) => {
                if (cancelled) return;
                created = URL.createObjectURL(blob);
                setUrl(created);
            })
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
            if (created) URL.revokeObjectURL(created);
        };
    }, [evidenceId]);

    if (failed) {
        return (
            <span className={`flex ${size} flex-col items-center justify-center rounded-lg border border-border bg-background/60 text-[9px] text-muted-foreground`}>
                <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                Unavailable
            </span>
        );
    }
    if (!url) return <span className={`block ${size} animate-pulse rounded-lg border border-border bg-background/60`} aria-label="Loading photo" />;
    return (
        <button type="button" onClick={() => onOpen({ url, explanation, capturedAt })} aria-label={`View photo: ${explanation}`} className={`group relative block ${size} overflow-hidden rounded-lg border border-border hover:border-primary`}>
            {/* A blob of a private image: next/image cannot optimise it, and must not try to. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
                <Eye className="h-4 w-4" aria-hidden />
            </span>
        </button>
    );
}
