"use client";

// Game-Themed Sound Synthesizer for WeMakeLessons
// No external files needed! Uses Web Audio API.

type SoundType =
    | "success"
    | "error"
    | "click"
    | "pop"
    | "hover"
    | "navigate"
    | "levelUp"
    | "coin"
    | "powerUp"
    | "menuOpen"
    | "menuClose";

let audioCtx: AudioContext | null = null;
let unlockHandlersInstalled = false;

type WindowWithWebkitAudioContext = Window & {
    webkitAudioContext?: typeof AudioContext;
};

const getContext = () => {
    if (typeof window === "undefined") return null;
    if (audioCtx && audioCtx.state !== "closed") return audioCtx;

    const AudioContextClass =
        window.AudioContext ||
        (window as WindowWithWebkitAudioContext).webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
        audioCtx = new AudioContextClass();
    } catch {
        return null;
    }

    if (!unlockHandlersInstalled) {
        unlockHandlersInstalled = true;
        const unlock = () => {
            if (!audioCtx || audioCtx.state !== "suspended") return;
            void audioCtx.resume().catch(() => {
                // Ignore autoplay-policy errors until next interaction.
            });
        };
        window.addEventListener("pointerdown", unlock, { passive: true });
        window.addEventListener("touchstart", unlock, { passive: true });
        window.addEventListener("keydown", unlock);
    }

    return audioCtx;
};

export const playSound = (type: SoundType) => {
    const ctx = getContext();
    if (!ctx) return;

    const playNow = () => {
        if (ctx.state !== "running") return;
        const now = ctx.currentTime;

        switch (type) {
        case "success": {
            // Celebratory victory chime (C5 -> E5 -> G5 -> C6)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
            osc.frequency.setValueAtTime(1046.5, now + 0.24); // C6

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            osc.start(now);
            osc.stop(now + 0.5);
            break;
        }

        case "error": {
            // Playful "bonk" sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "triangle";
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            osc.start(now);
            osc.stop(now + 0.2);
            break;
        }

        case "click": {
            // Snappy button press with subtle "boing"
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            osc.start(now);
            osc.stop(now + 0.08);
            break;
        }

        case "pop": {
            // Bubbly, playful pop
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            osc.start(now);
            osc.stop(now + 0.1);
            break;
        }

        case "hover": {
            // Light sparkly touch
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc.frequency.setValueAtTime(1400, now);
            osc.frequency.exponentialRampToValueAtTime(1600, now + 0.03);

            gain.gain.setValueAtTime(0.015, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc.start(now);
            osc.stop(now + 0.04);
            break;
        }

        case "navigate": {
            // Quick whoosh/swipe for page transitions
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sawtooth";
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(500, now + 0.12);

            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.start(now);
            osc.stop(now + 0.15);
            break;
        }

        case "levelUp": {
            // Ascending arcade fanfare
            const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = "square";
                osc.frequency.setValueAtTime(freq, now + i * 0.1);

                gain.gain.setValueAtTime(0, now + i * 0.1);
                gain.gain.linearRampToValueAtTime(0.08, now + i * 0.1 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);

                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.15);
            });
            break;
        }

        case "coin": {
            // Classic coin pickup sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "square";
            osc.frequency.setValueAtTime(987.77, now); // B5
            osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

            osc.start(now);
            osc.stop(now + 0.2);
            break;
        }

        case "powerUp": {
            // Rising shimmer power-up
            const osc = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc2.type = "triangle";

            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
            osc2.frequency.setValueAtTime(402, now);
            osc2.frequency.exponentialRampToValueAtTime(1206, now + 0.3);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

            osc.start(now);
            osc2.start(now);
            osc.stop(now + 0.35);
            osc2.stop(now + 0.35);
            break;
        }

        case "menuOpen": {
            // Bouncy pop for menu opening
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.06);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

            osc.start(now);
            osc.stop(now + 0.12);
            break;
        }

        case "menuClose": {
            // Quick descending pop for menu closing
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            osc.start(now);
            osc.stop(now + 0.1);
            break;
        }
        }
    };

    if (ctx.state === "suspended") {
        void ctx.resume().then(playNow).catch(() => {
            // Ignore autoplay-policy errors until next user interaction.
        });
        return;
    }

    playNow();
};
