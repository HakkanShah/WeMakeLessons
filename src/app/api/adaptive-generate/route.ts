import { NextResponse } from "next/server";
import { generateAdaptiveCourse } from "@/lib/ai";

export async function POST(request: Request) {
    try {
        const { topic, learningProfile, performanceHistory } = await request.json();

        if (!topic || !learningProfile) {
            return NextResponse.json(
                { error: "Missing required fields: topic, learningProfile" },
                { status: 400 }
            );
        }

        // Use default performance history if not provided (new user)
        const perfHistory = performanceHistory || {
            visualScore: 50,
            readingScore: 50,
            handsonScore: 50,
            listeningScore: 50,
            averageQuizScore: 0,
            totalLessonsCompleted: 0,
            currentDifficulty: "beginner",
            strongTopics: [],
            weakTopics: [],
        };

        const course = await generateAdaptiveCourse(topic, learningProfile, perfHistory);

        return NextResponse.json({
            success: true,
            course,
            adaptiveMetadata: {
                targetDifficulty: perfHistory.currentDifficulty,
                targetModality: learningProfile.learningStyles?.[0] || "reading",
                targetAge: learningProfile.age,
                targetGradeLevel: learningProfile.gradeLevel,
                language: learningProfile.language,
            },
        });
    } catch (error: any) {
        console.error("Adaptive generation error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate adaptive course" },
            { status: 500 }
        );
    }
}
