"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { playSound } from "@/lib/sounds";
import type { LearningProfile, PerformanceHistory } from "@/lib/adaptiveEngine";
import { getRecommendedTopics } from "@/lib/adaptiveEngine";

interface Course {
    id: string;
    title: string;
    description: string;
    lessons?: any[];
    metadata?: { difficulty?: string };
}

interface RecommendedCoursesProps {
    courses: Course[];
    learningProfile: LearningProfile | null;
    performanceHistory: PerformanceHistory | null;
}

export default function RecommendedCourses({
    courses,
    learningProfile,
    performanceHistory,
}: RecommendedCoursesProps) {
    const router = useRouter();

    // Get completed course topics
    const completedTopics = courses.map(c => c.title);

    // Generate recommendations if profile exists
    const recommendations = learningProfile && performanceHistory
        ? getRecommendedTopics(learningProfile, performanceHistory, completedTopics)
        : [];

    const inProgressCourses = courses; // All courses are "in progress" or completed
    const recommendedTopics = recommendations.filter(r => r.category === 'recommended');
    const challengeTopics = recommendations.filter(r => r.category === 'challenge');
    const exploreTopics = recommendations.filter(r => r.category === 'explore');

    const handleTopicClick = (topic: string) => {
        playSound("click");
        // Navigate to generate page with pre-filled topic
        router.push(`/generate?topic=${encodeURIComponent(topic)}`);
    };

    return (
        <div className="space-y-10">
            {/* Continue Learning */}
            {inProgressCourses.length > 0 && (
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-3xl font-black text-black">Continue Learning</h2>
                        <div className="h-1 flex-1 bg-black rounded-full opacity-10"></div>
                    </div>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {inProgressCourses.map((course, index) => {
                            const colors = ['bg-comic-blue', 'bg-comic-yellow', 'bg-comic-red', 'bg-comic-green', 'bg-purple-400', 'bg-orange-400'];
                            const color = colors[index % colors.length];
                            return (
                                <Link
                                    href={`/course/${course.id}`}
                                    key={course.id}
                                    onClickCapture={() => playSound("click")}
                                >
                                    <div className="comic-box h-full flex flex-col group overflow-hidden hover:scale-[1.02] transition-transform">
                                        <div className={`h-32 ${color} p-6 relative border-b-4 border-black flex items-center justify-center`}>
                                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/comic-dots.png')] opacity-20"></div>
                                            <div className="absolute top-3 right-3 bg-white border-2 border-black px-2 py-1 rounded-lg text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000]">
                                                {course.metadata?.difficulty || "Beginner"}
                                            </div>
                                            <span className="text-5xl drop-shadow-lg transform group-hover:scale-110 transition-transform">
                                                {getCourseIcon(course.title)}
                                            </span>
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col bg-white">
                                            <h3 className="font-black text-lg text-black mb-2 line-clamp-2 leading-tight">
                                                {course.title}
                                            </h3>
                                            <p className="text-gray-600 font-medium text-sm mb-4 line-clamp-2 leading-relaxed flex-1">
                                                {course.description}
                                            </p>
                                            <div className="flex items-center justify-between pt-3 border-t-2 border-gray-100">
                                                <span className="font-bold text-gray-500 text-sm">📚 {course.lessons?.length || 0} Levels</span>
                                                <div className="px-3 py-1.5 bg-black text-white rounded-lg font-bold text-sm group-hover:bg-comic-yellow group-hover:text-black transition-colors border-2 border-black">
                                                    PLAY ▶
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Recommended For You */}
            {recommendedTopics.length > 0 && (
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-3xl font-black text-black">Recommended For You</h2>
                        <div className="inline-block px-3 py-1 bg-comic-yellow border-2 border-black rounded-full text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000]">
                            AI Picks ✨
                        </div>
                        <div className="h-1 flex-1 bg-black rounded-full opacity-10"></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {recommendedTopics.slice(0, 6).map((rec, i) => (
                            <button
                                key={i}
                                onClick={() => handleTopicClick(rec.topic)}
                                className="comic-box p-5 bg-white text-left group hover:scale-[1.03] hover:-rotate-1 transition-all"
                            >
                                <div className="text-4xl mb-3 group-hover:animate-bounce">{rec.icon}</div>
                                <h3 className="font-black text-base mb-1 line-clamp-1">{rec.topic}</h3>
                                <p className="text-xs font-bold text-gray-400 line-clamp-2">{rec.reason}</p>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Challenge Yourself */}
            {challengeTopics.length > 0 && (
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-3xl font-black text-black">Challenge Yourself</h2>
                        <div className="h-1 flex-1 bg-black rounded-full opacity-10"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {challengeTopics.map((rec, i) => (
                            <button
                                key={i}
                                onClick={() => handleTopicClick(rec.topic)}
                                className="comic-box p-6 bg-gradient-to-r from-orange-50 to-red-50 text-left flex items-center gap-5 group hover:scale-[1.02] transition-all border-comic-red"
                            >
                                <div className="text-5xl group-hover:animate-bounce shrink-0">🏆</div>
                                <div>
                                    <h3 className="font-black text-lg mb-1">{rec.topic}</h3>
                                    <p className="text-sm font-bold text-gray-500">{rec.reason}</p>
                                </div>
                                <div className="ml-auto px-4 py-2 bg-comic-red text-white rounded-lg font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_#000] shrink-0 group-hover:bg-red-600">
                                    GO →
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Explore New Areas */}
            {exploreTopics.length > 0 && (
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-3xl font-black text-black">Explore New Areas</h2>
                        <div className="h-1 flex-1 bg-black rounded-full opacity-10"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {exploreTopics.map((rec, i) => (
                            <button
                                key={i}
                                onClick={() => handleTopicClick(rec.topic)}
                                className="comic-box p-5 bg-gradient-to-br from-blue-50 to-purple-50 text-left group hover:scale-[1.03] transition-all"
                            >
                                <div className="text-3xl mb-2 group-hover:animate-bounce">{rec.icon}</div>
                                <h3 className="font-black text-base mb-1">{rec.topic}</h3>
                                <p className="text-xs font-bold text-gray-400">{rec.reason}</p>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Empty state — no courses and no recommendations */}
            {inProgressCourses.length === 0 && recommendations.length === 0 && (
                <div className="comic-box p-12 text-center bg-white">
                    <div className="text-6xl mb-4 animate-bounce-slow">🗺️</div>
                    <h3 className="text-2xl font-black text-black mb-2">No missions yet!</h3>
                    <p className="text-gray-500 mb-8 font-medium">Start your first learning adventure to earn XP and badges.</p>
                    <Link href="/generate">
                        <button
                            onClick={() => playSound("click")}
                            className="btn-action inline-flex"
                        >
                            Start Your Journey 🚀
                        </button>
                    </Link>
                </div>
            )}
        </div>
    );
}

function getCourseIcon(title: string) {
    const t = title.toLowerCase();
    if (t.includes('space') || t.includes('star')) return '🚀';
    if (t.includes('math') || t.includes('number')) return '🧮';
    if (t.includes('history') || t.includes('ancient')) return '🏛️';
    if (t.includes('science') || t.includes('chem')) return '🧪';
    if (t.includes('animal') || t.includes('nature')) return '🐾';
    if (t.includes('art') || t.includes('draw')) return '🎨';
    if (t.includes('code') || t.includes('program')) return '💻';
    return '🎒';
}
