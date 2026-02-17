"use client";

import { useCallback, useRef, useEffect } from "react";

type WindowWithWebkitAudioContext = Window & {
    webkitAudioContext?: typeof AudioContext;
};

export function useSound() {
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext on user interaction if needed, 
        // but here we just prepare the ref.
        const AudioContextClass =
            window.AudioContext ||
            (window as WindowWithWebkitAudioContext).webkitAudioContext;
        if (AudioContextClass) {
            audioContextRef.current = new AudioContextClass();
        }

        return () => {
            audioContextRef.current?.close();
        };
    }, []);

    const playTone = useCallback((freq: number, type: OscillatorType, duration: number, startTime = 0) => {
        const ctx = audioContextRef.current;
        if (!ctx) return;

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
    }, []);

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

    return { playClick, playCorrect, playWrong, playComplete, playQuizResult };
}
