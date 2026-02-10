import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
].filter(Boolean) as string[];

// Gemini models in fallback order (free tier available models)
const GEMINI_MODELS = [
    "gemini-2.5-flash",       // Fast, balanced, cost-efficient
    "gemini-2.5-flash-lite",  // Lightweight, high-volume, low-latency
    "gemini-2.5-pro",         // Complex reasoning, coding, analysis
    "gemini-2.0-flash",       // Older stable model
    "gemini-1.5-flash",       // Legacy high-stability fallback
] as const;

type GeminiModel = typeof GEMINI_MODELS[number];

export interface CourseLesson {
    id: string;
    title: string;
    content: string;
    duration: number;
    quiz: {
        question: string;
        options: string[];
        correctAnswer: number;
        explanation: string;
    }[];
}

export interface GeneratedCourse {
    title: string;
    description: string;
    learningObjectives: string[];
    lessons: CourseLesson[];
}

export interface CourseGenerationParams {
    topic: string;
    targetAge: string;
    language: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    learningGoals: string;
}

/**
 * Sleep for a given duration
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Attempts to generate content using multiple Gemini models AND multiple API keys with fallback and retry
 * @param prompt - The prompt to send to the model
 * @param maxRetries - Maximum retries per model for rate limits (default 1)
 * @returns The generated text response
 */
async function generateWithFallback(
    prompt: string | { text: string }[],
    maxRetries: number = 1
): Promise<string> {
    let lastError: Error | null = null;

    // Outer loop: Iterate through API keys
    for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
        const apiKey = API_KEYS[keyIndex];
        const genAI = new GoogleGenerativeAI(apiKey);

        console.log(`Using API Key #${keyIndex + 1}/${API_KEYS.length}`);

        // Inner loop: Iterate through Models
        for (let modelIndex = 0; modelIndex < GEMINI_MODELS.length; modelIndex++) {
            const modelName = GEMINI_MODELS[modelIndex];

            for (let retry = 0; retry <= maxRetries; retry++) {
                try {
                    if (retry > 0) {
                        console.log(`Retry ${retry}/${maxRetries} for model: ${modelName} (Key #${keyIndex + 1})`);
                    } else {
                        console.log(`Attempting generation with model: ${modelName} (Key #${keyIndex + 1})`);
                    }

                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();

                    console.log(`Successfully generated with model: ${modelName}`);
                    return text;
                } catch (error) {
                    console.warn(`Model ${modelName} failed (attempt ${retry + 1}) with Key #${keyIndex + 1}:`, error);
                    lastError = error as Error;

                    const errorMessage = (error as Error).message?.toLowerCase() || "";
                    const isRateLimit =
                        errorMessage.includes("429") ||
                        errorMessage.includes("rate limit") ||
                        errorMessage.includes("too many requests") ||
                        errorMessage.includes("quota");

                    const isQuotaExceeded = errorMessage.includes("quota") || errorMessage.includes("429");

                    // If it's a hard quota limit, break retry loop immediately to switch models/keys
                    if (isQuotaExceeded && retry < maxRetries) {
                        console.log("Quota exceeded, switching strategy immediately.");
                        break;
                    }

                    // If rate limited and we have retries left, wait and retry same model
                    if (isRateLimit && retry < maxRetries) {
                        const waitTime = Math.pow(2, retry + 1) * 1000; // Exponential backoff: 2s, 4s
                        console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
                        await sleep(waitTime);
                        continue;
                    }

                    // Move to next model
                    break;
                }
            }
        }
    }

    // All keys and models failed
    throw lastError || new Error("All Gemini models/keys failed");
}

export async function generateCourse(params: CourseGenerationParams): Promise<GeneratedCourse> {
    const prompt = `You are an expert course creator. Generate a complete educational course based on the following parameters:

Topic: ${params.topic}
Target Age Group: ${params.targetAge}
Language: ${params.language}
Difficulty Level: ${params.difficulty}
Learning Goals: ${params.learningGoals}

Create a structured course with:
1. A compelling title
2. A brief description (2-3 sentences)
3. 3-5 learning objectives
4. 5-7 lessons, each containing:
   - A clear title
   - Educational content (300-500 words, formatted in markdown)
   - Estimated reading time in minutes
   - 3 quiz questions with 4 options each, correct answer index (0-3), and explanation

IMPORTANT: Return ONLY valid JSON in this exact format, no markdown code blocks:
{
  "title": "Course Title",
  "description": "Course description",
  "learningObjectives": ["objective1", "objective2"],
  "lessons": [
    {
      "id": "lesson_1",
      "title": "Lesson Title",
      "content": "Markdown content here...",
      "duration": 5,
      "quiz": [
        {
          "question": "Question text?",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": 0,
          "explanation": "Explanation why A is correct"
        }
      ]
    }
  ]
}`;

    try {
        const text = await generateWithFallback(prompt);

        // Clean the response - remove markdown code blocks if present
        let cleanedText = text.trim();
        if (cleanedText.startsWith("```json")) {
            cleanedText = cleanedText.slice(7);
        }
        if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.slice(3);
        }
        if (cleanedText.endsWith("```")) {
            cleanedText = cleanedText.slice(0, -3);
        }

        const course = JSON.parse(cleanedText.trim()) as GeneratedCourse;

        // Validation: Ensure lessons exist and is an array
        if (!course.lessons || !Array.isArray(course.lessons) || course.lessons.length === 0) {
            throw new Error("Generated course is missing lessons");
        }

        return course;
    } catch (error) {
        console.error("AI Generation Error:", error);

        // Fallback Mechanism to pre-built courses
        const { fallbackCourses } = require("./fallbackCourses"); // Lazy load
        const normalizedTopic = params.topic.toLowerCase().trim();

        // 1. Try exact match
        if (fallbackCourses[normalizedTopic]) {
            console.log(`Using fallback for topic: ${normalizedTopic}`);
            return fallbackCourses[normalizedTopic];
        }

        // 2. Try identifying keywords
        const knownTopics = Object.keys(fallbackCourses);
        const match = knownTopics.find(t => normalizedTopic.includes(t) || t.includes(normalizedTopic));
        if (match) {
            console.log(`Using partial fallback match: ${match}`);
            return fallbackCourses[match];
        }

        // 3. Ultimate Fallback: Return "Space Travel" as a demo if everything fails
        // This prevents the app from crashing (500 error) when AI is down/busy and topic is unknown
        console.log("No specific fallback found. Using default Space Travel course to prevent crash.");

        // Clone the object to avoid mutating the original
        const defaultCourse = JSON.parse(JSON.stringify(fallbackCourses["space travel"]));
        defaultCourse.title = `(Demo) ${defaultCourse.title}`;
        defaultCourse.description = `[AI Unavailable - Showing Demo] ${defaultCourse.description}`;
        return defaultCourse;
    }
}

/**
 * Generate a course adaptively based on student's learning profile and performance history.
 * Uses the adaptive engine to build a personalized prompt.
 */
export async function generateAdaptiveCourse(
    topic: string,
    learningProfile: import("./adaptiveEngine").LearningProfile,
    performanceHistory: import("./adaptiveEngine").PerformanceHistory,
): Promise<GeneratedCourse> {
    const { generateAdaptiveCoursePrompt } = require("./adaptiveEngine");
    const prompt = generateAdaptiveCoursePrompt(learningProfile, performanceHistory, topic);

    try {
        const text = await generateWithFallback(prompt);

        // Clean the response - remove markdown code blocks if present
        let cleanedText = text.trim();
        if (cleanedText.startsWith("```json")) {
            cleanedText = cleanedText.slice(7);
        }
        if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.slice(3);
        }
        if (cleanedText.endsWith("```")) {
            cleanedText = cleanedText.slice(0, -3);
        }

        const course = JSON.parse(cleanedText.trim()) as GeneratedCourse;

        // Validation: Ensure lessons exist and is an array
        if (!course.lessons || !Array.isArray(course.lessons) || course.lessons.length === 0) {
            throw new Error("Generated adaptive course is missing lessons");
        }

        return course;
    } catch (error) {
        console.error("Adaptive AI Generation Error, falling back to standard generation:", error);
        // Fall back to standard generation with profile-derived params
        return generateCourse({
            topic,
            targetAge: String(learningProfile.age),
            language: learningProfile.language,
            difficulty: performanceHistory.currentDifficulty || "beginner",
            learningGoals: `Personalized for ${learningProfile.gradeLevel} student interested in ${learningProfile.interests.join(", ")}`,
        });
    }
}

export async function getAITutorResponse(
    lessonContext: string,
    userQuestion: string,
    isQuizRelated: boolean
): Promise<string> {
    const systemPrompt = isQuizRelated
        ? `You are a helpful AI tutor. The student is asking about a quiz question. 
       DO NOT give the direct answer. Instead:
       - Provide hints and clues
       - Explain related concepts
       - Guide them to think through the problem
       - Encourage their learning
       
       Lesson Context: ${lessonContext}`
        : `You are a friendly AI tutor helping a student learn.
       - Explain concepts clearly and simply
       - Use examples when helpful
       - Be encouraging and supportive
       - Keep responses concise (2-3 paragraphs max)
       
       Lesson Context: ${lessonContext}`;

    try {
        const text = await generateWithFallback([
            { text: systemPrompt },
            { text: `Student Question: ${userQuestion}` },
        ]);
        return text;
    } catch (error) {
        console.error("AI Tutor Error:", error);
        return "I'm having trouble responding right now. Please try again in a moment.";
    }
}

