"use client";

import { useDashboardData } from "@/lib/useDashboardData";
import Sidebar from "@/components/Sidebar";
import { mockUsers, getLevelTitle } from "@/lib/mockUsers";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface LeaderboardUser {
    userId: string;
    name: string;
    avatar: string;
    xp: number;
    level: number;
}

export default function LeaderboardPage() {
    const { user, loading, stats, userName, signOut } = useDashboardData();
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

    const { playIntro, voiceModeEnabled } = useTextToSpeech();

    useEffect(() => {
        const fetchLeaderboard = async () => {
            let users: LeaderboardUser[] = [];

            // 1. Unconditionally add mock users
            users = mockUsers.map(u => ({
                userId: u.id,
                name: u.name,
                avatar: u.avatar,
                xp: u.xp,
                level: u.level
            }));

            // 2. Try to fetch real users from Firestore
            try {
                const q = query(
                    collection(db, "leaderboard"),
                    orderBy("xp", "desc"),
                    limit(50)
                );
                const querySnapshot = await getDocs(q);

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // Check if this real user is already in the list
                    const existingIndex = users.findIndex(u => u.userId === data.userId);
                    const realUser = {
                        userId: data.userId,
                        name: data.name || "Explorer",
                        avatar: data.avatar || "👤",
                        xp: data.xp || 0,
                        level: Math.floor(Math.sqrt((data.xp || 0) / 100)) + 1
                    };

                    if (existingIndex >= 0) {
                        users[existingIndex] = realUser;
                    } else {
                        users.push(realUser);
                    }
                });
            } catch (error) {
                console.warn("Could not fetch real leaderboard (likely permission or index issue). Using mock data only.", error);
            } finally {
                // 3. Sort by XP desc
                users.sort((a, b) => b.xp - a.xp);
                setLeaderboardData(users.slice(0, 50));
                setLoadingLeaderboard(false);
            }
        };

        fetchLeaderboard();
    }, []);

    // Voice Intro
    useEffect(() => {
        if (voiceModeEnabled && !loading && !loadingLeaderboard) {
            playIntro("dashboard-leaderboard", "See how you stack up against other explorers! Climb the ranks and become a top learner.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voiceModeEnabled, loading, loadingLeaderboard, playIntro]);

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;

    const topThree = leaderboardData.slice(0, 3);
    const rest = leaderboardData.slice(3);

    // If no data yet (shouldn't happen due to mocks), show empty state
    if (leaderboardData.length === 0 && !loadingLeaderboard) {
        return (
            <div className="min-h-screen">
                <Sidebar userName={userName} userAvatar={user?.photoURL || "👤"} xp={stats.xp} level={stats.level} streak={stats.streak} gems={stats.gems} onSignOut={signOut} />
                <main className="lg:ml-80 pt-24 p-8 text-center">
                    <h1 className="text-4xl font-black">Leaderboard is empty! 🕸️</h1>
                    <p className="text-xl">Be the first to complete a lesson!</p>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <Sidebar
                userName={userName}
                userAvatar={user?.photoURL || "👤"}
                xp={stats.xp}
                level={stats.level}
                streak={stats.streak}
                gems={stats.gems}
                onSignOut={signOut}
            />

            <main className="lg:ml-80 pt-24 p-4 md:p-8 lg:p-12">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-black text-black text-outline mb-4 inline-block transform -rotate-2">
                            Hall of Fame 🏆
                        </h1>
                        <p className="text-xl font-bold text-gray-500">
                            See who's leading the legendary race!
                        </p>
                    </div>

                    {loadingLeaderboard ? (
                        <div className="text-center py-20 text-2xl font-black text-gray-400">Loading Ranks...</div>
                    ) : (
                        <>
                            {/* Top 3 Podium */}
                            {topThree.length > 0 && (
                                <div className="flex flex-col md:flex-row justify-center items-end gap-6 mb-16 px-4">
                                    {/* 2nd Place */}
                                    {topThree[1] && (
                                        <div className="order-2 md:order-1 flex flex-col items-center">
                                            <div className="w-24 h-24 rounded-full border-4 border-black bg-gray-300 flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_#000] mb-4 relative z-10 overflow-hidden">
                                                {topThree[1].avatar.startsWith("http") ? <img src={topThree[1].avatar} alt="" className="w-full h-full object-cover" /> : topThree[1].avatar}
                                                <div className="absolute -bottom-3 bg-gray-300 text-black border-2 border-black px-2 rounded-lg font-black text-sm z-20">#2</div>
                                            </div>
                                            <div className="comic-box bg-white p-4 w-48 text-center h-48 flex flex-col justify-end bg-gradient-to-t from-gray-100 to-white">
                                                <h3 className="font-black text-lg truncate w-full">{topThree[1].name}</h3>
                                                <p className="text-gray-500 font-bold text-sm mb-2">{getLevelTitle(topThree[1].level).title}</p>
                                                <div className="bg-black text-white rounded-lg py-1 font-black">
                                                    {topThree[1].xp.toLocaleString()} XP
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 1st Place */}
                                    {topThree[0] && (
                                        <div className="order-1 md:order-2 flex flex-col items-center -mt-12">
                                            <div className="relative">
                                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-6xl animate-bounce">👑</div>
                                                <div className="w-32 h-32 rounded-full border-4 border-black bg-comic-yellow flex items-center justify-center text-6xl shadow-[6px_6px_0px_0px_#000] mb-4 relative z-10 overflow-hidden">
                                                    {topThree[0].avatar.startsWith("http") ? <img src={topThree[0].avatar} alt="" className="w-full h-full object-cover" /> : topThree[0].avatar}
                                                    <div className="absolute -bottom-4 bg-comic-yellow text-black border-2 border-black px-3 py-1 rounded-lg font-black text-lg z-20">#1</div>
                                                </div>
                                            </div>
                                            <div className="comic-box bg-white p-6 w-56 text-center h-64 flex flex-col justify-end bg-gradient-to-t from-yellow-50 to-white transform scale-105 z-0 border-4 border-black">
                                                <h3 className="font-black text-xl truncate w-full mb-1">{topThree[0].name}</h3>
                                                <p className="text-comic-blue-dark font-black text-sm mb-4 uppercase tracking-wider">{getLevelTitle(topThree[0].level).title}</p>
                                                <div className="bg-comic-yellow border-2 border-black text-black rounded-xl py-2 font-black text-xl shadow-[2px_2px_0px_0px_#000]">
                                                    {topThree[0].xp.toLocaleString()} XP
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 3rd Place */}
                                    {topThree[2] && (
                                        <div className="order-3 flex flex-col items-center">
                                            <div className="w-24 h-24 rounded-full border-4 border-black bg-orange-300 flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_#000] mb-4 relative z-10 overflow-hidden">
                                                {topThree[2].avatar.startsWith("http") ? <img src={topThree[2].avatar} alt="" className="w-full h-full object-cover" /> : topThree[2].avatar}
                                                <div className="absolute -bottom-3 bg-orange-300 text-black border-2 border-black px-2 rounded-lg font-black text-sm z-20">#3</div>
                                            </div>
                                            <div className="comic-box bg-white p-4 w-48 text-center h-40 flex flex-col justify-end bg-gradient-to-t from-orange-50 to-white">
                                                <h3 className="font-black text-lg truncate w-full">{topThree[2].name}</h3>
                                                <p className="text-gray-500 font-bold text-sm mb-2">{getLevelTitle(topThree[2].level).title}</p>
                                                <div className="bg-black text-white rounded-lg py-1 font-black">
                                                    {topThree[2].xp.toLocaleString()} XP
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* The Rest List */}
                            {rest.length > 0 && (
                                <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_#000]">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left border-b-4 border-black">
                                                <th className="pb-4 pl-4 font-black uppercase text-gray-500">Rank</th>
                                                <th className="pb-4 font-black uppercase text-gray-500">Hero</th>
                                                <th className="pb-4 font-black uppercase text-gray-500 hidden sm:table-cell">Title</th>
                                                <th className="pb-4 pr-4 text-right font-black uppercase text-gray-500">XP</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-lg">
                                            {rest.map((rUser, index) => (
                                                <tr key={rUser.userId} className={`group hover:bg-yellow-50 transition-colors ${user?.uid === rUser.userId ? "bg-blue-50" : ""}`}>
                                                    <td className="py-4 pl-4 font-black text-gray-400 group-hover:text-black">#{index + 4}</td>
                                                    <td className="py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform overflow-hidden">
                                                                {rUser.avatar.startsWith("http") ? <img src={rUser.avatar} alt="" className="w-full h-full object-cover" /> : rUser.avatar}
                                                            </div>
                                                            <span className="font-bold">{rUser.name} {user?.uid === rUser.userId && "(You)"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 hidden sm:table-cell">
                                                        <span className="px-2 py-1 bg-gray-100 border border-black rounded text-xs font-bold uppercase group-hover:bg-white">
                                                            {getLevelTitle(rUser.level).title}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 pr-4 text-right font-black text-comic-blue group-hover:text-comic-blue-dark">
                                                        {rUser.xp.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
