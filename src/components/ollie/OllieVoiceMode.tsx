"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Mic, MicOff, MessageSquare, Volume2 } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVoice } from "@/context/VoiceContext";
import { useTutorContext } from "@/context/TutorContext";
import OllieAvatar from "./OllieAvatar3D";
import type { OllieExpression } from "./OllieAvatar3D";

const SILENCE_TIMEOUT_MS = 5000; // auto-stop after 5s of silence

interface OllieVoiceModeProps {
    onSwitchToText: () => void;
}

export default function OllieVoiceMode({ onSwitchToText }: OllieVoiceModeProps) {
    const { isSupported, isListening, transcript, startListening, stopListening, error, clearTranscript } =
        useSpeechRecognition();
    const { speakOllie: speak, isSpeaking, cancel, setOllieVoiceEnabled: setVoiceModeEnabled } = useVoice();
    const { lessonContext, isQuizRelated } = useTutorContext();

    const [isThinking, setIsThinking] = useState(false);
    const [lastResponse, setLastResponse] = useState("");
    const [statusText, setStatusText] = useState("Tap the mic and ask Ollie anything!");
    const [showTextHint, setShowTextHint] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const transcriptRef = useRef(transcript);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTranscriptRef = useRef("");
    const responseRef = useRef<HTMLDivElement>(null);

    // Keep ref in sync with state
    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    // Periodically flash "Switch to text mode" hint on the mode toggle
    useEffect(() => {
        const interval = setInterval(() => {
            setShowTextHint(true);
            setTimeout(() => setShowTextHint(false), 3000);
        }, 15000); // Flash every 15 seconds
        // Show once early too
        const earlyTimeout = setTimeout(() => setShowTextHint(true), 5000);
        const earlyHide = setTimeout(() => setShowTextHint(false), 8000);
        return () => {
            clearInterval(interval);
            clearTimeout(earlyTimeout);
            clearTimeout(earlyHide);
        };
    }, []);

    // ---------- Auto-pause after 7 seconds of silence ----------
    useEffect(() => {
        if (!isListening) {
            // Clear any existing silence timer when not listening
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            return;
        }

        // If transcript changed, reset the silence timer
        if (transcript !== lastTranscriptRef.current) {
            lastTranscriptRef.current = transcript;

            // Clear existing timer
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }

            // Only start silence timer if we have some transcript (user has spoken)
            if (transcript.trim().length > 0) {
                silenceTimerRef.current = setTimeout(() => {
                    // Auto-stop and send
                    stopListening();
                    const question = transcriptRef.current.trim();
                    if (question) {
                        void sendQuestion(question);
                    }
                }, SILENCE_TIMEOUT_MS);
            }
        }

        return () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening, transcript]);

    // Derive the expression for the avatar
    const expression: OllieExpression = isSpeaking
        ? "speaking"
        : isThinking
            ? "thinking"
            : isListening
                ? "listening"
                : "idle";

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, []);

    // Auto-scroll response into view when it changes
    useEffect(() => {
        if (lastResponse && responseRef.current) {
            responseRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [lastResponse]);

    const sendQuestion = useCallback(async (question: string) => {
        if (!question) {
            setStatusText("I didn't catch that. Try again!");
            return;
        }

        setStatusText("Thinking...");
        setIsThinking(true);
        clearTranscript();

        // Abort any previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await fetch("/api/tutor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lessonContext, question, isQuizRelated }),
                signal: controller.signal,
            });

            const data = await response.json();
            const reply =
                typeof data?.response === "string" && data.response.trim()
                    ? data.response
                    : "I could not generate a response. Please try again.";

            setLastResponse(reply);
            setStatusText("Speaking...");
            speak(reply);
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setLastResponse("I ran into an issue. Please try again.");
            setStatusText("Something went wrong.");
        } finally {
            setIsThinking(false);
        }
    }, [lessonContext, isQuizRelated, speak, clearTranscript]);

    const handleToggleMic = useCallback(() => {
        if (isListening) {
            // Clear silence timer
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            stopListening();
            setTimeout(() => {
                const question = transcriptRef.current.trim();
                void sendQuestion(question);
            }, 400);
        } else {
            cancel();
            setLastResponse("");
            clearTranscript();
            lastTranscriptRef.current = "";
            startListening();
            setStatusText("Listening... Speak now!");
        }
    }, [isListening, stopListening, startListening, cancel, clearTranscript, sendQuestion]);

    // Update status when speaking ends
    useEffect(() => {
        if (!isSpeaking && lastResponse && !isThinking && !isListening) {
            setStatusText("Tap the mic to ask another question!");
        }
    }, [isSpeaking, lastResponse, isThinking, isListening]);

    /* ---------- Safari: no STT support ---------- */
    if (!isSupported) {
        return (
            <div className="flex flex-col items-center gap-4 p-5">
                <OllieAvatar expression="idle" />

                <div className="w-full rounded-xl border-2 border-comic-blue bg-blue-50 p-4 text-center">
                    <div className="mb-2 text-2xl">🔊</div>
                    <p className="font-black text-comic-ink text-sm">
                        Voice Mode requires <span className="text-comic-blue">Chrome</span>,{" "}
                        <span className="text-comic-blue">Edge</span>, or{" "}
                        <span className="text-comic-blue">Firefox</span>.
                    </p>
                    <p className="mt-1 text-xs font-bold text-gray-500">
                        Safari does not support speech recognition.
                    </p>
                    <button
                        onClick={onSwitchToText}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border-2 border-comic-ink bg-comic-yellow px-4 py-2 font-black text-sm transition-all hover:bg-comic-yellow-dark"
                    >
                        <MessageSquare className="h-4 w-4" />
                        Switch to Text Mode
                    </button>
                </div>
            </div>
        );
    }

    /* ---------- Normal voice mode ----------
     * Layout:
     *   [STICKY]  Avatar + Mic + Status (always visible)
     *   [SCROLL]  Transcript + Response (scrolls independently)
     */
    return (
        <div className="ollie-voice-layout flex flex-col" style={{ height: "100%" }}>
            {/* ---- STICKY TOP: Avatar + Mic + Status ---- */}
            <div className="ollie-sticky-top flex flex-col items-center gap-2 border-b border-gray-100 bg-white px-4 py-4 shadow-sm">
                {/* Animated Emoji Avatar */}
                <OllieAvatar expression={expression} />

                <div className="flex flex-col items-center gap-1">
                    {/* Status */}
                    <p className="ollie-status-text text-center text-sm font-black text-gray-700">{statusText}</p>

                    {/* Mic button */}
                    <button
                        onClick={handleToggleMic}
                        disabled={isThinking}
                        className={`ollie-mic-btn mt-1 ${isListening ? "ollie-mic-btn--listening" : ""}`}
                        aria-label={isListening ? "Stop recording" : "Start recording"}
                    >
                        {isListening ? (
                            <MicOff className="h-6 w-6" />
                        ) : (
                            <Mic className="h-6 w-6" />
                        )}
                    </button>

                    <p className="text-[10px] font-bold text-gray-400">
                        {isListening ? "Tap to stop · auto-sends in 5s" : "Tap to talk"}
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <p className="text-center text-[10px] font-bold text-red-500">{error}</p>
                )}
            </div>

            {/* ---- SCROLLABLE BOTTOM: Transcript + Response ---- */}
            <div className="ollie-scroll-area flex-1 overflow-y-auto bg-gray-50/30 px-4 py-4">
                {/* Live transcript */}
                {(isListening || transcript) && (
                    <div className="ollie-transcript mb-4 w-full rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">You said</p>
                        <p className="mt-1 text-sm font-bold text-comic-ink">
                            {transcript || <span className="text-gray-300">Listening...</span>}
                        </p>
                        {isListening && transcript && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="ollie-silence-bar h-1 flex-1 rounded-full bg-gray-100 overflow-hidden">
                                    <div key={transcript} className="ollie-silence-progress h-full rounded-full bg-comic-blue/60" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Last response */}
                {lastResponse && !isListening && (
                    <div ref={responseRef} className="ollie-response-bubble w-full rounded-xl border-2 border-gray-100 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center gap-1.5">
                            <Volume2 className="h-3.5 w-3.5 text-comic-blue" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-comic-blue">Ollie</span>
                            {isSpeaking && <span className="ollie-speaking-dot ml-auto h-2 w-2 rounded-full bg-comic-green" />}
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-gray-800">{lastResponse}</p>
                    </div>
                )}

                {/* Empty state & bottom actions */}
                {!lastResponse && !isListening && !isThinking && (
                    <div className="flex flex-col items-center gap-4 py-8 text-center opacity-80 hover:opacity-100 transition-opacity">
                        <button
                            onClick={onSwitchToText}
                            className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-sm transition-all hover:border-comic-blue hover:text-comic-blue hover:shadow-md"
                        >
                            <MessageSquare className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                            Switch to text mode
                        </button>
                    </div>
                )}
            </div>

            {/* ---- Floating text mode hint (only if not empty state) ---- */}
            {showTextHint && (lastResponse || isListening || isThinking) && (
                <div className="ollie-text-hint absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-max">
                    <button
                        onClick={onSwitchToText}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-4 py-2 text-xs font-bold text-gray-500 shadow-lg backdrop-blur transition-all hover:border-comic-blue hover:text-comic-blue hover:scale-105"
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Switch to text mode
                    </button>
                </div>
            )}
        </div>
    );
}
