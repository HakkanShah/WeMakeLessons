import { NextRequest, NextResponse } from "next/server";

import { generateStructuredCourse } from "@/lib/courseGenerator";
import { normalizeDifficulty } from "@/lib/structuredCourse";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
        const duration = typeof body?.duration === "string" ? body.duration.trim() : "";
        const level = normalizeDifficulty(body?.level);

        if (!topic || topic.length < 2 || topic.length > 120) {
            return NextResponse.json(
                { error: "Topic must be between 2 and 120 characters." },
                { status: 400 }
            );
        }

        if (!duration || duration.length < 2 || duration.length > 80) {
            return NextResponse.json(
                { error: "Duration must be between 2 and 80 characters." },
                { status: 400 }
            );
        }

        const course = await generateStructuredCourse({
            topic,
            level,
            duration,
        });

        return NextResponse.json(course);
    } catch (error) {
        console.error("Structured course generation failed:", error);
        return NextResponse.json(
            { error: "Failed to generate course." },
            { status: 500 }
        );
    }
}
