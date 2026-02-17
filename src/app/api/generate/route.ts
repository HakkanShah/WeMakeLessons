import { NextRequest, NextResponse } from "next/server";
import { generateCourse } from "@/lib/ai";

function hasMandatoryYouTubeVideoInEveryLesson(course: unknown): boolean {
    if (!course || typeof course !== "object") return false;
    const maybeCourse = course as { lessons?: Array<{ visualAssets?: Array<{ type?: string; url?: string }> }> };
    const lessons = maybeCourse.lessons;
    if (!Array.isArray(lessons) || lessons.length === 0) return false;

    return lessons.every((lesson) =>
        (lesson.visualAssets || []).some((asset) => {
            if (asset?.type !== "video") return false;
            const url = String(asset.url || "");
            return /(?:youtube\.com|youtu\.be)/i.test(url);
        })
    );
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { topic, targetAge, language, difficulty, learningGoals } = body;

        // Validation
        if (!topic || !targetAge || !language || !difficulty) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const safeTopic = String(topic).trim();
        if (safeTopic.length < 2 || safeTopic.length > 120) {
            return NextResponse.json(
                { error: "Topic must be between 2 and 120 characters" },
                { status: 400 }
            );
        }

        const course = await generateCourse({
            topic: safeTopic,
            targetAge,
            language,
            difficulty,
            learningGoals: learningGoals || "",
        });
        if (!hasMandatoryYouTubeVideoInEveryLesson(course)) {
            return NextResponse.json(
                { error: "Mandatory YouTube video missing from one or more lessons. Please retry generation." },
                { status: 500 }
            );
        }

        return NextResponse.json({ course });
    } catch (error) {
        console.error("Course generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate course" },
            { status: 500 }
        );
    }
}
