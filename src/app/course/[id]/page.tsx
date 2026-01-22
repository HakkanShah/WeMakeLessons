"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";

interface Lesson {
    id: string;
    title: string;
    content: string;
    duration: number;
    quiz: { question: string; options: string[]; correctAnswer: number }[];
}

interface Course {
    title: string;
    description: string;
    learningObjectives: string[];
    lessons: Lesson[];
    metadata: {
        difficulty: string;
        targetAge: string;
        language: string;
    };
}

export default function CoursePage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [progress, setProgress] = useState<{ completedLessons: string[] }>({
        completedLessons: [],
    });
    const [loading, setLoading] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);

    const [permissionErrorMsg, setPermissionErrorMsg] = useState("");

    const courseId = params.id as string;

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
            return;
        }

        async function fetchCourse() {
            if (!courseId) return;
            // Wait for auth to initialize to prevent false positive permission errors
            if (authLoading) return;

            setPermissionDenied(false); // Reset error state on new attempt
            setPermissionErrorMsg("");

            let courseData: Course | null = null;

            // 1. Fetch Course (Blocking)
            try {
                const courseDoc = await getDoc(doc(db, "courses", courseId));
                if (courseDoc.exists()) {
                    const data = courseDoc.data();
                    console.log("CoursePage: Fetched course:", data);

                    // DEBUG: Check creator matching
                    if (user && data.creatorId && user.uid !== data.creatorId) {
                        console.warn(`Mismatch! User: ${user.uid}, Creator: ${data.creatorId}`);
                    }

                    courseData = data as Course;
                    setCourse(courseData);
                }
            } catch (error: any) {
                // Check for permission error
                if (error?.code === "permission-denied" || error?.message?.includes("insufficient permissions")) {
                    setPermissionDenied(true);
                    setPermissionErrorMsg(error.message);
                } else {
                    console.error("Error fetching course:", error);
                }
                setLoading(false);
                return; // Stop if course fetch fails
            }

            // 2. Fetch Progress (Non-Blocking)
            if (user && courseData) {
                try {
                    const progressDoc = await getDoc(
                        doc(db, "course_progress", `${user.uid}_${courseId}`)
                    );
                    if (progressDoc.exists()) {
                        setProgress(progressDoc.data() as { completedLessons: string[] });
                    } else {
                        // Try to initialize progress
                        try {
                            await setDoc(doc(db, "course_progress", `${user.uid}_${courseId}`), {
                                userId: user.uid,
                                courseId,
                                completedLessons: [],
                                quizScores: {},
                                adaptiveLevel: 1.0,
                                startedAt: serverTimestamp(),
                                lastAccessedAt: serverTimestamp(),
                            });
                        } catch (writeError) {
                            console.warn("Could not create stats - continuing anyway", writeError);
                            // Do not setPermissionDenied here; let the user see the course
                        }
                    }
                } catch (progressError) {
                    console.warn("Error fetching progress:", progressError);
                    // Do not block the page for progress errors
                }
            }

            setLoading(false);
        }

        fetchCourse();
    }, [courseId, user, authLoading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-comic-paper flex items-center justify-center">
                <div className="text-3xl font-black animate-pulse">Loading Mission... 📂</div>
            </div>
        );
    }

    // Permission Denied UI
    if (permissionDenied) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-comic-paper">
                <div className="text-8xl mb-4 grayscale opacity-50">🔒</div>
                <h1 className="text-3xl font-black mb-4">Access Denied!</h1>
                <p className="text-xl font-bold text-gray-500 mb-8 max-w-md text-center">
                    You don't have permission to view this top-secret mission file.
                </p>
                <Link href="/dashboard">
                    <button className="btn-primary">Return to Base</button>
                </Link>

                {/* DEBUG INFO */}
                <div className="mt-8 p-6 bg-gray-200 rounded-lg text-left font-mono text-xs text-gray-700 w-full max-w-lg overflow-hidden border-2 border-gray-400">
                    <p className="font-bold mb-2 border-b border-gray-400 pb-1">🕵️ AGENT DEBUG LOG</p>
                    <div className="space-y-1">
                        <p><span className="font-bold">User ID:</span> {user?.uid || "NULL (Not Logged In)"}</p>
                        <p><span className="font-bold">Auth Status:</span> {authLoading ? "Loading..." : "Ready"}</p>
                        <p><span className="font-bold">Course ID:</span> {courseId}</p>
                        <p><span className="font-bold">Error Msg:</span> {permissionErrorMsg || "Unknown Permission Error"}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-comic-paper">
                <div className="text-8xl mb-4 grayscale opacity-50">🏝️</div>
                <h1 className="text-3xl font-black mb-4">Mission Not Found!</h1>
                <Link href="/dashboard">
                    <button className="btn-primary">Return to Base</button>
                </Link>
            </div>
        );
    }

    if (!course.lessons || !Array.isArray(course.lessons) || course.lessons.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-comic-paper">
                <div className="text-8xl mb-4 grayscale opacity-50">💔</div>
                <h1 className="text-3xl font-black mb-4">Mission Corrupted!</h1>
                <p className="text-xl font-bold text-gray-500 mb-8 max-w-md text-center">
                    The mission data seems to be empty or broken.
                </p>
                <Link href="/dashboard">
                    <button className="btn-primary">Return to Base</button>
                </Link>
            </div>
        );
    }

    const completedCount = progress.completedLessons.length;
    const totalLessons = course.lessons.length;
    const progressPercent = Math.round((completedCount / totalLessons) * 100);

    return (
        <div className="min-h-screen bg-comic-paper bg-dot-pattern">

            {/* Header / Mission Briefing */}
            <header className="bg-white border-b-[3px] border-comic-ink py-6 md:py-8 px-4 md:px-6">
                <div className="max-w-5xl mx-auto">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 font-bold text-gray-500 hover:text-comic-ink mb-4 md:mb-6">
                        ← Back to Map
                    </Link>

                    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                        <div className="flex-1 w-full">
                            <div className="inline-block px-3 py-1 bg-comic-yellow border-2 border-comic-ink rounded text-xs font-black uppercase tracking-widest mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                Mission Briefing
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black mb-4 text-comic-ink leading-tight">
                                {course.title}
                            </h1>
                            <p className="text-lg md:text-xl font-medium text-gray-600 mb-6 leading-relaxed">
                                {course.description}
                            </p>

                            {/* Mission Stats */}
                            <div className="flex flex-wrap gap-3 md:gap-4">
                                <div className="comic-badge bg-gray-100 text-sm md:text-base">
                                    ⏱️ {course.lessons.reduce((acc, l) => acc + l.duration, 0)} MIN
                                </div>
                                <div className="comic-badge bg-gray-100 text-sm md:text-base">
                                    🎮 {course.metadata.difficulty}
                                </div>
                            </div>
                        </div>

                        {/* Progress Card */}
                        <div className="w-full md:w-80 comic-box p-5 md:p-6 bg-comic-blue text-white rotate-1 mt-4 md:mt-0">
                            <h3 className="font-black text-lg md:text-xl mb-2 uppercase">Mission Progress</h3>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-3xl md:text-4xl font-black">{progressPercent}%</span>
                                <span className="font-bold opacity-80 text-sm md:text-base">{completedCount}/{totalLessons} DONE</span>
                            </div>
                            <div className="h-4 bg-black/20 rounded-full border-2 border-white/30 overflow-hidden">
                                <div
                                    className="h-full bg-comic-yellow"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">

                <h2 className="text-3xl font-black mb-8 border-l-8 border-comic-yellow pl-4">
                    Mission Levels
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {course.lessons.map((lesson, index) => {
                        const isCompleted = progress.completedLessons.includes(lesson.id);
                        const isLocked = index > 0 && !progress.completedLessons.includes(course.lessons[index - 1].id);
                        const isNext = !isCompleted && !isLocked;

                        return (
                            <button
                                key={lesson.id}
                                onClick={() => !isLocked && router.push(`/course/${courseId}/lesson/${lesson.id}`)}
                                disabled={isLocked}
                                className={`
                                    group relative flex flex-col items-start text-left p-6 rounded-2xl border-[3px] border-black transition-all duration-300
                                    ${isLocked
                                        ? 'bg-gray-100/50 text-gray-400 cursor-not-allowed grayscale'
                                        : 'bg-white hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer'
                                    }
                                    ${isNext ? 'ring-4 ring-comic-blue/30' : ''}
                                    ${isCompleted ? 'bg-green-50/50' : ''}
                                `}
                            >
                                {/* Badge */}
                                <div className={`
                                    absolute -top-4 -right-4 w-12 h-12 rounded-full border-[3px] border-black flex items-center justify-center font-black text-xl shadow-sm z-10
                                    ${isCompleted ? 'bg-comic-green text-white' : isLocked ? 'bg-gray-200 text-gray-400' : 'bg-comic-yellow text-comic-ink group-hover:animate-bounce'}
                                `}>
                                    {isCompleted ? '✓' : isLocked ? '🔒' : (index + 1)}
                                </div>

                                <h3 className="text-xl md:text-2xl font-black mb-3 pr-6 leading-tight group-hover:text-comic-blue transition-colors">
                                    {lesson.title}
                                </h3>

                                <div className="mt-auto flex items-center gap-4 text-sm font-bold text-gray-500 w-full mb-4">
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                        ⏱️ {lesson.duration}m
                                    </span>
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                        📝 {lesson.quiz.length}Q
                                    </span>
                                </div>

                                <div className={`
                                    w-full py-2 text-center rounded-lg font-black text-sm uppercase tracking-widest border-2 border-black
                                    ${isLocked ? 'bg-gray-100 border-gray-300 text-gray-400' :
                                        isCompleted ? 'bg-white text-comic-green border-comic-green' :
                                            'bg-comic-blue text-white group-hover:bg-comic-blue-dark'}
                                `}>
                                    {isCompleted ? 'Completed' : isLocked ? 'Locked' : 'Start Mission'}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Completion Bonus */}
                {progressPercent === 100 && (
                    <div className="mt-12 comic-box p-8 bg-comic-yellow text-center animate-pop flex flex-col items-center justify-center">
                        <div className="text-6xl mb-4">🏆</div>
                        <h3 className="text-3xl font-black mb-2">Mission Complete!</h3>
                        <p className="font-bold text-xl mb-6">You&apos;ve mastered this topic. Amazing work!</p>
                        <Link href="/dashboard">
                            <button className="btn-secondary">Find New Mission</button>
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
