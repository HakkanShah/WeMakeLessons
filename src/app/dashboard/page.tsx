"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import RecommendedCourses from "@/components/RecommendedCourses";
import LearningInsights from "@/components/LearningInsights";
import toast from "react-hot-toast";
import { playSound } from "@/lib/sounds";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import type { LearningProfile, PerformanceHistory } from "@/lib/adaptiveEngine";

interface DashboardCourse {
    id: string;
    title: string;
    description: string;
    lessons?: unknown[];
    metadata?: { difficulty?: string };
    [key: string]: unknown;
}

export default function Dashboard() {
    const { user, loading, signOut, hasCompletedOnboarding } = useAuth();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [courses, setCourses] = useState<DashboardCourse[]>([]);
    const [stats, setStats] = useState({ xp: 0, level: 1, streak: 0, gems: 0 });
    const [loadingData, setLoadingData] = useState(true);
    const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
    const [performanceHistory, setPerformanceHistory] = useState<PerformanceHistory | null>(null);
    const [insightsCollapsed, setInsightsCollapsed] = useState(true);
    const recommendationsRef = useRef<HTMLDivElement | null>(null);

    const fetchData = async () => {
        if (!user) return;
        setLoadingData(true);
        setError(null);
        try {
            const coursesQuery = query(collection(db, "courses"), where("creatorId", "==", user.uid));
            const snap = await getDocs(coursesQuery);
            const mappedCourses = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DashboardCourse[];
            setCourses(mappedCourses);

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setStats(userData.stats || stats);
                setLearningProfile(userData.learningProfile || null);
                setPerformanceHistory(userData.performanceHistory || null);
            }
        } catch (e: unknown) {
            console.error(e);
            playSound("error");
            toast.error("Connection error.");
            const message = e instanceof Error ? e.message : "Failed to load courses.";
            setError(message);
        } finally {
            setLoadingData(false);
        }
    };

    const { playIntro, voiceModeEnabled } = useTextToSpeech();

    useEffect(() => {
        if (!loading && !user) router.push("/login");
        if (!loading && user && hasCompletedOnboarding === false) router.push("/onboarding");
    }, [user, loading, hasCompletedOnboarding, router]);

    useEffect(() => {
        if (voiceModeEnabled && user && !loading && hasCompletedOnboarding === true) {
            playIntro("dashboard-home", "Welcome back. Here you can track progress and explore recommended next topics.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voiceModeEnabled, loading, hasCompletedOnboarding, playIntro]);

    useEffect(() => {
        if (user) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        if (!user || loadingData || loading || error || hasCompletedOnboarding !== true) return;
        if (typeof window === "undefined") return;

        const firstVisitKey = `dashboard-auto-scroll-recommendations-${user.uid}`;
        if (window.localStorage.getItem(firstVisitKey)) return;

        const timer = window.setTimeout(() => {
            recommendationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            window.localStorage.setItem(firstVisitKey, "done");
        }, 500);

        return () => window.clearTimeout(timer);
    }, [user, loading, loadingData, error, hasCompletedOnboarding]);

    useEffect(() => {
        if (learningProfile && performanceHistory) {
            setInsightsCollapsed(true);
        }
    }, [learningProfile, performanceHistory]);

    if (loading) return null;
    if (!user) return null;

    const userName = user.displayName?.split(" ")[0] || "Explorer";

    return (
        <div className="min-h-screen">
            <Sidebar
                userName={userName}
                userAvatar={user.photoURL || "👤"}
                xp={stats.xp}
                level={stats.level}
                streak={stats.streak}
                gems={stats.gems}
                onSignOut={() => {
                    playSound("click");
                    signOut();
                }}
            />

            <main className="lg:ml-80 pt-24 p-4 md:p-8 lg:p-12">
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
                    <div>
                        <div className="inline-block px-4 py-1.5 bg-comic-yellow border-2 border-black rounded-full text-xs font-black uppercase tracking-wider mb-2 shadow-[2px_2px_0px_0px_#000] rotate-1">
                            Welcome Back!
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-black text-outline">
                            Hello, {userName}! 👋
                        </h1>
                    </div>
                    <Link href="/generate">
                        <button
                            onClick={() => playSound("click")}
                            className="btn-primary flex items-center gap-2 transform md:rotate-2 hover:rotate-0 transition-transform"
                        >
                            <span className="text-2xl">✨</span>
                            Explore Topics
                        </button>
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: "Total XP", value: stats.xp.toLocaleString(), icon: "⚡", color: "bg-comic-yellow" },
                        { label: "Level", value: stats.level, icon: "🛡️", color: "bg-comic-blue" },
                        { label: "Day Streak", value: stats.streak, icon: "🔥", color: "bg-orange-400" },
                        { label: "Gems", value: stats.gems, icon: "💎", color: "bg-purple-400" },
                    ].map((stat, i) => (
                        <div key={stat.label} className={`comic-box p-4 bg-white flex flex-col items-center justify-center text-center ${i % 2 === 0 ? "-rotate-1" : "rotate-1"} hover:rotate-0`}>
                            <div className={`w-14 h-14 rounded-full border-2 border-black flex items-center justify-center text-2xl mb-2 ${stat.color} shadow-[2px_2px_0px_0px_#000]`}>
                                {stat.icon}
                            </div>
                            <p className="text-3xl font-black text-black">{stat.value}</p>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {learningProfile && performanceHistory && (
                    <div className="mb-10 relative">
                        <div className="pointer-events-none absolute -top-5 -left-4 rotate-[-8deg] rounded-full border-2 border-black bg-comic-yellow px-3 py-1 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#000]">
                            Insight Zone 🧠
                        </div>
                        <div className="rounded-2xl border-[3px] border-black bg-gradient-to-r from-yellow-100 via-blue-100 to-green-100 p-2 shadow-[6px_6px_0px_0px_#000]">
                            <div className="rounded-xl border-2 border-black bg-white p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Learning Insights</p>
                                        <h3 className="text-xl font-black text-black">
                                            {insightsCollapsed ? "Insights Hidden" : "Insights Expanded"}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setInsightsCollapsed((prev) => !prev)}
                                        className={`rounded-lg border-2 border-black px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[2px_2px_0px_0px_#000] transition-all ${
                                            insightsCollapsed
                                                ? "bg-comic-blue text-white hover:-translate-y-0.5"
                                                : "bg-comic-yellow text-black hover:-translate-y-0.5"
                                        }`}
                                    >
                                        {insightsCollapsed ? "Expand Insights" : "Hide Insights"}
                                    </button>
                                </div>

                                {insightsCollapsed ? (
                                    <div className="mt-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4">
                                        <p className="font-bold text-gray-600">
                                            Click <span className="font-black">Expand Insights</span> to view your trend, skill meters, strengths, and focus areas.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        <LearningInsights
                                            learningProfile={learningProfile}
                                            performanceHistory={performanceHistory}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={recommendationsRef} id="recommendations-section" className="scroll-mt-28">
                    <div className="mb-6 flex items-center gap-3">
                        <span className="text-3xl">🧭</span>
                        <h2 className="text-3xl font-black text-black">Recommended Next Topics</h2>
                        <div className="h-1 flex-1 rounded-full bg-black opacity-10"></div>
                    </div>
                    {error ? (
                        <div className="comic-box p-8 bg-white border-comic-red animate-pop">
                            <div className="text-center">
                                <div className="text-6xl mb-4">🌩️</div>
                                <h3 className="text-2xl font-black mb-2 text-comic-red">Connection Failed</h3>
                                <p className="text-gray-600 font-bold mb-6">{error}</p>
                                <button onClick={fetchData} className="btn-primary">
                                    🔄 Retry Mission Sync
                                </button>
                            </div>
                        </div>
                    ) : loadingData ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-2xl bg-gray-200 animate-pulse border-4 border-gray-300" />)}
                        </div>
                    ) : (
                        <RecommendedCourses
                            courses={courses}
                            learningProfile={learningProfile}
                            performanceHistory={performanceHistory}
                            view="recommendations-only"
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
