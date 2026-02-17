"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Cross-browser Speech Recognition hook.
 *
 * - Chrome / Edge  → webkitSpeechRecognition  (best support)
 * - Firefox 104+   → SpeechRecognition
 * - Safari          → NOT supported → isSupported = false
 */

/* ---------- browser typing shim ---------- */
interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
    error: string;
    message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
    if (typeof window === "undefined") return null;
    const w = window as unknown as Record<string, unknown>;
    return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionConstructor | null;
}

export interface UseSpeechRecognitionReturn {
    /** false on Safari & unsupported browsers */
    isSupported: boolean;
    /** currently recording */
    isListening: boolean;
    /** latest transcription (final + interim) */
    transcript: string;
    /** start recording */
    startListening: () => void;
    /** stop recording and finalise transcript */
    stopListening: () => void;
    /** last error message, if any */
    error: string | null;
    /** clear the current transcript */
    clearTranscript: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
    const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const intentionalStopRef = useRef(false);

    // We track the accumulated final transcript in a ref so the onresult
    // handler always has the latest value without depending on React state.
    const finalTextRef = useRef("");

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { /* ignore */ }
                recognitionRef.current = null;
            }
        };
    }, []);

    const startListening = useCallback(() => {
        const Ctor = getSpeechRecognitionCtor();
        if (!Ctor) {
            setError("Speech recognition is not supported in this browser.");
            return;
        }

        // Abort any existing instance
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* ignore */ }
        }

        setError(null);
        setTranscript("");
        finalTextRef.current = "";
        intentionalStopRef.current = false;

        const recognition = new Ctor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
        };

        /**
         * KEY FIX: Rebuild the transcript from ALL results on every event.
         *
         * The SpeechRecognition API provides a `results` list that GROWS over time.
         * Each result can be `isFinal` (locked in) or interim (still being refined).
         * We must NOT append to previous state — we must rebuild from the full
         * results list each time, otherwise interim results get baked in and cause
         * duplication when they later become final.
         */
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalText = "";
            let interimText = "";

            // Iterate over ALL results (not just from resultIndex) to rebuild fully
            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0].transcript;
                if (result.isFinal) {
                    finalText += text;
                } else {
                    interimText += text;
                }
            }

            // Store the final portion in the ref (so stopListening can read it)
            finalTextRef.current = finalText;

            // Display = all finals + current interim (no duplication possible)
            const display = (finalText + interimText).trim();
            setTranscript(display);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            // "aborted" and "no-speech" are normal operational states
            if (event.error === "aborted" || event.error === "no-speech") return;
            setError(`Speech recognition error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
            // Auto-restart if not intentionally stopped (handles network blips)
            if (!intentionalStopRef.current && recognitionRef.current === recognition) {
                try {
                    recognition.start();
                } catch {
                    // Cannot restart — stay stopped
                }
            }
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch {
            setError("Failed to start speech recognition. Please check microphone permissions.");
        }
    }, []);

    const stopListening = useCallback(() => {
        intentionalStopRef.current = true;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }
        setIsListening(false);
    }, []);

    const clearTranscript = useCallback(() => {
        setTranscript("");
        finalTextRef.current = "";
    }, []);

    return {
        isSupported,
        isListening,
        transcript,
        startListening,
        stopListening,
        error,
        clearTranscript,
    };
}
