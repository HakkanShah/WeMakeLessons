import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

export async function generateCourse(params: CourseGenerationParams): Promise<GeneratedCourse> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

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
        return course;
    } catch (error) {
        console.error("AI Generation Error:", error);

        // Fallback Mechanism
        const { fallbackCourses } = require("./fallbackCourses"); // Lazy load
        const normalizedTopic = params.topic.toLowerCase().trim();

        if (fallbackCourses[normalizedTopic]) {
            console.log(`Using fallback for topic: ${normalizedTopic}`);
            return fallbackCourses[normalizedTopic];
        }

        throw new Error("Failed to generate course. Please try again.");
    }
}

export async function getAITutorResponse(
    lessonContext: string,
    userQuestion: string,
    isQuizRelated: boolean
): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        const result = await model.generateContent([
            { text: systemPrompt },
            { text: `Student Question: ${userQuestion}` },
        ]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Tutor Error:", error);
        return "I'm having trouble responding right now. Please try again in a moment.";
    }
}
