"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

interface VoiceContextType {
    isSpeaking: boolean;
    voiceModeEnabled: boolean;
    setVoiceModeEnabled: (enabled: boolean) => void;
    speak: (text: string) => void;
    playIntro: (key: string, text: string) => void;
    cancel: () => void;
    hasVoiceSupport: boolean;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

type SpeechCue = "start" | "question" | "excited";

interface SpeechChunk {
    text: string;
    pause: number;
    pitch: number;
    rate: number;
    volume: number;
    cue: SpeechCue;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function isSpeechSynthesisSupported() {
    if (typeof window === "undefined") return false;
    return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function scoreVoiceForBrowserCoverage(voice: SpeechSynthesisVoice): number {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    let score = 0;

    if (lang.startsWith("en-us")) score += 70;
    else if (lang.startsWith("en-gb")) score += 55;
    else if (lang.startsWith("en")) score += 45;

    if (voice.localService) score += 20;
    if (voice.default) score += 10;

    if (/google us english|microsoft|natural/.test(name)) score += 30;

    // Safari voices commonly available on Apple platforms.
    if (/samantha|ava|allison|karen|moira|serena|daniel|alex/.test(name)) score += 24;

    // Firefox/system voices can vary; keep broad english fallbacks.
    if (/female|zira|aria|jenny|emma/.test(name)) score += 8;

    return score;
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null;
    const ranked = [...voices].sort(
        (a, b) => scoreVoiceForBrowserCoverage(b) - scoreVoiceForBrowserCoverage(a)
    );
    return ranked[0] || voices[0] || null;
}

export function VoiceProvider({ children }: { children: React.ReactNode }) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceModeEnabled, setVoiceModeEnabled] = useState(true);
    const [hasVoiceSupport] = useState(() => isSpeechSynthesisSupported());
    const [hasUserInteraction, setHasUserInteraction] = useState(false);
    const [playedIntros, setPlayedIntros] = useState<Set<string>>(new Set());

    const synth = useRef<SpeechSynthesis | null>(null);
    const selectedVoice = useRef<SpeechSynthesisVoice | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const queuePauseTimeoutRef = useRef<number | null>(null);
    const queueWatchdogTimeoutRef = useRef<number | null>(null);
    const startSpeakingTimeoutRef = useRef<number | null>(null);

    // Initialize Speech Synthesis
    useEffect(() => {
        if (!hasVoiceSupport || typeof window === "undefined") return;

        synth.current = window.speechSynthesis;
        const activeSynth = synth.current;
        if (!activeSynth) return;

        let isDisposed = false;
        let retries = 0;

        const loadVoices = () => {
            if (isDisposed) return;
            const voices = activeSynth.getVoices() || [];
            if (voices.length === 0) return;

            const bestVoice = pickBestVoice(voices);
            if (!bestVoice) return;

            selectedVoice.current = bestVoice;
        };

        const onVoicesChanged = () => {
            loadVoices();
        };

        loadVoices();

        // Different browsers fire voiceschanged differently (Safari/Firefox can be delayed).
        if (typeof activeSynth.addEventListener === "function") {
            activeSynth.addEventListener("voiceschanged", onVoicesChanged);
        }
        if (activeSynth.onvoiceschanged !== undefined) {
            activeSynth.onvoiceschanged = onVoicesChanged;
        }

        const voiceRetryTimer = window.setInterval(() => {
            if (selectedVoice.current || retries >= 30) {
                window.clearInterval(voiceRetryTimer);
                return;
            }
            retries += 1;
            loadVoices();
        }, 500);

        // Safari sometimes requires a lightweight warmup after user gesture for voice list hydration.
        const warmupSpeechEngine = () => {
            if (selectedVoice.current || !synth.current) return;
            try {
                const warmup = new SpeechSynthesisUtterance(" ");
                warmup.volume = 0;
                warmup.rate = 1;
                warmup.pitch = 1;
                synth.current.speak(warmup);
                synth.current.cancel();
                loadVoices();
            } catch {
                // Ignore warmup errors; normal voice flow still works when available.
            }
        };

        window.addEventListener("pointerdown", warmupSpeechEngine, { once: true, passive: true });
        window.addEventListener("touchstart", warmupSpeechEngine, { once: true, passive: true });
        window.addEventListener("keydown", warmupSpeechEngine, { once: true });

        return () => {
            isDisposed = true;
            window.clearInterval(voiceRetryTimer);
            window.removeEventListener("pointerdown", warmupSpeechEngine);
            window.removeEventListener("touchstart", warmupSpeechEngine);
            window.removeEventListener("keydown", warmupSpeechEngine);

            if (typeof activeSynth.removeEventListener === "function") {
                activeSynth.removeEventListener("voiceschanged", onVoicesChanged);
            }
            if (activeSynth.onvoiceschanged === onVoicesChanged) {
                activeSynth.onvoiceschanged = null;
            }
        };
    }, [hasVoiceSupport]);

    useEffect(() => {
        return () => {
            if (synth.current) {
                synth.current.cancel();
            }
            if (queuePauseTimeoutRef.current !== null) {
                window.clearTimeout(queuePauseTimeoutRef.current);
                queuePauseTimeoutRef.current = null;
            }
            if (queueWatchdogTimeoutRef.current !== null) {
                window.clearTimeout(queueWatchdogTimeoutRef.current);
                queueWatchdogTimeoutRef.current = null;
            }
            if (startSpeakingTimeoutRef.current !== null) {
                window.clearTimeout(startSpeakingTimeoutRef.current);
                startSpeakingTimeoutRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
                void audioContextRef.current.close();
            }
        };
    }, []);

    // Browser autoplay policies block TTS until user interaction.
    useEffect(() => {
        if (typeof window === "undefined") return;

        const markInteracted = () => {
            setHasUserInteraction(true);
            if (audioContextRef.current?.state === "suspended") {
                void audioContextRef.current.resume().catch(() => {
                    // Ignore blocked resume; next interaction can retry.
                });
            }
            if (synth.current) {
                // Refresh voice cache after gesture for Safari/Firefox edge cases.
                selectedVoice.current = pickBestVoice(synth.current.getVoices() || []);
            }
        };
        window.addEventListener("pointerdown", markInteracted, { once: true });
        window.addEventListener("keydown", markInteracted, { once: true });
        window.addEventListener("touchstart", markInteracted, { once: true });

        return () => {
            window.removeEventListener("pointerdown", markInteracted);
            window.removeEventListener("keydown", markInteracted);
            window.removeEventListener("touchstart", markInteracted);
        };
    }, []);

    const speechQueue = useRef<SpeechChunk[]>([]);
    const pendingSpeechRef = useRef<string | null>(null);

    const getAudioContext = useCallback(() => {
        if (typeof window === "undefined") return null;
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            return audioContextRef.current;
        }

        const w = window as Window & { webkitAudioContext?: typeof AudioContext };
        const AudioCtor = window.AudioContext || w.webkitAudioContext;
        if (!AudioCtor) return null;

        try {
            audioContextRef.current = new AudioCtor();
            return audioContextRef.current;
        } catch {
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
                // Ignore autoplay-policy resume errors.
            });
            return;
        }

        runIfReady();
    }, [getAudioContext]);

    const playEarcon = useCallback((cue: SpeechCue) => {
        if (!hasUserInteraction) return;

        withReadyAudioContext((ctx) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            const config = cue === "question"
                ? { start: 540, end: 700, duration: 0.1, loudness: 0.03 }
                : cue === "excited"
                    ? { start: 660, end: 880, duration: 0.11, loudness: 0.035 }
                    : { start: 440, end: 540, duration: 0.08, loudness: 0.02 };

            osc.type = "sine";
            osc.frequency.setValueAtTime(config.start, now);
            osc.frequency.exponentialRampToValueAtTime(config.end, now + config.duration);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(config.loudness, now + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + config.duration + 0.02);
        });
    }, [hasUserInteraction, withReadyAudioContext]);

    const createSpeechChunk = useCallback((chunkText: string): SpeechChunk | null => {
        const text = chunkText.trim();
        if (!text) return null;

        const wordCount = text.split(/\s+/).length;
        const excitementRegex = /\b(awesome|great|amazing|fantastic|nice job|yay|super)\b/i;

        let pause = 170;
        let pitch = 1.03;
        let rate = 0.97;
        const volume = 1;
        let cue: SpeechCue = "start";

        if (text.endsWith(".")) {
            pause = 260;
            pitch = 0.99;
        } else if (text.endsWith("?")) {
            pause = 230;
            pitch = 1.1;
            rate = 0.98;
            cue = "question";
        } else if (text.endsWith("!")) {
            pause = 190;
            pitch = 1.14;
            rate = 1.04;
            cue = "excited";
        } else if (/[,:;]/.test(text[text.length - 1] ?? "")) {
            pause = 150;
            pitch = 1.01;
        }

        if (wordCount <= 4) {
            rate += 0.02;
        } else if (wordCount >= 16) {
            rate -= 0.03;
            pause += 30;
        }

        if (excitementRegex.test(text)) {
            pitch += 0.06;
            rate += 0.03;
            cue = "excited";
        }

        const jitter = ((text.length % 5) - 2) * 0.008;

        return {
            text,
            pause,
            pitch: clamp(pitch + jitter, 0.85, 1.25),
            rate: clamp(rate + jitter, 0.82, 1.18),
            volume: clamp(volume, 0.7, 1),
            cue,
        };
    }, []);

    const clearSpeechTimers = useCallback(() => {
        if (queuePauseTimeoutRef.current !== null) {
            window.clearTimeout(queuePauseTimeoutRef.current);
            queuePauseTimeoutRef.current = null;
        }
        if (queueWatchdogTimeoutRef.current !== null) {
            window.clearTimeout(queueWatchdogTimeoutRef.current);
            queueWatchdogTimeoutRef.current = null;
        }
        if (startSpeakingTimeoutRef.current !== null) {
            window.clearTimeout(startSpeakingTimeoutRef.current);
            startSpeakingTimeoutRef.current = null;
        }
    }, []);

    const cancel = useCallback(() => {
        if (synth.current) {
            synth.current.cancel();
        }
        clearSpeechTimers();
        speechQueue.current = [];
        pendingSpeechRef.current = null;
        setIsSpeaking(false);
    }, [clearSpeechTimers]);

    const playNextChunk = useCallback(function playNextChunkInner() {
        if (!synth.current || speechQueue.current.length === 0) {
            setIsSpeaking(false);
            return;
        }

        const chunk = speechQueue.current.shift();
        if (!chunk) return;

        if (queuePauseTimeoutRef.current !== null) {
            window.clearTimeout(queuePauseTimeoutRef.current);
            queuePauseTimeoutRef.current = null;
        }
        if (queueWatchdogTimeoutRef.current !== null) {
            window.clearTimeout(queueWatchdogTimeoutRef.current);
            queueWatchdogTimeoutRef.current = null;
        }

        const utterance = new SpeechSynthesisUtterance(chunk.text);
        if (selectedVoice.current) {
            utterance.voice = selectedVoice.current;
            utterance.lang = selectedVoice.current.lang;
        } else {
            utterance.lang = "en-US";
        }
        utterance.pitch = chunk.pitch;
        utterance.rate = chunk.rate;
        utterance.volume = chunk.volume;

        const estimatedDurationMs = Math.max(
            1400,
            Math.round((chunk.text.length * 85) / Math.max(0.7, utterance.rate))
        );

        queueWatchdogTimeoutRef.current = window.setTimeout(() => {
            // Safari/Firefox can occasionally miss onend; watchdog keeps queue moving.
            if (queueWatchdogTimeoutRef.current !== null) {
                window.clearTimeout(queueWatchdogTimeoutRef.current);
                queueWatchdogTimeoutRef.current = null;
            }

            if (speechQueue.current.length > 0) {
                if (synth.current?.speaking) {
                    synth.current.cancel();
                }
                playNextChunkInner();
                return;
            }

            setIsSpeaking(false);
        }, estimatedDurationMs + 1200);

        utterance.onend = () => {
            if (queueWatchdogTimeoutRef.current !== null) {
                window.clearTimeout(queueWatchdogTimeoutRef.current);
                queueWatchdogTimeoutRef.current = null;
            }
            if (speechQueue.current.length > 0) {
                // Determine pause duration based on punctuation
                queuePauseTimeoutRef.current = window.setTimeout(() => {
                    playNextChunkInner();
                }, chunk.pause);
            } else {
                setIsSpeaking(false);
            }
        };

        utterance.onerror = (e) => {
            if (queueWatchdogTimeoutRef.current !== null) {
                window.clearTimeout(queueWatchdogTimeoutRef.current);
                queueWatchdogTimeoutRef.current = null;
            }
            if (queuePauseTimeoutRef.current !== null) {
                window.clearTimeout(queuePauseTimeoutRef.current);
                queuePauseTimeoutRef.current = null;
            }
            // Ignore expected interruptions
            if (e.error === 'canceled' || e.error === 'interrupted') {
                setIsSpeaking(false);
                return;
            }
            if (e.error === 'not-allowed') {
                console.warn("Speech playback blocked (autoplay policy). User interaction usage required.");
                setIsSpeaking(false);
                return;
            }
            console.error("Speech error:", e.error);
            setIsSpeaking(false);
        };

        // Ensure we are in speaking state
        setIsSpeaking(true);
        synth.current.speak(utterance);
    }, []);

    const speak = useCallback((text: string) => {
        if (!synth.current || !voiceModeEnabled) return;
        if (!hasUserInteraction) {
            pendingSpeechRef.current = text;
            return;
        }

        // Cancel any existing speech
        cancel();

        const normalizedText = text
            .replace(/\p{Extended_Pictographic}/gu, " ")
            .replace(/[\u200D\uFE0F]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        if (!normalizedText) return;

        const chunks = normalizedText.match(/[^.?!,;]+[.?!,;]+|[^.?!,;]+$/g) || [normalizedText];

        const newQueue = chunks
            .map((chunk) => createSpeechChunk(chunk))
            .filter(Boolean) as SpeechChunk[];

        if (newQueue.length > 0) {
            speechQueue.current = newQueue;
            playEarcon(newQueue[0].cue);
            startSpeakingTimeoutRef.current = window.setTimeout(() => {
                startSpeakingTimeoutRef.current = null;
                playNextChunk();
            }, 35);
        }
    }, [voiceModeEnabled, hasUserInteraction, cancel, playNextChunk, createSpeechChunk, playEarcon]);

    useEffect(() => {
        if (!voiceModeEnabled || !hasUserInteraction) return;
        const pending = pendingSpeechRef.current;
        if (!pending) return;
        pendingSpeechRef.current = null;
        speak(pending);
    }, [voiceModeEnabled, hasUserInteraction, speak]);

    const playIntro = useCallback((key: string, text: string) => {
        // Prevent re-playing if already played in this session
        if (playedIntros.has(key)) return;

        // Add to played set immediately
        setPlayedIntros(prev => {
            const newSet = new Set(prev);
            newSet.add(key);
            return newSet;
        });

        speak(text);
    }, [playedIntros, speak]);

    return (
        <VoiceContext.Provider value={{
            isSpeaking,
            voiceModeEnabled,
            setVoiceModeEnabled,
            speak,
            playIntro,
            cancel,
            hasVoiceSupport
        }}>
            {children}
        </VoiceContext.Provider>
    );
}

export function useVoice() {
    const context = useContext(VoiceContext);
    if (!context) {
        throw new Error("useVoice must be used within a VoiceProvider");
    }
    return context;
}
