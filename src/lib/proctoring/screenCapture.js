/**
 * What a web page can know about screen capture, and no more than that.
 *
 * The guard sees a capture only if it started through getDisplayMedia in this page. No browser API
 * reveals a recorder in another application or tab, an extension's capture, or a capture card, so
 * this cannot and does not claim to find them. docs/proctoring_post_integration_validation_report.md
 * sets out what can be detected, and what would need native software or managed devices.
 */
export function createCaptureGuard(getDevices) {
    const devicesOf = () => (typeof getDevices === "function" ? getDevices() : getDevices);
    const tracks = new Set();
    const listeners = new Set();
    let onRefused = null;
    let installed = false;

    const tell = () => listeners.forEach((listener) => listener());

    const activeSessions = () => [...tracks].filter((track) => track.readyState === "live").length;

    const watch = (stream) => {
        for (const track of stream?.getVideoTracks?.() ?? []) {
            tracks.add(track);
            track.addEventListener("ended", () => {
                tracks.delete(track);
                tell();
            });
        }
        tell();
    };

    return {
        supported: () => Boolean(devicesOf()?.getDisplayMedia),
        activeSessions,

        /** Safe to call again. The earlier it runs, the more it can see, so it runs as the exam page loads. */
        install() {
            const devices = devicesOf();
            if (installed || !devices?.getDisplayMedia) return;
            installed = true;
            const original = devices.getDisplayMedia;
            devices.getDisplayMedia = async function getDisplayMedia(...args) {
                if (onRefused) {
                    onRefused();
                    throw new DOMException("Screen sharing is not allowed during a proctored exam.", "NotAllowedError");
                }
                const stream = await original.apply(this, args);
                watch(stream);
                return stream;
            };
        },

        /** New captures are refused until the function it returns is called. */
        refuseNew(handler = () => {}) {
            onRefused = handler;
            return () => {
                if (onRefused === handler) onRefused = null;
            };
        },

        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

/** The exam page's guard. */
export const captureGuard = createCaptureGuard(() => (typeof navigator === "undefined" ? null : navigator.mediaDevices));
