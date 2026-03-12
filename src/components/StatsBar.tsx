"use client";

import { getXPForLevel, getLevelTitle, getStreakLevel } from "@/lib/mockUsers";

interface StatsBarProps {
    xp: number;
    level: number;
    streak: number;
    gems: number;
    coursesCount: number;
}

export default function StatsBar({ xp, level, streak, gems, coursesCount }: StatsBarProps) {
    const { required: xpRequired, total: xpForLevel } = getXPForLevel(level);
    const xpForCurrentLevel = level > 1 ? getXPForLevel(level - 1).total : 0;
    const progressXP = xp - xpForCurrentLevel;
    const progressPercent = Math.min((progressXP / xpRequired) * 100, 100);
    const { title, color } = getLevelTitle(level);
    const { emoji: streakEmoji } = getStreakLevel(streak);

    return (
        <div className="comic-box p-4 bg-white mb-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                {/* XP */}
                <div className="flex items-center gap-3 p-3 bg-comic-yellow/20 rounded-xl border-2 border-comic-yellow">
                    <span className="text-2xl">⚡</span>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">XP</p>
                        <p className="font-black text-lg">{xp.toLocaleString()}</p>
                    </div>
                </div>

                {/* Level */}
                <div className="flex items-center gap-3 p-3 bg-comic-blue/20 rounded-xl border-2 border-comic-blue">
                    <span className="text-2xl">🛡️</span>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Level</p>
                        <p className="font-black text-lg">{level}</p>
                    </div>
                </div>

                {/* Streak */}
                <div className="flex items-center gap-3 p-3 bg-comic-red/20 rounded-xl border-2 border-comic-red">
                    <span className="text-2xl">{streakEmoji}</span>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Streak</p>
                        <p className="font-black text-lg">{streak} Days</p>
                    </div>
                </div>

                {/* Gems */}
                <div className="flex items-center gap-3 p-3 bg-purple-100 rounded-xl border-2 border-purple-300">
                    <span className="text-2xl">💎</span>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Gems</p>
                        <p className="font-black text-lg">{gems}</p>
                    </div>
                </div>

                {/* Courses */}
                <div className="flex items-center gap-3 p-3 bg-comic-green/20 rounded-xl border-2 border-comic-green">
                    <span className="text-2xl">📚</span>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Courses</p>
                        <p className="font-black text-lg">{coursesCount}</p>
                    </div>
                </div>
            </div>

            {/* Level Progress */}
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`font-black text-sm uppercase ${color}`}>{title}</span>
                        <span className="text-gray-400 font-bold text-sm">Level {level}</span>
                    </div>
                    <div className="text-right">
                        <span className="font-bold text-sm text-gray-500">
                            {progressXP} / {xpRequired} XP
                        </span>
                    </div>
                </div>

                <div className="h-4 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300">
                    <div
                        className="h-full bg-gradient-to-r from-comic-blue to-comic-blue-dark transition-all duration-500 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <div className="flex justify-between mt-2">
                    <span className="text-xs font-bold text-gray-400">Level {level}</span>
                    <span className="text-xs font-bold text-comic-blue">
                        {Math.round(progressPercent)}% to Level {level + 1}
                    </span>
                </div>
            </div>
        </div>
    );
}
