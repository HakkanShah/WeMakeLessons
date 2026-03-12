import { NextRequest, NextResponse } from "next/server";
import { getAITutorResponse } from "@/lib/ai";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lessonContext, question, isQuizRelated, history, userName, learningProfile } = body;

        if (!question) {
            return NextResponse.json(
                { error: "Question is required" },
                { status: 400 }
            );
        }

        const response = await getAITutorResponse(
            lessonContext || "",
            question,
            isQuizRelated || false,
            history || [],
            userName || "Student",
            learningProfile || null
        );

        return NextResponse.json({ response });
    } catch (error) {
        console.error("AI Tutor error:", error);
        return NextResponse.json(
            { error: "Failed to get tutor response" },
            { status: 500 }
        );
    }
}
