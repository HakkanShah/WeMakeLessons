"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Send, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTutorContext } from "@/context/TutorContext";

type TutorMessage = {
    role: "user" | "assistant";
    content: string;
};

export default function OllieTutor() {
    const { user } = useAuth();
    const { lessonContext, isQuizRelated } = useTutorContext();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<TutorMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!chatBodyRef.current) return;
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }, [messages, isLoading, isOpen]);

    const handleAskTutor = async () => {
        const question = input.trim();
        if (!question || isLoading) return;

        setMessages((prev) => [...prev, { role: "user", content: question }]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/tutor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lessonContext,
                    question,
                    isQuizRelated,
                }),
            });

            const data = await response.json();
            const assistantReply =
                typeof data?.response === "string" && data.response.trim()
                    ? data.response
                    : "I could not generate a response. Please try again.";

            setMessages((prev) => [...prev, { role: "assistant", content: assistantReply }]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "I ran into an issue. Please try again." },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void handleAskTutor();
    };

    const isHiddenRoute = pathname === "/" || pathname === "/login";

    if (!user || isHiddenRoute) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-[60]">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="h-16 w-16 rounded-full border-[3px] border-comic-ink bg-comic-yellow text-comic-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-110"
                    aria-label="Open Ollie tutor"
                >
                    <span className="text-4xl">🦉</span>
                </button>
            )}

            {isOpen && (
                <section className="flex w-80 flex-col overflow-hidden rounded-2xl border-[3px] border-comic-ink bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:w-96">
                    <div className="flex items-center justify-between border-b-[3px] border-comic-ink bg-comic-yellow p-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🦉</span>
                            <div className="leading-tight">
                                <h3 className="font-black text-comic-ink">Ollie</h3>
                                <p className="text-xs font-bold text-black/70">
                                    {isQuizRelated ? "Quiz Coach" : "AI Tutor"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-md p-1 text-comic-ink transition-colors hover:bg-black/10"
                            aria-label="Close Ollie tutor"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

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
                                    className={`max-w-[85%] rounded-xl border-2 p-3 text-sm font-bold ${
                                        message.role === "user"
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
                </section>
            )}
        </div>
    );
}
