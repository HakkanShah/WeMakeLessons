"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseTextToSpeechReturn {
    speak: (text: string) => void;
    cancel: () => void;
    isSpeaking: boolean;
    hasVoiceSupport: boolean;
    voiceModeEnabled: boolean;
    setVoiceModeEnabled: (enabled: boolean) => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceModeEnabled, setVoiceModeEnabled] = useState(true);
    const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const synth = useRef<SpeechSynthesis | null>(null);

    // Initialize Synthesis and Voice Selection
    useEffect(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            synth.current = window.speechSynthesis;
            setHasVoiceSupport(true);

            const loadVoices = () => {
                const voices = synth.current?.getVoices() || [];

                // Priority:
                // 1. Microsoft "Natural" voices (very high quality on Edge/Windows)
                // 2. Google US English (Standard high quality)
                // 3. Any "Female" voice
                // 4. Default

                // Look for a sweet/natural female voice
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
                    console.log("Selected Voice:", bestVoice.name);
                    setSelectedVoice(bestVoice);
                }
            };

            loadVoices();
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }, []);

    const speak = useCallback((text: string) => {
        if (!synth.current || !hasVoiceSupport || !selectedVoice) return;

        // Cancel running speech to avoid queue buildup
        synth.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = selectedVoice;

        // Tuning for "sweet and human-like"
        // Slightly higher pitch can sound friendlier/sweeter
        // Slightly slower rate helps with "expression" clarity
        utterance.pitch = 1.1;
        utterance.rate = 0.95;
        utterance.volume = 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synth.current.speak(utterance);
    }, [hasVoiceSupport, selectedVoice]);

    const cancel = useCallback(() => {
        if (synth.current) {
            synth.current.cancel();
            setIsSpeaking(false);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (synth.current) {
                synth.current.cancel();
            }
        };
    }, []);

    return {
        speak,
        cancel,
        isSpeaking,
        hasVoiceSupport,
        voiceModeEnabled,
        setVoiceModeEnabled
    };
}
