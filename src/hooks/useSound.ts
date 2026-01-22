"use client";

import { useCallback, useRef, useEffect } from "react";

export function useSound() {
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext on user interaction if needed, 
        // but here we just prepare the ref.
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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

    return { playClick, playCorrect, playWrong, playComplete };
}
