"use client";

import type { LearningProfile, PerformanceHistory, Modality } from "@/lib/adaptiveEngine";

interface LearningInsightsProps {
    learningProfile: LearningProfile | null;
    performanceHistory: PerformanceHistory | null;
}

const MODALITY_META: Record<Modality, { icon: string; label: string; color: string; bar: string }> = {
    visual: { icon: "👀", label: "Visual", color: "text-blue-600", bar: "bg-blue-400" },
    reading: { icon: "📘", label: "Reading", color: "text-green-600", bar: "bg-green-400" },
    handson: { icon: "🧪", label: "Hands On", color: "text-orange-600", bar: "bg-orange-400" },
    listening: { icon: "🎧", label: "Listening", color: "text-purple-600", bar: "bg-purple-400" },
};

const DIFFICULTY_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    beginner: { label: "Beginner", icon: "🌱", color: "text-green-700", bg: "bg-green-100" },
    intermediate: { label: "Intermediate", icon: "🌿", color: "text-blue-700", bg: "bg-blue-100" },
    advanced: { label: "Advanced", icon: "🌳", color: "text-purple-700", bg: "bg-purple-100" },
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

    const maxScore = Math.max(...modalityScores.map((m) => m.score), 1);
    const diffMeta = DIFFICULTY_META[performanceHistory.currentDifficulty] || DIFFICULTY_META.beginner;
    const avgScore = performanceHistory.averageQuizScore;

    let trendIcon = "➡️";
    let trendText = "Steady";
    let trendColor = "text-gray-600";
    if (avgScore >= 80) {
        trendIcon = "📈";
        trendText = "Improving";
        trendColor = "text-green-600";
    } else if (avgScore < 50 && performanceHistory.totalLessonsCompleted > 2) {
        trendIcon = "🎯";
        trendText = "Needs Focus";
        trendColor = "text-orange-600";
    }

    return (
        <div className="rounded-xl border-[3px] border-black bg-white p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Learning Insights</p>
                    <h3 className="text-2xl font-black text-black">Progress Snapshot 📊</h3>
                </div>
                <div className="rounded-xl border-2 border-black bg-comic-yellow px-4 py-2 text-center shadow-[2px_2px_0px_0px_#000]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Quiz Average</p>
                    <p className="text-2xl font-black text-black">{Math.round(avgScore)}%</p>
                </div>
            </div>

            <div className="mb-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Current Level</p>
                    <div className={`mt-2 inline-flex items-center gap-2 rounded-lg border-2 border-black px-3 py-1.5 ${diffMeta.bg}`}>
                        <span>{diffMeta.icon}</span>
                        <span className={`text-sm font-black ${diffMeta.color}`}>{diffMeta.label}</span>
                    </div>
                </div>

                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Trend</p>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-xl">{trendIcon}</span>
                        <span className={`text-sm font-black ${trendColor}`}>{trendText}</span>
                    </div>
                </div>

                <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Lessons Completed</p>
                    <p className="mt-2 text-2xl font-black">{performanceHistory.totalLessonsCompleted}</p>
                </div>
            </div>

            <div className="mb-6">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-gray-400">Learning Strength Meter</p>
                <div className="space-y-3">
                    {modalityScores.map(({ modality, score }, index) => {
                        const meta = MODALITY_META[modality];
                        return (
                            <div key={modality} className="rounded-lg border-2 border-gray-100 bg-gray-50 px-3 py-2">
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span>{meta.icon}</span>
                                        <span className={`text-sm font-black ${meta.color}`}>{meta.label}</span>
                                        {index === 0 && <span className="rounded-full border border-black bg-comic-yellow px-2 py-0.5 text-[10px] font-black uppercase">Top</span>}
                                    </div>
                                    <span className="text-sm font-black text-gray-500">{score}%</span>
                                </div>
                                <div className="h-4 overflow-hidden rounded-full border-2 border-gray-200 bg-white">
                                    <div
                                        className={`h-full ${meta.bar} transition-all duration-700`}
                                        style={{ width: `${Math.max(5, (score / maxScore) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {(performanceHistory.strongTopics.length > 0 || performanceHistory.weakTopics.length > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                    {performanceHistory.strongTopics.length > 0 && (
                        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-3">
                            <p className="mb-2 text-xs font-black uppercase tracking-wider text-green-700">Strengths 💪</p>
                            <div className="flex flex-wrap gap-1">
                                {performanceHistory.strongTopics.map((topic) => (
                                    <span key={topic} className="rounded-full border border-green-600 bg-white px-2 py-0.5 text-xs font-bold capitalize text-green-700">
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {performanceHistory.weakTopics.length > 0 && (
                        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-3">
                            <p className="mb-2 text-xs font-black uppercase tracking-wider text-orange-700">Focus Areas 🎯</p>
                            <div className="flex flex-wrap gap-1">
                                {performanceHistory.weakTopics.map((topic) => (
                                    <span key={topic} className="rounded-full border border-orange-600 bg-white px-2 py-0.5 text-xs font-bold capitalize text-orange-700">
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
