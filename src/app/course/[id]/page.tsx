"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";

import AssessmentPanel, { type AssessmentState } from "@/components/course/AssessmentPanel";
import CertificateCard from "@/components/course/CertificateCard";
import CourseSidebar from "@/components/course/CourseSidebar";
import InteractiveQuiz from "@/components/course/InteractiveQuiz";
import LessonDiagramCard from "@/components/course/LessonDiagramCard";
import LessonVideoCard from "@/components/course/LessonVideoCard";
import RevisionPanel from "@/components/course/RevisionPanel";
import { buildCertificateNumber, downloadCertificate, normalizeCertificateRecord, type CourseCertificate } from "@/lib/certificates";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { buildYouTubeEmbedUrl } from "@/lib/lessonMedia";
import { normalizeUserStats } from "@/lib/userStats";
import {
    flattenStructuredLessons,
    normalizeStoredCourse,
    normalizeStructuredLessonRegeneration,
    type FlattenedStructuredLesson,
    type StructuredCourse,
    type StructuredLessonRegeneration,
    type StructuredLessonVideo,
    type StructuredModuleRevision,
} from "@/lib/structuredCourse";

interface LessonQuizResult {
    selectedAnswer: string;
    isCorrect: boolean;
}

interface CourseProgressState {
    completedLessons: string[];
    currentLessonId: string | null;
    quizResults: Record<string, LessonQuizResult>;
    moduleQuizResults: Record<string, AssessmentState>;
    finalAssessmentResult: AssessmentState;
    generatedRevisions: Record<string, StructuredModuleRevision>;
    regeneratedLessons: Record<string, StructuredLessonRegeneration>;
    certificateId: string | null;
}

const EMPTY_ASSESSMENT_STATE: AssessmentState = {
    answers: {},
    score: null,
    passed: false,
    submittedAt: null,
};

const defaultProgressState: CourseProgressState = {
    completedLessons: [],
    currentLessonId: null,
    quizResults: {},
    moduleQuizResults: {},
    finalAssessmentResult: { ...EMPTY_ASSESSMENT_STATE },
    generatedRevisions: {},
    regeneratedLessons: {},
    certificateId: null,
};

const BASE_LESSON_XP = 40;
const BASE_LESSON_GEMS = 3;
const MODULE_QUIZ_XP = 90;
const MODULE_QUIZ_GEMS = 6;
const FINAL_TRIAL_XP = 220;
const FINAL_TRIAL_GEMS = 18;
const MARKDOWN_STRUCTURE_PATTERN = /(^|\n)\s{0,3}(?:#{1,6}\s|[-*+]\s|>\s|\d+\.\s|```)/m;

type ModuleMilestoneStatus = "locked" | "in_progress" | "passed" | "review";

function getMilestoneCardClass(status: ModuleMilestoneStatus, isCurrent: boolean): string {
    if (isCurrent) {
        return "border-black bg-[#fff7d6] ring-[3px] ring-black shadow-comic";
    }

    if (status === "passed") {
        return "border-black bg-[#eefbf1]";
    }

    if (status === "review") {
        return "border-black bg-[#fff3d8]";
    }

    if (status === "locked") {
        return "border-slate-300 bg-slate-100";
    }

    return "border-black bg-[#e9f5ff]";
}

function calculateLevelFromXp(xp: number): number {
    return Math.max(1, Math.floor(xp / 250) + 1);
}

function getLessonRewards(lessonNumber: number) {
    const xp = BASE_LESSON_XP + ((lessonNumber - 1) % 3) * 5;
    const gems = BASE_LESSON_GEMS + ((lessonNumber + 1) % 2);

    return { xp, gems };
}

function formatLessonMarkdown(content: string): string {
    const normalized = content
        .replace(/\r\n?/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    if (!normalized) {
        return "";
    }

    if (MARKDOWN_STRUCTURE_PATTERN.test(normalized) || normalized.includes("\n\n")) {
        return normalized;
    }

    if (normalized.includes("\n")) {
        const paragraphs = normalized
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        if (paragraphs.length > 1) {
            return paragraphs.join("\n\n");
        }
    }

    const sentences = (normalized.match(/[^.!?]+(?:[.!?]+["')\]]*)|[^.!?]+$/g) ?? [])
        .map((sentence) => sentence.trim())
        .filter(Boolean);

    if (sentences.length < 3) {
        return normalized;
    }

    const paragraphSize = sentences.length >= 6 ? 3 : 2;
    const paragraphs: string[] = [];

    for (let index = 0; index < sentences.length; index += paragraphSize) {
        paragraphs.push(sentences.slice(index, index + paragraphSize).join(" ").trim());
    }

    return paragraphs.join("\n\n");
}

function MarkdownBlock({ content }: { content: string }) {
    return (
        <div className={[
            "space-y-4 text-base font-medium leading-8 text-gray-700",
            // headings
            "[&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-comic-ink [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:border-b-[3px] [&_h1]:border-comic-yellow [&_h1]:pb-2",
            "[&_h2]:text-xl [&_h2]:font-black [&_h2]:text-comic-blue-dark [&_h2]:mt-5 [&_h2]:mb-2",
            "[&_h3]:text-lg [&_h3]:font-black [&_h3]:text-comic-ink [&_h3]:mt-4 [&_h3]:mb-2",
            // paragraphs
            "[&_p]:mb-4 [&_p]:leading-7",
            // strong/bold
            "[&_strong]:font-black [&_strong]:text-comic-ink [&_strong]:bg-comic-yellow/20 [&_strong]:px-1 [&_strong]:rounded-md",
            // lists
            "[&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1",
            "[&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1",
            "[&_li]:pl-1 [&_li]:leading-7",
            // code blocks
            "[&_pre]:rounded-xl [&_pre]:border-[2px] [&_pre]:border-black [&_pre]:bg-[#1e1e2e] [&_pre]:p-4 [&_pre]:shadow-[3px_3px_0px_0px_#000] [&_pre]:overflow-x-auto [&_pre]:text-sm",
            "[&_code]:font-mono [&_code]:text-sm",
            "[&_:not(pre)>code]:bg-comic-blue/10 [&_:not(pre)>code]:text-comic-blue-dark [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:border [&_:not(pre)>code]:border-comic-blue/20",
            // blockquotes
            "[&_blockquote]:border-l-4 [&_blockquote]:border-comic-purple [&_blockquote]:bg-comic-purple/5 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:rounded-r-xl [&_blockquote]:italic",
            // hr
            "[&_hr]:border-t-[2px] [&_hr]:border-dashed [&_hr]:border-comic-yellow [&_hr]:my-6",
        ].join(" ")}>
            <ReactMarkdown>{formatLessonMarkdown(content)}</ReactMarkdown>
        </div>
    );
}


function replaceLessonVideo(
    currentCourse: StructuredCourse,
    lessonId: string,
    video: StructuredLessonVideo,
): StructuredCourse {
    return {
        ...currentCourse,
        modules: currentCourse.modules.map((courseModule) => ({
            ...courseModule,
            lessons: courseModule.lessons.map((lesson) =>
                lesson.id === lessonId
                    ? {
                        ...lesson,
                        video,
                    }
                    : lesson
            ),
        })),
    };
}

function replaceLessonRegeneration(
    currentCourse: StructuredCourse,
    lessonId: string,
    lessonSupport: StructuredLessonRegeneration,
): StructuredCourse {
    return {
        ...currentCourse,
        modules: currentCourse.modules.map((courseModule) => ({
            ...courseModule,
            lessons: courseModule.lessons.map((lesson) =>
                lesson.id === lessonId
                    ? {
                        ...lesson,
                        ...lessonSupport,
                    }
                    : lesson
            ),
        })),
    };
}

function normalizeAssessmentState(raw: unknown): AssessmentState {
    const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const answersSource = value.answers && typeof value.answers === "object" ? (value.answers as Record<string, unknown>) : {};

    return {
        answers: Object.fromEntries(
            Object.entries(answersSource)
                .filter(([, answer]) => typeof answer === "string" && answer.trim())
                .map(([questionId, answer]) => [questionId, String(answer)])
        ),
        score: typeof value.score === "number" && Number.isFinite(value.score) ? value.score : null,
        passed: Boolean(value.passed),
        submittedAt: typeof value.submittedAt === "string" ? value.submittedAt : null,
    };
}

function normalizeLessonQuizResults(raw: unknown): Record<string, LessonQuizResult> {
    if (!raw || typeof raw !== "object") {
        return {};
    }

    return Object.fromEntries(
        Object.entries(raw as Record<string, unknown>).flatMap(([lessonId, result]) => {
            if (!result || typeof result !== "object") {
                return [];
            }

            const value = result as Record<string, unknown>;
            const selectedAnswer = typeof value.selectedAnswer === "string" ? value.selectedAnswer : "";
            if (!selectedAnswer) {
                return [];
            }

            return [[
                lessonId,
                {
                    selectedAnswer,
                    isCorrect: Boolean(value.isCorrect),
                } satisfies LessonQuizResult,
            ]];
        })
    );
}

function normalizeModuleQuizResults(raw: unknown): Record<string, AssessmentState> {
    if (!raw || typeof raw !== "object") {
        return {};
    }

    return Object.fromEntries(
        Object.entries(raw as Record<string, unknown>).map(([moduleId, value]) => [
            moduleId,
            normalizeAssessmentState(value),
        ])
    );
}

function normalizeRevisionOverride(
    rawRevision: unknown,
    fallback: StructuredModuleRevision,
): StructuredModuleRevision {
    const value = rawRevision && typeof rawRevision === "object" ? (rawRevision as Record<string, unknown>) : {};
    const focusAreas = Array.isArray(value.focusAreas)
        ? value.focusAreas.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6)
        : [];

    return {
        title: typeof value.title === "string" && value.title.trim() ? value.title : fallback.title,
        summary: typeof value.summary === "string" && value.summary.trim() ? value.summary : fallback.summary,
        focusAreas: focusAreas.length > 0 ? focusAreas : fallback.focusAreas,
        refresher: typeof value.refresher === "string" && value.refresher.trim() ? value.refresher : fallback.refresher,
        practice: typeof value.practice === "string" && value.practice.trim() ? value.practice : fallback.practice,
    };
}

function normalizeGeneratedRevisions(
    raw: unknown,
    course: StructuredCourse,
): Record<string, StructuredModuleRevision> {
    if (!raw || typeof raw !== "object") {
        return {};
    }

    const revisionSource = raw as Record<string, unknown>;
    const output: Record<string, StructuredModuleRevision> = {};

    for (const courseModule of course.modules) {
        if (revisionSource[courseModule.id]) {
            output[courseModule.id] = normalizeRevisionOverride(
                revisionSource[courseModule.id],
                courseModule.miniRevision
            );
        }
    }

    return output;
}

function normalizeRegeneratedLessons(
    raw: unknown,
    course: StructuredCourse,
): Record<string, StructuredLessonRegeneration> {
    if (!raw || typeof raw !== "object") {
        return {};
    }

    const source = raw as Record<string, unknown>;
    const output: Record<string, StructuredLessonRegeneration> = {};

    for (const courseModule of course.modules) {
        for (const lesson of courseModule.lessons) {
            if (source[lesson.id]) {
                output[lesson.id] = normalizeStructuredLessonRegeneration(
                    source[lesson.id],
                    lesson.title,
                    courseModule.title
                );
            }
        }
    }

    return output;
}

function applyLessonRegenerations(
    course: StructuredCourse,
    overrides: Record<string, StructuredLessonRegeneration>,
): StructuredCourse {
    return {
        ...course,
        modules: course.modules.map((courseModule) => ({
            ...courseModule,
            lessons: courseModule.lessons.map((lesson) =>
                overrides[lesson.id]
                    ? {
                        ...lesson,
                        ...overrides[lesson.id],
                    }
                    : lesson
            ),
        })),
    };
}

function calculateUnlockedModuleCount(course: StructuredCourse, progress: CourseProgressState): number {
    let unlockedCount = 1;

    for (let moduleIndex = 0; moduleIndex < course.modules.length - 1; moduleIndex += 1) {
        if (progress.moduleQuizResults[course.modules[moduleIndex].id]?.passed) {
            unlockedCount = moduleIndex + 2;
            continue;
        }

        break;
    }

    return unlockedCount;
}

function getAccessibleLessonId(course: StructuredCourse, progress: CourseProgressState): string | null {
    const unlockedModuleCount = calculateUnlockedModuleCount(course, progress);
    const unlockedModules = course.modules.slice(0, unlockedModuleCount);
    const completedSet = new Set(progress.completedLessons);

    for (const unlockedModule of unlockedModules) {
        const nextLesson = unlockedModule.lessons.find((lesson) => !completedSet.has(lesson.id));
        if (nextLesson) {
            return nextLesson.id;
        }
    }

    return unlockedModules[unlockedModules.length - 1]?.lessons[0]?.id || course.modules[0]?.lessons[0]?.id || null;
}

function buildMissedTopics(
    questions: Array<{ id: string; question: string; answer: string }>,
    answers: Record<string, string>,
): string[] {
    return questions
        .filter((question) => answers[question.id] !== question.answer)
        .map((question) => question.question)
        .slice(0, 5);
}

function shouldShowModuleRevision(result?: AssessmentState): boolean {
    if (typeof result?.score !== "number") {
        return false;
    }

    return !result.passed && result.score <= 5;
}

function stripMarkdown(markdown: string): string {
    return markdown
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^>\s?/gm, "")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, "")
        .replace(/`{1,3}/g, "")
        .replace(/\*\*|__|\*|_/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function splitMarkdownParagraphs(markdown: string, minLength = 24): string[] {
    return markdown
        .split(/\n\s*\n/)
        .map((block) => stripMarkdown(block))
        .map((block) => block.replace(/\s+/g, " ").trim())
        .filter((block) => block.length >= minLength);
}

function splitMarkdownSentences(markdown: string): string[] {
    return (stripMarkdown(markdown).match(/[^.!?]+[.!?]?/g) ?? [])
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length >= 24);
}

function dedupeStrings(items: string[]): string[] {
    const seen = new Set<string>();

    return items.filter((item) => {
        const normalized = item.trim().toLowerCase();
        if (!normalized || seen.has(normalized)) {
            return false;
        }

        seen.add(normalized);
        return true;
    });
}

function summarizeMarkdown(markdown: string, fallback: string, stripTitle?: string): string {
    const raw = splitMarkdownParagraphs(markdown, 16)[0] || splitMarkdownSentences(markdown)[0] || fallback;
    if (stripTitle && raw.toLowerCase().startsWith(stripTitle.toLowerCase())) {
        const cleaned = raw.slice(stripTitle.length).replace(/^[:\s-]+/, "").trim();
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1) || raw;
    }
    return raw;
}

function buildLessonHighlights(lesson: FlattenedStructuredLesson): string[] {
    return dedupeStrings([
        summarizeMarkdown(
            lesson.context,
            `${lesson.title} matters because it strengthens the rest of ${lesson.moduleTitle}.`,
            lesson.title,
        ),
        ...splitMarkdownSentences(lesson.content).slice(0, 2),
        summarizeMarkdown(
            lesson.example,
            `Use the worked example to see ${lesson.title.toLowerCase()} in action.`,
            lesson.title,
        ),
        summarizeMarkdown(
            lesson.summary,
            `Keep the main takeaway from ${lesson.title.toLowerCase()} in mind before moving on.`,
            lesson.title,
        ),
    ]).slice(0, 4);
}

function buildLessonChecklist(lesson: FlattenedStructuredLesson): string[] {
    return dedupeStrings([
        ...lesson.diagram.steps.map((step) => `${step.title}: ${summarizeMarkdown(step.detail, step.title, step.title)}`),
        summarizeMarkdown(
            lesson.exercise,
            `Practice ${lesson.title.toLowerCase()} once in your own words before continuing.`,
            lesson.title,
        ),
        `Answer the lesson check: ${stripMarkdown(lesson.quiz.question)}`,
    ]).slice(0, 5);
}

function buildLessonPitfalls(lesson: FlattenedStructuredLesson): string[] {
    const firstStep = lesson.diagram.steps[0]?.title || "the lesson context";
    const secondStep = lesson.diagram.steps[1]?.title || "the core idea";

    return dedupeStrings([
        `Do not skip ${firstStep}; it frames the rest of the lesson.`,
        `Avoid memorizing ${secondStep} without linking it to the worked example.`,
        "Trace why each step happens before you move to the next one.",
        "Finish the practice drill and restate the summary in your own words.",
    ]).slice(0, 4);
}

export default function CoursePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();

    const courseId = params.id as string;
    const lessonQuery = searchParams.get("lesson");

    const [course, setCourse] = useState<StructuredCourse | null>(null);
    const [progress, setProgress] = useState<CourseProgressState>(defaultProgressState);
    const [selectedLessonId, setSelectedLessonId] = useState<string>("");
    const [pageLoading, setPageLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [resolvingLessonId, setResolvingLessonId] = useState<string | null>(null);
    const [regeneratingLessonId, setRegeneratingLessonId] = useState<string | null>(null);
    const [revisingModuleId, setRevisingModuleId] = useState<string | null>(null);
    const [submittingModuleQuizId, setSubmittingModuleQuizId] = useState<string | null>(null);
    const [submittingFinalAssessment, setSubmittingFinalAssessment] = useState(false);
    const [certificate, setCertificate] = useState<CourseCertificate | null>(null);
    const [showLessonView, setShowLessonView] = useState(false);
    const [activeTab, setActiveTab] = useState<"theory" | "video" | "diagram" | "quiz">("theory");
    const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});
    const [celebrationBanner, setCelebrationBanner] = useState<string | null>(null);
    const attemptedVideoLessonsRef = useRef<Set<string>>(new Set());
    const selectedLessonVideoRef = useRef<StructuredLessonVideo | null>(null);
    const advancingRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!celebrationBanner) {
            return;
        }

        const timer = window.setTimeout(() => {
            if (isMountedRef.current) {
                setCelebrationBanner(null);
            }
        }, 4200);

        return () => {
            window.clearTimeout(timer);
        };
    }, [celebrationBanner]);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [loading, router, user]);

    useEffect(() => {
        let isActive = true;

        async function fetchCourseAndProgress() {
            if (!user || !courseId) {
                return;
            }

            if (!isActive) {
                return;
            }

            setPageLoading(true);
            setPageError(null);

            try {
                const courseSnap = await getDoc(doc(db, "courses", courseId));
                if (!courseSnap.exists()) {
                    if (isActive) {
                        setPageError("Course not found.");
                        setPageLoading(false);
                    }
                    return;
                }

                const normalizedCourse = normalizeStoredCourse(courseSnap.data());
                const flattened = flattenStructuredLessons(normalizedCourse);
                if (flattened.length === 0) {
                    if (isActive) {
                        setPageError("This course does not contain any lessons.");
                        setPageLoading(false);
                    }
                    return;
                }

                const progressRef = doc(db, "course_progress", `${user.uid}_${courseId}`);
                const progressSnap = await getDoc(progressRef);

                let nextProgress = { ...defaultProgressState };

                if (progressSnap.exists()) {
                    const stored = progressSnap.data() as Record<string, unknown>;

                    nextProgress = {
                        completedLessons: Array.isArray(stored.completedLessons) ? stored.completedLessons.map((value) => String(value)) : [],
                        currentLessonId: typeof stored.currentLessonId === "string" ? stored.currentLessonId : null,
                        quizResults: normalizeLessonQuizResults(stored.quizResults),
                        moduleQuizResults: normalizeModuleQuizResults(stored.moduleQuizResults),
                        finalAssessmentResult: normalizeAssessmentState(stored.finalAssessmentResult),
                        generatedRevisions: normalizeGeneratedRevisions(stored.generatedRevisions, normalizedCourse),
                        regeneratedLessons: normalizeRegeneratedLessons(stored.regeneratedLessons, normalizedCourse),
                        certificateId: typeof stored.certificateId === "string" ? stored.certificateId : null,
                    };
                } else {
                    const initialLessonId = flattened[0]?.id || null;
                    nextProgress = {
                        ...defaultProgressState,
                        currentLessonId: initialLessonId,
                    };

                    await setDoc(
                        progressRef,
                        {
                            userId: user.uid,
                            courseId,
                            completedLessons: [],
                            currentLessonId: initialLessonId,
                            quizResults: {},
                            moduleQuizResults: {},
                            finalAssessmentResult: EMPTY_ASSESSMENT_STATE,
                            generatedRevisions: {},
                            regeneratedLessons: {},
                            certificateId: null,
                            startedAt: serverTimestamp(),
                            lastAccessedAt: serverTimestamp(),
                        },
                        { merge: true }
                    );
                }

                const courseWithOverrides = applyLessonRegenerations(normalizedCourse, nextProgress.regeneratedLessons);
                const accessibleLessonId = getAccessibleLessonId(courseWithOverrides, nextProgress);
                const preferredLessonId =
                    flattened.find((lesson) => lesson.id === nextProgress.currentLessonId)?.id ||
                    accessibleLessonId ||
                    flattened[0]?.id ||
                    "";

                let nextCertificate: CourseCertificate | null = null;
                if (nextProgress.certificateId) {
                    const certificateSnap = await getDoc(doc(db, "certificates", nextProgress.certificateId));
                    if (certificateSnap.exists()) {
                        nextCertificate = normalizeCertificateRecord(
                            certificateSnap.id,
                            certificateSnap.data() as Record<string, unknown>,
                            user.uid,
                        );
                    }
                }

                if (!isActive) {
                    return;
                }

                setCourse(courseWithOverrides);
                setProgress(nextProgress);
                setSelectedLessonId(preferredLessonId);
                setCertificate(nextCertificate);
            } catch (error) {
                console.error(error);
                if (isActive) {
                    setPageError(error instanceof Error ? error.message : "Failed to load the course.");
                }
            } finally {
                if (isActive) {
                    setPageLoading(false);
                }
            }
        }

        void fetchCourseAndProgress();

        return () => {
            isActive = false;
        };
    }, [courseId, user]);

    useEffect(() => {
        attemptedVideoLessonsRef.current.clear();
        setResolvingLessonId(null);
        setShowLessonView(false);
    }, [courseId]);

    useEffect(() => {
        if (!course || !lessonQuery) {
            return;
        }

        const lesson = flattenStructuredLessons(course).find((entry) => entry.id === lessonQuery);
        if (lesson) {
            setSelectedLessonId(lesson.id);
        }
    }, [course, lessonQuery]);

    const flattenedLessons = course ? flattenStructuredLessons(course) : [];
    const selectedLesson =
        flattenedLessons.find((lesson) => lesson.id === selectedLessonId) ||
        flattenedLessons[0] ||
        null;

    const completedSet = new Set(progress.completedLessons);
    const completedCount = completedSet.size;
    const totalLessons = flattenedLessons.length;
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    const currentQuizResult = selectedLesson ? progress.quizResults[selectedLesson.id] : undefined;
    const selectedAnswer = currentQuizResult?.selectedAnswer || null;
    const selectedLessonKey = selectedLesson?.id || "";
    selectedLessonVideoRef.current = selectedLesson?.video || null;

    useEffect(() => {
        if (!course || !selectedLesson) {
            return;
        }

        const unlockedModuleCount = calculateUnlockedModuleCount(course, progress);
        if (selectedLesson.moduleIndex < unlockedModuleCount) {
            return;
        }

        const fallbackLessonId = getAccessibleLessonId(course, progress);
        if (!fallbackLessonId || fallbackLessonId === selectedLesson.id) {
            return;
        }

        setSelectedLessonId(fallbackLessonId);
        router.replace(`/course/${courseId}?lesson=${encodeURIComponent(fallbackLessonId)}`, { scroll: false });
    }, [course, courseId, progress, router, selectedLesson]);

    const courseLanguage = typeof course?.metadata?.language === "string"
        ? course.metadata.language
        : undefined;

    useEffect(() => {
        if (!selectedLessonKey) {
            return;
        }

        const video = selectedLessonVideoRef.current;
        if (!video) {
            return;
        }

        if (buildYouTubeEmbedUrl(video.url) || !video.searchQuery) {
            setResolvingLessonId(null);
            return;
        }

        if (attemptedVideoLessonsRef.current.has(selectedLessonKey)) {
            return;
        }

        attemptedVideoLessonsRef.current.add(selectedLessonKey);

        const abortController = new AbortController();
        let isActive = true;

        setResolvingLessonId(selectedLessonKey);

        async function resolveLessonVideo() {
            try {
                const response = await fetch("/api/lesson-video", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ video, language: courseLanguage }),
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    return;
                }

                const payload = await response.json() as { video?: StructuredLessonVideo };
                if (!isActive || !payload.video) {
                    return;
                }

                const resolvedVideo = payload.video;
                setCourse((currentCourse) => {
                    if (!currentCourse) {
                        return currentCourse;
                    }

                    return replaceLessonVideo(currentCourse, selectedLessonKey, resolvedVideo);
                });
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }

                console.warn("Automatic lesson video resolution failed:", error);
            } finally {
                if (isActive) {
                    setResolvingLessonId((currentLessonId) =>
                        currentLessonId === selectedLessonKey ? null : currentLessonId
                    );
                }
            }
        }

        void resolveLessonVideo();

        return () => {
            isActive = false;
            abortController.abort();
        };
    }, [selectedLessonKey, courseLanguage]);

    async function persistProgress(nextProgress: CourseProgressState) {
        if (!user) {
            return;
        }

        try {
            await setDoc(
                doc(db, "course_progress", `${user.uid}_${courseId}`),
                {
                    userId: user.uid,
                    courseId,
                    completedLessons: nextProgress.completedLessons,
                    currentLessonId: nextProgress.currentLessonId,
                    quizResults: nextProgress.quizResults,
                    moduleQuizResults: nextProgress.moduleQuizResults,
                    finalAssessmentResult: nextProgress.finalAssessmentResult,
                    generatedRevisions: nextProgress.generatedRevisions,
                    regeneratedLessons: nextProgress.regeneratedLessons,
                    certificateId: nextProgress.certificateId,
                    lastAccessedAt: serverTimestamp(),
                },
                { merge: true }
            );
        } catch (error) {
            console.warn("Progress persistence failed:", error);
        }
    }

    async function grantRewards(xp: number, gems: number) {
        if (!user) {
            return;
        }

        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            const currentStats = normalizeUserStats(userSnap.exists() ? userSnap.data().stats : undefined);
            const nextXp = currentStats.xp + xp;
            const nextGems = currentStats.gems + gems;
            const nextLevel = Math.max(currentStats.level, calculateLevelFromXp(nextXp));

            await setDoc(
                userRef,
                {
                    stats: {
                        ...currentStats,
                        xp: nextXp,
                        gems: nextGems,
                        level: nextLevel,
                    },
                },
                { merge: true }
            );
        } catch (error) {
            console.warn("Reward persistence failed:", error);
        }
    }

    if (loading || !user || pageLoading) {
        return (
            <div className="min-h-screen bg-comic-paper bg-dot-pattern px-4 py-24">
                <div className="mx-auto max-w-3xl comic-box p-8 text-center shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-800 font-medium">Loading</p>
                    <h1 className="mt-3 text-4xl font-black text-comic-ink">Loading course content...</h1>
                </div>
            </div>
        );
    }

    if (!course || !selectedLesson || pageError) {
        return (
            <div className="min-h-screen bg-comic-paper bg-dot-pattern px-4 py-24">
                <div className="mx-auto max-w-3xl comic-box p-8 text-center shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600">Course unavailable</p>
                    <h1 className="mt-3 text-4xl font-black text-comic-ink">{pageError || "Unable to load this course."}</h1>
                    <Link
                        href="/dashboard/continue-learning"
                        className="mt-6 inline-flex items-center btn-secondary text-sm px-4 py-2"
                    >
                        Back to courses
                    </Link>
                </div>
            </div>
        );
    }

    const unlockedModuleCount = calculateUnlockedModuleCount(course, progress);
    const lockedModuleIds = course.modules.slice(unlockedModuleCount).map((courseModule) => courseModule.id);
    const passedModuleIds = course.modules
        .filter((courseModule) => progress.moduleQuizResults[courseModule.id]?.passed)
        .map((courseModule) => courseModule.id);
    const revisionModuleIds = course.modules
        .filter((courseModule) => shouldShowModuleRevision(progress.moduleQuizResults[courseModule.id]))
        .map((courseModule) => courseModule.id);
    const selectedModule = course.modules[selectedLesson.moduleIndex];
    const moduleLessons = selectedModule.lessons;
    const moduleCompletedCount = moduleLessons.filter((lesson) => completedSet.has(lesson.id)).length;
    const moduleReadyForQuiz = moduleCompletedCount === moduleLessons.length;
    const moduleQuizState = progress.moduleQuizResults[selectedModule.id] || { ...EMPTY_ASSESSMENT_STATE };
    const moduleQuizPassed = Boolean(moduleQuizState.passed);
    const moduleRevision = progress.generatedRevisions[selectedModule.id] || selectedModule.miniRevision;
    const shouldShowRevision = shouldShowModuleRevision(moduleQuizState);
    const nextLessonInModule = moduleLessons[selectedLesson.lessonIndex + 1] || null;
    const nextModule = course.modules[selectedLesson.moduleIndex + 1] || null;
    const stageReward = getLessonRewards(selectedLesson.lessonNumber);
    const allModuleQuizzesPassed = course.modules.every(
        (courseModule) => progress.moduleQuizResults[courseModule.id]?.passed
    );
    const finalAssessmentUnlocked = allModuleQuizzesPassed && completedCount === totalLessons;
    const finalAssessmentState = progress.finalAssessmentResult;
    const finalAssessmentAnsweredCount = Object.keys(finalAssessmentState.answers).length;
    const lessonStatusLabel = completedSet.has(selectedLesson.id) ? "Completed" : "In progress";
    const courseProgressWidth = totalLessons > 0 ? Math.max(progressPercent, completedCount > 0 ? 8 : 0) : 0;
    const moduleStatusSummary = moduleQuizPassed
        ? "Module assessment passed."
        : moduleReadyForQuiz
            ? "Module assessment is ready."
            : `Complete ${moduleLessons.length - moduleCompletedCount} more lesson${moduleLessons.length - moduleCompletedCount === 1 ? "" : "s"} to unlock the assessment.`;
    const continueActionLabel = nextLessonInModule
        ? "Continue to next lesson"
        : moduleQuizPassed && nextModule
            ? "Go to next module"
            : moduleReadyForQuiz
                ? "Open module assessment"
                : "Mark lesson complete";
    const continueActionDescription = nextLessonInModule
        ? "Your next lesson will open as soon as this lesson is completed."
        : moduleQuizPassed && nextModule
            ? "This module is complete. Move on when you are ready."
            : moduleReadyForQuiz
                ? "All lessons in this module are done. Take the module assessment next."
                : "Finish the lesson check first, then continue through this module in order.";
    const lessonOverview = summarizeMarkdown(
        `${selectedLesson.context}\n\n${selectedLesson.content}`,
        `This lesson explains ${selectedLesson.title} inside ${selectedLesson.moduleTitle}.`,
        selectedLesson.title,
    );
    const practicePreview = summarizeMarkdown(
        selectedLesson.exercise,
        `Apply ${selectedLesson.title.toLowerCase()} once on your own before moving to the next lesson.`,
        selectedLesson.title,
    );
    const lessonHighlights = buildLessonHighlights(selectedLesson);
    const lessonChecklist = buildLessonChecklist(selectedLesson);
    const lessonPitfalls = buildLessonPitfalls(selectedLesson);
    const moduleMilestones = course.modules.map((courseModule, moduleIndex) => {
        const status: ModuleMilestoneStatus = lockedModuleIds.includes(courseModule.id)
            ? "locked"
            : passedModuleIds.includes(courseModule.id)
                ? "passed"
                : revisionModuleIds.includes(courseModule.id)
                    ? "review"
                    : "in_progress";

        const completedLessonsInModule = courseModule.lessons.filter((lesson) =>
            completedSet.has(lesson.id)
        ).length;
        const isCurrent = selectedModule.id === courseModule.id;

        return {
            id: courseModule.id,
            title: courseModule.title,
            index: moduleIndex,
            status,
            completedLessonsInModule,
            totalLessonsInModule: courseModule.lessons.length,
            isCurrent,
        };
    });
    const currentStepLabel = moduleReadyForQuiz && !moduleQuizPassed
        ? "Module assessment pending"
        : finalAssessmentUnlocked && !finalAssessmentState.passed
            ? "Final assessment unlocked"
            : moduleQuizPassed && nextModule
                ? "Ready for next module"
                : "Lesson in progress";
    const milestoneStatusLabel: Record<ModuleMilestoneStatus, string> = {
        locked: "Locked",
        in_progress: "In progress",
        passed: "Passed",
        review: "Review",
    };
    const milestoneStatusClass: Record<ModuleMilestoneStatus, string> = {
        locked: "bg-slate-200 text-slate-800",
        in_progress: "bg-sky-100 text-comic-blue-dark",
        passed: "bg-comic-green text-white",
        review: "bg-amber-100 text-amber-700",
    };

    function updateSelectedLesson(lessonId: string) {
        const targetLesson = flattenedLessons.find((lesson) => lesson.id === lessonId);
        if (!targetLesson) {
            return;
        }

        if (targetLesson.moduleIndex >= unlockedModuleCount) {
            toast.error("Finish the current module assessment to open that module.");
            return;
        }

        setSelectedLessonId(lessonId);
        setActiveTab("theory");
        setExpandedAccordions({});

        const nextProgress: CourseProgressState = {
            ...progress,
            currentLessonId: lessonId,
        };

        setProgress(nextProgress);
        void persistProgress(nextProgress);
        router.replace(`/course/${courseId}?lesson=${encodeURIComponent(lessonId)}`, { scroll: false });
    }

    function toggleAccordion(key: string) {
        setExpandedAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    function handleSelectAnswer(answer: string) {
        const isCorrect = answer === selectedLesson.quiz.answer;
        const nextProgress: CourseProgressState = {
            ...progress,
            quizResults: {
                ...progress.quizResults,
                [selectedLesson.id]: {
                    selectedAnswer: answer,
                    isCorrect,
                },
            },
        };

        setProgress(nextProgress);
        void persistProgress(nextProgress);
    }

    function handleSelectModuleQuizAnswer(questionId: string, answer: string) {
        const currentState = progress.moduleQuizResults[selectedModule.id] || { ...EMPTY_ASSESSMENT_STATE };
        const nextProgress: CourseProgressState = {
            ...progress,
            moduleQuizResults: {
                ...progress.moduleQuizResults,
                [selectedModule.id]: {
                    ...currentState,
                    answers: {
                        ...currentState.answers,
                        [questionId]: answer,
                    },
                },
            },
        };

        setProgress(nextProgress);
        void persistProgress(nextProgress);
    }

    async function generateRevisionForModule(score: number, answers: Record<string, string>, baseProgress: CourseProgressState) {
        if (!isMountedRef.current) {
            return;
        }

        setRevisingModuleId(selectedModule.id);

        if (!course) {
            if (isMountedRef.current) {
                setRevisingModuleId(null);
            }
            return;
        }

        try {
            const response = await fetch("/api/module-revision", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    courseTitle: course.courseTitle,
                    difficulty: course.difficulty,
                    moduleTitle: selectedModule.title,
                    moduleDescription: selectedModule.description,
                    score,
                    lessonTitles: selectedModule.lessons.map((lesson) => lesson.title),
                    missedTopics: buildMissedTopics(selectedModule.moduleQuiz.questions, answers),
                }),
            });

            const payload = await response.json() as { revision?: StructuredModuleRevision };
            const revision = response.ok && payload.revision ? payload.revision : selectedModule.miniRevision;

            const nextProgress: CourseProgressState = {
                ...baseProgress,
                generatedRevisions: {
                    ...baseProgress.generatedRevisions,
                    [selectedModule.id]: revision,
                },
            };

            if (isMountedRef.current) {
                setProgress(nextProgress);
            }
            await persistProgress(nextProgress);
        } catch (error) {
            console.error(error);
            toast.error("Could not refresh the review plan.");
        } finally {
            if (isMountedRef.current) {
                setRevisingModuleId(null);
            }
        }
    }

    async function handleSubmitModuleQuiz() {
        if (submittingModuleQuizId === selectedModule.id) {
            return;
        }

        const currentState = progress.moduleQuizResults[selectedModule.id] || { ...EMPTY_ASSESSMENT_STATE };
        if (selectedModule.moduleQuiz.questions.some((question) => !currentState.answers[question.id])) {
            toast.error("Answer every module assessment question first.");
            return;
        }

        setSubmittingModuleQuizId(selectedModule.id);
        try {
            const score = selectedModule.moduleQuiz.questions.reduce((count, question) => (
                currentState.answers[question.id] === question.answer ? count + 1 : count
            ), 0);
            const passed = score >= selectedModule.moduleQuiz.passingScore;

            const nextProgress: CourseProgressState = {
                ...progress,
                moduleQuizResults: {
                    ...progress.moduleQuizResults,
                    [selectedModule.id]: {
                        ...currentState,
                        score,
                        passed,
                        submittedAt: new Date().toISOString(),
                    },
                },
            };

            if (isMountedRef.current) {
                setProgress(nextProgress);
            }
            await persistProgress(nextProgress);

            if (passed) {
                await grantRewards(MODULE_QUIZ_XP, MODULE_QUIZ_GEMS);
                toast.success(`Module assessment passed. ${score}/10.`);
                if (isMountedRef.current) {
                    setShowLessonView(false);
                    setCelebrationBanner("Module cleared. Rewards granted and progression unlocked.");
                }

                if (nextModule?.lessons[0]) {
                    if (isMountedRef.current) {
                        setSelectedLessonId(nextModule.lessons[0].id);
                    }
                    const movedProgress: CourseProgressState = {
                        ...nextProgress,
                        currentLessonId: nextModule.lessons[0].id,
                    };
                    if (isMountedRef.current) {
                        setProgress(movedProgress);
                    }
                    await persistProgress(movedProgress);
                    if (isMountedRef.current) {
                        router.replace(`/course/${courseId}?lesson=${encodeURIComponent(nextModule.lessons[0].id)}`, { scroll: false });
                    }
                } else {
                    toast.success("Final assessment unlocked.");
                }
            } else {
                toast.error(`Score: ${score}/10. Review plan unlocked before you retry.`);
                await generateRevisionForModule(score, currentState.answers, nextProgress);
            }
        } catch (error) {
            console.error(error);
            toast.error("Module assessment submission failed.");
        } finally {
            if (isMountedRef.current) {
                setSubmittingModuleQuizId(null);
            }
        }
    }

    function handleResetModuleQuiz() {
        const nextProgress: CourseProgressState = {
            ...progress,
            moduleQuizResults: {
                ...progress.moduleQuizResults,
                [selectedModule.id]: { ...EMPTY_ASSESSMENT_STATE },
            },
        };

        setProgress(nextProgress);
        void persistProgress(nextProgress);
    }

    async function handleRefreshRevision() {
        const currentState = progress.moduleQuizResults[selectedModule.id] || { ...EMPTY_ASSESSMENT_STATE };
        await generateRevisionForModule(currentState.score || 0, currentState.answers, progress);
    }

    async function handleRegenerateLesson() {
        if (regeneratingLessonId === selectedLesson.id) {
            return;
        }

        setRegeneratingLessonId(selectedLesson.id);

        if (!course) {
            if (isMountedRef.current) {
                setRegeneratingLessonId(null);
            }
            return;
        }

        try {
            const response = await fetch("/api/regenerate-lesson", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    courseTitle: course.courseTitle,
                    difficulty: course.difficulty,
                    moduleTitle: selectedLesson.moduleTitle,
                    moduleDescription: selectedLesson.moduleDescription,
                    lessonTitle: selectedLesson.title,
                    context: selectedLesson.context,
                    content: selectedLesson.content,
                    example: selectedLesson.example,
                    exercise: selectedLesson.exercise,
                    summary: selectedLesson.summary,
                }),
            });

            const payload = await response.json() as { lesson?: StructuredLessonRegeneration };
            if (!response.ok || !payload.lesson) {
                throw new Error("Regeneration failed.");
            }

            const normalizedLesson = normalizeStructuredLessonRegeneration(
                payload.lesson,
                selectedLesson.title,
                selectedLesson.moduleTitle,
            );

            setCourse((currentCourse) => currentCourse ? replaceLessonRegeneration(currentCourse, selectedLesson.id, normalizedLesson) : currentCourse);

            const nextProgress: CourseProgressState = {
                ...progress,
                regeneratedLessons: {
                    ...progress.regeneratedLessons,
                    [selectedLesson.id]: normalizedLesson,
                },
            };

            if (isMountedRef.current) {
                setProgress(nextProgress);
            }
            await persistProgress(nextProgress);
            toast.success("Clearer lesson version generated.");
        } catch (error) {
            console.error(error);
            toast.error("Could not simplify that lesson.");
        } finally {
            if (isMountedRef.current) {
                setRegeneratingLessonId(null);
            }
        }
    }

    function handleSelectFinalAnswer(questionId: string, answer: string) {
        const nextProgress: CourseProgressState = {
            ...progress,
            finalAssessmentResult: {
                ...progress.finalAssessmentResult,
                answers: {
                    ...progress.finalAssessmentResult.answers,
                    [questionId]: answer,
                },
            },
        };

        setProgress(nextProgress);
        void persistProgress(nextProgress);
    }

    async function issueCertificate(finalScore: number) {
        if (!user || !course) {
            return null;
        }

        const certificateId = progress.certificateId || `${user.uid}_${courseId}`;
        const nextCertificate: CourseCertificate = {
            id: certificateId,
            userId: user.uid,
            courseId,
            courseTitle: course.courseTitle,
            recipientName: user.displayName || "Learner",
            certificateTitle: course.certificateTemplate.title,
            certificateSubtitle: course.certificateTemplate.subtitle,
            difficulty: course.difficulty.charAt(0).toUpperCase() + course.difficulty.slice(1),
            duration: course.duration,
            finalScore,
            totalQuestions: course.finalAssessment.questions.length,
            certificateNumber: buildCertificateNumber(courseId, user.uid),
            issuedAtLabel: "Today",
            issuedAtRaw: new Date(),
        };

        await setDoc(
            doc(db, "certificates", certificateId),
            {
                userId: user.uid,
                courseId,
                courseTitle: course.courseTitle,
                recipientName: nextCertificate.recipientName,
                certificateTitle: course.certificateTemplate.title,
                certificateSubtitle: course.certificateTemplate.subtitle,
                difficulty: nextCertificate.difficulty,
                duration: course.duration,
                finalScore,
                totalQuestions: course.finalAssessment.questions.length,
                certificateNumber: nextCertificate.certificateNumber,
                issuedAt: serverTimestamp(),
            },
            { merge: true }
        );

        await grantRewards(FINAL_TRIAL_XP, FINAL_TRIAL_GEMS);
        if (isMountedRef.current) {
            setCertificate(nextCertificate);
        }
        return nextCertificate;
    }

    async function handleSubmitFinalAssessment() {
        if (submittingFinalAssessment) {
            return;
        }

        if (!course) {
            toast.error("Course data not loaded.");
            return;
        }

        if (course.finalAssessment.questions.some((question) => !progress.finalAssessmentResult.answers[question.id])) {
            toast.error("Answer every final assessment question first.");
            return;
        }

        setSubmittingFinalAssessment(true);

        try {
            const score = course.finalAssessment.questions.reduce((count, question) => (
                progress.finalAssessmentResult.answers[question.id] === question.answer ? count + 1 : count
            ), 0);
            const passed = score >= course.finalAssessment.passingScore;

            const nextProgress: CourseProgressState = {
                ...progress,
                finalAssessmentResult: {
                    ...progress.finalAssessmentResult,
                    score,
                    passed,
                    submittedAt: new Date().toISOString(),
                },
            };

            if (isMountedRef.current) {
                setProgress(nextProgress);
            }

            let nextCertificateId = nextProgress.certificateId;
            if (passed) {
                const issuedCertificate = await issueCertificate(score);
                nextCertificateId = issuedCertificate?.id || nextCertificateId;
                toast.success("Final assessment passed. Certificate unlocked.");
                if (isMountedRef.current) {
                    setCelebrationBanner("Final assessment passed. Certificate unlocked.");
                }
            } else {
                toast.error("Final assessment not passed. Review the feedback and try again.");
            }

            const persistedProgress: CourseProgressState = {
                ...nextProgress,
                certificateId: nextCertificateId || null,
            };

            if (isMountedRef.current) {
                setProgress(persistedProgress);
            }
            await persistProgress(persistedProgress);
        } catch (error) {
            console.error(error);
            toast.error("Final assessment submission failed.");
        } finally {
            if (isMountedRef.current) {
                setSubmittingFinalAssessment(false);
            }
        }
    }

    function handleResetFinalAssessment() {
        const nextProgress: CourseProgressState = {
            ...progress,
            finalAssessmentResult: { ...EMPTY_ASSESSMENT_STATE },
        };

        setProgress(nextProgress);
        void persistProgress(nextProgress);
    }

    async function handleAdvance() {
        if (advancingRef.current) {
            return;
        }

        advancingRef.current = true;

        try {
        // If module is ready for quiz, open assessment instead
            if (moduleReadyForQuiz && !nextLessonInModule) {
                if (isMountedRef.current) {
                    setShowLessonView(false);
                }
                return;
            }

            if (!selectedAnswer) {
                toast.error("Answer the lesson check first.");
                return;
            }

            const nextCompletedLessons = Array.from(new Set([...progress.completedLessons, selectedLesson.id]));
            const firstTimeClear = !progress.completedLessons.includes(selectedLesson.id);
            const nextProgress: CourseProgressState = {
                ...progress,
                completedLessons: nextCompletedLessons,
                currentLessonId: nextLessonInModule?.id || selectedLesson.id,
            };

            if (isMountedRef.current) {
                setProgress(nextProgress);
            }
            await persistProgress(nextProgress);

            if (firstTimeClear) {
                await grantRewards(stageReward.xp, stageReward.gems);
                toast.success("Lesson completed.");
                if (isMountedRef.current) {
                    setCelebrationBanner(
                        `Lesson clear. +${stageReward.xp} XP and +${stageReward.gems} gems added.`
                    );
                }
            }

            if (nextLessonInModule) {
                if (isMountedRef.current) {
                    setSelectedLessonId(nextLessonInModule.id);
                    router.replace(`/course/${courseId}?lesson=${encodeURIComponent(nextLessonInModule.id)}`, { scroll: false });
                }
                return;
            }

            if (!moduleQuizPassed) {
                toast.success("All lessons in this module are complete. Take the module assessment next.");
                return;
            }

            if (nextModule?.lessons[0]) {
                if (isMountedRef.current) {
                    setSelectedLessonId(nextModule.lessons[0].id);
                }
                const movedProgress: CourseProgressState = {
                    ...nextProgress,
                    currentLessonId: nextModule.lessons[0].id,
                };
                if (isMountedRef.current) {
                    setProgress(movedProgress);
                }
                await persistProgress(movedProgress);
                if (isMountedRef.current) {
                    router.replace(`/course/${courseId}?lesson=${encodeURIComponent(nextModule.lessons[0].id)}`, { scroll: false });
                }
                return;
            }

            if (finalAssessmentUnlocked) {
                toast.success("All modules completed. Final assessment unlocked.");
                if (isMountedRef.current) {
                    setCelebrationBanner("All modules complete. Final assessment is now unlocked.");
                }
                return;
            }
        } finally {
            advancingRef.current = false;
        }
    }

    // Show module assessment as a separate page view
    const showModuleAssessmentPage = moduleReadyForQuiz && !moduleQuizState.submittedAt && !showLessonView;

    if (showModuleAssessmentPage) {
        return (
            <div className="quest-page-bg min-h-screen px-4 py-6 md:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setShowLessonView(true)}
                                className="inline-flex items-center btn-secondary text-sm px-4 py-2"
                            >
                                {"\u2190"} Back to lesson
                            </button>
                            <Link
                                href="/dashboard/continue-learning"
                                className="inline-flex items-center btn-secondary text-sm px-4 py-2"
                            >
                                Back to courses
                            </Link>
                        </div>

                        <div className="quest-note min-w-[280px] flex-1 px-5 py-4 md:max-w-[420px]">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Course progress</p>
                                <p className="text-sm font-black text-comic-ink">
                                    {completedCount}/{totalLessons} lessons completed
                                </p>
                            </div>
                            <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-black bg-white">
                                <div
                                    className="h-full rounded-full bg-comic-blue progress-stripes transition-all"
                                    style={{ width: `${courseProgressWidth}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {celebrationBanner && (
                        <section className="quest-surface border-comic-green bg-[#eefbf1] p-4 text-sm font-black text-comic-ink animate-pop">
                            {celebrationBanner}
                        </section>
                    )}

                    <section className="quest-surface p-5 md:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="quest-section-label">Mission map</p>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                                {passedModuleIds.length}/{course.modules.length} cleared
                            </p>
                        </div>
                        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {moduleMilestones.map((milestone) => {
                                const completionRatio = milestone.totalLessonsInModule > 0
                                    ? (milestone.completedLessonsInModule / milestone.totalLessonsInModule) * 100
                                    : 0;
                                const statusHint = milestone.status === "locked"
                                    ? "Clear the previous module assessment to unlock this module."
                                    : milestone.status === "review"
                                        ? "Revision is active. Retake module assessment after review."
                                        : milestone.status === "passed"
                                            ? "Module cleared. You can revisit lessons anytime."
                                            : "Current active module. Finish lessons in order.";

                                return (
                                    <div
                                        key={milestone.id}
                                        className={`rounded-[1.6rem] border-[3px] p-4 ${getMilestoneCardClass(milestone.status, milestone.isCurrent)}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-black text-comic-ink">
                                                Module {milestone.index + 1}
                                            </p>
                                            <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${milestoneStatusClass[milestone.status]}`}>
                                                {milestoneStatusLabel[milestone.status]}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-base font-black text-comic-ink">{milestone.title}</p>
                                        <div className="mt-3 h-2 overflow-hidden rounded-full border-2 border-black bg-white">
                                            <div className="h-full rounded-full bg-comic-blue" style={{ width: `${completionRatio}%` }} />
                                        </div>
                                        <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                                            {milestone.completedLessonsInModule}/{milestone.totalLessonsInModule} lessons complete
                                        </p>
                                        <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{statusHint}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="quest-hero p-6 md:p-8">
                        <div className="relative max-w-3xl">
                            <p className="quest-section-label">Module assessment</p>
                            <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-amber-700">
                                Module {selectedLesson.moduleIndex + 1} review gate
                            </p>
                            <h1 className="mt-3 text-3xl font-black tracking-tight text-comic-ink md:text-4xl">
                                {selectedModule.title}
                            </h1>
                            <p className="mt-4 text-base font-bold leading-7 text-slate-600">
                                {selectedModule.description}
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <span className="quest-chip bg-white">Module assessment</span>
                                <span className="quest-chip bg-white">{course.difficulty}</span>
                            </div>

                            <div className="mt-6 max-w-2xl rounded-[1.4rem] border-[3px] border-black bg-[#fff7d6] p-4 shadow-[4px_4px_0px_0px_#000]">
                                <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-800">
                                    Ready to unlock the next module
                                </p>
                                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                                    All {moduleLessons.length} lessons are complete. Pass this assessment to open the next module and claim the module rewards.
                                </p>
                            </div>
                        </div>
                    </section>

                    <AssessmentPanel
                        badge="Module assessment"
                        title={selectedModule.moduleQuiz.title}
                        description={selectedModule.moduleQuiz.description}
                        questions={selectedModule.moduleQuiz.questions}
                        passingScore={selectedModule.moduleQuiz.passingScore}
                        state={moduleQuizState}
                        submitting={submittingModuleQuizId === selectedModule.id}
                        onSelectAnswer={handleSelectModuleQuizAnswer}
                        onSubmit={() => void handleSubmitModuleQuiz()}
                        submitLabel={moduleQuizPassed ? "Retake module assessment" : "Submit module assessment"}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="quest-page-bg min-h-screen px-4 py-6 md:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* ─── Top bar ─── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href="/dashboard/continue-learning"
                        className="inline-flex items-center btn-secondary text-sm px-4 py-2"
                    >
                        ← Back to courses
                    </Link>

                    <div className="quest-note min-w-[280px] flex-1 px-4 py-3 md:max-w-[420px]">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Course progress</p>
                            <p className="text-sm font-black text-comic-ink">{completedCount}/{totalLessons}</p>
                        </div>
                        <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-black bg-white">
                            <div
                                className="h-full rounded-full bg-comic-blue progress-stripes"
                                style={{ width: `${courseProgressWidth}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* ─── Celebration banner ─── */}
                {celebrationBanner && (
                    <section className="quest-surface border-comic-green bg-[#eefbf1] p-4 text-sm font-black text-comic-ink animate-pop">
                        🎉 {celebrationBanner}
                    </section>
                )}

                {/* ─── Hero (compact) ─── */}
                <section className="quest-hero p-6 md:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-3xl">
                            <p className="text-sm font-black uppercase tracking-[0.16em] text-comic-blue-dark">
                                Module {selectedLesson.moduleIndex + 1} — Lesson {selectedLesson.lessonNumber} of {moduleLessons.length}
                            </p>
                            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-comic-ink md:text-4xl xl:text-5xl">
                                {selectedLesson.title}
                            </h1>
                            <p className="mt-3 text-base font-bold leading-7 text-slate-600">
                                {selectedModule.title}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="quest-chip bg-white">{lessonStatusLabel}</span>
                                <span className="quest-chip bg-white">{course.difficulty}</span>
                                <span className="quest-chip bg-white">{course.duration}</span>
                                <span className="quest-chip bg-[#fff7d6]">+{stageReward.xp} XP</span>
                                <span className="quest-chip bg-[#e9f5ff]">+{stageReward.gems} 💎</span>
                            </div>
                        </div>

                        {/* Module progress mini-card */}
                        <div className="quest-metric bg-white p-4 min-w-[160px]">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Module</p>
                            <p className="mt-1 text-2xl font-black text-comic-ink">{moduleCompletedCount}/{moduleLessons.length}</p>
                            <p className="mt-1 text-xs font-bold text-slate-500">{moduleStatusSummary}</p>
                        </div>
                    </div>
                </section>

                {/* ─── Mission map ─── */}
                <section className="quest-surface p-5 md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="quest-section-label">Mission map</p>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                            {passedModuleIds.length}/{course.modules.length} cleared
                        </p>
                    </div>
                    <div className="mt-5 overflow-x-auto pb-2">
                        <div className="grid min-w-[960px] gap-4 xl:min-w-0 xl:grid-cols-4">
                            {moduleMilestones.map((milestone) => {
                                const completionRatio = milestone.totalLessonsInModule > 0
                                    ? (milestone.completedLessonsInModule / milestone.totalLessonsInModule) * 100
                                    : 0;

                                return (
                                    <div
                                        key={milestone.id}
                                        className={`rounded-[1.6rem] border-[3px] p-4 cursor-pointer transition-transform hover:-translate-y-1 ${getMilestoneCardClass(milestone.status, milestone.isCurrent)}`}
                                        onClick={() => {
                                            if (milestone.status === "locked") {
                                                toast.error("Clear the previous module assessment to unlock this module.");
                                                return;
                                            }
                                            const firstLessonInModule = course.modules[milestone.index]?.lessons[0];
                                            if (firstLessonInModule) {
                                                updateSelectedLesson(firstLessonInModule.id);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-black text-comic-ink">
                                                Module {milestone.index + 1}
                                            </p>
                                            <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${milestoneStatusClass[milestone.status]}`}>
                                                {milestoneStatusLabel[milestone.status]}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-lg font-black leading-tight text-comic-ink">
                                            {milestone.title}
                                        </p>
                                        <div className="mt-4 h-2 overflow-hidden rounded-full border-2 border-black bg-white">
                                            <div className="h-full rounded-full bg-comic-blue" style={{ width: `${completionRatio}%` }} />
                                        </div>
                                        <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                                            {milestone.completedLessonsInModule}/{milestone.totalLessonsInModule} lessons
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ─── Sidebar + Lesson content ─── */}
                <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
                    <CourseSidebar
                        course={course}
                        activeLessonId={selectedLesson.id}
                        completedLessonIds={progress.completedLessons}
                        lockedModuleIds={lockedModuleIds}
                        passedModuleIds={passedModuleIds}
                        revisionModuleIds={revisionModuleIds}
                        onSelectLesson={updateSelectedLesson}
                    />

                    <main className="space-y-6">
                        {/* ─── Tab bar ─── */}
                        <nav className="quest-tab-bar">
                            {([
                                { key: "theory" as const, label: "📖 Theory", done: true },
                                { key: "video" as const, label: "🎬 Video", done: Boolean(selectedLesson.video?.url) },
                                { key: "diagram" as const, label: "📊 Diagram", done: selectedLesson.diagram.steps.length >= 3 },
                                { key: "quiz" as const, label: "✅ Quiz", done: Boolean(selectedAnswer) },
                            ]).map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`quest-tab ${activeTab === tab.key ? "quest-tab--active" : ""} ${tab.done ? "quest-tab--done" : ""}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        {/* ════════ THEORY TAB ════════ */}
                        {activeTab === "theory" && (
                            <article className="quest-canvas p-6 md:p-8 animate-fade-in">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="max-w-3xl">
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                                            📖 Theory & Practice
                                        </p>
                                        <h2 className="mt-2 text-2xl font-black text-comic-ink md:text-3xl">
                                            {selectedLesson.title}
                                        </h2>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="inline-block rounded-full border border-comic-yellow bg-comic-yellow/30 px-3 py-1 text-xs font-black uppercase tracking-wider text-comic-ink">
                                                {course.metadata?.topic || course.courseTitle}
                                            </span>
                                            <span className="inline-block rounded-full border border-comic-blue/30 bg-sky-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-comic-blue-dark">
                                                {selectedLesson.moduleTitle}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => void handleRegenerateLesson()}
                                        disabled={regeneratingLessonId === selectedLesson.id}
                                        className="btn-primary shrink-0 px-4 py-2 text-sm"
                                    >
                                        {regeneratingLessonId === selectedLesson.id ? "Rewriting..." : "🔄 Simplify"}
                                    </button>
                                </div>

                                {/* Main content panels */}
                                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                                    <section className="quest-content-card bg-gradient-to-br from-comic-blue/5 to-comic-blue/10 border-comic-blue/30">
                                        <div className="quest-content-card-header">
                                            <span className="quest-content-card-icon">💡</span>
                                            <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Why this matters</p>
                                        </div>
                                        <div className="text-slate-700 font-medium">
                                            <MarkdownBlock content={selectedLesson.context} />
                                        </div>
                                    </section>

                                    <section className="quest-content-card bg-gradient-to-br from-comic-purple/5 to-comic-purple/10 border-comic-purple/30">
                                        <div className="quest-content-card-header">
                                            <span className="quest-content-card-icon">📘</span>
                                            <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Theory walkthrough</p>
                                        </div>
                                        <div className="text-slate-700 font-medium">
                                            <MarkdownBlock content={selectedLesson.content} />
                                        </div>
                                    </section>

                                    <section className="quest-content-card bg-gradient-to-br from-comic-green/5 to-comic-green/10 border-comic-green/30">
                                        <div className="quest-content-card-header">
                                            <span className="quest-content-card-icon">🔬</span>
                                            <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Worked example</p>
                                        </div>
                                        <div className="text-slate-700 font-medium">
                                            <MarkdownBlock content={selectedLesson.example} />
                                        </div>
                                    </section>

                                    <section className="quest-content-card bg-gradient-to-br from-comic-yellow/5 to-comic-yellow/15 border-comic-yellow/40">
                                        <div className="quest-content-card-header">
                                            <span className="quest-content-card-icon">🎯</span>
                                            <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Practice mission</p>
                                        </div>
                                        <div className="text-slate-700 font-medium">
                                            <MarkdownBlock content={selectedLesson.exercise} />
                                        </div>
                                    </section>
                                </div>

                                {/* Summary card */}
                                <section className="mt-4 quest-content-card bg-[#fff7d6]">
                                    <div className="quest-content-card-header">
                                        <span className="quest-content-card-icon">⭐</span>
                                        <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Final takeaway</p>
                                    </div>
                                    <div className="text-slate-700 font-medium">
                                        <MarkdownBlock content={selectedLesson.summary} />
                                    </div>
                                </section>

                                {/* Collapsible extras */}
                                <div className="mt-6 space-y-3">
                                    <div>
                                        <button
                                            type="button"
                                            className="quest-accordion-toggle"
                                            aria-expanded={expandedAccordions["highlights"] ? "true" : "false"}
                                            onClick={() => toggleAccordion("highlights")}
                                        >
                                            👀 At a glance
                                        </button>
                                        <div className={`quest-accordion-body ${expandedAccordions["highlights"] ? "quest-accordion-body--open" : ""}`}>
                                            <ul className="space-y-2 p-1">
                                                {lessonHighlights.map((item, index) => (
                                                    <li key={`${item}-${index}`} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 border-2 border-slate-200">
                                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-comic-yellow/30 text-xs font-black text-comic-ink">
                                                            {String(index + 1).padStart(2, "0")}
                                                        </span>
                                                        <p className="pt-0.5 text-sm leading-6 text-slate-700 font-medium">{item}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div>
                                        <button
                                            type="button"
                                            className="quest-accordion-toggle"
                                            aria-expanded={expandedAccordions["checklist"] ? "true" : "false"}
                                            onClick={() => toggleAccordion("checklist")}
                                        >
                                            ✅ Study checklist
                                        </button>
                                        <div className={`quest-accordion-body ${expandedAccordions["checklist"] ? "quest-accordion-body--open" : ""}`}>
                                            <ul className="space-y-2 p-1">
                                                {lessonChecklist.map((item, index) => (
                                                    <li key={`${item}-${index}`} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 border-2 border-slate-200">
                                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-comic-blue-dark">
                                                            {index + 1}
                                                        </span>
                                                        <p className="text-sm leading-6 text-slate-700 font-medium">{item}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div>
                                        <button
                                            type="button"
                                            className="quest-accordion-toggle"
                                            aria-expanded={expandedAccordions["pitfalls"] ? "true" : "false"}
                                            onClick={() => toggleAccordion("pitfalls")}
                                        >
                                            ⚠️ Common mistakes
                                        </button>
                                        <div className={`quest-accordion-body ${expandedAccordions["pitfalls"] ? "quest-accordion-body--open" : ""}`}>
                                            <ul className="space-y-2 p-1">
                                                {lessonPitfalls.map((item, index) => (
                                                    <li key={`${item}-${index}`} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 border-2 border-rose-200">
                                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-black text-rose-700">
                                                            !
                                                        </span>
                                                        <p className="text-sm leading-6 text-slate-700 font-medium">{item}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Next tab CTA */}
                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("video")}
                                        className="btn-primary px-5 py-2 text-sm"
                                    >
                                        Next: Watch Video →
                                    </button>
                                </div>
                            </article>
                        )}

                        {/* ════════ VIDEO TAB ════════ */}
                        {activeTab === "video" && (
                            <div className="space-y-6 animate-fade-in">
                                <LessonVideoCard
                                    video={selectedLesson.video}
                                    resolving={resolvingLessonId === selectedLesson.id}
                                />
                                <div className="flex justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("theory")}
                                        className="btn-secondary px-5 py-2 text-sm"
                                    >
                                        ← Theory
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("diagram")}
                                        className="btn-primary px-5 py-2 text-sm"
                                    >
                                        Next: Diagram →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ════════ DIAGRAM TAB ════════ */}
                        {activeTab === "diagram" && (
                            <div className="space-y-6 animate-fade-in">
                                <LessonDiagramCard diagram={selectedLesson.diagram} />
                                <div className="flex justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("video")}
                                        className="btn-secondary px-5 py-2 text-sm"
                                    >
                                        ← Video
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("quiz")}
                                        className="btn-primary px-5 py-2 text-sm"
                                    >
                                        Next: Take Quiz →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ════════ QUIZ TAB ════════ */}
                        {activeTab === "quiz" && (
                            <div className="space-y-6 animate-fade-in">
                                <InteractiveQuiz
                                    quiz={selectedLesson.quiz}
                                    selectedAnswer={selectedAnswer}
                                    onSelectAnswer={handleSelectAnswer}
                                />

                                {/* Continue learning card */}
                                <section className="quest-content-card bg-gradient-to-br from-comic-blue/5 to-comic-purple/10 border-comic-blue/30">
                                    <div className="quest-content-card-header">
                                        <span className="quest-content-card-icon">{selectedAnswer ? "🚀" : "🧠"}</span>
                                        <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">
                                            {selectedAnswer ? "Continue learning" : "Answer the question"}
                                        </p>
                                    </div>
                                    <h3 className="text-xl font-black text-comic-ink">
                                        {selectedAnswer ? continueActionLabel : "Complete the quiz first"}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600 font-medium">
                                        {selectedAnswer
                                            ? continueActionDescription
                                            : "Answer the question above to unlock the next step."}
                                    </p>

                                    {selectedAnswer ? (
                                        <button
                                            type="button"
                                            onClick={() => void handleAdvance()}
                                            className="mt-4 btn-primary w-full"
                                        >
                                            {continueActionLabel} →
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => toast.error("Answer the quiz question first to continue.")}
                                            className="mt-4 w-full inline-flex items-center justify-center rounded-xl border-[3px] border-slate-300 bg-slate-100 px-6 py-3 text-lg font-black uppercase tracking-wide text-slate-400 cursor-not-allowed"
                                        >
                                            🔒 Answer Question First
                                        </button>
                                    )}
                                </section>


                                <div className="flex justify-start">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("diagram")}
                                        className="btn-secondary px-5 py-2 text-sm"
                                    >
                                        ← Diagram
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ─── Module result (below tabs) ─── */}
                        {moduleQuizState.score !== null && (
                            <section className="quest-content-card">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <div className="quest-content-card-header">
                                            <span className="quest-content-card-icon">{moduleQuizPassed ? "🏆" : "📊"}</span>
                                            <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Module result</p>
                                        </div>
                                        <h3 className="text-2xl font-black text-comic-ink">
                                            {moduleQuizPassed
                                                ? `Passed with ${moduleQuizState.score}/10`
                                                : `Score: ${moduleQuizState.score}/10`}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-600 font-medium">
                                            {moduleQuizPassed
                                                ? "The next module is now available."
                                                : "Review the weak areas below, then retake the assessment."}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleResetModuleQuiz}
                                        className="btn-secondary text-sm px-4 py-2"
                                    >
                                        🔄 Retry assessment
                                    </button>
                                </div>
                            </section>
                        )}

                        {shouldShowRevision && (
                            <RevisionPanel
                                revision={moduleRevision}
                                loading={revisingModuleId === selectedModule.id}
                                onRefresh={() => void handleRefreshRevision()}
                            />
                        )}

                        {finalAssessmentUnlocked && (
                            <AssessmentPanel
                                badge="Final assessment"
                                title={course.finalAssessment.title}
                                description={course.finalAssessment.description}
                                questions={course.finalAssessment.questions}
                                passingScore={course.finalAssessment.passingScore}
                                state={finalAssessmentState}
                                submitting={submittingFinalAssessment}
                                onSelectAnswer={handleSelectFinalAnswer}
                                onSubmit={() => void handleSubmitFinalAssessment()}
                                submitLabel={finalAssessmentState.passed ? "Retake final assessment" : "Submit final assessment"}
                            />
                        )}

                        {finalAssessmentUnlocked && finalAssessmentState.score !== null && !finalAssessmentState.passed && (
                            <section className="quest-content-card">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <div className="quest-content-card-header">
                                            <span className="quest-content-card-icon">📋</span>
                                            <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Final assessment result</p>
                                        </div>
                                        <h3 className="mt-1 text-2xl font-black text-comic-ink">
                                            {finalAssessmentState.score}/{course.finalAssessment.questions.length}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-600 font-medium">
                                            You need {course.finalAssessment.passingScore}/{course.finalAssessment.questions.length} to earn the certificate.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleResetFinalAssessment}
                                        className="btn-secondary text-sm px-4 py-2"
                                    >
                                        🔄 Retry final assessment
                                    </button>
                                </div>
                            </section>
                        )}

                        {certificate && (
                            <CertificateCard
                                certificate={certificate}
                                onDownload={downloadCertificate}
                                onOpenCourse={(targetCourseId) => router.push(`/course/${targetCourseId}`)}
                            />
                        )}

                        {/* ─── Course completion summary ─── */}
                        {finalAssessmentUnlocked && (
                            <section className="quest-content-card">
                                <div className="quest-content-card-header">
                                    <span className="quest-content-card-icon">🏁</span>
                                    <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">Course completion</p>
                                </div>
                                <div className="mt-2 grid gap-4 md:grid-cols-4">
                                    {[
                                        { label: "Lessons", value: `${completedCount}/${totalLessons}`, done: completedCount === totalLessons },
                                        { label: "Module assessments", value: `${passedModuleIds.length}/${course.modules.length}`, done: allModuleQuizzesPassed },
                                        { label: "Final assessment", value: finalAssessmentState.score !== null ? `${finalAssessmentState.score}/${course.finalAssessment.questions.length}` : "Locked", done: finalAssessmentState.passed },
                                        { label: "Certificate", value: certificate ? "Issued" : "Pending", done: Boolean(certificate) },
                                    ].map((stat) => (
                                        <div
                                            key={stat.label}
                                            className={`rounded-2xl border p-4 ${stat.done ? "border-[3px] border-black bg-comic-green ring-[3px] ring-black shadow-comic text-white" : "border-slate-200 bg-slate-50"}`}
                                        >
                                            <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${stat.done ? "text-white/80" : "text-slate-500"}`}>
                                                {stat.label}
                                            </p>
                                            <p className={`mt-2 text-2xl font-black ${stat.done ? "text-white" : "text-comic-ink"}`}>
                                                {stat.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-4 text-sm leading-6 text-slate-600 font-medium">
                                    Final assessment answers: {finalAssessmentAnsweredCount}/{course.finalAssessment.questions.length}.
                                    Pass the final assessment to unlock the certificate.
                                </p>
                            </section>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

