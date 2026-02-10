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

                if (bestVoice) {
                    console.log("Global Voice Selected:", bestVoice.name);
                    selectedVoice.current = bestVoice;
                }
            };

            loadVoices();
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
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

    const playNextChunk = useCallback(() => {
        if (!synth.current || speechQueue.current.length === 0) {
            setIsSpeaking(false);
            return;
        }

        const chunk = speechQueue.current.shift();
        if (!chunk) return;

        const utterance = new SpeechSynthesisUtterance(chunk.text);
        utterance.voice = selectedVoice.current;
        utterance.pitch = chunk.pitch;
        utterance.rate = chunk.rate;
        utterance.volume = 1;

        utterance.onend = () => {
            if (speechQueue.current.length > 0) {
                // Determine pause duration based on punctuation
                timeoutRef.current = setTimeout(() => {
                    playNextChunk();
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
        if (!synth.current || !voiceModeEnabled || !selectedVoice.current) return;

        // Cancel any existing speech
        cancel();

        // Intelligent splitting regex
        // Matches sentences ending with punctuation, keeping the punctuation
        // Also splits on commas and semicolons for shorter pauses
        const chunks = text.match(/[^.?!,;]+[.?!,;]+|[^.?!,;]+$/g) || [text];

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
    }, [voiceModeEnabled, cancel, playNextChunk]);

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
