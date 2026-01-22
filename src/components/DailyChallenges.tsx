"use client";

import { useState, useEffect } from "react";
import { dailyChallenges, DailyChallenge } from "@/lib/mockUsers";

interface DailyChallengesProps {
    completedLessons: number;
    quizScores: number[];
    streak: number;
}

export default function DailyChallenges({ completedLessons, quizScores, streak }: DailyChallengesProps) {
    const [challenges, setChallenges] = useState<(DailyChallenge & { completed: boolean; progress: number })[]>([]);
    const [timeRemaining, setTimeRemaining] = useState("");

    useEffect(() => {
        // Calculate challenge progress
        const updatedChallenges = dailyChallenges.slice(0, 3).map(challenge => {
            let progress = 0;
            let completed = false;

            switch (challenge.type) {
                case "lesson":
                    progress = Math.min(completedLessons, challenge.target);
                    completed = completedLessons >= challenge.target;
                    break;
                case "quiz":
                    const bestScore = quizScores.length > 0 ? Math.max(...quizScores) : 0;
                    progress = Math.min(bestScore, challenge.target);
                    completed = bestScore >= challenge.target;
                    break;
                case "streak":
                    progress = streak > 0 ? 1 : 0;
                    completed = streak > 0;
                    break;
            }

            return { ...challenge, completed, progress };
        });

        setChallenges(updatedChallenges);
    }, [completedLessons, quizScores, streak]);

    // Update time remaining
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const diff = tomorrow.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setTimeRemaining(`${hours}h ${minutes}m`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, []);

    const completedCount = challenges.filter(c => c.completed).length;

    return (
        <div className="comic-box p-4 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-lg flex items-center gap-2">
                    🎯 Daily Challenges
                </h3>
                <div className="text-xs font-bold text-gray-400">
                    ⏰ Resets in {timeRemaining}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{completedCount}/{challenges.length} Completed</span>
                    <span className="text-comic-green">{completedCount === challenges.length ? "🎉 All Done!" : ""}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div
                        className="h-full bg-gradient-to-r from-comic-green to-comic-blue transition-all duration-500"
                        style={{ width: `${(completedCount / challenges.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Challenge List */}
            <div className="space-y-3">
                {challenges.map((challenge) => (
                    <div
                        key={challenge.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${challenge.completed
                                ? "bg-comic-green/10 border-comic-green"
                                : "bg-gray-50 border-gray-200"
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${challenge.completed ? "bg-comic-green text-white" : "bg-white border-2 border-gray-200"
                            }`}>
                            {challenge.completed ? "✓" : challenge.icon}
                        </div>

                        <div className="flex-1">
                            <p className={`font-bold text-sm ${challenge.completed ? "line-through text-gray-400" : ""}`}>
                                {challenge.title}
                            </p>
                            <p className="text-xs text-gray-500">{challenge.description}</p>
                        </div>

                        <div className="text-right">
                            <p className="font-black text-xs text-comic-yellow">+{challenge.xpReward} XP</p>
                            {challenge.gemReward > 0 && (
                                <p className="text-xs font-bold text-purple-500">+{challenge.gemReward} 💎</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bonus for completing all */}
            {completedCount === challenges.length && (
                <div className="mt-4 p-3 bg-gradient-to-r from-comic-yellow to-comic-yellow-dark rounded-xl border-2 border-comic-ink text-center animate-pop">
                    <p className="font-black">🎉 Daily Bonus Unlocked!</p>
                    <p className="text-sm font-bold">+50 XP + 5 💎</p>
                </div>
            )}
        </div>
    );
}
