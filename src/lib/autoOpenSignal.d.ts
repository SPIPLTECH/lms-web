/** The Course Map "Add Content" auto-open protocol. See src/lib/autoOpenSignal.js for the rules. */

/**
 * Decides whether a pending auto-open request should open the Add Content
 * picker on this render, and returns the marker to carry into the next one.
 *
 * `handled` must be stored across renders (a ref) and fed straight back in.
 */
export declare function resolveAutoOpen(args: {
  signal: number;
  isLoading: boolean;
  handled?: number | null;
}): { open: boolean; handled: number | null };
