import { NextRequest, NextResponse } from "next/server";

import { buildYouTubeSearchUrl, isHttpUrl } from "@/lib/lessonMedia";
import type { StructuredLessonVideo } from "@/lib/structuredCourse";
import { resolveStructuredLessonVideo } from "@/lib/youtubeLessonVideo";

function toSafeString(value: unknown, fallback = ""): string {
    if (typeof value !== "string") {
        if (typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }
        return fallback;
    }

    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized || fallback;
}

function normalizeVideoPayload(rawVideo: unknown): StructuredLessonVideo | null {
    if (!rawVideo || typeof rawVideo !== "object") {
        return null;
    }

    const video = rawVideo as Record<string, unknown>;
    const searchQuery = toSafeString(video.searchQuery);

    if (!searchQuery) {
        return null;
    }

    const rawUrl = toSafeString(video.url);

    return {
        title: toSafeString(video.title, "Lesson Video"),
        url: isHttpUrl(rawUrl) ? rawUrl : buildYouTubeSearchUrl(searchQuery),
        searchQuery,
        summary: toSafeString(
            video.summary,
            "Watch this guided lesson video to hear the concept explained and reinforced with examples."
        ),
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const video = normalizeVideoPayload(body?.video);
        const language = typeof body?.language === "string" ? body.language : undefined;

        if (!video) {
            return NextResponse.json(
                { error: "A valid lesson video payload is required." },
                { status: 400 }
            );
        }

        const resolvedVideo = await resolveStructuredLessonVideo(video, language);
        return NextResponse.json({ video: resolvedVideo });
    } catch (error) {
        console.error("Lesson video resolution failed:", error);
        return NextResponse.json(
            { error: "Failed to resolve lesson video." },
            { status: 500 }
        );
    }
}
