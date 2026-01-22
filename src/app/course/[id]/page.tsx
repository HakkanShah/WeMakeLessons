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
            <header className="bg-white border-b-[3px] border-comic-ink py-8 px-6">
                <div className="max-w-5xl mx-auto">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 font-bold text-gray-500 hover:text-comic-ink mb-6">
                        ← Back to Map
                    </Link>

                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1">
                            <div className="inline-block px-3 py-1 bg-comic-yellow border-2 border-comic-ink rounded text-xs font-black uppercase tracking-widest mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                Mission Briefing
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black mb-4 text-comic-ink leading-tight">
                                {course.title}
                            </h1>
                            <p className="text-xl font-medium text-gray-600 mb-6 leading-relaxed">
                                {course.description}
                            </p>

                            {/* Mission Stats */}
                            <div className="flex gap-4">
                                <div className="comic-badge bg-gray-100">
                                    ⏱️ {course.lessons.reduce((acc, l) => acc + l.duration, 0)} MIN
                                </div>
                                <div className="comic-badge bg-gray-100">
                                    🎮 {course.metadata.difficulty}
                                </div>
                            </div>
                        </div>

                        {/* Progress Card */}
                        <div className="w-full md:w-80 comic-box p-6 bg-comic-blue text-white rotate-1">
                            <h3 className="font-black text-xl mb-2 uppercase">Mission Progress</h3>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-4xl font-black">{progressPercent}%</span>
                                <span className="font-bold opacity-80">{completedCount}/{totalLessons} DONE</span>
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

            <main className="max-w-3xl mx-auto px-6 py-12">

                <h2 className="text-3xl font-black mb-8 border-l-8 border-comic-yellow pl-4">
                    Mission Levels
                </h2>

                <div className="space-y-6 relative">

                    {/* The "Path" Line */}
                    <div className="absolute left-8 top-8 bottom-8 w-1 bg-gray-300 -z-10 border-l-2 border-dashed border-gray-400"></div>

                    {course.lessons.map((lesson, index) => {
                        const isCompleted = progress.completedLessons.includes(lesson.id);
                        const isLocked = index > 0 && !progress.completedLessons.includes(course.lessons[index - 1].id);
                        const isNext = !isCompleted && !isLocked;

                        return (
                            <div key={lesson.id} className={`flex gap-6 items-center group ${isLocked ? 'opacity-60' : ''}`}>

                                {/* Status Icon */}
                                <div className={`
                                    w-16 h-16 rounded-full border-[3px] border-comic-ink flex items-center justify-center text-2xl z-10 font-black shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:scale-110
                                    ${isCompleted ? 'bg-comic-green text-white' :
                                        isLocked ? 'bg-gray-200 text-gray-400' :
                                            'bg-comic-yellow text-comic-ink animate-bounce'}
                                `}>
                                    {isCompleted ? '✓' : isLocked ? '🔒' : (index + 1)}
                                </div>

                                {/* Lesson Card */}
                                <div className={`
                                    flex-1 comic-box p-5 flex items-center justify-between transition-all
                                    ${isNext ? 'border-comic-blue border-4 transform -translate-x-2' : ''}
                                    ${isCompleted ? 'bg-green-50' : 'bg-white'}
                                `}>
                                    <div>
                                        <h3 className="text-xl font-black mb-1">{lesson.title}</h3>
                                        <div className="text-sm font-bold text-gray-500 flex gap-3">
                                            <span>⏱️ {lesson.duration} min</span>
                                            <span>📝 {lesson.quiz.length} Qs</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => !isLocked && router.push(`/course/${courseId}/lesson/${lesson.id}`)}
                                        disabled={isLocked}
                                        className={`
                                            px-6 py-2 rounded-lg font-bold border-2 border-comic-ink text-sm uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none
                                            ${isLocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300 shadow-none' :
                                                isCompleted ? 'bg-white hover:bg-gray-50' :
                                                    'bg-comic-blue text-white hover:bg-comic-blue-dark'}
                                        `}
                                    >
                                        {isCompleted ? 'Replay' : isLocked ? 'Locked' : 'Start'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Completion Bonus */}
                {progressPercent === 100 && (
                    <div className="mt-12 comic-box p-8 bg-comic-yellow text-center animate-pop">
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
