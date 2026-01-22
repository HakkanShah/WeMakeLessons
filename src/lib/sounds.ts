"use client";

// Simple Retro Sound Synthesizer
// No external files needed! Uses Web Audio API.

type SoundType = "success" | "error" | "click" | "pop" | "hover";

let audioCtx: AudioContext | null = null;

const getContext = () => {
    if (typeof window === "undefined") return null;
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtx;
};

export const playSound = (type: SoundType) => {
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
        case "success":
            // Ascending Chime (C5 -> E5 -> G5)
            osc.type = "sine";
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.linearRampToValueAtTime(659.25, now + 0.1); // E5
            osc.frequency.linearRampToValueAtTime(783.99, now + 0.2); // G5

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

            osc.start(now);
            osc.stop(now + 0.6);
            break;

        case "error":
            // Low Buzz/Thud
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.2);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

            osc.start(now);
            osc.stop(now + 0.3);
            break;

        case "click":
            // Short high blip
            osc.type = "sine";
            osc.frequency.setValueAtTime(800, now);

            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            osc.start(now);
            osc.stop(now + 0.1);
            break;

        case "pop":
            // Bubble pop sound
            osc.type = "sine";
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            osc.start(now);
            osc.stop(now + 0.1);
            break;

        case "hover":
            // Very subtle click
            osc.type = "triangle";
            osc.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
    }
};
