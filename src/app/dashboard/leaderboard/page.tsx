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
    rank: number;
}

export default function LeaderboardPage() {
    const { user, loading, stats, userName, signOut } = useDashboardData();
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

    const { playIntro, voiceModeEnabled } = useTextToSpeech();

    useEffect(() => {
        const fetchLeaderboard = async () => {
            let tempUsers: Omit<LeaderboardUser, "rank">[] = [];

            // 1. Unconditionally add mock users
            tempUsers = mockUsers.map(u => ({
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
                    limit(100)
                );
                const querySnapshot = await getDocs(q);

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const existingIndex = tempUsers.findIndex(u => u.userId === data.userId);
                    const realUser = {
                        userId: data.userId,
                        name: data.name || "Explorer",
                        avatar: data.avatar || "👤",
                        xp: data.xp || 0,
                        level: Math.floor(Math.sqrt((data.xp || 0) / 100)) + 1
                    };

                    if (existingIndex >= 0) {
                        tempUsers[existingIndex] = realUser;
                    } else {
                        tempUsers.push(realUser);
                    }
                });
            } catch (error) {
                console.warn("Could not fetch real leaderboard. Using mock data only.", error);
            }

            // 3. Sort by XP desc
            tempUsers.sort((a, b) => b.xp - a.xp);

            // 4. Assign Ranks & Handle Current User
            const finalUsers: LeaderboardUser[] = tempUsers.map((u, i) => ({
                ...u,
                rank: i + 1
            }));

            if (user) {
                const userIndex = finalUsers.findIndex(u => u.userId === user.uid);

                if (userIndex === -1) {
                    // User not in top 100? Append them to the list.
                    // Rank is estimated as > 100 (or just next available number)
                    finalUsers.push({
                        userId: user.uid,
                        name: userName, // from useDashboardData
                        avatar: user.photoURL || "👤",
                        xp: stats.xp,
                        level: stats.level,
                        rank: finalUsers.length + 1
                    });
                }
            }

            // 5. Slice? logic. 
            // If user wants to see themselves at the "bottom", we should probably show the top 50 
            // AND the user if they are beyond 50.
            // But strict "append to bottom" request suggests displaying them at the end of the fetched list.
            // For now, we'll keep the logic simple: Show top 50. If user > 50, show 50... + User.

            let displayList = finalUsers;
            if (finalUsers.length > 50) {
                const top50 = finalUsers.slice(0, 50);
                const currentUser = finalUsers.find(u => u.userId === user?.uid);

                if (currentUser && currentUser.rank > 50) {
                    displayList = [...top50, currentUser];
                } else {
                    displayList = top50;
                }
            }

            setLeaderboardData(displayList);
            setLoadingLeaderboard(false);
        };

        if (user || !loading) {
            fetchLeaderboard();
        }
    }, [user, loading, stats, userName]);

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

            <main className="lg:ml-80 pt-24 pb-12 p-4 md:p-8 lg:p-12">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-6xl font-black text-black text-outline mb-4 inline-block transform -rotate-2">
                            Hall of Fame 🏆
                        </h1>
                        <p className="text-lg md:text-xl font-bold text-gray-500">
                            Compete with explorers worldwide!
                        </p>
                    </div>

                    {loadingLeaderboard ? (
                        <div className="text-center py-20 text-2xl font-black text-gray-400 animate-pulse">Loading Ranks...</div>
                    ) : (
                        <>
                            {/* Top 3 Podium */}
                            {topThree.length > 0 && (
                                <div className="flex flex-row justify-center items-end gap-2 md:gap-6 mb-12 px-2 md:px-4">
                                    {/* 2nd Place */}
                                    {topThree[1] && (
                                        <div className="order-1 flex flex-col items-center w-1/3 md:w-auto relative group">
                                            <div className="relative mb-[-1.5rem] z-10 transition-transform group-hover:scale-105">
                                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-black bg-gray-300 flex items-center justify-center text-4xl shadow-[2px_2px_0px_0px_#000] overflow-hidden ring-2 ring-white">
                                                    {topThree[1].avatar.startsWith("http") ? <img src={topThree[1].avatar} alt="" className="w-full h-full object-cover" /> : topThree[1].avatar}
                                                </div>
                                            </div>
                                            <div className="comic-box bg-white pt-8 pb-4 px-1 md:px-4 w-full md:w-40 text-center h-56 md:h-64 flex flex-col justify-end bg-gradient-to-t from-gray-50 to-white relative mt-2 rounded-t-lg md:rounded-xl border-x-4 border-t-4 border-black border-b-0 shadow-[4px_0px_0px_0px_rgba(0,0,0,0.1)]">
                                                {user?.uid === topThree[1].userId && <div className="absolute top-2 right-1 md:right-2 bg-comic-blue text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase">You</div>}
                                                <div className="font-black text-4xl md:text-5xl text-gray-300/80 mb-2 mt-2">#2</div>
                                                <h3 className="font-black text-sm md:text-lg truncate w-full mb-1">{topThree[1].name}</h3>
                                                <p className="text-gray-500 font-bold text-[10px] md:text-sm mb-2">{getLevelTitle(topThree[1].level).title}</p>
                                                <div className="bg-black text-white rounded-md py-1 px-1 font-black text-xs md:text-sm">
                                                    {topThree[1].xp.toLocaleString()} XP
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 1st Place */}
                                    {topThree[0] && (
                                        <div className="order-2 flex flex-col items-center w-1/3 md:w-auto relative -mt-6 z-20 group">
                                            <div className="relative mb-[-2rem] z-10 transition-transform group-hover:scale-105">
                                                <div className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 text-4xl md:text-6xl animate-bounce drop-shadow-md">👑</div>
                                                <div className="w-20 h-20 md:w-32 md:h-32 rounded-full border-4 border-black bg-comic-yellow flex items-center justify-center text-6xl shadow-[3px_3px_0px_0px_#000] overflow-hidden ring-4 ring-white">
                                                    {topThree[0].avatar.startsWith("http") ? <img src={topThree[0].avatar} alt="" className="w-full h-full object-cover" /> : topThree[0].avatar}
                                                </div>
                                            </div>
                                            <div className="comic-box bg-white pt-10 pb-6 px-1 md:px-6 w-full md:w-48 text-center h-64 md:h-80 flex flex-col justify-end bg-gradient-to-t from-yellow-50 to-white transform scale-105 rounded-t-xl border-x-4 border-t-4 border-black border-b-0 shadow-[6px_-2px_0px_0px_rgba(0,0,0,0.2)] md:shadow-[8px_-4px_0px_0px_rgba(0,0,0,0.2)] relative mt-2">
                                                {user?.uid === topThree[0].userId && <div className="absolute top-2 right-1 md:right-2 bg-comic-blue text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase">You</div>}
                                                <div className="font-black text-5xl md:text-6xl text-comic-yellow-dark/80 mb-2 mt-4">#1</div>
                                                <h3 className="font-black text-base md:text-xl truncate w-full mb-1">{topThree[0].name}</h3>
                                                <p className="text-comic-blue-dark font-black text-[10px] md:text-sm mb-3 uppercase tracking-wider">{getLevelTitle(topThree[0].level).title}</p>
                                                <div className="bg-comic-yellow border-2 border-black text-black rounded-lg py-1.5 px-2 font-black text-sm md:text-lg shadow-[2px_2px_0px_0px_#000]">
                                                    {topThree[0].xp.toLocaleString()} XP
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 3rd Place */}
                                    {topThree[2] && (
                                        <div className="order-3 flex flex-col items-center w-1/3 md:w-auto relative group">
                                            <div className="relative mb-[-1.5rem] z-10 transition-transform group-hover:scale-105">
                                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-black bg-orange-300 flex items-center justify-center text-4xl shadow-[2px_2px_0px_0px_#000] overflow-hidden ring-2 ring-white">
                                                    {topThree[2].avatar.startsWith("http") ? <img src={topThree[2].avatar} alt="" className="w-full h-full object-cover" /> : topThree[2].avatar}
                                                </div>
                                            </div>
                                            <div className="comic-box bg-white pt-8 pb-4 px-1 md:px-4 w-full md:w-40 text-center h-48 md:h-56 flex flex-col justify-end bg-gradient-to-t from-orange-50 to-white relative mt-2 rounded-t-lg md:rounded-xl border-x-4 border-t-4 border-black border-b-0 shadow-[4px_0px_0px_0px_rgba(0,0,0,0.1)]">
                                                {user?.uid === topThree[2].userId && <div className="absolute top-2 right-1 md:right-2 bg-comic-blue text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase">You</div>}
                                                <div className="font-black text-4xl md:text-5xl text-orange-300/80 mb-2 mt-2">#3</div>
                                                <h3 className="font-black text-sm md:text-lg truncate w-full mb-1">{topThree[2].name}</h3>
                                                <p className="text-gray-500 font-bold text-[10px] md:text-sm mb-2">{getLevelTitle(topThree[2].level).title}</p>
                                                <div className="bg-black text-white rounded-md py-1 px-1 font-black text-xs md:text-sm">
                                                    {topThree[2].xp.toLocaleString()} XP
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* The Rest List (Card Style) */}
                            {rest.length > 0 && (
                                <div className="space-y-4">
                                    {rest.map((rUser) => {
                                        const isCurrentUser = user?.uid === rUser.userId;
                                        // Show ellipsis if there is a gap? Not implemented for simplicity, but we can visually separate if rank jump is high.

                                        return (
                                            <div
                                                key={rUser.userId}
                                                className={`flex items-center justify-between p-4 border-4 border-black rounded-2xl bg-white transition-transform hover:scale-[1.01] ${isCurrentUser ? "ring-4 ring-comic-blue ring-offset-2 bg-blue-50" : ""}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 flex items-center justify-center font-black text-xl text-gray-400">
                                                        #{rUser.rank}
                                                    </div>

                                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center overflow-hidden">
                                                        {rUser.avatar.startsWith("http") ? <img src={rUser.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">{rUser.avatar}</span>}
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-black text-lg md:text-xl truncate max-w-[120px] md:max-w-xs leading-none">
                                                                {rUser.name}
                                                            </h3>
                                                            {isCurrentUser && <span className="bg-comic-blue text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">You</span>}
                                                        </div>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-0.5">
                                                            {getLevelTitle(rUser.level).title}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <p className="font-black text-xl md:text-2xl text-comic-blue">
                                                        {rUser.xp.toLocaleString()}
                                                    </p>
                                                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">Total XP</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
