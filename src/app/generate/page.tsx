"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";

import LoadingMiniGamesOverlay from "@/components/generate/LoadingMiniGamesOverlay";
import Sidebar from "@/components/Sidebar";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useSound } from "@/hooks/useSound";
import { db } from "@/lib/firebase";
import { useDashboardData } from "@/lib/useDashboardData";
import {
    buildCourseDescription,
    normalizeDifficulty,
    type CourseDifficulty,
    type StructuredCourse,
} from "@/lib/structuredCourse";

const STATUS_MESSAGES = [
    "Ollie is sketching your quest map...",
    "Packing every stop with lessons and examples...",
    "Setting up quiz checkpoints and practice missions...",
    "Polishing your adventure board...",
] as const;

const LOADING_VOICE_MESSAGES = [
    "Course generation has started.",
    "Please do not close or refresh this page.",
    "We are building modules, lessons, and assessments for your topic.",
    "Video and diagram support are being prepared for each lesson.",
    "Final quality checks are in progress.",
] as const;

const DURATION_OPTIONS = [
    "2 weeks",
    "4 weeks",
    "6 weeks",
    "8 weeks",
    "Self-paced",
] as const;

const LEVEL_TONES: Record<CourseDifficulty, { label: string; blurb: string; emoji: string; color: string; accent: string }> = {
    beginner: {
        label: "Starter Quest",
        blurb: "Gentle ramp-up with quick wins.",
        emoji: "🌱",
        color: "bg-comic-green",
        accent: "text-emerald-700",
    },
    intermediate: {
        label: "Hero Quest",
        blurb: "Faster pacing, tougher checks.",
        emoji: "⚔️",
        color: "bg-comic-blue",
        accent: "text-comic-blue-dark",
    },
    advanced: {
        label: "Boss Quest",
        blurb: "Expert-level challenge.",
        emoji: "🔥",
        color: "bg-comic-red",
        accent: "text-rose-700",
    },
};

const QUEST_FEATURES = [
    { icon: "🗺️", title: "Module Map", text: "4-6 focused chapters" },
    { icon: "⚔️", title: "Module Trials", text: "10-question quiz per module" },
    { icon: "🧪", title: "Practice Missions", text: "Video + diagram + task per lesson" },
    { icon: "🏁", title: "Certificate", text: "Pass the final to unlock it" },
] as const;

function isStructuredCourse(value: unknown): value is StructuredCourse {
    if (!value || typeof value !== "object") {
        return false;
    }

    const maybeCourse = value as Partial<StructuredCourse>;
    return typeof maybeCourse.courseTitle === "string" && Array.isArray(maybeCourse.modules);
}

function getErrorMessageFromPayload(payload: unknown, fallback: string): string {
    if (payload && typeof payload === "object" && "error" in payload) {
        const error = (payload as { error?: unknown }).error;
        if (typeof error === "string" && error.trim()) {
            return error;
        }
    }

    return fallback;
}

export default function GeneratePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading, stats, userName, signOut } = useDashboardData();

    const [topic, setTopic] = useState("");
    const [level, setLevel] = useState<CourseDifficulty>("beginner");
    const [duration, setDuration] = useState<string>("4 weeks");
    const [submitting, setSubmitting] = useState(false);
    const [statusIndex, setStatusIndex] = useState(0);

    const isMountedRef = useRef(true);
    const submitInFlightRef = useRef(false);
    const requestAbortControllerRef = useRef<AbortController | null>(null);
    const loadingSpeechIndexRef = useRef(0);
    const wasSubmittingRef = useRef(false);

    const { playClick, playComplete, playWrong } = useSound();
    const {
        playIntro,
        speak,
        cancel,
        voiceModeEnabled,
        setVoiceModeEnabled,
        hasVoiceSupport,
    } = useTextToSpeech();

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            requestAbortControllerRef.current?.abort();
            cancel();
        };
    }, [cancel]);

    useEffect(() => {
        const initialTopic = searchParams.get("topic");
        const initialLevel = searchParams.get("level");
        const initialDuration = searchParams.get("duration");

        if (initialTopic && !topic) {
            setTopic(initialTopic);
        }
        if (initialLevel && level === "beginner") {
            setLevel(normalizeDifficulty(initialLevel));
        }
        if (initialDuration && duration === "4 weeks" && DURATION_OPTIONS.includes(initialDuration as (typeof DURATION_OPTIONS)[number])) {
            setDuration(initialDuration);
        }
    }, [duration, level, searchParams, topic]);

    useEffect(() => {
        if (!submitting) {
            setStatusIndex(0);
            return;
        }

        const interval = window.setInterval(() => {
            setStatusIndex((current) => (current + 1) % STATUS_MESSAGES.length);
        }, 1800);

        return () => {
            window.clearInterval(interval);
        };
    }, [submitting]);

    useEffect(() => {
        if (voiceModeEnabled && !loading) {
            playIntro("generate-structured", "Tell me what you want to learn and I will build your full quest map.");
        }
    }, [voiceModeEnabled, loading, playIntro]);

    useEffect(() => {
        if (!submitting) {
            if (wasSubmittingRef.current) {
                cancel();
            }
            wasSubmittingRef.current = false;
            return;
        }

        wasSubmittingRef.current = true;

        if (!voiceModeEnabled || !hasVoiceSupport) {
            return;
        }

        loadingSpeechIndexRef.current = 0;

        const speakLoadingStatus = () => {
            const index = loadingSpeechIndexRef.current % LOADING_VOICE_MESSAGES.length;
            speak(LOADING_VOICE_MESSAGES[index]);
            loadingSpeechIndexRef.current += 1;
        };

        let miniGamePromptTimer: number | null = null;
        const startTimer = window.setTimeout(() => {
            speakLoadingStatus();
            miniGamePromptTimer = window.setTimeout(() => {
                speak("While we generate your course, you can play mini games on the loading screen.");
            }, 1800);
        }, 450);

        const cycleTimer = window.setInterval(() => {
            speakLoadingStatus();
        }, 9000);

        return () => {
            window.clearTimeout(startTimer);
            if (miniGamePromptTimer !== null) {
                window.clearTimeout(miniGamePromptTimer);
            }
            window.clearInterval(cycleTimer);
            cancel();
        };
    }, [submitting, voiceModeEnabled, hasVoiceSupport, speak, cancel]);

    if (loading || !user) {
        return null;
    }

    const trimmedTopic = topic.trim();
    const isFormValid = trimmedTopic.length >= 2;

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submitInFlightRef.current || submitting) {
            toast.error("Generation already in progress.");
            return;
        }

        const currentUser = user;
        if (!currentUser) {
            toast.error("You must be logged in to generate a course.");
            return;
        }

        if (!isFormValid) {
            toast.error("Enter a topic with at least 2 characters.");
            return;
        }

        playClick();
        submitInFlightRef.current = true;

        requestAbortControllerRef.current?.abort();
        const controller = new AbortController();
        requestAbortControllerRef.current = controller;

        if (isMountedRef.current) {
            setSubmitting(true);
        }

        try {
            const response = await fetch("/generate-course", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    topic: trimmedTopic,
                    level: normalizeDifficulty(level),
                    duration,
                }),
                signal: controller.signal,
            });

            let payload: unknown = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok) {
                throw new Error(getErrorMessageFromPayload(payload, "Course generation failed."));
            }

            if (!isStructuredCourse(payload)) {
                throw new Error("Generated course payload is invalid.");
            }

            const course = payload;
            const description = buildCourseDescription(course);
            const firstLessonId = course.modules[0]?.lessons[0]?.id || null;

            const courseRef = await addDoc(collection(db, "courses"), {
                ...course,
                title: course.courseTitle,
                creatorId: currentUser.uid,
                topic: trimmedTopic,
                description,
                metadata: {
                    ...(course.metadata || {}),
                    difficulty: course.difficulty,
                    format: "structured",
                },
                version: 3,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            await setDoc(
                doc(db, "course_progress", `${currentUser.uid}_${courseRef.id}`),
                {
                    userId: currentUser.uid,
                    courseId: courseRef.id,
                    completedLessons: [],
                    currentLessonId: firstLessonId,
                    quizResults: {},
                    moduleQuizResults: {},
                    finalAssessmentResult: {
                        answers: {},
                        score: null,
                        passed: false,
                        submittedAt: null,
                    },
                    generatedRevisions: {},
                    regeneratedLessons: {},
                    certificateId: null,
                    startedAt: serverTimestamp(),
                    lastAccessedAt: serverTimestamp(),
                },
                { merge: true },
            );

            playComplete();
            toast.success("Quest ready!");

            if (isMountedRef.current) {
                router.push(`/course/${courseRef.id}`);
            }
        } catch (error: unknown) {
            if (error instanceof DOMException && error.name === "AbortError") {
                return;
            }

            console.error(error);
            playWrong();
            toast.error(error instanceof Error ? error.message : "Quest creation failed.");
        } finally {
            if (requestAbortControllerRef.current === controller) {
                requestAbortControllerRef.current = null;
            }

            submitInFlightRef.current = false;
            if (isMountedRef.current) {
                setSubmitting(false);
            }
        }
    }

    function handleDisabledSubmitClick() {
        if (submitting) {
            toast.error("Generation in progress — please wait.");
            return;
        }
        if (!trimmedTopic) {
            toast.error("Enter a topic first to generate your course.");
            return;
        }
        if (trimmedTopic.length < 2) {
            toast.error("Topic must be at least 2 characters long.");
        }
    }

    const levelTone = LEVEL_TONES[level];

    return (
        <div className="quest-page-bg min-h-screen">
            {submitting && <LoadingMiniGamesOverlay />}

            <Sidebar
                userName={userName}
                userAvatar={user.photoURL || "\u{1F464}"}
                xp={stats.xp}
                level={stats.level}
                streak={stats.streak}
                gems={stats.gems}
                onSignOut={signOut}
            />

            <main className="lg:ml-80 min-h-screen px-4 pb-16 pt-24 md:px-8 lg:px-12">
                <div className="mx-auto max-w-6xl space-y-8">

                    {/* ─── Hero ─── */}
                    <section className="quest-hero p-6 md:p-8 xl:p-10">
                        <div className="flex flex-wrap items-center gap-3 mb-5">
                            <span className="quest-chip bg-comic-yellow">✨ New Quest</span>
                            <Link
                                href="/history"
                                className="inline-flex items-center rounded-2xl border-[3px] border-black bg-comic-blue px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[4px_4px_0px_0px_#000] transition hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000]"
                            >
                                📜 Quest Vault
                            </Link>
                            {hasVoiceSupport && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (voiceModeEnabled) {
                                            cancel();
                                        }
                                        setVoiceModeEnabled(!voiceModeEnabled);
                                    }}
                                    className={`inline-flex items-center gap-2 rounded-full border-[3px] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] shadow-[3px_3px_0px_0px_#000] transition ${
                                        voiceModeEnabled
                                            ? "border-black bg-comic-blue text-white"
                                            : "border-black bg-white text-slate-600"
                                    }`}
                                    title={voiceModeEnabled ? "Turn voice off" : "Turn voice on"}
                                >
                                    <span className="text-lg">{voiceModeEnabled ? "🔊" : "🔇"}</span>
                                    <span>{voiceModeEnabled ? "Voice On" : "Voice Off"}</span>
                                </button>
                            )}
                        </div>

                        <h1 className="max-w-3xl text-4xl font-black leading-[0.95] text-black md:text-5xl xl:text-6xl">
                            Build your next learning quest
                        </h1>
                        <p className="mt-4 max-w-2xl text-lg font-bold leading-8 text-slate-600">
                            Pick a topic, choose your difficulty, and let PV generate a complete course
                            with theory, videos, diagrams, and quizzes.
                        </p>

                        {/* Inline stat strip */}
                        <div className="quest-stat-strip mt-5">
                            <span className="quest-stat-strip-item">
                                <span>📚</span> 4-6 Modules
                            </span>
                            <span className="quest-stat-strip-item">
                                <span>🎬</span> Video per lesson
                            </span>
                            <span className="quest-stat-strip-item">
                                <span>📊</span> Diagram flow
                            </span>
                            <span className="quest-stat-strip-item">
                                <span>✅</span> Quiz checks
                            </span>
                            <span className="quest-stat-strip-item">
                                <span>🏆</span> Certificate
                            </span>
                        </div>
                    </section>

                    {/* ─── Form + Sidebar ─── */}
                    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_340px]">

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="quest-surface p-6 md:p-8">
                            <p className="quest-section-label">Build your mission</p>
                            <h2 className="mt-3 text-3xl font-black text-black md:text-4xl">
                                What do you want to learn?
                            </h2>

                            <div className="mt-7 grid gap-5">
                                {/* Topic input */}
                                <label className="block">
                                    <span className="mb-2 block text-sm font-black uppercase tracking-[0.18em] text-slate-600">
                                        Topic
                                    </span>
                                    <div className="relative">
                                        <input
                                            value={topic}
                                            onChange={(event) => setTopic(event.target.value)}
                                            placeholder="e.g. Python data analysis, algebra, photosynthesis"
                                            className="w-full rounded-[1.35rem] border-[3px] border-black bg-white px-5 py-4 text-lg font-bold text-black outline-none placeholder:text-slate-400 transition focus:ring-2 focus:ring-comic-blue/40"
                                            maxLength={120}
                                            disabled={submitting}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                                            {topic.length}/120
                                        </span>
                                    </div>
                                </label>

                                {/* Level + Duration */}
                                <div className="grid gap-5 md:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-black uppercase tracking-[0.18em] text-slate-600">
                                            Challenge level
                                        </span>
                                        <select
                                            value={level}
                                            onChange={(event) => setLevel(normalizeDifficulty(event.target.value))}
                                            className="w-full rounded-[1.35rem] border-[3px] border-black bg-white px-5 py-4 text-lg font-bold text-black outline-none"
                                            disabled={submitting}
                                        >
                                            <option value="beginner">🌱 Beginner</option>
                                            <option value="intermediate">⚔️ Intermediate</option>
                                            <option value="advanced">🔥 Advanced</option>
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="mb-2 block text-sm font-black uppercase tracking-[0.18em] text-slate-600">
                                            Course length
                                        </span>
                                        <select
                                            value={duration}
                                            onChange={(event) => setDuration(event.target.value)}
                                            className="w-full rounded-[1.35rem] border-[3px] border-black bg-white px-5 py-4 text-lg font-bold text-black outline-none"
                                            disabled={submitting}
                                        >
                                            {DURATION_OPTIONS.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </div>

                            {/* Level preview badge */}
                            <div className="mt-6 flex items-center gap-3 rounded-[1.35rem] border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_#000] bg-gradient-to-r from-white to-slate-50">
                                <span className={`flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-black text-2xl ${levelTone.color} shadow-[2px_2px_0px_0px_#000]`}>
                                    {levelTone.emoji}
                                </span>
                                <div>
                                    <p className="text-sm font-black text-black">{levelTone.label}</p>
                                    <p className={`text-sm font-bold ${levelTone.accent}`}>{levelTone.blurb}</p>
                                </div>
                                <span className="ml-auto quest-chip bg-white">{duration}</span>
                            </div>

                            {/* Submit */}
                            <div className="mt-8">
                                {isFormValid && !submitting ? (
                                    <button
                                        type="submit"
                                        className="quest-btn-glow w-full inline-flex min-h-14 items-center justify-center rounded-2xl border-[4px] border-black bg-comic-blue px-8 py-4 text-lg font-black uppercase tracking-[0.18em] text-white shadow-[6px_6px_0px_0px_#000] transition hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0px_0px_#000]"
                                    >
                                        🚀 Generate My Course
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleDisabledSubmitClick}
                                        className="w-full inline-flex min-h-14 items-center justify-center rounded-2xl border-[4px] border-slate-300 bg-slate-100 px-8 py-4 text-lg font-black uppercase tracking-[0.18em] text-slate-400 cursor-not-allowed"
                                    >
                                        {submitting ? STATUS_MESSAGES[statusIndex] : "🚀 Generate My Course"}
                                    </button>
                                )}
                            </div>
                        </form>

                        {/* Sidebar: compact features + steps */}
                        <aside className="space-y-6">
                            {/* Quest preview ticket */}
                            {trimmedTopic && (
                                <div className="quest-surface-muted p-5 animate-pop">
                                    <p className="quest-section-label">Quest preview</p>
                                    <div className="mt-3 rounded-[1.2rem] border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000]">
                                        <p className="text-lg font-black text-black leading-tight">{trimmedTopic}</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className={`quest-chip ${levelTone.color} text-white`}>
                                                {levelTone.emoji} {levelTone.label}
                                            </span>
                                            <span className="quest-chip bg-white">{duration}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* What you get — compact */}
                            <div className="quest-surface p-5">
                                <p className="quest-section-label">What you get</p>
                                <div className="mt-4 space-y-2">
                                    {QUEST_FEATURES.map((feature) => (
                                        <div
                                            key={feature.title}
                                            className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-4 py-3 shadow-[2px_2px_0px_0px_#000]"
                                        >
                                            <span className="text-xl flex-shrink-0">{feature.icon}</span>
                                            <div className="min-w-0">
                                                <span className="text-sm font-black text-black">{feature.title}</span>
                                                <span className="ml-1 text-sm font-bold text-slate-500">{feature.text}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* How it works — compact numbered list */}
                            <div className="quest-surface-muted p-5">
                                <p className="quest-section-label">How it works</p>
                                <div className="mt-4 space-y-2">
                                    {[
                                        "Pick your topic and difficulty.",
                                        "Open the mission map, start lesson one.",
                                        "Beat quizzes and clear practice tasks.",
                                        "Complete the quest and earn your certificate.",
                                    ].map((step, index) => (
                                        <div key={step} className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[2px] border-black bg-comic-yellow text-xs font-black text-black shadow-[2px_2px_0px_0px_#000]">
                                                {index + 1}
                                            </div>
                                            <p className="text-sm font-bold leading-6 text-slate-700">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
}
