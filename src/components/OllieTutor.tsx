"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Send, X, Mic, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTutorContext } from "@/context/TutorContext";
import { useVoice } from "@/context/VoiceContext";
import OllieVoiceMode from "./ollie/OllieVoiceMode";

type TutorMessage = {
    role: "user" | "assistant";
    content: string;
};

type TutorMode = "voice" | "text";

export default function OllieTutor() {
    const { user, loading, learningProfile } = useAuth();
    const { lessonContext, isQuizRelated } = useTutorContext();
    const pathname = usePathname();
    const router = useRouter();
    const userName = user?.displayName?.split(" ")[0] || "Friend";

    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<TutorMode>("voice"); // Default to voice mode
    const [messages, setMessages] = useState<TutorMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!chatBodyRef.current) return;
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }, [messages, isLoading, isOpen]);

    const { playIntro, isSpeaking, speakOllie } = useVoice();
    const hasGreetedRef = useRef(false);
    const isAutoGreetingRef = useRef(false);

    // Clear greeting flag on logout so it resets for next login
    useEffect(() => {
        if (!user && !loading) {
            sessionStorage.removeItem("ollie_greeted");
            hasGreetedRef.current = false;
        }
    }, [user, loading]);

    useEffect(() => {
        // Auto-greeting logic: 5s after mount/login
        // WAITS for auth loading to finish so we don't greet during spinner/verify
        // also explicit check to NOT greet on onboarding page or login page
        if (loading || !user || hasGreetedRef.current) return;
        if (pathname === "/onboarding" || pathname === "/login" || pathname === "/") return;

        // Check session storage to prevent double greeting in same session (unless logged out)
        const hasSeenGreeting = sessionStorage.getItem("ollie_greeted");
        if (hasSeenGreeting) {
            hasGreetedRef.current = true;
            return;
        }

        const timer = setTimeout(() => {
            if (hasGreetedRef.current) return;

            setIsOpen(true);
            isAutoGreetingRef.current = true;
            hasGreetedRef.current = true;
            sessionStorage.setItem("ollie_greeted", "true");

            // Visual Message (Correct Spelling)
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: `Hi ${userName}! I'm Ollie, your personal AI tutor built by Hakkan. I'm here to help you whenever you get stuck or have questions. Just tap the mic and ASK away!`
                }
            ]);

            // Audio Message (Phonetic Pronunciation for "Haakkaan")
            playIntro(
                "ollie-welcome",
                `Hi ${userName}! I'm Ollie, your personal AI tutor built by Haakkaan. I'm here to help you whenever you get stuck or have questions. Just tap the mic and ASK away!`
            );
        }, 5000);

        return () => clearTimeout(timer);
    }, [user, loading, playIntro, pathname, userName]);

    // Auto-close logic: Close panel when Ollie finishes the auto-greeting
    useEffect(() => {
        if (isOpen && isAutoGreetingRef.current && !isSpeaking) {
            // Wait a moment after speaking finishes so it doesn't slam shut instantly
            const closeTimer = setTimeout(() => {
                setIsOpen(false);
                isAutoGreetingRef.current = false; // Reset so manual opens don't auto-close
            }, 2000); // 2s delay after speech ends
            return () => clearTimeout(closeTimer);
        }
    }, [isOpen, isSpeaking]);

    const handleAskTutor = async () => {
        const question = input.trim();
        if (!question || isLoading) return;

        setMessages((prev) => [...prev, { role: "user", content: question }]);
        setInput("");
        setIsLoading(true);

        try {
            // Get last 6 messages for context (excluding the new one we just added to state, 
            // but we can pass it separately or include it. 
            // The API usually takes history + new question.
            const history = messages.slice(-6);

            const response = await fetch("/api/tutor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lessonContext,
                    question,
                    isQuizRelated,
                    history,
                    userName,
                    learningProfile
                }),
            });

            const data = await response.json();

            if (data.response) {
                console.log("OLLIE RESPONSE:", data.response);

                // Normalize: Remove bold/italic markers (*, #) but KEEP underscores for the keyword!
                const cleanResponse = data.response.replace(/[\*#]/g, "");

                // ROBUST DETECTION: keyword check + split
                // Allow spaces or underscores between words
                const redirectRegex = /REDIRECT[_\s]+TO[_\s]+GENERATE/i;
                if (cleanResponse.match(redirectRegex)) {
                    console.log("REDIRECT KEYWORD FOUND");

                    const parts = cleanResponse.split(redirectRegex);
                    // parts[0] = text before (usually empty)
                    // parts[1] = text after (Topic...)

                    let topic = "";
                    let confirmationMsg = "";

                    if (parts.length > 1) {
                        const afterKeyword = parts[1];
                        // Clean leading punctuation like ": ", " - ", " "
                        const cleanAfter = afterKeyword.replace(/^[:\s\-\.]+/g, "");
                        const lines = cleanAfter.split("\n");

                        topic = lines[0].trim(); // First line is topic
                        // Remaining lines are message. If none, use default.
                        confirmationMsg = lines.slice(1).join("\n").trim();
                    }

                    if (!confirmationMsg) {
                        confirmationMsg = `Okay, let's create a course about ${topic || "that"}!`;
                    }

                    // Fallback instruction
                    confirmationMsg += "\n\n(If you aren't redirected automatically, please click 'Create' on the sidebar.)";

                    console.log("PARSED TOPIC:", topic);

                    // Show confirmation message ONLY
                    const assistantMsg: TutorMessage = { role: "assistant", content: confirmationMsg };
                    setMessages((prev) => [...prev, assistantMsg]);

                    if (mode === "voice") {
                        speakOllie(confirmationMsg);
                    }

                    setTimeout(() => {
                        setIsOpen(false);
                        // Fallback if topic is empty? Default to something or just open generator
                        router.push(`/generate?topic=${encodeURIComponent(topic || "General Knowledge")}`);
                    }, 2000);

                } else {
                    // Normal response
                    const assistantMsg: TutorMessage = { role: "assistant", content: data.response };
                    setMessages((prev) => [...prev, assistantMsg]);

                    if (mode === "voice") {
                        speakOllie(data.response);
                    }
                }
            }
        } catch (error) {
            console.error("Error asking tutor:", error);
            const errorMsg = "Sorry, I'm having trouble connecting to my brain right now.";
            setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
            if (mode === "voice") speakOllie(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void handleAskTutor();
    };

    const isHiddenRoute = pathname === "/" || pathname === "/login";

    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 }); // Offset from bottom-right default
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only allow dragging from specific handles or main body, not interactive elements
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
            return;
        }

        isDraggingRef.current = false;
        const initialX = e.clientX;
        const initialY = e.clientY;
        dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const moveX = moveEvent.clientX;
            const moveY = moveEvent.clientY;

            // Calculate distance moved
            const dist = Math.sqrt(Math.pow(moveX - initialX, 2) + Math.pow(moveY - initialY, 2));

            // Only consider it a drag if moved more than 5 pixels
            if (dist > 5) {
                isDraggingRef.current = true;
                let newX = moveX - dragStartRef.current.x;
                let newY = moveY - dragStartRef.current.y;

                // Boundary Constraints
                if (containerRef.current) {
                    const { offsetWidth, offsetHeight } = containerRef.current;
                    const { innerWidth, innerHeight } = window;

                    // Clamp X (Left/Right limits)
                    // Right limit: right: 0 -> 24 - x = 0 -> x = 24
                    // Left limit: right: windowWidth - width -> 24 - x = windowWidth - width -> x = 24 - windowWidth + width
                    const maxX = 24;
                    const minX = 24 - innerWidth + offsetWidth;
                    newX = Math.max(minX, Math.min(newX, maxX));

                    // Clamp Y (Top/Bottom limits)
                    // Bottom limit: bottom: 0 -> 24 - y = 0 -> y = 24
                    // Top limit: bottom: windowHeight - height -> 24 - y = windowHeight - height -> y = 24 - windowHeight + height
                    const maxY = 24;
                    const minY = 24 - innerHeight + offsetHeight;
                    newY = Math.max(minY, Math.min(newY, maxY));
                }

                setPosition({ x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            // We don't reset isDraggingRef here; it's needed for the click handler to know not to toggle
            // It will be reset on next mouse down

            // However, if we didn't drag, we need to ensure the click handler fires
            // The click handler checks !isDraggingRef.current, which is correct.
            // But we need a way to clear the flag after the click implies.
            // Actually, the click handler fires after mouseup.
            // So we can set a timeout to clear it, OR relies on the fact that handleMouseDown clears it at start.

            // Better approach: specific click handler logic or let standard click flow work.
            // The current logic: toggleOpen checks !isDraggingRef.current.
            // If we moved > 5px, isDraggingRef is true -> click ignored.
            // If we moved < 5px, isDraggingRef is false -> click processed.
            // This is correct.

            setTimeout(() => {
                isDraggingRef.current = false;
            }, 100);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const toggleOpen = () => {
        if (!isDraggingRef.current) {
            setIsOpen(!isOpen);
        }
    };

    // Reset position when closed so it "snaps back" to default corner
    useEffect(() => {
        if (!isOpen) {
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen]);

    if (!user || isHiddenRoute) {
        return null;
    }

    return (
        // Draggable Container
        <div
            ref={containerRef}
            className="fixed z-[60]"
            style={{
                right: `${24 - position.x}px`,
                bottom: `${24 - position.y}px`,
                cursor: isOpen ? 'default' : 'move'
            }}
        >
            {!isOpen && (
                <button
                    onMouseDown={handleMouseDown}
                    onClick={toggleOpen}
                    className="ollie-fab h-16 w-16 rounded-full border-[3px] border-comic-ink bg-comic-yellow text-comic-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform active:scale-95 hover:scale-105"
                    aria-label="Open Ollie tutor"
                    style={{ touchAction: 'none' }}
                >
                    <span className="text-4xl pointer-events-none">🦉</span>
                </button>
            )}

            {isOpen && (
                <section
                    className="ollie-panel flex w-80 flex-col overflow-hidden rounded-2xl border-[3px] border-comic-ink bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:w-96"
                >
                    {/* Header - Draggable Handle */}
                    <div
                        onMouseDown={handleMouseDown}
                        className="flex items-center justify-between border-b-[3px] border-comic-ink bg-comic-yellow p-3 cursor-move select-none"
                    >
                        <div className="flex items-center gap-3 pointer-events-none">
                            <span className="text-2xl">🦉</span>
                            <div className="leading-tight">
                                <h3 className="font-black text-comic-ink">Ollie</h3>
                                <p className="text-xs font-bold text-black/70">
                                    {isQuizRelated ? "Quiz Coach" : "AI Tutor"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Mode toggle with label */}
                            <button
                                onClick={() => setMode(mode === "voice" ? "text" : "voice")}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-comic-ink transition-colors hover:bg-black/10"
                                aria-label={mode === "voice" ? "Switch to text mode" : "Switch to voice mode"}
                            >
                                {mode === "voice" ? (
                                    <>
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        <span className="text-[10px] font-black">Text</span>
                                    </>
                                ) : (
                                    <>
                                        <Mic className="h-3.5 w-3.5" />
                                        <span className="text-[10px] font-black">Voice</span>
                                    </>
                                )}
                            </button>

                            {/* Close */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-md p-1.5 text-comic-ink transition-colors hover:bg-black/10"
                                aria-label="Close Ollie tutor"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Voice mode */}
                    {mode === "voice" && (
                        <div className="ollie-voice-body relative" style={{ height: "26rem" }}>
                            <OllieVoiceMode onSwitchToText={() => setMode("text")} />
                        </div>
                    )}

                    {/* Text mode (original chat) */}
                    {mode === "text" && (
                        <>
                            <div ref={chatBodyRef} className="h-72 space-y-4 overflow-y-auto bg-white p-4">
                                {messages.length === 0 && (
                                    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                                        <p className="font-bold text-gray-600">Ask Ollie anything.</p>
                                        <p className="mt-1 text-xs font-semibold text-gray-500">
                                            {lessonContext ? "Lesson-aware mode is active." : "General tutor mode is active."}
                                        </p>
                                    </div>
                                )}

                                {messages.map((message, index) => (
                                    <div
                                        key={`${message.role}-${index}`}
                                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-xl border-2 p-3 text-sm font-bold ${message.role === "user"
                                                ? "rounded-tr-none border-comic-blue bg-comic-blue text-white"
                                                : "rounded-tl-none border-gray-200 bg-gray-100 text-comic-ink"
                                                }`}
                                        >
                                            {message.content}
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="rounded-xl rounded-tl-none border-2 border-gray-200 bg-gray-100 p-3">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="flex gap-2 border-t-[3px] border-comic-ink bg-gray-50 p-3">
                                <input
                                    className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm font-bold focus:border-comic-blue focus:outline-none"
                                    placeholder="Type a question..."
                                    value={input}
                                    onChange={(event) => setInput(event.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="rounded-lg border-2 border-comic-blue bg-comic-blue p-2 text-white transition-colors hover:bg-comic-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
                                    aria-label="Send question"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </form>
                        </>
                    )}
                </section>
            )}
        </div>
    );
}
