"use client";

import { useEffect, useState } from "react";
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

export default function Dashboard() {
    const { user, loading, signOut, hasCompletedOnboarding } = useAuth();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [stats, setStats] = useState({ xp: 0, level: 1, streak: 0, gems: 0 });
    const [loadingData, setLoadingData] = useState(true);
    const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
    const [performanceHistory, setPerformanceHistory] = useState<PerformanceHistory | null>(null);

    const fetchData = async () => {
        if (!user) return;
        setLoadingData(true);
        setError(null);
        try {
            const coursesQuery = query(collection(db, "courses"), where("creatorId", "==", user.uid));
            const snap = await getDocs(coursesQuery);
            setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setStats(userData.stats || stats);
                setLearningProfile(userData.learningProfile || null);
                setPerformanceHistory(userData.performanceHistory || null);
            }
        } catch (e: any) {
            console.error(e);
            playSound("error");
            toast.error("Connection Error! 🌩️");
            setError(e.message || "Failed to load missions");
        } finally {
            setLoadingData(false);
        }
    };

    const { playIntro, voiceModeEnabled } = useTextToSpeech();

    useEffect(() => {
        if (!loading && !user) router.push("/login");
        if (!loading && user && hasCompletedOnboarding === false) router.push("/onboarding");
    }, [user, loading, hasCompletedOnboarding, router]);

    // Voice Intro
    useEffect(() => {
        if (voiceModeEnabled && user && !loading) {
            playIntro("dashboard-home", "Welcome back! Here you can track your progress, see your active courses, and resume your learning adventure.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voiceModeEnabled, loading, playIntro]);

    useEffect(() => {
        if (user) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

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
                {/* Header Section */}
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

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: "Total XP", value: stats.xp.toLocaleString(), icon: "⚡", color: "bg-comic-yellow" },
                        { label: "Level", value: stats.level, icon: "🛡️", color: "bg-comic-blue" },
                        { label: "Day Streak", value: stats.streak, icon: "🔥", color: "bg-orange-400" },
                        { label: "Gems", value: stats.gems, icon: "💎", color: "bg-purple-400" },
                    ].map((stat, i) => (
                        <div key={stat.label} className={`comic-box p-4 bg-white flex flex-col items-center justify-center text-center ${i % 2 === 0 ? '-rotate-1' : 'rotate-1'} hover:rotate-0`}>
                            <div className={`w-14 h-14 rounded-full border-2 border-black flex items-center justify-center text-2xl mb-2 ${stat.color} shadow-[2px_2px_0px_0px_#000]`}>
                                {stat.icon}
                            </div>
                            <p className="text-3xl font-black text-black">{stat.value}</p>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Learning Insights Card */}
                {learningProfile && performanceHistory && (
                    <div className="mb-10">
                        <LearningInsights
                            learningProfile={learningProfile}
                            performanceHistory={performanceHistory}
                        />
                    </div>
                )}

                {/* Courses & Recommendations */}
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
                    />
                )}
            </main>
        </div>
    );
}
