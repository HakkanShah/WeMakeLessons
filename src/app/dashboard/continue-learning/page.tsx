"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import RecommendedCourses from "@/components/RecommendedCourses";
import { useDashboardData } from "@/lib/useDashboardData";
import { db } from "@/lib/firebase";
import { playSound } from "@/lib/sounds";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

interface DashboardCourse {
    id: string;
    title: string;
    description: string;
    lessons?: unknown[];
    metadata?: { difficulty?: string };
    [key: string]: unknown;
}

export default function ContinueLearningPage() {
    const { user, loading, stats, userName, signOut } = useDashboardData();
    const [courses, setCourses] = useState<DashboardCourse[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { playIntro, voiceModeEnabled } = useTextToSpeech();

    useEffect(() => {
        const fetchCourses = async () => {
            if (!user) return;

            setLoadingCourses(true);
            setError(null);
            try {
                const coursesQuery = query(collection(db, "courses"), where("creatorId", "==", user.uid));
                const snap = await getDocs(coursesQuery);
                setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DashboardCourse[]);
            } catch (e: unknown) {
                console.error(e);
                playSound("error");
                const message = e instanceof Error ? e.message : "Failed to load courses.";
                setError(message);
            } finally {
                setLoadingCourses(false);
            }
        };

        if (user) fetchCourses();
    }, [user]);

    useEffect(() => {
        if (voiceModeEnabled && !loading) {
            playIntro("dashboard-continue", "Pick up your existing courses and continue learning from where you left off.");
        }
    }, [voiceModeEnabled, loading, playIntro]);

    if (loading || !user) return null;

    return (
        <div className="min-h-screen">
            <Sidebar
                userName={userName}
                userAvatar={user.photoURL || "👤"}
                xp={stats.xp}
                level={stats.level}
                streak={stats.streak}
                gems={stats.gems}
                onSignOut={signOut}
            />

            <main className="lg:ml-80 pt-24 p-4 md:p-8 lg:p-12">
                <div className="mb-8">
                    <div className="inline-block px-4 py-1.5 bg-comic-blue border-2 border-black rounded-full text-xs font-black uppercase tracking-wider mb-2 shadow-[2px_2px_0px_0px_#000] -rotate-1 text-white">
                        Continue Tab
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-black text-outline">
                        Continue Learning
                    </h1>
                    <p className="mt-2 text-lg font-bold text-gray-500">
                        Resume your existing courses from the sidebar.
                    </p>
                </div>

                {error ? (
                    <div className="comic-box p-8 bg-white border-comic-red animate-pop">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🌩️</div>
                            <h3 className="text-2xl font-black mb-2 text-comic-red">Connection Failed</h3>
                            <p className="text-gray-600 font-bold mb-6">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-primary"
                            >
                                🔄 Retry Mission Sync
                            </button>
                        </div>
                    </div>
                ) : loadingCourses ? (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-64 rounded-2xl bg-gray-200 animate-pulse border-4 border-gray-300"
                            />
                        ))}
                    </div>
                ) : (
                    <RecommendedCourses
                        courses={courses}
                        learningProfile={null}
                        performanceHistory={null}
                        view="continue-only"
                    />
                )}
            </main>
        </div>
    );
}
