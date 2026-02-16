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

export function VoiceProvider({ children }: { children: React.ReactNode }) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceModeEnabled, setVoiceModeEnabled] = useState(true);
    const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
    const [hasUserInteraction, setHasUserInteraction] = useState(false);
    const [playedIntros, setPlayedIntros] = useState<Set<string>>(new Set());

    const synth = useRef<SpeechSynthesis | null>(null);
    const selectedVoice = useRef<SpeechSynthesisVoice | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize Speech Synthesis
    useEffect(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            synth.current = window.speechSynthesis;
            setHasVoiceSupport(true);

            const loadVoices = () => {
                const voices = synth.current?.getVoices() || [];
                if (voices.length === 0) {
                    selectedVoice.current = null;
                    return;
                }

                // Voice Selection Logic (same as before)
                let bestVoice = voices.find(v =>
                    v.name.includes("Natural") && v.name.includes("United States") && v.name.includes("Female")
                );

                if (!bestVoice) {
                    bestVoice = voices.find(v => v.name.includes("Google US English"));
                }

                if (!bestVoice) {
                    bestVoice = voices.find(v =>
                        (v.name.includes("Female") || v.name.includes("Zira")) && v.lang.startsWith("en")
                    );
                }

                if (!bestVoice) {
                    bestVoice = voices.find(v => v.lang?.toLowerCase().startsWith("en"));
                }

                if (!bestVoice) {
                    bestVoice = voices[0];
                }

                if (bestVoice) {
                    console.log("Global Voice Selected:", bestVoice.name);
                    selectedVoice.current = bestVoice;
                }
            };

            loadVoices();
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = loadVoices;
            }

            // Safari sometimes resolves voices after initial mount without firing reliably.
            let retries = 0;
            const voiceRetryTimer = window.setInterval(() => {
                if (selectedVoice.current || retries >= 12) {
                    window.clearInterval(voiceRetryTimer);
                    return;
                }
                loadVoices();
                retries += 1;
            }, 500);

            return () => {
                window.clearInterval(voiceRetryTimer);
                if (speechSynthesis.onvoiceschanged === loadVoices) {
                    speechSynthesis.onvoiceschanged = null;
                }
            };
        }
    }, []);

    useEffect(() => {
        return () => {
            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
                void audioContextRef.current.close();
            }
        };
    }, []);

    // Browser autoplay policies block TTS until user interaction.
    useEffect(() => {
        if (typeof window === "undefined") return;

        const markInteracted = () => setHasUserInteraction(true);
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
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const getAudioContext = useCallback(() => {
        if (typeof window === "undefined") return null;
        if (audioContextRef.current) return audioContextRef.current;

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

    const playEarcon = useCallback((cue: SpeechCue) => {
        if (!hasUserInteraction) return;

        const ctx = getAudioContext();
        if (!ctx) return;

        if (ctx.state === "suspended") {
            void ctx.resume();
        }

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
    }, [getAudioContext, hasUserInteraction]);

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

    const cancel = useCallback(() => {
        if (synth.current) {
            synth.current.cancel();
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        speechQueue.current = [];
        setIsSpeaking(false);
    }, []);

    const playNextChunk = useCallback(function playNextChunkInner() {
        if (!synth.current || speechQueue.current.length === 0) {
            setIsSpeaking(false);
            return;
        }

        const chunk = speechQueue.current.shift();
        if (!chunk) return;

        const utterance = new SpeechSynthesisUtterance(chunk.text);
        if (selectedVoice.current) {
            utterance.voice = selectedVoice.current;
        }
        utterance.pitch = chunk.pitch;
        utterance.rate = chunk.rate;
        utterance.volume = chunk.volume;

        utterance.onend = () => {
            if (speechQueue.current.length > 0) {
                // Determine pause duration based on punctuation
                timeoutRef.current = setTimeout(() => {
                    playNextChunkInner();
                }, chunk.pause);
            } else {
                setIsSpeaking(false);
            }
        };

        utterance.onerror = (e) => {
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
        if (!synth.current || !voiceModeEnabled || !hasUserInteraction) return;

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
            playNextChunk();
        }
    }, [voiceModeEnabled, hasUserInteraction, cancel, playNextChunk, createSpeechChunk, playEarcon]);

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
