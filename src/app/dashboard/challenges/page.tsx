"use client";

import { useDashboardData } from "@/lib/useDashboardData";
import Sidebar from "@/components/Sidebar";
import { dailyChallenges, weeklyChallenges, getStreakLevel } from "@/lib/mockUsers";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useEffect, useState } from "react";
import { playSound } from "@/lib/sounds";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function MissionsPage() {
    const { user, loading, stats, userName, signOut } = useDashboardData();
    const [claimedMissions, setClaimedMissions] = useState<string[]>([]);
    const { multiplier } = getStreakLevel(stats.streak);
    const { playIntro, voiceModeEnabled } = useTextToSpeech();

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch claimed missions for today
    useEffect(() => {
        const fetchProgress = async () => {
            if (!user) return;
            try {
                const docRef = doc(db, `users/${user.uid}/missions/${today}`);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setClaimedMissions(docSnap.data().claimed || []);
                } else {
                    // Reset or empty
                    setClaimedMissions([]);
                }
            } catch (err) {
                console.error("Error fetching mission progress:", err);
            }
        };
        fetchProgress();
    }, [user, today]);

    // Voice Intro
    useEffect(() => {
        if (voiceModeEnabled && !loading) {
            playIntro("dashboard-missions", "Agent! Your daily missions are ready. Complete them to earn rewards and unlock the supply drop.");
        }
    }, [voiceModeEnabled, loading, playIntro]);

    if (loading || !user) return null;

    // Combine with real data checks
    const missionList = [
        // ... (same list as before)
        {
            id: "daily_login",
            title: "Daily Check-in",
            description: "Log in to the dashboard",
            icon: "📅",
            xpReward: 10,
            gemReward: 0,
            target: 1,
            progress: 1, // Always complete on load
            type: "login"
        },
        ...dailyChallenges.map(challenge => {
            let progress = 0;
            // Mock progress logic based on stats
            if (challenge.type === 'streak') progress = stats.streak >= challenge.target ? challenge.target : stats.streak;
            // For others, we don't have real data yet, so defaults to 0 (Locked)

            return {
                ...challenge,
                progress
            };
        })
    ];

    const handleClaim = async (id: string, xp: number, gems: number) => {
        if (claimedMissions.includes(id)) return;
        playSound("success");

        const newClaimed = [...claimedMissions, id];
        setClaimedMissions(newClaimed);

        // Persist to Firestore
        try {
            const docRef = doc(db, `users/${user.uid}/missions/${today}`);
            await setDoc(docRef, {
                claimed: arrayUnion(id),
                lastUpdated: new Date()
            }, { merge: true });

            // Here you would also call a cloud function or update stats doc to add XP/Gems
            // For now, UI state is enough for "revisit" persistence
        } catch (err) {
            console.error("Error saving claim:", err);
            // Revert on error? Or just log.
        }
    };

    const completedCount = claimedMissions.length;
    const totalDaily = missionList.length;
    const progressPercent = (completedCount / totalDaily) * 100;

    return (
        <div className="min-h-screen">
            <style jsx global>{`
                .stripes-pattern {
                    background-image: linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent);
                    background-size: 1rem 1rem;
                }
            `}</style>
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
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                        <div>
                            <div className="inline-block px-4 py-2 bg-comic-red border-2 border-black rounded-lg text-white font-black uppercase text-sm -rotate-2 mb-2 shadow-[2px_2px_0px_0px_#000]">
                                Top Secret 🕵️‍♂️
                            </div>
                            <h1 className="text-5xl font-black text-black text-outline">Daily Missions</h1>
                        </div>

                        {/* Supply Drop Status */}
                        <div className="bg-white border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_#000] flex items-center gap-4 w-full md:w-auto">
                            <div className="relative">
                                <div className={`text-5xl transition-transform ${completedCount === totalDaily ? "animate-bounce" : ""}`}>
                                    {completedCount === totalDaily ? "🎁" : "📦"}
                                </div>
                                {completedCount === totalDaily && (
                                    <div className="absolute -top-2 -right-2 bg-comic-yellow text-black text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-black">
                                        READY!
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-black uppercase text-sm mb-1">
                                    {completedCount === totalDaily ? "Supply Drop Unlocked!" : "Daily Supply Drop"}
                                </p>
                                <div className="w-full md:w-48 h-4 bg-gray-200 rounded-full border-2 border-black overflow-hidden relative">
                                    <div
                                        className="h-full bg-comic-green transition-all duration-500 stripes-pattern"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <p className="text-xs font-bold text-gray-500 mt-1">{completedCount}/{totalDaily} Completed</p>
                            </div>
                        </div>
                    </div>

                    {/* Streak Banner */}
                    <div className="bg-comic-yellow border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_#000] rotate-1 flex items-center gap-4 mb-12">
                        <div className="text-4xl">🔥</div>
                        <div>
                            <p className="font-black text-black uppercase text-sm">Streak Bonus Active!</p>
                            <p className="font-bold text-black">{multiplier}x XP Multiplier on all missions</p>
                        </div>
                    </div>

                    {/* Mission Grid */}
                    <div className="grid md:grid-cols-1 gap-4 mb-12">
                        {missionList.map((challenge, index) => {
                            const isClaimed = claimedMissions.includes(challenge.id);
                            // Daily Login is always completed (progress 1/1).
                            // Others depend on real stats.
                            const isCompleted = challenge.progress >= challenge.target;
                            const isReadyToClaim = !isClaimed && isCompleted;

                            return (
                                <div key={challenge.id} className={`comic-box p-4 bg-white flex flex-col md:flex-row items-center gap-4 group transition-all ${isClaimed ? "opacity-60 grayscale-[0.5]" : "hover:scale-[1.01]"}`}>
                                    <div className={`w-16 h-16 border-4 border-black rounded-xl flex items-center justify-center text-3xl shadow-[2px_2px_0px_0px_#000] shrink-0 ${isClaimed ? "bg-gray-200" : "bg-comic-blue"}`}>
                                        {challenge.icon}
                                    </div>

                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-xl font-black text-black">{challenge.title}</h3>
                                        <p className="text-gray-600 font-bold text-sm">{challenge.description}</p>
                                        <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                                            <span className="px-2 py-0.5 bg-gray-100 border-2 border-black rounded text-xs font-bold uppercase">
                                                {challenge.xpReward} XP
                                            </span>
                                            {challenge.gemReward > 0 && (
                                                <span className="px-2 py-0.5 bg-gray-100 border-2 border-black rounded text-xs font-bold uppercase">
                                                    {challenge.gemReward} 💎
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="w-full md:w-auto mt-2 md:mt-0">
                                        {isClaimed ? (
                                            <button disabled className="w-full md:w-32 py-2 bg-gray-300 border-2 border-black rounded-lg font-black text-gray-500 uppercase cursor-not-allowed">
                                                Completed
                                            </button>
                                        ) : isReadyToClaim ? (
                                            <button
                                                onClick={() => handleClaim(challenge.id, challenge.xpReward, challenge.gemReward)}
                                                className="w-full md:w-32 py-2 bg-comic-green border-2 border-black rounded-lg font-black text-white uppercase shadow-[4px_4px_0px_0px_#000] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all animate-pulse"
                                            >
                                                Claim!
                                            </button>
                                        ) : (
                                            <div className="w-full md:w-32 py-2 bg-white border-2 border-black rounded-lg font-bold text-center text-sm flex flex-col items-center justify-center">
                                                <span className="text-gray-400 uppercase text-xs mb-1">Locked</span>
                                                <div className="w-full h-1.5 bg-gray-100 rounded-full border border-gray-300 overflow-hidden mb-1">
                                                    <div className="h-full bg-blue-400" style={{ width: `${Math.min(100, (challenge.progress / challenge.target) * 100)}%` }}></div>
                                                </div>
                                                <span className="text-[10px] text-gray-400">{challenge.progress}/{challenge.target}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Weekly Operations */}
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-3xl font-black text-black flex items-center gap-2">
                                Weekly Ops
                                <span className="text-sm bg-purple-500 text-white border-2 border-black px-2 py-1 rounded font-black uppercase">High Value</span>
                            </h2>
                            <div className="h-1 flex-1 bg-black/10 rounded-full border-b-2 border-black/10"></div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {weeklyChallenges.map((challenge) => (
                                <div key={challenge.id} className="comic-box p-4 bg-white flex flex-col justify-between h-full relative overflow-hidden">
                                    <div className="absolute top-2 right-2 text-6xl opacity-10 rotate-12">{challenge.icon}</div>
                                    <div>
                                        <h3 className="text-lg font-black text-black mb-1 z-10 relative">{challenge.title}</h3>
                                        <p className="text-gray-500 text-xs font-bold mb-4 z-10 relative">{challenge.description}</p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs font-black uppercase mb-1">
                                            <span>Progress</span>
                                            <span>{Math.round((challenge.progress / challenge.target) * 100)}%</span>
                                        </div>
                                        <div className="h-3 bg-gray-100 border-2 border-black rounded-full overflow-hidden mb-3">
                                            <div
                                                className="h-full bg-purple-500 rounded-full"
                                                style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] font-black bg-yellow-100 border border-black px-1 rounded">+{challenge.xpReward} XP</span>
                                            <span className="text-[10px] font-black bg-purple-100 border border-black px-1 rounded">+{challenge.gemReward} 💎</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
