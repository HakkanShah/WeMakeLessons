"use client";

import { useDashboardData } from "@/lib/useDashboardData";
import Sidebar from "@/components/Sidebar";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useEffect } from "react";

const shopItems = [
    { id: 1, name: "Freeze Streak", cost: 50, icon: "❄️", description: "Protect your streak for one day missed.", color: "bg-cyan-100" },
    { id: 2, name: "Double XP", cost: 100, icon: "⚡", description: "Get 2x XP for the next 24 hours!", color: "bg-yellow-100" },
    { id: 3, name: "Mystery Box", cost: 75, icon: "🎁", description: "Contains a random amount of XP or Gems.", color: "bg-purple-100" },
    { id: 4, name: "Golden Avatar", cost: 500, icon: "🦁", description: "Unlock the exclusive Golden Lion avatar.", color: "bg-orange-100" },
    { id: 5, name: "Life Potion", cost: 30, icon: "🧪", description: "Refill your hearts instantly in quizzes.", color: "bg-red-100" },
    { id: 6, name: "Theme Pack", cost: 200, icon: "🎨", description: "Unlock dark mode and space themes.", color: "bg-indigo-100" },
];

export default function RewardsPage() {
    const { user, loading, stats, userName, signOut } = useDashboardData();
    const { playIntro, voiceModeEnabled } = useTextToSpeech();

    // Voice Intro
    useEffect(() => {
        if (voiceModeEnabled && !loading) {
            playIntro("dashboard-shop", "Spend your hard-earned gems here to unlock cool avatars, themes, and power-ups.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voiceModeEnabled, loading, playIntro]);

    if (loading) return null;
    if (!user) return null;

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
                <div className="max-w-6xl mx-auto">
                    {/* Header with Gem Count */}
                    <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
                        <div>
                            <div className="inline-block px-4 py-2 bg-comic-green border-2 border-black rounded-lg text-white font-black uppercase text-sm rotate-2 mb-2 shadow-[2px_2px_0px_0px_#000]">
                                Treasure Shop 🛒
                            </div>
                            <h1 className="text-5xl font-black text-black text-outline">Rewards Store</h1>
                        </div>

                        <div className="comic-box p-4 bg-white flex items-center gap-4 -rotate-2 hover:rotate-0 transition-transform">
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-500 uppercase">Your Balance</p>
                                <p className="text-4xl font-black text-comic-blue">{stats.gems.toLocaleString()}</p>
                            </div>
                            <div className="w-16 h-16 bg-comic-blue rounded-full border-4 border-black flex items-center justify-center text-3xl shadow-[2px_2px_0px_0px_#000]">
                                💎
                            </div>
                        </div>
                    </div>

                    {/* Shop Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {shopItems.map((item) => (
                            <div key={item.id} className="comic-box p-6 bg-white flex flex-col group hover:scale-[1.02]">
                                <div className={`h-40 ${item.color} rounded-xl border-2 border-black flex items-center justify-center text-6xl shadow-[2px_2px_0px_0px_#000] mb-6 group-hover:rotate-2 transition-transform`}>
                                    {item.icon}
                                </div>

                                <h3 className="text-2xl font-black text-black mb-2">{item.name}</h3>
                                <p className="text-gray-600 font-bold text-sm mb-6 flex-1 border-l-4 border-gray-200 pl-3">
                                    {item.description}
                                </p>

                                <button
                                    className={`w-full py-3 rounded-xl border-2 border-black font-black uppercase transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[2px_2px_0px_0px_#000] ${stats.gems >= item.cost
                                        ? 'bg-comic-blue text-white hover:bg-comic-blue-dark'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300 shadow-none'
                                        }`}
                                    disabled={stats.gems < item.cost}
                                >
                                    <span>{item.cost}</span>
                                    <span>💎</span>
                                    <span>Buy</span>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Fun Banner */}
                    <div className="mt-16 bg-comic-yellow border-4 border-black rounded-3xl p-8 relative overflow-hidden shadow-[8px_8px_0px_0px_#000]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl rotate-12 pointer-events-none">🎁</div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <h2 className="text-3xl font-black text-black mb-2">Want more Gems?</h2>
                                <p className="text-black font-bold text-lg">Complete Daily Challenges and upgrade your streak to earn bonus gems!</p>
                            </div>
                            <Link href="/dashboard/challenges" className="btn-secondary whitespace-nowrap bg-white">
                                Go to Challenges →
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

import Link from "next/link";
