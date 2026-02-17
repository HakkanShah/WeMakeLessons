import { NextResponse } from "next/server";
import { generateAdaptiveCourse } from "@/lib/ai";
import {
    calculateOptimalModality,
    calculateNextDifficulty,
    type LearningProfile,
    type PerformanceHistory,
} from "@/lib/adaptiveEngine";

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
        if (!hasMandatoryYouTubeVideoInEveryLesson(course)) {
            return NextResponse.json(
                { error: "Mandatory YouTube video missing from one or more lessons. Please retry generation." },
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
