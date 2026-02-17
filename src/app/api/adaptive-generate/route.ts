import { NextResponse } from "next/server";
import { generateAdaptiveCourse } from "@/lib/ai";
import {
    calculateOptimalModality,
    calculateNextDifficulty,
    type LearningProfile,
    type PerformanceHistory,
} from "@/lib/adaptiveEngine";

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

export async function POST(request: Request) {
    try {
        const { topic, learningProfile, performanceHistory } = await request.json();

        if (!topic || !learningProfile) {
            return NextResponse.json(
                { error: "Missing required fields: topic, learningProfile" },
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

        // Use default performance history if not provided (new user)
        const perfHistory: PerformanceHistory = performanceHistory || {
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

        const profile = learningProfile as LearningProfile;
        const computedModality = calculateOptimalModality(profile, perfHistory)[0] || "reading";
        const computedDifficulty = calculateNextDifficulty(perfHistory);
        const course = await generateAdaptiveCourse(safeTopic, profile, perfHistory);
        if (!hasMandatoryIntroYouTubeVideo(course)) {
            return NextResponse.json(
                { error: "Mandatory intro YouTube video missing from first lesson. Please retry generation." },
                { status: 500 }
            );
        }
        const metadata = course.metadata || {};

        return NextResponse.json({
            success: true,
            course,
            adaptiveMetadata: {
                targetDifficulty: metadata.difficulty || computedDifficulty,
                targetModality: metadata.primaryModality || computedModality,
                targetAge: metadata.targetAge || profile.age,
                targetGradeLevel: metadata.gradeLevel || profile.gradeLevel,
                language: metadata.language || profile.language,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to generate adaptive course";
        console.error("Adaptive generation error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
