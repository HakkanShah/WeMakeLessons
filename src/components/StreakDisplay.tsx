"use client";

import { getStreakLevel } from "@/lib/mockUsers";

interface StreakDisplayProps {
    streak: number;
    showMultiplier?: boolean;
}

export default function StreakDisplay({ streak, showMultiplier = true }: StreakDisplayProps) {
    const { emoji, multiplier, name } = getStreakLevel(streak);

    return (
        <div className="relative">
            {/* Main Streak Display */}
            <div className={`
                comic-box p-4 text-center transition-all
                ${streak >= 30 ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' :
                    streak >= 14 ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' :
                        streak >= 7 ? 'bg-gradient-to-br from-comic-red to-orange-500 text-white' :
                            streak >= 3 ? 'bg-comic-red text-white' :
                                'bg-white'}
            `}>
                {/* Animated Fire for high streaks */}
                {streak >= 7 && (
                    <div className="absolute -top-3 -right-3 text-3xl animate-bounce">
                        {streak >= 30 ? '👑' : '⭐'}
                    </div>
                )}

                <div className="text-4xl mb-1">{emoji}</div>
                <div className="text-3xl font-black">{streak}</div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                    Day Streak
                </div>

                {/* Streak Level Name */}
                <div className={`
                    mt-2 text-xs font-black uppercase px-2 py-1 rounded-full inline-block
                    ${streak >= 7 ? 'bg-white/20' : 'bg-comic-ink/10'}
                `}>
                    {name}
                </div>

                {/* XP Multiplier */}
                {showMultiplier && multiplier > 1 && (
                    <div className="mt-2 text-xs font-bold bg-white/20 rounded-full px-2 py-1 inline-block">
                        ⚡ {multiplier}x XP Bonus
                    </div>
                )}
            </div>

            {/* Streak Protection Status */}
            {streak > 0 && (
                <div className="mt-2 text-center text-xs text-gray-500 font-bold">
                    🛡️ Don&apos;t break it!
                </div>
            )}

            {/* Next Milestone */}
            {streak < 100 && (
                <div className="mt-2 bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs font-bold text-gray-400">
                        Next: {
                            streak < 3 ? '3 days → 🔥' :
                                streak < 7 ? '7 days → 🔥🔥' :
                                    streak < 14 ? '14 days → 🔥🔥🔥' :
                                        streak < 30 ? '30 days → 💜🔥' :
                                            '100 days → 👑🔥'
                        }
                    </p>
                    <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div
                            className="h-full bg-comic-red"
                            style={{
                                width: `${streak < 3 ? (streak / 3) * 100 :
                                        streak < 7 ? ((streak - 3) / 4) * 100 :
                                            streak < 14 ? ((streak - 7) / 7) * 100 :
                                                streak < 30 ? ((streak - 14) / 16) * 100 :
                                                    ((streak - 30) / 70) * 100
                                    }%`
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
