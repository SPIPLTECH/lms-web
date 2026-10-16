/** The one YouTube URL reader. See src/lib/youtube.js for the rules. */

/** The 11-character video id in a YouTube URL, or null if there isn't one. */
export declare function getYouTubeVideoId(url: string | null | undefined): string | null;

/**
 * True for any link on a YouTube host, including ones carrying no video id
 * (playlists, channels, mistyped watch URLs).
 */
export declare function isYouTubeUrl(url: string | null | undefined): boolean;
