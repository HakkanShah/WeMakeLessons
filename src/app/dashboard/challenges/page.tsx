"use client";

import { useDashboardData } from "@/lib/useDashboardData";
import Sidebar from "@/components/Sidebar";
import { dailyChallenges, weeklyChallenges, getStreakLevel } from "@/lib/mockUsers";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useEffect } from "react";

export default function ChallengesPage() {
    const { user, loading, stats, userName, signOut } = useDashboardData();

    if (loading) return null;
    if (!user) return null;

    const { multiplier } = getStreakLevel(stats.streak);
    const { playIntro, voiceModeEnabled } = useTextToSpeech();

    // Voice Intro
    useEffect(() => {
        if (voiceModeEnabled && !loading) {
            playIntro("dashboard-challenges", "Ready to test your skills? Complete these daily challenges to earn bonus XP and rewards!");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voiceModeEnabled, loading, playIntro]);

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
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                        <div>
                            <div className="inline-block px-4 py-2 bg-comic-red border-2 border-black rounded-lg text-white font-black uppercase text-sm -rotate-2 mb-2 shadow-[2px_2px_0px_0px_#000]">
                                Mission Board 🎯
                            </div>
                            <h1 className="text-5xl font-black text-black text-outline">Daily Quests</h1>
                        </div>

                        {/* Streak Banner */}
                        <div className="bg-comic-yellow border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_#000] rotate-1 animate-bounce-slow flex items-center gap-4">
                            <div className="text-4xl">🔥</div>
                            <div>
                                <p className="font-black text-black uppercase text-sm">Streak Bonus Active!</p>
                                <p className="font-bold text-black">{multiplier}x XP Multiplier</p>
                            </div>
                        </div>
                    </div>

                    {/* Daily Challenges */}
                    <div className="mb-12">
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-3xl font-black text-black flex items-center gap-2">
                                Daily Tasks
                                <span className="text-sm bg-black text-white px-2 py-1 rounded font-bold uppercase">Resets 12AM</span>
                            </h2>
                            <div className="h-1 flex-1 bg-black/10 rounded-full border-b-2 border-black/10"></div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {dailyChallenges.map((challenge, index) => (
                                <div key={challenge.id} className="comic-box p-6 bg-white hover:rotate-1 group relative overflow-hidden">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-14 h-14 bg-comic-green border-2 border-black rounded-xl flex items-center justify-center text-3xl shadow-[2px_2px_0px_0px_#000] group-hover:scale-110 transition-transform">
                                            {challenge.icon}
                                        </div>
                                        {index === 0 && (
                                            <div className="bg-comic-green text-white border-2 border-black px-2 py-1 rounded text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] rotate-3">
                                                Completed!
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-xl font-black text-black mb-2 leading-tight">{challenge.title}</h3>
                                    <p className="text-gray-600 font-bold text-sm mb-4 leading-relaxed bg-gray-50 p-2 rounded-lg border-2 border-transparent group-hover:border-black group-hover:bg-comic-yellow/10 transition-colors">
                                        {challenge.description}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mt-auto">
                                        <span className="px-3 py-1 bg-comic-blue text-white border-2 border-black rounded-full text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000]">
                                            +{challenge.xpReward} XP
                                        </span>
                                        {challenge.gemReward > 0 && (
                                            <span className="px-3 py-1 bg-purple-400 text-white border-2 border-black rounded-full text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000]">
                                                +{challenge.gemReward} 💎
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weekly Challenges */}
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-3xl font-black text-black flex items-center gap-2">
                                Epic Weekly Quests
                                <span className="text-sm bg-comic-purple text-black px-2 py-1 rounded font-black uppercase bg-purple-200 border-2 border-black">Big Rewards</span>
                            </h2>
                            <div className="h-1 flex-1 bg-black/10 rounded-full border-b-2 border-black/10"></div>
                        </div>

                        <div className="space-y-6">
                            {weeklyChallenges.map((challenge) => (
                                <div key={challenge.id} className="comic-box p-6 bg-white flex flex-col md:flex-row items-center gap-6 hover:bg-blue-50">
                                    <div className="w-20 h-20 bg-comic-blue border-4 border-black rounded-2xl flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_#000] rotate-3 md:rotate-0 shrink-0">
                                        {challenge.icon}
                                    </div>

                                    <div className="flex-1 w-full">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-2xl font-black text-black">{challenge.title}</h3>
                                            <div className="hidden md:flex gap-2">
                                                <span className="badge bg-yellow-400 border-2 border-black px-3 font-bold rounded shadow-[2px_2px_0px_0px_#000]">+{challenge.xpReward} XP</span>
                                                <span className="badge bg-purple-400 border-2 border-black px-3 font-bold text-white rounded shadow-[2px_2px_0px_0px_#000]">+{challenge.gemReward} 💎</span>
                                            </div>
                                        </div>
                                        <p className="text-gray-600 font-bold mb-4">{challenge.description}</p>

                                        {/* Progress Bar */}
                                        <div className="relative pt-2">
                                            <div className="flex justify-between text-xs font-black uppercase mb-1">
                                                <span>Progress</span>
                                                <span>{Math.round((challenge.progress / challenge.target) * 100)}%</span>
                                            </div>
                                            <div className="h-6 bg-white border-2 border-black rounded-full overflow-hidden p-0.5">
                                                <div
                                                    className="h-full bg-comic-green rounded-full border-r-2 border-black stripes-pattern"
                                                    style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                                                />
                                            </div>
                                            <div className="mt-1 text-right text-xs font-bold text-gray-500">
                                                {challenge.progress} / {challenge.target} Completed
                                            </div>
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

// Add stripes pattern to global css or inline style if needed, but simple color works for now.
