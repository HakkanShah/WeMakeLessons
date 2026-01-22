"use client";

import { useState } from "react";
import { mockUsers, MockUser, getUserRank } from "@/lib/mockUsers";

interface LeaderboardProps {
    userXP: number;
    userName: string;
    userLevel: number;
    compact?: boolean;
}

export default function Leaderboard({ userXP, userName, userLevel, compact = false }: LeaderboardProps) {
    const [timeFilter, setTimeFilter] = useState<"weekly" | "monthly" | "allTime">("weekly");

    // Sort mock users by XP and add user to the mix
    const allUsers = [
        ...mockUsers,
        { id: "you", name: userName || "You", avatar: "⭐", xp: userXP, level: userLevel, streak: 0, coursesCompleted: 0, accuracy: 0, title: "", joinedDaysAgo: 0 }
    ].sort((a, b) => b.xp - a.xp);

    const userRank = getUserRank(userXP);
    const displayUsers = compact ? allUsers.slice(0, 5) : allUsers.slice(0, 10);

    const getRankEmoji = (rank: number) => {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return `#${rank}`;
    };

    const getRankStyle = (rank: number, isUser: boolean) => {
        if (isUser) return "bg-comic-yellow/20 border-comic-yellow";
        if (rank === 1) return "bg-yellow-50";
        if (rank === 2) return "bg-gray-50";
        if (rank === 3) return "bg-orange-50";
        return "bg-white";
    };

    return (
        <div className="comic-box p-4 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-lg flex items-center gap-2">
                    🏆 Leaderboard
                </h3>
                {!compact && (
                    <div className="flex gap-1">
                        {(["weekly", "monthly", "allTime"] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${timeFilter === filter
                                        ? "bg-comic-ink text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {filter === "weekly" ? "Week" : filter === "monthly" ? "Month" : "All"}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* User's Rank Highlight */}
            <div className="bg-comic-blue/10 border-2 border-comic-blue rounded-lg p-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">⭐</span>
                    <div>
                        <p className="font-black text-sm">Your Rank</p>
                        <p className="text-xs text-gray-500">Keep learning to climb!</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-comic-blue">#{userRank}</p>
                    <p className="text-xs font-bold text-gray-500">{userXP.toLocaleString()} XP</p>
                </div>
            </div>

            {/* Leaderboard List */}
            <div className="space-y-2">
                {displayUsers.map((user, index) => {
                    const rank = index + 1;
                    const isUser = user.id === "you";

                    return (
                        <div
                            key={user.id}
                            className={`flex items-center justify-between p-2 rounded-lg border-2 transition-all hover:scale-[1.01] ${getRankStyle(rank, isUser)}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-8 text-center font-black ${rank <= 3 ? "text-lg" : "text-sm text-gray-400"}`}>
                                    {getRankEmoji(rank)}
                                </span>
                                <span className="text-2xl">{user.avatar}</span>
                                <div>
                                    <p className={`font-bold text-sm ${isUser ? "text-comic-blue" : ""}`}>
                                        {isUser ? "You ⭐" : user.name}
                                    </p>
                                    <p className="text-xs text-gray-400">Level {user.level}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-sm">{user.xp.toLocaleString()} XP</p>
                                {user.streak > 0 && (
                                    <p className="text-xs text-orange-500 font-bold">{user.streak}🔥</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {compact && (
                <button className="w-full mt-4 text-center text-sm font-bold text-comic-blue hover:underline">
                    View Full Leaderboard →
                </button>
            )}
        </div>
    );
}
