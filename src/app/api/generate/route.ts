import { NextRequest, NextResponse } from "next/server";
import { generateCourse } from "@/lib/ai";

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

        return NextResponse.json({ course });
    } catch (error) {
        console.error("Course generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate course" },
            { status: 500 }
        );
    }
}
