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

export function VoiceProvider({ children }: { children: React.ReactNode }) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceModeEnabled, setVoiceModeEnabled] = useState(true);
    const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
    const [hasUserInteraction, setHasUserInteraction] = useState(false);
    const [playedIntros, setPlayedIntros] = useState<Set<string>>(new Set());

    const synth = useRef<SpeechSynthesis | null>(null);
    const selectedVoice = useRef<SpeechSynthesisVoice | null>(null);

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

    const speechQueue = useRef<{ text: string; pause: number; pitch: number; rate: number }[]>([]);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        utterance.volume = 1;

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

        // Intelligent splitting regex
        // Matches sentences ending with punctuation, keeping the punctuation
        // Also splits on commas and semicolons for shorter pauses
        const chunks = normalizedText.match(/[^.?!,;]+[.?!,;]+|[^.?!,;]+$/g) || [normalizedText];

        const newQueue = chunks.map(chunk => {
            const trimmed = chunk.trim();
            if (!trimmed) return null;

            let pause = 100; // Default small pause between un-punctuated chunks
            let pitch = 1.0;
            let rate = 1.0;

            // Analyze punctuation for "human-like" delivery rules
            if (trimmed.endsWith('.')) {
                pause = 0;
                pitch = 0.95;
            } else if (trimmed.endsWith('?')) {
                pause = 0;
                pitch = 1.1;
            } else if (trimmed.endsWith('!')) {
                pause = 0;
                rate = 1.1;
                pitch = 1.1;
            } else if (trimmed.endsWith(',') || trimmed.endsWith(';')) {
                pause = 0;
            } else {
                pause = 0;
            }

            return { text: trimmed, pause, pitch, rate };
        }).filter(Boolean) as { text: string; pause: number; pitch: number; rate: number }[];

        if (newQueue.length > 0) {
            speechQueue.current = newQueue;
            playNextChunk();
        }
    }, [voiceModeEnabled, hasUserInteraction, cancel, playNextChunk]);

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
