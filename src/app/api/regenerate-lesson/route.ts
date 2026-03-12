import { NextRequest, NextResponse } from "next/server";

import { regenerateLessonSupport } from "@/lib/courseSupport";
import { normalizeDifficulty } from "@/lib/structuredCourse";

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

function toSafeRichText(value: unknown, fallback = ""): string {
    if (typeof value !== "string") {
        if (typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }
        return fallback;
    }

    const normalized = value
        .replace(/\r\n?/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    return normalized || fallback;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const lesson = await regenerateLessonSupport({
            courseTitle: toSafeString(body?.courseTitle, "Generated Course"),
            difficulty: normalizeDifficulty(body?.difficulty, "beginner"),
            moduleTitle: toSafeString(body?.moduleTitle, "Module"),
            moduleDescription: toSafeString(body?.moduleDescription),
            lessonTitle: toSafeString(body?.lessonTitle, "Lesson"),
            context: toSafeRichText(body?.context),
            content: toSafeRichText(body?.content),
            example: toSafeRichText(body?.example),
            exercise: toSafeRichText(body?.exercise),
            summary: toSafeRichText(body?.summary),
        });

        return NextResponse.json({ lesson });
    } catch (error) {
        console.error("Lesson regeneration failed:", error);
        return NextResponse.json(
            { error: "Failed to regenerate lesson." },
            { status: 500 }
        );
    }
}
