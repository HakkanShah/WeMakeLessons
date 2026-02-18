"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import Link from "next/link";
import type { PerformanceHistory } from "@/lib/adaptiveEngine";

interface Lesson {
    id: string;
    title: string;
    content: string;
    duration: number;
    contentType?: "visual" | "reading" | "handson" | "listening";
    visualAssets?: { type: "image" | "gif" | "video"; url: string }[];
    quiz: { question: string; options: string[]; correctAnswer: number }[];
}

interface Course {
    title: string;
    description: string;
    learningObjectives: string[];
    lessons: Lesson[];
    creatorId?: string;
    metadata?: {
        difficulty?: string;
        targetAge?: string;
        language?: string;
        primaryModality?: "visual" | "reading" | "handson" | "listening";
        [key: string]: unknown;
    };
}

interface AdaptiveSnapshot {
    currentDifficulty: string;
    learnerTier: string;
    streakHealth: string;
    tierScore: number;
    reason: string;
}

function hasGifInEveryLesson(course: Course): boolean {
    if (!Array.isArray(course.lessons) || course.lessons.length === 0) return false;
    return course.lessons.every((lesson) =>
        (lesson.visualAssets || []).some((asset) => asset.type === "gif" && /^https?:\/\//i.test(asset.url))
    );
}

const FALLBACK_YOUTUBE_VIDEO_IDS = new Set(["dQw4w9WgXcQ", "8ELbX5CMomE", "5MgBikgcWnY"]);

function extractYouTubeVideoId(url: string): string | null {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
        if (host.includes("youtube.com")) return parsed.searchParams.get("v");
        if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || null;
        return null;
    } catch {
        return null;
    }
}

function isFallbackVideoUrl(url: string): boolean {
    const id = extractYouTubeVideoId(url || "");
    if (!id) return false;
    return FALLBACK_YOUTUBE_VIDEO_IDS.has(id);
}

function hasHealthyVideoCoverage(course: Course): boolean {
    const totalLessons = Array.isArray(course.lessons) ? course.lessons.length : 0;
    if (totalLessons === 0) return false;

    const lessonsWithVideo = course.lessons.filter((lesson) =>
        (lesson.visualAssets || []).some((asset) => asset.type === "video" && /^https?:\/\//i.test(asset.url))
    ).length;
    const distinctVideos = new Set(
        course.lessons
            .flatMap((lesson) => lesson.visualAssets || [])
            .filter((asset) => asset.type === "video" && /^https?:\/\//i.test(asset.url))
            .map((asset) => asset.url)
    ).size;
    const hasFallbackVideo = course.lessons
        .flatMap((lesson) => lesson.visualAssets || [])
        .some((asset) => asset.type === "video" && isFallbackVideoUrl(asset.url));
    const diversityTarget = Math.max(1, Math.ceil(totalLessons * 0.8));

    return lessonsWithVideo >= totalLessons && distinctVideos >= diversityTarget && !hasFallbackVideo;
}

export default function CoursePage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [course, setCourse] = useState<Course | null>(null);
    const [progress, setProgress] = useState<{ completedLessons: string[] }>({ completedLessons: [] });
    const [adaptiveSnapshot, setAdaptiveSnapshot] = useState<AdaptiveSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [permissionErrorMsg, setPermissionErrorMsg] = useState("");
    const videoRetryAttemptsRef = useRef(0);
    const gifRetryAttemptsRef = useRef(0);

    const courseId = params.id as string;

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
            return;
        }

        async function fetchCourse() {
            if (!courseId || authLoading) return;

            setPermissionDenied(false);
            setPermissionErrorMsg("");

            let fetchedCourse: Course | null = null;

            try {
                const courseDoc = await getDoc(doc(db, "courses", courseId));
                if (courseDoc.exists()) {
                    fetchedCourse = courseDoc.data() as Course;
                    setCourse(fetchedCourse);
                }
            } catch (error: unknown) {
                const firebaseError = error as { code?: string; message?: string };
                if (
                    firebaseError?.code === "permission-denied" ||
                    firebaseError?.message?.includes("insufficient permissions")
                ) {
                    setPermissionDenied(true);
                    const message = error instanceof Error ? error.message : "Permission denied";
                    setPermissionErrorMsg(message);
                } else {
                    console.error("Error fetching course:", error);
                }
                setLoading(false);
                return;
            }

            if (user && fetchedCourse) {
                try {
                    const progressRef = doc(db, "course_progress", `${user.uid}_${courseId}`);
                    const progressDoc = await getDoc(progressRef);
                    if (progressDoc.exists()) {
                        const data = progressDoc.data() as { completedLessons?: string[] };
                        setProgress({ completedLessons: data.completedLessons || [] });
                    } else {
                        await setDoc(progressRef, {
                            userId: user.uid,
                            courseId,
                            completedLessons: [],
                            quizScores: {},
                            adaptiveLevel: 1.0,
                            startedAt: serverTimestamp(),
                            lastAccessedAt: serverTimestamp(),
                        });
                        setProgress({ completedLessons: [] });
                    }
                } catch (progressError: unknown) {
                    const firebaseError = progressError as { code?: string; message?: string };
                    if (
                        firebaseError?.code === "permission-denied" ||
                        firebaseError?.message?.includes("insufficient permissions")
                    ) {
                        // Keep the page usable even if progress doc rules are temporarily strict.
                        setProgress({ completedLessons: [] });
                    } else {
                        console.warn("Error fetching/initializing progress:", progressError);
                    }
                }

                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const perf = (userData.performanceHistory || {}) as Partial<PerformanceHistory>;
                        setAdaptiveSnapshot({
                            currentDifficulty: perf.currentDifficulty || "beginner",
                            learnerTier: perf.learnerTier || "beginner",
                            streakHealth: perf.streakHealth || "warning",
                            tierScore: Number(perf.tierScore || 0),
                            reason: perf.difficultyChangeReason || "Difficulty adapts based on your quiz trend.",
                        });
                    }
                } catch (adaptiveError) {
                    console.warn("Failed to fetch adaptive snapshot:", adaptiveError);
                }
            }

            setLoading(false);
        }

        fetchCourse();
    }, [courseId, user, authLoading, router]);

    useEffect(() => {
        if (!course || !user || permissionDenied) return;
        if (course.creatorId && course.creatorId !== user.uid) return;
        if (hasHealthyVideoCoverage(course)) return;
        if (videoRetryAttemptsRef.current >= 2) return;

        let cancelled = false;
        const triggerVideoRetry = async () => {
            videoRetryAttemptsRef.current += 1;

            try {
                const courseRef = doc(db, "courses", courseId);
                const latestSnap = await getDoc(courseRef);
                const latestCourse = (latestSnap.exists() ? latestSnap.data() : course) as Course;

                const retryRes = await fetch("/api/retry-videos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        topic: String(latestCourse.metadata?.topic || latestCourse.title || "").trim(),
                        course: latestCourse,
                        maxAttempts: 2,
                    }),
                });

                if (!retryRes.ok) return;
                const retryPayload = await retryRes.json();
                const retriedCourse = retryPayload?.course as {
                    lessons?: Lesson[];
                    metadata?: Course["metadata"];
                } | null;
                if (!retriedCourse || !Array.isArray(retriedCourse.lessons)) return;

                const mergedMetadata = {
                    ...(latestCourse.metadata || {}),
                    ...(retriedCourse.metadata || {}),
                };

                await updateDoc(courseRef, {
                    lessons: retriedCourse.lessons,
                    metadata: mergedMetadata,
                });

                if (!cancelled) {
                    setCourse({
                        ...latestCourse,
                        lessons: retriedCourse.lessons,
                        metadata: mergedMetadata,
                    });
                }
            } catch (error) {
                console.warn("Background video retry failed:", error);
            }
        };

        const timer = window.setTimeout(
            () => {
                void triggerVideoRetry();
            },
            videoRetryAttemptsRef.current === 0 ? 400 : 12000
        );

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [course, courseId, permissionDenied, user]);

    useEffect(() => {
        if (!course || !user || permissionDenied) return;
        if (course.creatorId && course.creatorId !== user.uid) return;
        if (hasGifInEveryLesson(course)) return;
        if (gifRetryAttemptsRef.current >= 2) return;

        let cancelled = false;
        const triggerGifRetry = async () => {
            gifRetryAttemptsRef.current += 1;

            try {
                const courseRef = doc(db, "courses", courseId);
                const latestSnap = await getDoc(courseRef);
                const latestCourse = (latestSnap.exists() ? latestSnap.data() : course) as Course;

                const retryRes = await fetch("/api/retry-gifs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        topic: String(latestCourse.metadata?.topic || latestCourse.title || "").trim(),
                        course: latestCourse,
                        maxAttempts: 3,
                    }),
                });

                if (!retryRes.ok) return;
                const retryPayload = await retryRes.json();
                const retriedCourse = retryPayload?.course as {
                    lessons?: Lesson[];
                    metadata?: Course["metadata"];
                } | null;

                if (!retriedCourse || !Array.isArray(retriedCourse.lessons)) return;

                const mergedMetadata = {
                    ...(latestCourse.metadata || {}),
                    ...(retriedCourse.metadata || {}),
                };

                await updateDoc(courseRef, {
                    lessons: retriedCourse.lessons,
                    metadata: mergedMetadata,
                });

                if (!cancelled) {
                    setCourse({
                        ...latestCourse,
                        lessons: retriedCourse.lessons,
                        metadata: mergedMetadata,
                    });
                }
            } catch (error) {
                console.warn("Background Visual retry failed:", error);
            }
        };

        const timer = window.setTimeout(
            () => {
                void triggerGifRetry();
            },
            gifRetryAttemptsRef.current === 0 ? 300 : 12000
        );

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [course, courseId, permissionDenied, user]);

    const stats = useMemo(() => {
        if (!course) return null;

        const completedCount = progress.completedLessons.length;
        const totalLessons = course.lessons.length;
        const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
        const totalMinutes = course.lessons.reduce((acc, lesson) => acc + lesson.duration, 0);
        const totalVisualAssets = course.lessons.reduce(
            (total, lesson) => total + (lesson.visualAssets?.length || 0),
            0
        );

        return {
            completedCount,
            totalLessons,
            progressPercent,
            totalMinutes,
            totalVisualAssets,
        };
    }, [course, progress.completedLessons]);

    if (loading) {
        return (
            <div className="min-h-screen bg-comic-paper flex items-center justify-center">
                <div className="text-3xl font-black animate-pulse">Loading mission...</div>
            </div>
        );
    }

    if (permissionDenied) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-comic-paper p-6">
                <h1 className="text-3xl font-black mb-4">Access denied</h1>
                <p className="text-lg font-bold text-gray-500 mb-6 text-center max-w-xl">
                    You do not have permission to view this course.
                </p>
                <p className="font-mono text-xs text-gray-500 mb-6">{permissionErrorMsg}</p>
                <Link href="/dashboard">
                    <button className="btn-primary">Return to dashboard</button>
                </Link>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-comic-paper">
                <h1 className="text-3xl font-black mb-4">Course not found</h1>
                <Link href="/dashboard">
                    <button className="btn-primary">Return to dashboard</button>
                </Link>
            </div>
        );
    }

    if (!course.lessons || !Array.isArray(course.lessons) || course.lessons.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-comic-paper">
                <h1 className="text-3xl font-black mb-4">Course is empty</h1>
                <p className="text-lg font-bold text-gray-500 mb-8 text-center max-w-md">
                    This course has no playable lessons yet.
                </p>
                <Link href="/dashboard">
                    <button className="btn-primary">Return to dashboard</button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-comic-paper bg-dot-pattern">
            <header className="bg-white border-b-[3px] border-comic-ink py-6 md:py-8 px-4 md:px-6">
                <div className="max-w-6xl mx-auto">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 font-bold text-gray-500 hover:text-comic-ink mb-4 md:mb-6">
                        &larr; Back to map
                    </Link>

                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="flex-1 w-full">
                            <div className="inline-block px-3 py-1 bg-comic-yellow border-2 border-comic-ink rounded text-xs font-black uppercase tracking-widest mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                Mission briefing
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black mb-4 text-comic-ink leading-tight">
                                {course.title}
                            </h1>
                            <p className="text-lg md:text-xl font-medium text-gray-600 mb-6 leading-relaxed">
                                {course.description}
                            </p>

                            <div className="flex flex-wrap gap-3 md:gap-4">
                                <div className="comic-badge bg-gray-100 text-sm md:text-base">
                                    TIME {stats?.totalMinutes || 0} min
                                </div>
                                <div className="comic-badge bg-gray-100 text-sm md:text-base">
                                    DIFF {course.metadata?.difficulty || "adaptive"}
                                </div>
                                {adaptiveSnapshot && (
                                    <div className="comic-badge bg-gray-100 text-sm md:text-base">
                                        TIER {adaptiveSnapshot.learnerTier}
                                    </div>
                                )}
                                <div className="comic-badge bg-gray-100 text-sm md:text-base">
                                    MODE {course.metadata?.primaryModality || "mixed"}
                                </div>
                                <div className="comic-badge bg-gray-100 text-sm md:text-base">
                                    MEDIA {stats?.totalVisualAssets || 0} visuals
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-80 comic-box p-6 bg-comic-blue text-white rotate-1">
                            <h3 className="font-black text-lg md:text-xl mb-2 uppercase">Mission progress</h3>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-3xl md:text-4xl font-black">{stats?.progressPercent || 0}%</span>
                                <span className="font-bold opacity-80 text-sm md:text-base">
                                    {stats?.completedCount || 0}/{stats?.totalLessons || 0} done
                                </span>
                            </div>
                            <div className="h-4 bg-black/20 rounded-full border-2 border-white/30 overflow-hidden">
                                <div className="h-full bg-comic-yellow" style={{ width: `${stats?.progressPercent || 0}%` }} />
                            </div>
                            {adaptiveSnapshot && (
                                <div className="mt-3 space-y-1 text-xs font-bold">
                                    <p className="uppercase tracking-wider">Adaptive difficulty: {adaptiveSnapshot.currentDifficulty}</p>
                                    <p className="uppercase tracking-wider">Streak health: {adaptiveSnapshot.streakHealth}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
                <div className="mb-8">
                    <h2 className="text-3xl font-black border-l-8 border-comic-yellow pl-4">Adventure map</h2>
                    <p className="mt-2 text-gray-600 font-bold pl-4">
                        Complete each level to unlock the next one.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {course.lessons.map((lesson, index) => {
                        const isCompleted = progress.completedLessons.includes(lesson.id);
                        const isLocked =
                            index > 0 && !progress.completedLessons.includes(course.lessons[index - 1].id);
                        const isNext = !isCompleted && !isLocked;

                        return (
                            <button
                                key={lesson.id}
                                onClick={() => !isLocked && router.push(`/course/${courseId}/lesson/${lesson.id}`)}
                                disabled={isLocked}
                                className={`
                                    group relative flex flex-col items-start text-left p-6 rounded-2xl border-[3px] border-black transition-all duration-300
                                    ${
                                        isLocked
                                            ? "bg-gray-100/50 text-gray-400 cursor-not-allowed grayscale"
                                            : "bg-white hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                                    }
                                    ${isNext ? "ring-4 ring-comic-blue/30" : ""}
                                    ${isCompleted ? "bg-green-50/50" : ""}
                                    ${index % 2 === 0 ? "rotate-[-0.5deg]" : "rotate-[0.5deg]"}
                                `}
                            >
                                <div
                                    className={`
                                    absolute -top-4 -right-4 w-12 h-12 rounded-full border-[3px] border-black flex items-center justify-center font-black text-xl shadow-sm z-10
                                    ${
                                        isCompleted
                                            ? "bg-comic-green text-white"
                                            : isLocked
                                              ? "bg-gray-200 text-gray-400"
                                              : "bg-comic-yellow text-comic-ink group-hover:animate-bounce"
                                    }
                                `}
                                >
                                    {isCompleted ? "OK" : isLocked ? "LOCK" : index + 1}
                                </div>

                                <h3 className="text-xl md:text-2xl font-black mb-3 pr-6 leading-tight group-hover:text-comic-blue transition-colors">
                                    {lesson.title}
                                </h3>

                                <div className="mt-auto flex flex-wrap items-center gap-2 text-sm font-bold text-gray-500 w-full mb-4">
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">TIME {lesson.duration}m</span>
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">QUIZ {lesson.quiz.length}Q</span>
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                        {getLessonIcon(lesson.contentType)} {lesson.contentType || "mixed"}
                                    </span>
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">MEDIA {lesson.visualAssets?.length || 0}</span>
                                </div>

                                <div
                                    className={`
                                    w-full py-2 text-center rounded-lg font-black text-sm uppercase tracking-widest border-2 border-black
                                    ${
                                        isLocked
                                            ? "bg-gray-100 border-gray-300 text-gray-400"
                                            : isCompleted
                                              ? "bg-white text-comic-green border-comic-green"
                                              : "bg-comic-blue text-white group-hover:bg-comic-blue-dark"
                                    }
                                `}
                                >
                                    {isCompleted ? "Completed" : isLocked ? "Locked" : "Start mission"}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {(stats?.progressPercent || 0) === 100 && (
                    <div className="mt-12 comic-box p-8 bg-comic-yellow text-center animate-pop flex flex-col items-center justify-center">
                        <div className="text-6xl mb-4">??</div>
                        <h3 className="text-3xl font-black mb-2">Mission complete</h3>
                        <p className="font-bold text-xl mb-6">You mastered this topic. Ready for the next adventure?</p>
                        <Link href="/dashboard">
                            <button className="btn-secondary">Find new mission</button>
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}

function getLessonIcon(contentType?: Lesson["contentType"]) {
    if (contentType === "visual") return "VIS";
    if (contentType === "handson") return "LAB";
    if (contentType === "listening") return "AUDIO";
    if (contentType === "reading") return "READ";
    return "PATH";
}

