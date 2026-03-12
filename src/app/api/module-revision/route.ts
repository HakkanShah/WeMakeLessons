import { NextRequest, NextResponse } from "next/server";

import { generateTargetedModuleRevision } from "@/lib/courseSupport";
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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const missedTopics = Array.isArray(body?.missedTopics)
            ? body.missedTopics.map((item: unknown) => toSafeString(item)).filter(Boolean)
            : [];
        const lessonTitles = Array.isArray(body?.lessonTitles)
            ? body.lessonTitles.map((item: unknown) => toSafeString(item)).filter(Boolean)
            : [];

        const revision = await generateTargetedModuleRevision({
            courseTitle: toSafeString(body?.courseTitle, "Generated Course"),
            difficulty: normalizeDifficulty(body?.difficulty, "beginner"),
            moduleTitle: toSafeString(body?.moduleTitle, "Module"),
            moduleDescription: toSafeString(body?.moduleDescription),
            score: Math.max(0, Math.min(10, Number(body?.score) || 0)),
            lessonTitles,
            missedTopics,
        });

        return NextResponse.json({ revision });
    } catch (error) {
        console.error("Module revision generation failed:", error);
        return NextResponse.json(
            { error: "Failed to generate module revision." },
            { status: 500 }
        );
    }
}
