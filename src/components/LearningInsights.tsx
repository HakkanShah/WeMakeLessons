"use client";

import type { LearningProfile, PerformanceHistory, Modality } from "@/lib/adaptiveEngine";

interface LearningInsightsProps {
    learningProfile: LearningProfile | null;
    performanceHistory: PerformanceHistory | null;
}

const MODALITY_META: Record<Modality, { icon: string; label: string; color: string }> = {
    visual: { icon: "👁️", label: "Visual", color: "bg-blue-400" },
    reading: { icon: "📖", label: "Reading", color: "bg-green-400" },
    handson: { icon: "🖐️", label: "Hands-On", color: "bg-orange-400" },
    listening: { icon: "🎧", label: "Listening", color: "bg-purple-400" },
};

const DIFFICULTY_META: Record<string, { label: string; icon: string; color: string }> = {
    beginner: { label: "Beginner", icon: "🌱", color: "text-green-500" },
    intermediate: { label: "Intermediate", icon: "🌿", color: "text-blue-500" },
    advanced: { label: "Advanced", icon: "🌳", color: "text-purple-500" },
};

export default function LearningInsights({
    learningProfile,
    performanceHistory,
}: LearningInsightsProps) {
    if (!learningProfile || !performanceHistory) return null;

    const modalityScores: { modality: Modality; score: number }[] = [
        { modality: "visual" as Modality, score: performanceHistory.visualScore },
        { modality: "reading" as Modality, score: performanceHistory.readingScore },
        { modality: "handson" as Modality, score: performanceHistory.handsonScore },
        { modality: "listening" as Modality, score: performanceHistory.listeningScore },
    ].sort((a, b) => b.score - a.score);

    const maxScore = Math.max(...modalityScores.map(m => m.score), 1);
    const diffMeta = DIFFICULTY_META[performanceHistory.currentDifficulty] || DIFFICULTY_META.beginner;
    const avgScore = performanceHistory.averageQuizScore;

    // Determine trend
    let trendIcon = "→";
    let trendText = "Steady";
    if (avgScore >= 80) { trendIcon = "↑"; trendText = "Trending Up!"; }
    else if (avgScore < 50 && performanceHistory.totalLessonsCompleted > 2) { trendIcon = "↓"; trendText = "Needs Focus"; }

    return (
        <div className="comic-box p-6 bg-white">
            <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">📊</span>
                <h3 className="font-black text-lg uppercase tracking-wider">Learning Insights</h3>
            </div>

            {/* Current Level & Trend */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                <div className="flex-1">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Current Level</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{diffMeta.icon}</span>
                        <span className={`font-black text-lg ${diffMeta.color}`}>{diffMeta.label}</span>
                    </div>
                </div>
                <div className="w-px h-12 bg-gray-200"></div>
                <div className="flex-1">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Trend</p>
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black ${avgScore >= 80 ? 'text-green-500' : avgScore < 50 ? 'text-red-500' : 'text-gray-500'}`}>
                            {trendIcon}
                        </span>
                        <span className="font-black text-lg">{trendText}</span>
                    </div>
                </div>
                <div className="w-px h-12 bg-gray-200"></div>
                <div className="flex-1">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Lessons Done</p>
                    <span className="font-black text-2xl">{performanceHistory.totalLessonsCompleted}</span>
                </div>
            </div>

            {/* Modality Breakdown */}
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">How You Learn Best</p>
            <div className="space-y-3 mb-6">
                {modalityScores.map(({ modality, score }, index) => {
                    const meta = MODALITY_META[modality];
                    return (
                        <div key={modality} className="flex items-center gap-3">
                            <span className="text-xl w-8 text-center">{meta.icon}</span>
                            <span className="font-black text-sm w-20">{meta.label}</span>
                            <div className="flex-1 h-5 bg-gray-100 rounded-full border-2 border-gray-200 overflow-hidden">
                                <div
                                    className={`h-full ${meta.color} rounded-full transition-all duration-700`}
                                    style={{ width: `${Math.max(5, (score / maxScore) * 100)}%` }}
                                />
                            </div>
                            <span className="font-black text-sm w-10 text-right text-gray-500">{score}%</span>
                            {index === 0 && <span className="text-sm">⭐</span>}
                        </div>
                    );
                })}
            </div>

            {/* Strong & Weak Topics */}
            {(performanceHistory.strongTopics.length > 0 || performanceHistory.weakTopics.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                    {performanceHistory.strongTopics.length > 0 && (
                        <div className="p-3 bg-green-50 rounded-xl border-2 border-green-200">
                            <p className="text-xs font-black text-green-600 uppercase mb-2">💪 Strengths</p>
                            <div className="flex flex-wrap gap-1">
                                {performanceHistory.strongTopics.map(t => (
                                    <span key={t} className="px-2 py-0.5 bg-green-200 rounded-full text-xs font-bold text-green-800 capitalize">{t}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {performanceHistory.weakTopics.length > 0 && (
                        <div className="p-3 bg-orange-50 rounded-xl border-2 border-orange-200">
                            <p className="text-xs font-black text-orange-600 uppercase mb-2">🎯 Focus Areas</p>
                            <div className="flex flex-wrap gap-1">
                                {performanceHistory.weakTopics.map(t => (
                                    <span key={t} className="px-2 py-0.5 bg-orange-200 rounded-full text-xs font-bold text-orange-800 capitalize">{t}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
