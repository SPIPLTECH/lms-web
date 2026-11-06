/**
 * Voice activity detection, entirely in the browser. Copied from ProctorGuard.
 *
 * Each audio frame is reduced to two numbers (level in dBFS and zero crossings per second) and
 * then discarded. Only the summary of a detected speech segment (duration, speech ratio, peak
 * level) is reported to the server. No audio, spectra or transcripts ever leave the page.
 *
 * A frame counts as speech when it is louder than the room (noise floor + marginDb, and at
 * least minLevelDb) and its zero-crossing rate is in the speech range, which excludes mains
 * hum and hiss. The noise floor tracks the room's quiet level and is learned for calibrationMs
 * before anything is detected. Speech frames separated by less than hangoverMs form one segment,
 * reported once, when its speech time reaches minSpeechMs, and at most once per cooldownMs.
 */

const SILENCE_DB = -100;

/** RMS level of the frame in dBFS (-100 for silence). */
export function frameLevelDb(samples) {
    if (samples.length === 0) return SILENCE_DB;
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / samples.length);
    return rms > 0 ? Math.max(SILENCE_DB, 20 * Math.log10(rms)) : SILENCE_DB;
}

/** Sign changes per second. */
export function crossingsPerSecond(samples, sampleRate) {
    if (samples.length < 2) return 0;
    let crossings = 0;
    for (let i = 1; i < samples.length; i += 1) {
        if ((samples[i - 1] >= 0) !== (samples[i] >= 0)) crossings += 1;
    }
    return (crossings * sampleRate) / samples.length;
}

/** Asks for microphone permission and releases the device at once. Nothing is recorded. */
export async function checkMicrophoneAccess() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "UNAVAILABLE";
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getTracks().forEach((track) => track.stop());
        return "READY";
    } catch (error) {
        return error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError" ? "DENIED" : "UNAVAILABLE";
    }
}

export class VoiceActivityDetector {
    constructor(options) {
        this.o = { marginDb: 12, minLevelDb: -50, minCrossingsPerSecond: 150, maxCrossingsPerSecond: 6000, hangoverMs: 400, calibrationMs: 1000, ...options };
        this.startedAt = null;
        this.noiseFloorDb = null;
        this.prevFrameAt = null;
        this.lastReportAt = -Infinity;
        this.segment = null;
    }

    isSpeechFrame(levelDb, crossings) {
        if (this.noiseFloorDb === null) return false;
        return (
            levelDb >= this.o.minLevelDb &&
            levelDb >= this.noiseFloorDb + this.o.marginDb &&
            crossings >= this.o.minCrossingsPerSecond &&
            crossings <= this.o.maxCrossingsPerSecond
        );
    }

    updateFloor(levelDb) {
        if (this.noiseFloorDb === null) {
            this.noiseFloorDb = levelDb;
            return;
        }
        const rate = levelDb < this.noiseFloorDb ? 0.5 : 0.02;
        this.noiseFloorDb = Math.max(-90, this.noiseFloorDb + (levelDb - this.noiseFloorDb) * rate);
    }

    /** One frame of samples (-1..1) at `nowMs`. Returns a report at most once per segment. */
    push(samples, nowMs) {
        const levelDb = frameLevelDb(samples);
        const crossings = crossingsPerSecond(samples, this.o.sampleRate);
        if (this.startedAt === null) this.startedAt = nowMs;
        // Time since the previous frame, capped so a throttled timer cannot inflate durations.
        const step = this.prevFrameAt === null ? 0 : Math.min(nowMs - this.prevFrameAt, 250);
        this.prevFrameAt = nowMs;

        if (nowMs - this.startedAt < this.o.calibrationMs) {
            this.updateFloor(levelDb);
            return null;
        }

        const speech = this.isSpeechFrame(levelDb, crossings);
        if (!speech) this.updateFloor(levelDb);

        if (speech && !this.segment) {
            this.segment = { startAt: nowMs - step, lastSpeechAt: nowMs, speechMs: 0, frames: 0, speechFrames: 0, peakDb: levelDb, reported: false };
        }
        const segment = this.segment;
        if (!segment) return null;

        segment.frames += 1;
        if (speech) {
            segment.speechFrames += 1;
            segment.speechMs += step;
            segment.lastSpeechAt = nowMs;
            segment.peakDb = Math.max(segment.peakDb, levelDb);
        } else if (nowMs - segment.lastSpeechAt > this.o.hangoverMs) {
            this.segment = null;
            return null;
        }

        if (!segment.reported && segment.speechMs >= this.o.minSpeechMs && nowMs - this.lastReportAt >= this.o.cooldownMs) {
            segment.reported = true;
            this.lastReportAt = nowMs;
            return {
                durationMs: Math.round(nowMs - segment.startAt),
                speechRatio: Math.round((segment.speechFrames / segment.frames) * 100) / 100,
                levelDb: Math.round(segment.peakDb),
            };
        }
        return null;
    }
}
