"use client";

import { useCallback, useRef, useEffect } from "react";

type WindowWithWebkitAudioContext = Window & {
    webkitAudioContext?: typeof AudioContext;
};

export function useSound() {
    const audioContextRef = useRef<AudioContext | null>(null);

    const getAudioContext = useCallback(() => {
        if (typeof window === "undefined") return null;

        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            return audioContextRef.current;
        }

        const AudioContextClass =
            window.AudioContext ||
            (window as WindowWithWebkitAudioContext).webkitAudioContext;
        if (!AudioContextClass) return null;

        try {
            audioContextRef.current = new AudioContextClass();
            return audioContextRef.current;
        } catch (error) {
            console.warn("AudioContext unavailable in this browser/runtime.", error);
            return null;
        }
    }, []);

    const withReadyAudioContext = useCallback((run: (ctx: AudioContext) => void) => {
        const ctx = getAudioContext();
        if (!ctx) return;

        const runIfReady = () => {
            if (ctx.state !== "running") return;
            run(ctx);
        };

        if (ctx.state === "suspended") {
            void ctx.resume().then(runIfReady).catch(() => {
                // Keep silent if resume is blocked by autoplay policy.
            });
            return;
        }

        runIfReady();
    }, [getAudioContext]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const unlockAudio = () => {
            withReadyAudioContext(() => {
                // no-op; this forces resume on first user interaction in Safari/Firefox.
            });
        };

        window.addEventListener("pointerdown", unlockAudio, { passive: true });
        window.addEventListener("keydown", unlockAudio);
        window.addEventListener("touchstart", unlockAudio, { passive: true });

        return () => {
            window.removeEventListener("pointerdown", unlockAudio);
            window.removeEventListener("keydown", unlockAudio);
            window.removeEventListener("touchstart", unlockAudio);

            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
                void audioContextRef.current.close();
            }
        };
    }, [withReadyAudioContext]);

    const playTone = useCallback((freq: number, type: OscillatorType, duration: number, startTime = 0) => {
        withReadyAudioContext((ctx) => {
            try {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

                gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + startTime);
                osc.stop(ctx.currentTime + startTime + duration);
            } catch {
                // Ignore transient browser audio node failures.
            }
        });
    }, [withReadyAudioContext]);

    const playSequence = useCallback(
        (notes: number[], type: OscillatorType, duration: number, step: number) => {
            notes.forEach((note, index) => {
                playTone(note, type, duration, index * step);
            });
        },
        [playTone]
    );

    const playClick = useCallback(() => {
        playTone(800, "sine", 0.1);
    }, [playTone]);

    const playCorrect = useCallback(() => {
        // Major Arpeggio (C - E - G)
        playTone(523.25, "sine", 0.2, 0);       // C5
        playTone(659.25, "sine", 0.2, 0.1);     // E5
        playTone(783.99, "sine", 0.4, 0.2);     // G5
    }, [playTone]);

    const playWrong = useCallback(() => {
        // Low dissonant tone
        playTone(150, "sawtooth", 0.3);
        playTone(130, "sawtooth", 0.3, 0.1);
    }, [playTone]);

    const playComplete = useCallback(() => {
        // Victory fanfare ish
        playTone(523.25, "square", 0.2, 0);
        playTone(659.25, "square", 0.2, 0.15);
        playTone(783.99, "square", 0.2, 0.30);
        playTone(1046.50, "square", 0.6, 0.45); // C6
    }, [playTone]);

    const playScorePerfect = useCallback(() => {
        playSequence([523.25, 659.25, 783.99, 1046.5], "square", 0.2, 0.09);
        playTone(1318.51, "triangle", 0.32, 0.42);
    }, [playSequence, playTone]);

    const playScoreGreat = useCallback(() => {
        playSequence([440, 554.37, 659.25, 880], "sine", 0.18, 0.08);
    }, [playSequence]);

    const playScoreGood = useCallback(() => {
        playSequence([392, 493.88, 587.33], "triangle", 0.16, 0.08);
    }, [playSequence]);

    const playScoreRetry = useCallback(() => {
        playTone(220, "triangle", 0.2, 0);
        playTone(261.63, "triangle", 0.2, 0.1);
        playTone(329.63, "triangle", 0.24, 0.2);
    }, [playTone]);

    const playQuizResult = useCallback(
        (scorePercent: number) => {
            if (scorePercent >= 90) {
                playScorePerfect();
                return;
            }
            if (scorePercent >= 75) {
                playScoreGreat();
                return;
            }
            if (scorePercent >= 50) {
                playScoreGood();
                return;
            }
            playScoreRetry();
        },
        [playScorePerfect, playScoreGreat, playScoreGood, playScoreRetry]
    );

    return { playClick, playCorrect, playWrong, playComplete, playQuizResult, playScoreRetry };
}
