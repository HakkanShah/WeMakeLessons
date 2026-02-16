"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import toast from "react-hot-toast";
import { useSound } from "@/hooks/useSound";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import type { LearningProfile, PerformanceHistory } from "@/lib/adaptiveEngine";

// Custom Loading Overlay
const LoadingOverlay = () => {
    const [messageIndex, setMessageIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    const messages = [
        "🤖 Analyzing your learning style...",
        "🧠 Adapting content difficulty...",
        "⚡ Customizing explanations...",
        "🎨 Rendering visual aids...",
        "📝 Crafting smart quizzes...",
        "🚀 Preparing your mission...",
        "🌟 Adding extra sparkles...",
        "⚙️ Finalizing course structure..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 2000);

        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return 95;
                const increment = Math.max(0.5, (95 - prev) / 50);
                return Math.min(95, prev + increment);
            });
        }, 100);

        return () => {
            clearInterval(interval);
            clearInterval(progressInterval);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-comic-yellow/95 flex items-center justify-center p-4 animate-fade-in">
            <div className="relative max-w-lg w-full">
                <div className="absolute inset-0 bg-[repeating-conic-gradient(#0000_0deg_10deg,rgba(0,0,0,0.1)_10deg_20deg)] animate-[spin_20s_linear_infinite] rounded-full scale-[2] pointer-events-none opacity-20"></div>
                <div className="relative z-10 bg-white border-[6px] border-black p-8 md:p-12 shadow-[12px_12px_0px_0px_#000] rotate-1 transform">
                    <div className="flex flex-col items-center">
                        <div className="text-8xl mb-4 animate-spin-slow">⚙️</div>
                        <h2 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tight mb-2">
                            Generating...
                        </h2>
                        <div className="w-full bg-white border-4 border-black rounded-xl h-12 mb-6 relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                            <div
                                className="h-full bg-comic-blue border-r-4 border-black transition-all duration-300 ease-linear flex items-center justify-end px-3"
                                style={{ width: `${Math.max(5, progress)}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-black mix-blend-multiply">
                                {Math.round(progress)}%
                            </div>
                        </div>
                        <p className="text-xl font-black text-gray-700 text-center animate-pulse">
                            {messages[messageIndex]}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

function GenerateContent() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTopic = searchParams.get("topic") || "";

    const [topic, setTopic] = useState(initialTopic);
    const [genLoading, setGenLoading] = useState(false);
    const [profile, setProfile] = useState<LearningProfile | null>(null);
    const [perfHistory, setPerfHistory] = useState<PerformanceHistory | null>(null);

    const { playClick, playComplete, playWrong } = useSound();
    const { playIntro, voiceModeEnabled } = useTextToSpeech();

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            try {
                const docSnap = await getDoc(doc(db, "users", user.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfile(data.learningProfile || null);
                    setPerfHistory(data.performanceHistory || null);

                    if (!data.learningProfile) {
                        toast.error("Please set up your profile first!");
                        router.push("/onboarding");
                    }
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            }
        };

        if (user) fetchProfile();
    }, [user, router]);

    useEffect(() => {
        if (voiceModeEnabled && !loading) {
            playIntro("generate-adaptive", "What do you want to learn today? I'll customize the course just for you!");
        }
    }, [voiceModeEnabled, loading, playIntro]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        playClick();
        if (!user || !profile) return;

        setGenLoading(true);
        try {
            const res = await fetch("/api/adaptive-generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic,
                    learningProfile: profile,
                    performanceHistory: perfHistory
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Generation failed");
            }

            const { course, adaptiveMetadata } = await res.json();
            const mergedMetadata = {
                ...(course?.metadata || {}),
                ...(adaptiveMetadata || {}),
                topic,
                generationType: "adaptive",
            };

            const ref = await addDoc(collection(db, "courses"), {
                ...course,
                metadata: mergedMetadata,
                adaptiveMetadata: adaptiveMetadata || null,
                creatorId: user.uid,
                createdAt: serverTimestamp(),
            });

            playComplete();
            toast.success("Course Ready! 🚀");
            router.push(`/course/${ref.id}`);
                } catch (e: unknown) {
            console.error(e);
            playWrong();
            const message = e instanceof Error ? e.message : "Mission Failed!";
            toast.error(message);
        } finally {
            setGenLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen">
            {genLoading && <LoadingOverlay />}

            <Sidebar
                userName={user.displayName || "Explorer"}
                userAvatar={user.photoURL || "👤"}
                xp={0} level={1} streak={0} gems={0}
                onSignOut={() => { }}
            />

            <main className="lg:ml-80 pt-24 p-4 md:p-8 lg:p-12 relative overflow-hidden">
                <div className="max-w-3xl mx-auto relative z-10">
                    <div className="text-center mb-10">
                        <div className="inline-block px-4 py-2 bg-comic-green border-2 border-black rounded-lg text-white font-black uppercase shadow-[4px_4px_0px_0px_#000] -rotate-2 mb-4">
                            Adaptive Engine Active ⚡
                        </div>
                        <h1 className="text-5xl font-black text-black text-outline mb-4">What&apos;s Your Mission?</h1>
                        <p className="text-xl font-bold text-gray-500">
                            I&apos;ll build a course that matches your learning style!
                        </p>
                    </div>

                    <div className="comic-box p-8 bg-white mb-10 transform rotate-1">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xl font-black text-black mb-3">
                                    I want to learn about...
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="e.g. Black Holes, Ancient Rome, Coding..."
                                    className="w-full px-6 py-5 rounded-xl border-4 border-black font-bold text-2xl outline-none focus:shadow-[4px_4px_0px_0px_#000] focus:-translate-y-1 transition-all placeholder:text-gray-300"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={genLoading || !topic.trim()}
                                className={`w-full py-5 rounded-xl font-black text-2xl uppercase tracking-widest border-4 border-black transition-all flex items-center justify-center gap-3 ${genLoading || !topic.trim()
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        : "bg-comic-blue text-white shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] active:translate-y-1 active:shadow-[2px_2px_0px_0px_#000]"
                                    }`}
                            >
                                {genLoading ? "Building..." : "Start Adventure 🚀"}
                            </button>
                        </form>
                    </div>

                    {/* Topic Suggestions based on interests could go here, but dashboard handles recommendations now */}
                </div>
            </main>
        </div>
    );
}

export default function GeneratePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
            <GenerateContent />
        </Suspense>
    );
}

