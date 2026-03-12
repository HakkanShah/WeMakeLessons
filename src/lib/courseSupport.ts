import "server-only";

import { generateStructuredJson, hasCourseAiAccess } from "@/lib/courseAi";
import {
    normalizeStructuredLessonRegeneration,
    type CourseDifficulty,
    type StructuredLessonRegeneration,
    type StructuredModuleRevision,
} from "@/lib/structuredCourse";

interface RegenerateLessonInput {
    courseTitle: string;
    difficulty: CourseDifficulty;
    moduleTitle: string;
    moduleDescription: string;
    lessonTitle: string;
    context: string;
    content: string;
    example: string;
    exercise: string;
    summary: string;
}

interface GenerateRevisionInput {
    courseTitle: string;
    difficulty: CourseDifficulty;
    moduleTitle: string;
    moduleDescription: string;
    score: number;
    lessonTitles: string[];
    missedTopics: string[];
}

function toSafeString(value: unknown, fallback = ""): string {
    if (typeof value !== "string") {
        if (typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }
        return fallback;
    }

    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized || fallback;
}

function toStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => toSafeString(item))
        .filter(Boolean);
}

function buildFallbackLessonRegeneration(input: RegenerateLessonInput): StructuredLessonRegeneration {
    return {
        context: `${input.lessonTitle} explains an important part of ${input.moduleTitle} and connects core terms to real subject behavior.`,
        content: [
            `${input.lessonTitle} introduces the essential terminology used in ${input.moduleTitle}. Each term should be linked to what it represents in the real process or system.`,
            `The mechanism should be explained with factual cause-and-effect: identify inputs and conditions, trace the process step by step, and determine outputs or outcomes.`,
            `A realistic scenario then shows how these terms and process steps are used to reason toward a correct answer in context.`,
        ].join("\n\n"),
        example: [
            `Worked example: solve one realistic ${input.moduleTitle.toLowerCase()} scenario involving ${input.lessonTitle.toLowerCase()}.`,
            "1. Identify relevant variables and facts.",
            "2. Map them to the correct process steps.",
            "3. Use domain terminology to justify the conclusion.",
        ].join("\n"),
        exercise: [
            `Retry task: solve a new scenario for ${input.lessonTitle.toLowerCase()}.`,
            "State the final answer and justify it with at least two specific subject facts.",
        ].join("\n"),
        summary: `${input.lessonTitle} is complete when you can explain the terms, trace the mechanism, and apply both in a new scenario.`,
        diagram: {
            title: `${input.lessonTitle} Clear Flow`,
            description: `A simplified flow chart for understanding ${input.lessonTitle.toLowerCase()} inside ${input.moduleTitle}.`,
            steps: [
                {
                    title: "Subject Context",
                    detail: `Connect the concept to the job it does inside ${input.moduleTitle}.`,
                },
                {
                    title: "Domain Terms",
                    detail: `State the key terminology and what each term means.`,
                },
                {
                    title: "Process Flow",
                    detail: `Follow one worked example from start to finish using factual reasoning.`,
                },
                {
                    title: "Applied Check",
                    detail: `Solve a similar scenario on your own and justify the conclusion.`,
                },
            ],
        },
    };
}

function buildFallbackModuleRevision(input: GenerateRevisionInput): StructuredModuleRevision {
    const focusAreas = input.missedTopics.length > 0
        ? input.missedTopics.slice(0, 5)
        : input.lessonTitles.slice(0, 5);

    return {
        title: `${input.moduleTitle} Mini Revision`,
        summary: `You scored ${input.score}/10. Revisit the core ideas below and retry the mastery quiz after this short revision.`,
        focusAreas,
        refresher: `Review the lesson contexts, examples, and flow charts for ${input.moduleTitle}. After each one, explain the idea in your own words before moving to the next.`,
        practice: `Pick two focus areas, redraw their flow from memory, and solve one practice task for each before retaking the quiz.`,
    };
}

function buildLessonPrompt(input: RegenerateLessonInput): string {
    return `
You are rewriting a lesson so it becomes easier to understand without becoming shallow.

Return valid JSON only.

Course title: ${input.courseTitle}
Difficulty: ${input.difficulty}
Module title: ${input.moduleTitle}
Module description: ${input.moduleDescription}
Lesson title: ${input.lessonTitle}

Current lesson notes:
Context: ${input.context}
Content: ${input.content}
Example: ${input.example}
Exercise: ${input.exercise}
Summary: ${input.summary}

Rewrite the lesson with:
- clearer context
- simpler but factual theory explanation
- one stronger subject-specific example
- one practical retry exercise that checks subject reasoning
- one concise summary
- a 4-step flow-chart style diagram

Hard constraints:
- Generate content about the subject itself, not about how to study the subject.
- Avoid generic filler phrases like "core concept", "guided analysis", or "common mistakes" unless tied to concrete domain facts.
- Preserve and expand real topic terminology from the current lesson notes.
- Example and exercise must test subject understanding, not writing/explanation style.

The content field must teach the concept properly, not just summarize it.
Write it as 3 short paragraphs in this order:
1) definition and domain terms,
2) mechanism and cause-and-effect,
3) application in a realistic scenario.

JSON shape:
{
  "context": "string",
  "content": "string",
  "example": "string",
  "exercise": "string",
  "summary": "string",
  "diagram": {
    "title": "string",
    "description": "string",
    "steps": [
      {
        "title": "string",
        "detail": "string"
      }
    ]
  }
}
`.trim();
}

function buildRevisionPrompt(input: GenerateRevisionInput): string {
    return `
You are creating a targeted mini revision for a learner who struggled in one module quiz.

Return valid JSON only.

Course title: ${input.courseTitle}
Difficulty: ${input.difficulty}
Module title: ${input.moduleTitle}
Module description: ${input.moduleDescription}
Score: ${input.score}/10
Lesson titles: ${input.lessonTitles.join(" | ")}
Missed topics: ${input.missedTopics.join(" | ")}

Create a concise but helpful revision plan with:
- title
- summary
- focusAreas
- refresher
- practice

JSON shape:
{
  "title": "string",
  "summary": "string",
  "focusAreas": ["string"],
  "refresher": "string",
  "practice": "string"
}
`.trim();
}

export async function regenerateLessonSupport(input: RegenerateLessonInput): Promise<StructuredLessonRegeneration> {
    const fallback = buildFallbackLessonRegeneration(input);

    if (!hasCourseAiAccess()) {
        return fallback;
    }

    try {
        const payload = await generateStructuredJson<StructuredLessonRegeneration>(buildLessonPrompt(input));
        return normalizeStructuredLessonRegeneration(payload, input.lessonTitle, input.moduleTitle);
    } catch {
        return fallback;
    }
}

export async function generateTargetedModuleRevision(input: GenerateRevisionInput): Promise<StructuredModuleRevision> {
    const fallback = buildFallbackModuleRevision(input);

    if (!hasCourseAiAccess()) {
        return fallback;
    }

    try {
        const payload = await generateStructuredJson<StructuredModuleRevision>(buildRevisionPrompt(input));
        return {
            title: toSafeString(payload.title, fallback.title),
            summary: toSafeString(payload.summary, fallback.summary),
            focusAreas: toStringList(payload.focusAreas).slice(0, 6).length > 0
                ? toStringList(payload.focusAreas).slice(0, 6)
                : fallback.focusAreas,
            refresher: toSafeString(payload.refresher, fallback.refresher),
            practice: toSafeString(payload.practice, fallback.practice),
        };
    } catch {
        return fallback;
    }
}
