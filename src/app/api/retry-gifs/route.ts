import { NextResponse } from "next/server";
import { enrichCourseWithGifRetries, type GeneratedCourse } from "@/lib/ai";

function isGeneratedCourse(value: unknown): value is GeneratedCourse {
    if (!value || typeof value !== "object") return false;
    const course = value as { title?: unknown; lessons?: unknown };
    if (typeof course.title !== "string") return false;
    if (!Array.isArray(course.lessons) || course.lessons.length === 0) return false;
    return true;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const topic = String(body?.topic || "").trim();
        const rawCourse = body?.course;
        const requestedAttempts = Number(body?.maxAttempts);

        if (topic.length < 2 || topic.length > 120) {
            return NextResponse.json(
                { error: "Topic must be between 2 and 120 characters" },
                { status: 400 }
            );
        }

        if (!isGeneratedCourse(rawCourse)) {
            return NextResponse.json(
                { error: "Invalid course payload" },
                { status: 400 }
            );
        }

        const maxAttempts = Number.isFinite(requestedAttempts)
            ? Math.min(4, Math.max(1, Math.floor(requestedAttempts)))
            : 3;

        const course = await enrichCourseWithGifRetries(rawCourse, topic, {
            maxAttempts,
            retryDelayMs: 1000,
        });

        return NextResponse.json({
            success: true,
            course,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to retry GIF enrichment";
        console.error("GIF retry error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
