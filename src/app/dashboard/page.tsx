"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import toast from "react-hot-toast";
import { playSound } from "@/lib/sounds";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

export default function Dashboard() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [stats, setStats] = useState({ xp: 0, level: 1, streak: 0, gems: 0 });
    const [loadingData, setLoadingData] = useState(true);

    const fetchData = async () => {
        if (!user) return;
        setLoadingData(true);
        setError(null);
        try {
            const coursesQuery = query(collection(db, "courses"), where("creatorId", "==", user.uid));
            const snap = await getDocs(coursesQuery);
            setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) setStats(userDoc.data().stats || stats);
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
    }, [user, loading, router]);

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
                            Create New Adventure
                        </button>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
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

                {/* Courses Grid */}
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-3xl font-black text-black">Your Missions</h2>
                    <div className="h-1 flex-1 bg-black rounded-full opacity-10"></div>
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
                ) : courses.length === 0 ? (
                    <div className="comic-box p-12 text-center bg-white">
                        <div className="text-6xl mb-4 animate-bounce-slow">🗺️</div>
                        <h3 className="text-2xl font-black text-black mb-2">No missions yet!</h3>
                        <p className="text-gray-500 mb-8 font-medium">Start your first learning adventure to earn XP and badges.</p>
                        <Link href="/generate">
                            <button
                                onClick={() => playSound("click")}
                                className="btn-action inline-flex"
                            >
                                Start Your Journey 🚀
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {courses.map((course, index) => {
                            const colors = ['bg-comic-blue', 'bg-comic-yellow', 'bg-comic-red', 'bg-comic-green', 'bg-purple-400', 'bg-orange-400'];
                            const color = colors[index % colors.length];

                            return (
                                <Link
                                    href={`/course/${course.id}`}
                                    key={course.id}
                                    onClickCapture={() => playSound("click")}
                                >
                                    <div className="comic-box h-full flex flex-col group overflow-hidden hover:scale-[1.02]">
                                        <div className={`h-36 ${color} p-6 relative border-b-4 border-black flex items-center justify-center`}>
                                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/comic-dots.png')] opacity-20"></div>
                                            <div className="absolute top-4 right-4 bg-white border-2 border-black px-3 py-1 rounded-lg text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000]">
                                                {course.metadata?.difficulty || "Beginner"}
                                            </div>
                                            <span className="text-6xl drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                                                {getCourseIcon(course.title)}
                                            </span>
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col bg-white">
                                            <h3 className="font-black text-xl text-black mb-2 line-clamp-2 leading-tight">
                                                {course.title}
                                            </h3>
                                            <p className="text-gray-600 font-medium text-sm mb-6 line-clamp-3 leading-relaxed flex-1">
                                                {course.description}
                                            </p>
                                            <div className="flex items-center justify-between pt-4 border-t-2 border-gray-100">
                                                <div className="flex items-center gap-2 font-bold text-gray-500 text-sm">
                                                    <span>📚 {course.lessons?.length || 0} Levels</span>
                                                </div>
                                                <div className="px-4 py-2 bg-black text-white rounded-lg font-bold text-sm group-hover:bg-comic-yellow group-hover:text-black transition-colors border-2 border-black group-hover:shadow-[2px_2px_0px_0px_#000]">
                                                    PLAY ▶
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

            </main >
        </div >
    );
}

function getCourseIcon(title: string) {
    const t = title.toLowerCase();
    if (t.includes('space') || t.includes('star')) return '🚀';
    if (t.includes('math') || t.includes('number')) return '🧮';
    if (t.includes('history') || t.includes('ancient')) return '🏛️';
    if (t.includes('science') || t.includes('chem')) return '🧪';
    if (t.includes('animal') || t.includes('nature')) return '🐾';
    if (t.includes('art') || t.includes('draw')) return '🎨';
    if (t.includes('code') || t.includes('program')) return '💻';
    return '🎒';
}
