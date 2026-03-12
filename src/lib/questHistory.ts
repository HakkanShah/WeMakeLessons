import type { Firestore } from "firebase/firestore";
import { collection, getDocs, query, where } from "firebase/firestore";

import { getCourseLessonCount, normalizeDifficulty } from "@/lib/structuredCourse";

export interface QuestHistoryItem {
    id: string;
    title: string;
    topic: string;
    description: string;
    difficulty: string;
    duration: string;
    modulesCount: number;
    lessonsCount: number;
    completedLessons: number;
    progressPercent: number;
    status: "fresh" | "active" | "completed";
    createdAtLabel: string;
    lastAccessedLabel: string;
    currentLessonId: string | null;
}

function toDate(value: unknown): Date | null {
    if (!value) return null;

    if (value instanceof Date) return value;

    if (typeof value === "object") {
        const candidate = value as { toDate?: () => Date; seconds?: number };
        if (typeof candidate.toDate === "function") {
            return candidate.toDate();
        }
        if (typeof candidate.seconds === "number") {
            return new Date(candidate.seconds * 1000);
        }
    }

    return null;
}

function formatDateLabel(value: unknown, emptyLabel: string): string {
    const date = toDate(value);
    if (!date) return emptyLabel;

    const now = Date.now();
    const diffMs = now - date.getTime();
    const dayMs = 1000 * 60 * 60 * 24;
    const diffDays = Math.floor(diffMs / dayMs);

    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    }).format(date);
}

function normalizeHistoryDifficulty(value: unknown): string {
    const difficulty = normalizeDifficulty(value);
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

export async function fetchQuestHistory(db: Firestore, userId: string): Promise<QuestHistoryItem[]> {
    const [coursesSnapshot, progressSnapshot] = await Promise.all([
        getDocs(query(collection(db, "courses"), where("creatorId", "==", userId))),
        getDocs(query(collection(db, "course_progress"), where("userId", "==", userId))),
    ]);

    const progressMap = new Map(
        progressSnapshot.docs.map((progressDoc) => {
            const data = progressDoc.data() as {
                courseId?: string;
                completedLessons?: string[];
                currentLessonId?: string | null;
                lastAccessedAt?: unknown;
                certificateId?: string | null;
                finalAssessmentResult?: { passed?: boolean } | null;
            };

            return [
                String(data.courseId || ""),
                {
                    completedLessons: Array.isArray(data.completedLessons) ? data.completedLessons : [],
                    currentLessonId: typeof data.currentLessonId === "string" ? data.currentLessonId : null,
                    lastAccessedAt: data.lastAccessedAt,
                    certificateId: typeof data.certificateId === "string" ? data.certificateId : null,
                    finalPassed: Boolean(data.finalAssessmentResult?.passed),
                },
            ];
        })
    );

    return coursesSnapshot.docs
        .map((courseDoc) => {
            const data = courseDoc.data() as Record<string, unknown>;
            const progress = progressMap.get(courseDoc.id);
            const lessonsCount = getCourseLessonCount(data);
            const modulesCount = Array.isArray(data.modules) ? data.modules.length : lessonsCount > 0 ? Math.ceil(lessonsCount / 4) : 0;
            const completedLessons = progress?.completedLessons.length || 0;
            const progressPercent = lessonsCount > 0 ? Math.round((completedLessons / lessonsCount) * 100) : 0;
            const createdAtMs = toDate(data.createdAt)?.getTime() || 0;
            const courseCertified = Boolean(progress?.certificateId) || Boolean(progress?.finalPassed);
            const status: QuestHistoryItem["status"] =
                courseCertified
                    ? "completed"
                    : completedLessons > 0
                        ? "active"
                        : "fresh";

            return {
                createdAtMs,
                historyItem: {
                    id: courseDoc.id,
                    title: typeof data.title === "string" ? data.title : typeof data.courseTitle === "string" ? data.courseTitle : "Untitled Quest",
                    topic: typeof data.topic === "string" && data.topic.trim() ? data.topic : typeof data.title === "string" ? data.title : "General",
                    description: typeof data.description === "string" ? data.description : "A custom quest built for your next learning run.",
                    difficulty: normalizeHistoryDifficulty(
                        data.difficulty ??
                        (data.metadata && typeof data.metadata === "object"
                            ? (data.metadata as Record<string, unknown>).difficulty
                            : undefined)
                    ),
                    duration: typeof data.duration === "string" && data.duration.trim() ? data.duration : "Self-paced",
                    modulesCount,
                    lessonsCount,
                    completedLessons,
                    progressPercent,
                    status,
                    createdAtLabel: formatDateLabel(data.createdAt, "Recently"),
                    lastAccessedLabel: formatDateLabel(progress?.lastAccessedAt, status === "fresh" ? "Not started" : "Recently"),
                    currentLessonId: progress?.currentLessonId || null,
                } satisfies QuestHistoryItem,
            };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
        .map((entry) => entry.historyItem);
}
