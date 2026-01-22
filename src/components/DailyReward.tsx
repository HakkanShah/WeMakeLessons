"use client";

import { useState, useEffect } from "react";

interface DailyRewardProps {
    currentStreak: number;
    lastClaimDate?: Date;
    onClaim: (xp: number, gems: number) => void;
}

const rewards = [
    { day: 1, xp: 10, gems: 0, icon: "🎁" },
    { day: 2, xp: 20, gems: 0, icon: "📦" },
    { day: 3, xp: 25, gems: 1, icon: "💎" },
    { day: 4, xp: 30, gems: 0, icon: "🎁" },
    { day: 5, xp: 40, gems: 2, icon: "💎" },
    { day: 6, xp: 50, gems: 0, icon: "🎁" },
    { day: 7, xp: 75, gems: 5, icon: "🎉" },
];

export default function DailyReward({ currentStreak, lastClaimDate, onClaim }: DailyRewardProps) {
    const [canClaim, setCanClaim] = useState(true);
    const [showAnimation, setShowAnimation] = useState(false);
    const [claimedToday, setClaimedToday] = useState(false);

    // Handle streak of 0 by defaulting to day 1
    const safeStreak = Math.max(currentStreak, 1);
    const currentDay = ((safeStreak - 1) % 7) + 1;
    const todayReward = rewards[currentDay - 1] || rewards[0];

    useEffect(() => {
        if (lastClaimDate) {
            const today = new Date();
            const lastClaim = new Date(lastClaimDate);
            const isSameDay = today.toDateString() === lastClaim.toDateString();
            setClaimedToday(isSameDay);
            setCanClaim(!isSameDay);
        }
    }, [lastClaimDate]);

    const handleClaim = () => {
        if (!canClaim || claimedToday) return;

        setShowAnimation(true);
        onClaim(todayReward.xp, todayReward.gems);
        setClaimedToday(true);
        setCanClaim(false);

        setTimeout(() => setShowAnimation(false), 2000);
    };

    return (
        <div className="comic-box p-4 bg-gradient-to-br from-purple-500 to-pink-500 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 text-8xl opacity-10">🎁</div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="font-black text-lg flex items-center gap-2">
                    📦 Daily Reward
                </h3>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                    Day {currentDay}/7
                </span>
            </div>

            {/* Reward Days */}
            <div className="flex gap-1 mb-4 relative z-10">
                {rewards.map((reward, index) => (
                    <div
                        key={index}
                        className={`flex-1 p-2 rounded-lg text-center transition-all ${index + 1 < currentDay
                            ? "bg-white/30"
                            : index + 1 === currentDay
                                ? "bg-white text-purple-600 scale-110 shadow-lg"
                                : "bg-white/10"
                            }`}
                    >
                        <div className="text-lg">{reward.icon}</div>
                        <div className="text-xs font-bold">
                            {index + 1 < currentDay ? "✓" : `D${index + 1}`}
                        </div>
                    </div>
                ))}
            </div>

            {/* Today's Reward */}
            <div className="bg-white/20 rounded-xl p-4 mb-4 relative z-10">
                <div className="text-center">
                    <div className="text-4xl mb-2">{todayReward.icon}</div>
                    <p className="font-black text-xl">+{todayReward.xp} XP</p>
                    {todayReward.gems > 0 && (
                        <p className="font-bold text-sm">+{todayReward.gems} 💎</p>
                    )}
                </div>
            </div>

            {/* Claim Button */}
            <button
                onClick={handleClaim}
                disabled={!canClaim || claimedToday}
                className={`w-full py-3 rounded-xl font-black text-lg uppercase tracking-wider transition-all relative z-10 ${canClaim && !claimedToday
                    ? "bg-white text-purple-600 hover:scale-105 shadow-lg"
                    : "bg-white/30 cursor-not-allowed"
                    }`}
            >
                {claimedToday ? "✓ Claimed!" : "Claim Reward"}
            </button>

            {/* Animation Overlay */}
            {showAnimation && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 animate-pop">
                    <div className="text-center">
                        <div className="text-6xl animate-bounce">🎉</div>
                        <p className="text-2xl font-black">+{todayReward.xp} XP!</p>
                        {todayReward.gems > 0 && (
                            <p className="text-lg font-bold">+{todayReward.gems} 💎</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
