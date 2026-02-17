import { NextRequest, NextResponse } from "next/server";
import { generateCourse } from "@/lib/ai";

function hasMandatoryIntroYouTubeVideo(course: unknown): boolean {
    if (!course || typeof course !== "object") return false;
    const maybeCourse = course as { lessons?: Array<{ visualAssets?: Array<{ type?: string; url?: string }> }> };
    const firstLesson = maybeCourse.lessons?.[0];
    if (!firstLesson) return false;

    return (firstLesson.visualAssets || []).some((asset) => {
        if (asset?.type !== "video") return false;
        const url = String(asset.url || "");
        return /(?:youtube\.com|youtu\.be)/i.test(url);
    });
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
        if (!hasMandatoryIntroYouTubeVideo(course)) {
            return NextResponse.json(
                { error: "Mandatory intro YouTube video missing from first lesson. Please retry generation." },
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
