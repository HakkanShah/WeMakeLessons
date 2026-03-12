import "server-only";

import { generateStructuredJson, hasCourseAiAccess } from "@/lib/courseAi";
import { buildLessonVideoSearchQuery, buildYouTubeSearchUrl, isHttpUrl } from "@/lib/lessonMedia";
import {
    normalizeDifficulty,
    slugifySegment,
    type CourseDifficulty,
    type StructuredAssessmentQuestion,
    type StructuredCertificateTemplate,
    type StructuredCourse,
    type StructuredFinalAssessment,
    type StructuredLesson,
    type StructuredLessonDiagram,
    type StructuredLessonRegeneration,
    type StructuredLessonVideo,
    type StructuredModule,
    type StructuredModuleQuiz,
    type StructuredModuleRevision,
} from "@/lib/structuredCourse";
import { resolveStructuredLessonVideo } from "@/lib/youtubeLessonVideo";

export interface CourseGenerationRequest {
    topic: string;
    level: CourseDifficulty;
    duration: string;
}

interface OutlineLessonDraft {
    title: string;
    focus: string;
}

interface OutlineModuleDraft {
    title: string;
    description: string;
    lessons: OutlineLessonDraft[];
}

interface OutlineDraft {
    courseTitle: string;
    difficulty: CourseDifficulty;
    duration: string;
    objectives: string[];
    prerequisites: string[];
    modules: OutlineModuleDraft[];
}

interface GeneratedAssessmentQuestionDraft {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
}

interface GeneratedLessonDraft {
    title: string;
    context: string;
    content: string;
    example: string;
    quiz: GeneratedAssessmentQuestionDraft;
    video: {
        title: string;
        searchQuery: string;
        summary: string;
        url?: string;
    };
    diagram: {
        title: string;
        description: string;
        steps: Array<{
            title: string;
            detail: string;
        }>;
    };
    exercise: string;
    summary: string;
}

interface GeneratedModuleDraft {
    title: string;
    description: string;
    lessons: GeneratedLessonDraft[];
    moduleQuiz: {
        title: string;
        description: string;
        passingScore: number;
        questions: GeneratedAssessmentQuestionDraft[];
    };
    miniRevision: {
        title: string;
        summary: string;
        focusAreas: string[];
        refresher: string;
        practice: string;
    };
}

interface GeneratedFinalAssessmentDraft {
    title: string;
    description: string;
    passingScore: number;
    questions: GeneratedAssessmentQuestionDraft[];
}

const MODULE_QUIZ_QUESTION_COUNT = 10;
const FINAL_ASSESSMENT_QUESTION_COUNT = 12;

const LESSON_BLUEPRINTS = [
    {
        label: "Core concept",
        action: "break down the concept in plain language",
        practice: "explain the concept in one paragraph and identify where it shows up",
    },
    {
        label: "Guided analysis",
        action: "connect the concept to a worked example",
        practice: "annotate the example and point out the main decision steps",
    },
    {
        label: "Hands-on application",
        action: "apply the idea to a practical task",
        practice: "complete a short exercise and compare your result to the lesson summary",
    },
    {
        label: "Common mistakes",
        action: "surface the most common misunderstandings",
        practice: "write down one mistake to avoid and how to correct it",
    },
    {
        label: "Transfer",
        action: "move the idea into a new scenario",
        practice: "adapt the lesson method to a different but related situation",
    },
] as const;

const MODULE_THEMES = [
    "Foundations",
    "Core Concepts",
    "Practical Methods",
    "Applied Problem Solving",
    "Real-World Execution",
    "Advanced Refinement",
] as const;

const DEFAULT_PREREQUISITES = {
    beginner: ["No prior experience required.", "Basic note-taking materials."],
    intermediate: ["Comfort with the topic basics.", "Ability to follow multi-step examples."],
    advanced: ["Strong command of the fundamentals.", "Readiness for analytical practice."],
} satisfies Record<CourseDifficulty, string[]>;

const toSafeString = (value: unknown, fallback = ""): string => {
    if (typeof value !== "string") {
        if (typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }
        return fallback;
    }

    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized || fallback;
};

const toSafeRichText = (value: unknown, fallback = ""): string => {
    if (typeof value !== "string") {
        if (typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }
        return fallback;
    }

    const normalized = value
        .replace(/\r\n?/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    return normalized || fallback;
};

const toStringList = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => toSafeString(entry))
        .filter(Boolean);
};

function buildId(prefix: string, title: string, index: number): string {
    return `${prefix}-${index + 1}-${slugifySegment(title)}`;
}

function getTargetModuleCount(level: CourseDifficulty): number {
    if (level === "advanced") return 6;
    if (level === "intermediate") return 5;
    return 4;
}

function getTargetLessonCount(level: CourseDifficulty, moduleIndex: number): number {
    if (level === "advanced") {
        return moduleIndex % 2 === 0 ? 5 : 4;
    }
    if (level === "intermediate") {
        return moduleIndex === 0 ? 4 : moduleIndex % 2 === 0 ? 5 : 4;
    }
    return moduleIndex === 0 ? 3 : 4;
}

function normalizeTopicLabel(topic: string): string {
    const safeTopic = toSafeString(topic, "General Topic");
    const cleanedTopic = safeTopic
        .replace(/\b(course|courses|class|classes|tutorial|tutorials|training|trainings|lesson|lessons|guide|guides)\b\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();

    return cleanedTopic || safeTopic;
}

function ensureUniqueOptions(options: string[], fallbackOptions: string[]): string[] {
    return Array.from(new Set([...options, ...fallbackOptions].map((option) => toSafeString(option)).filter(Boolean))).slice(0, 4);
}

function buildFallbackVideo(courseTitle: string, moduleTitle: string, lessonTitle: string): StructuredLessonVideo {
    const searchQuery = buildLessonVideoSearchQuery({
        courseTitle,
        moduleTitle,
        lessonTitle,
    });

    return {
        title: `${lessonTitle} Video Walkthrough`,
        url: buildYouTubeSearchUrl(searchQuery),
        searchQuery,
        summary: `Use this video to hear the lesson explained aloud, watch the concept applied, and reinforce ${lessonTitle.toLowerCase()} before moving on.`,
    };
}

function normalizeDiagramStep(
    rawStep: unknown,
    fallbackTitle: string,
    fallbackDetail: string
): { title: string; detail: string } {
    const step = rawStep && typeof rawStep === "object" ? (rawStep as Record<string, unknown>) : {};

    return {
        title: toSafeString(step.title, fallbackTitle),
        detail: toSafeString(step.detail, fallbackDetail),
    };
}

function buildFallbackDiagram(
    topic: string,
    moduleTitle: string,
    lessonTitle: string,
    focus: string
): StructuredLessonDiagram {
    return {
        title: `${lessonTitle} Flow Chart`,
        description: `A quick visual map of how ${lessonTitle.toLowerCase()} works inside ${moduleTitle}.`,
        steps: [
            {
                title: "Context",
                detail: `Locate where ${lessonTitle.toLowerCase()} matters within ${topic}.`,
            },
            {
                title: "Core Idea",
                detail: `Identify the main concept in ${lessonTitle} and connect it to ${focus}`,
            },
            {
                title: "Example Route",
                detail: `See the concept working in a practical ${moduleTitle.toLowerCase()} example.`,
            },
            {
                title: "Use It Yourself",
                detail: `Apply the same flow in a short task so the process becomes natural.`,
            },
        ],
    };
}

function buildFallbackLessonSupport(
    input: CourseGenerationRequest,
    module: OutlineModuleDraft,
    lessonDraft: OutlineLessonDraft,
    lessonIndex: number
): StructuredLessonRegeneration {
    const blueprint = LESSON_BLUEPRINTS[lessonIndex] || LESSON_BLUEPRINTS[LESSON_BLUEPRINTS.length - 1];
    const title = lessonDraft.title;

    return {
        context: `${title} matters because learners need to understand where it appears in ${input.topic}, why it matters, and how it connects to the rest of ${module.title}.`,
        content: [
            `${title} focuses on ${lessonDraft.focus}. Start by building the theory: define the idea clearly, identify why it matters, and connect it to the larger goal of ${module.title}.`,
            `In this part of the course, the learner will ${blueprint.action} while staying anchored to ${module.title}. The explanation should walk through cause and effect, not just list facts.`,
            `By the end, the learner should be able to restate the concept in plain language, recognize it in context, and apply it with confidence.`,
        ].join("\n\n"),
        example: `Example: walk through a simple ${input.topic} scenario that demonstrates ${title.toLowerCase()} step by step.`,
        exercise: `Practice task: ${blueprint.practice} using the concepts from ${module.title}.`,
        summary: `Summary: ${title} helps the learner ${blueprint.action} so they can keep progressing through ${input.topic}.`,
        diagram: buildFallbackDiagram(input.topic, module.title, title, lessonDraft.focus),
    };
}

function normalizeLessonVideo(
    rawVideo: unknown,
    courseTitle: string,
    moduleTitle: string,
    lessonTitle: string
): StructuredLessonVideo {
    const fallback = buildFallbackVideo(courseTitle, moduleTitle, lessonTitle);
    const video = rawVideo && typeof rawVideo === "object" ? (rawVideo as Record<string, unknown>) : {};
    const searchQuery = toSafeString(video.searchQuery, fallback.searchQuery);
    const rawUrl = toSafeString(video.url);
    const safeUrl = isHttpUrl(rawUrl) ? rawUrl : buildYouTubeSearchUrl(searchQuery);

    return {
        title: toSafeString(video.title, fallback.title),
        url: safeUrl,
        searchQuery,
        summary: toSafeString(video.summary, fallback.summary),
    };
}

function normalizeLessonDiagram(
    rawDiagram: unknown,
    topic: string,
    moduleTitle: string,
    lessonTitle: string,
    focus: string
): StructuredLessonDiagram {
    const fallback = buildFallbackDiagram(topic, moduleTitle, lessonTitle, focus);
    const diagram = rawDiagram && typeof rawDiagram === "object" ? (rawDiagram as Record<string, unknown>) : {};
    const rawSteps = Array.isArray(diagram.steps) ? diagram.steps : [];
    const steps = rawSteps
        .map((step, index) =>
            normalizeDiagramStep(
                step,
                fallback.steps[index]?.title || `Step ${index + 1}`,
                fallback.steps[index]?.detail || `Clarify how ${lessonTitle.toLowerCase()} works.`,
            )
        )
        .filter((step) => Boolean(step.title && step.detail))
        .slice(0, 5);

    return {
        title: toSafeString(diagram.title, fallback.title),
        description: toSafeString(diagram.description, fallback.description),
        steps: steps.length >= 3 ? steps : fallback.steps,
    };
}

function buildFallbackAssessmentQuestion(
    stem: string,
    correctAnswer: string,
    distractors: string[],
    explanation: string,
    questionId: string
): StructuredAssessmentQuestion {
    const options = ensureUniqueOptions([correctAnswer, ...distractors], [
        correctAnswer,
        "It ignores the core concept completely.",
        "It replaces understanding with guesswork.",
        "It is unrelated to the module objective.",
    ]);

    return {
        id: questionId,
        question: stem,
        options,
        answer: options.includes(correctAnswer) ? correctAnswer : options[0],
        explanation,
    };
}

function buildFallbackModuleQuiz(moduleTitle: string, lessons: StructuredLesson[]): StructuredModuleQuiz {
    const questions = lessons.flatMap((lesson, lessonIndex) => ([
        buildFallbackAssessmentQuestion(
            `What is the main goal of ${lesson.title}?`,
            `Understand how ${lesson.title.toLowerCase()} works inside ${moduleTitle}.`,
            [
                `Skip the concept and memorize random facts about ${moduleTitle}.`,
                `Avoid examples so ${lesson.title.toLowerCase()} stays abstract.`,
                `Replace ${lesson.title.toLowerCase()} with an unrelated topic.`,
            ],
            `${lesson.title} is about understanding the concept and using it correctly in the module context.`,
            buildId("module-quiz-question", `${moduleTitle}-${lesson.title}-goal`, lessonIndex * 2),
        ),
        buildFallbackAssessmentQuestion(
            `Which action best reinforces ${lesson.title}?`,
            `Review the context, follow the example, use the diagram, and try the practice task.`,
            [
                "Skip the example and move on without practice.",
                "Memorize one sentence without understanding the process.",
                "Ignore the diagram and guess the next step.",
            ],
            `The strongest reinforcement comes from understanding, visualization, and practice together.`,
            buildId("module-quiz-question", `${moduleTitle}-${lesson.title}-practice`, lessonIndex * 2 + 1),
        ),
    ]));

    while (questions.length < MODULE_QUIZ_QUESTION_COUNT) {
        const index = questions.length;
        questions.push(
            buildFallbackAssessmentQuestion(
                `Which study sequence best fits ${moduleTitle}?`,
                "Start with context, learn the concept, review the example, and then practice it.",
                [
                    "Start with guessing the quiz answers before reading.",
                    "Memorize the summary and skip the worked example.",
                    "Jump to another topic before this module is clear.",
                ],
                `${moduleTitle} is designed to move from understanding to application.`,
                buildId("module-quiz-question", `${moduleTitle}-sequence`, index),
            )
        );
    }

    return {
        title: `${moduleTitle} Mastery Quiz`,
        description: `Answer all 10 questions. Score 6 or more to unlock the next module.`,
        passingScore: 6,
        questions: questions.slice(0, MODULE_QUIZ_QUESTION_COUNT),
    };
}

function normalizeAssessmentQuestion(
    rawQuestion: unknown,
    fallback: StructuredAssessmentQuestion,
    questionId: string
): StructuredAssessmentQuestion {
    const source = rawQuestion && typeof rawQuestion === "object" ? (rawQuestion as Record<string, unknown>) : {};
    const rawOptions = Array.isArray(source.options) ? source.options : [];
    const safeOptions = ensureUniqueOptions(
        rawOptions.map((option) => toSafeString(option)).filter(Boolean),
        fallback.options,
    );
    const answerCandidate = toSafeString(source.answer, fallback.answer);
    const answer = safeOptions.includes(answerCandidate) ? answerCandidate : fallback.answer;

    return {
        id: toSafeString(source.id, questionId),
        question: toSafeString(source.question, fallback.question),
        options: safeOptions,
        answer,
        explanation: toSafeString(source.explanation, fallback.explanation),
    };
}

function normalizeAssessmentQuestions(
    rawQuestions: unknown,
    fallbackQuestions: StructuredAssessmentQuestion[],
    targetCount: number,
    prefix: string
): StructuredAssessmentQuestion[] {
    const input = Array.isArray(rawQuestions) ? rawQuestions : [];
    const questions = input
        .map((question, index) =>
            normalizeAssessmentQuestion(
                question,
                fallbackQuestions[index] || fallbackQuestions[fallbackQuestions.length - 1],
                buildId(prefix, `${prefix}-${index + 1}`, index),
            )
        )
        .slice(0, targetCount);

    while (questions.length < targetCount) {
        const fallbackQuestion = fallbackQuestions[questions.length] || fallbackQuestions[questions.length % fallbackQuestions.length];
        questions.push({
            ...fallbackQuestion,
            id: buildId(prefix, `${fallbackQuestion.question}-${questions.length + 1}`, questions.length),
        });
    }

    return questions.slice(0, targetCount);
}

function buildFallbackMiniRevision(moduleTitle: string, lessons: StructuredLesson[]): StructuredModuleRevision {
    return {
        title: `${moduleTitle} Mini Revision`,
        summary: `Review the essential concepts from ${moduleTitle} before you retry the mastery quiz.`,
        focusAreas: lessons.slice(0, 4).map((lesson) => lesson.title),
        refresher: `Go back through the lesson contexts, examples, and flow charts. Say each concept in your own words before looking at the summary again.`,
        practice: `Choose one lesson from ${moduleTitle}, redraw the flow chart from memory, and solve its practice task once more without looking at the answer.`,
    };
}

function normalizeMiniRevision(
    rawRevision: unknown,
    moduleTitle: string,
    lessons: StructuredLesson[]
): StructuredModuleRevision {
    const fallback = buildFallbackMiniRevision(moduleTitle, lessons);
    const source = rawRevision && typeof rawRevision === "object" ? (rawRevision as Record<string, unknown>) : {};

    return {
        title: toSafeString(source.title, fallback.title),
        summary: toSafeString(source.summary, fallback.summary),
        focusAreas: (toStringList(source.focusAreas).slice(0, 6).length > 0
            ? toStringList(source.focusAreas).slice(0, 6)
            : fallback.focusAreas),
        refresher: toSafeString(source.refresher, fallback.refresher),
        practice: toSafeString(source.practice, fallback.practice),
    };
}

function buildFallbackFinalAssessment(courseTitle: string, modules: StructuredModule[]): StructuredFinalAssessment {
    const lessons = modules.flatMap((module) => module.lessons.map((lesson) => ({ module, lesson })));
    const questions = lessons.slice(0, FINAL_ASSESSMENT_QUESTION_COUNT).map(({ module, lesson }, index) =>
        buildFallbackAssessmentQuestion(
            `Which statement best shows mastery of ${lesson.title}?`,
            `You can explain ${lesson.title.toLowerCase()} and apply it correctly inside ${module.title}.`,
            [
                `You skip the context of ${module.title} and guess the answer.`,
                "You memorize a line without understanding the process.",
                "You avoid the example, the diagram, and the practice task.",
            ],
            `True mastery means understanding the concept and applying it in context.`,
            buildId("final-question", `${courseTitle}-${lesson.title}`, index),
        )
    );

    while (questions.length < FINAL_ASSESSMENT_QUESTION_COUNT) {
        const index = questions.length;
        questions.push(
            buildFallbackAssessmentQuestion(
                `What is the best way to finish ${courseTitle} successfully?`,
                "Combine concept understanding, example review, practice, and self-explanation.",
                [
                    "Skip difficult steps and guess the rest.",
                    "Memorize summaries without applying them.",
                    "Ignore feedback and never revise mistakes.",
                ],
                `${courseTitle} is designed for active understanding and practice.`,
                buildId("final-question", `${courseTitle}-mastery`, index),
            )
        );
    }

    return {
        title: `${courseTitle} Final Trial`,
        description: `Complete the final assessment to prove overall mastery and unlock your certificate.`,
        passingScore: 8,
        questions: questions.slice(0, FINAL_ASSESSMENT_QUESTION_COUNT),
    };
}

function buildFallbackCertificateTemplate(courseTitle: string): StructuredCertificateTemplate {
    return {
        title: "Certificate of Mastery",
        subtitle: `Awarded for successfully completing ${courseTitle}.`,
    };
}

function buildFallbackOutline(input: CourseGenerationRequest): OutlineDraft {
    const topicLabel = normalizeTopicLabel(input.topic);
    const moduleCount = getTargetModuleCount(input.level);
    const modules: OutlineModuleDraft[] = Array.from({ length: moduleCount }, (_, moduleIndex) => {
        const theme = MODULE_THEMES[moduleIndex] || `Stage ${moduleIndex + 1}`;
        const lessonCount = getTargetLessonCount(input.level, moduleIndex);
        const lessons = Array.from({ length: lessonCount }, (_, lessonIndex) => {
            const blueprint = LESSON_BLUEPRINTS[lessonIndex] || LESSON_BLUEPRINTS[LESSON_BLUEPRINTS.length - 1];
            return {
                title: `${theme}: ${blueprint.label}`,
                focus: `${blueprint.action} for ${topicLabel}.`,
            };
        });

        return {
            title: moduleIndex === 0 ? `${topicLabel} Foundations` : `${theme} in ${topicLabel}`,
            description: `This module helps learners ${LESSON_BLUEPRINTS[moduleIndex % LESSON_BLUEPRINTS.length].action} within ${topicLabel}.`,
            lessons,
        };
    });

    return {
        courseTitle: `${topicLabel} Learning Path`,
        difficulty: input.level,
        duration: input.duration,
        objectives: [
            `Understand the essential ideas behind ${topicLabel}.`,
            `Use worked examples to build confidence with ${topicLabel}.`,
            `Practice ${topicLabel} through short applied tasks.`,
            `Retain the material with module-by-module mastery checks.`,
        ],
        prerequisites:
            input.level === "beginner"
                ? ["No prior experience required.", "Willingness to learn step by step."]
                : [...DEFAULT_PREREQUISITES[input.level]],
        modules,
    };
}

function normalizeOutline(rawOutline: unknown, input: CourseGenerationRequest): OutlineDraft {
    const fallback = buildFallbackOutline(input);

    if (!rawOutline || typeof rawOutline !== "object") {
        return fallback;
    }

    const outline = rawOutline as Record<string, unknown>;
    const targetModules = getTargetModuleCount(input.level);
    const rawModules = Array.isArray(outline.modules) ? outline.modules : [];
    const normalizedModules = rawModules
        .map((moduleValue, moduleIndex) => {
            if (!moduleValue || typeof moduleValue !== "object") {
                return null;
            }

            const moduleRecord = moduleValue as Record<string, unknown>;
            const fallbackModule = fallback.modules[moduleIndex] || fallback.modules[fallback.modules.length - 1];
            const rawLessons = Array.isArray(moduleRecord.lessons) ? moduleRecord.lessons : [];
            const lessonTarget = getTargetLessonCount(input.level, moduleIndex);

            const lessons = rawLessons
                .map((lessonValue, lessonIndex) => {
                    if (typeof lessonValue === "string") {
                        return {
                            title: toSafeString(lessonValue, fallbackModule.lessons[lessonIndex]?.title || `Lesson ${lessonIndex + 1}`),
                            focus: fallbackModule.lessons[lessonIndex]?.focus || "Explain the concept and apply it once.",
                        };
                    }

                    if (!lessonValue || typeof lessonValue !== "object") {
                        return null;
                    }

                    const lessonRecord = lessonValue as Record<string, unknown>;
                    const fallbackLesson = fallbackModule.lessons[lessonIndex] || fallbackModule.lessons[fallbackModule.lessons.length - 1];

                    return {
                        title: toSafeString(lessonRecord.title, fallbackLesson.title),
                        focus: toSafeString(lessonRecord.focus, fallbackLesson.focus),
                    };
                })
                .filter((lesson): lesson is OutlineLessonDraft => Boolean(lesson))
                .slice(0, 5);

            while (lessons.length < lessonTarget) {
                const fallbackLesson = fallbackModule.lessons[lessons.length] ||
                    fallbackModule.lessons[fallbackModule.lessons.length - 1];
                lessons.push({
                    title: fallbackLesson.title,
                    focus: fallbackLesson.focus,
                });
            }

            return {
                title: toSafeString(moduleRecord.title, fallbackModule.title),
                description: toSafeString(moduleRecord.description, fallbackModule.description),
                lessons: lessons.slice(0, 5),
            };
        })
        .filter((moduleValue): moduleValue is OutlineModuleDraft => Boolean(moduleValue))
        .slice(0, 6);

    while (normalizedModules.length < targetModules) {
        normalizedModules.push(fallback.modules[normalizedModules.length]);
    }

    return {
        courseTitle: toSafeString(outline.courseTitle, fallback.courseTitle),
        difficulty: normalizeDifficulty(outline.difficulty, input.level),
        duration: toSafeString(outline.duration, input.duration),
        objectives: toStringList(outline.objectives).slice(0, 6).length > 0
            ? toStringList(outline.objectives).slice(0, 6)
            : fallback.objectives,
        prerequisites: toStringList(outline.prerequisites).slice(0, 5).length > 0
            ? toStringList(outline.prerequisites).slice(0, 5)
            : fallback.prerequisites,
        modules: normalizedModules,
    };
}

function buildFallbackLesson(
    input: CourseGenerationRequest,
    module: OutlineModuleDraft,
    lessonDraft: OutlineLessonDraft,
    lessonIndex: number
): StructuredLesson {
    const title = lessonDraft.title;
    const support = buildFallbackLessonSupport(input, module, lessonDraft, lessonIndex);
    const correctAnswer = `It applies ${title.toLowerCase()} to ${input.topic}.`;
    const options = ensureUniqueOptions([
        correctAnswer,
        `It replaces ${input.topic} with an unrelated topic.`,
        "It skips the main concept and moves straight to memorization.",
        "It avoids examples, practice, and reflection.",
    ], [correctAnswer]);

    return {
        id: buildId("lesson", `${module.title}-${title}`, lessonIndex),
        title,
        context: support.context,
        content: support.content,
        example: support.example,
        quiz: {
            question: `Which option best reflects the purpose of ${title}?`,
            options,
            answer: correctAnswer,
            explanation: `${title} exists to make the learner use the concept in a clear ${input.topic} context.`,
        },
        video: buildFallbackVideo(`${input.topic} Learning Path`, module.title, title),
        diagram: support.diagram,
        exercise: support.exercise,
        summary: support.summary,
    };
}

function normalizeGeneratedLesson(
    lesson: unknown,
    module: OutlineModuleDraft,
    lessonDraft: OutlineLessonDraft,
    lessonIndex: number,
    input: CourseGenerationRequest
): StructuredLesson {
    const fallbackLesson = buildFallbackLesson(input, module, lessonDraft, lessonIndex);

    if (!lesson || typeof lesson !== "object") {
        return fallbackLesson;
    }

    const lessonRecord = lesson as Record<string, unknown>;
    const rawQuiz = lessonRecord.quiz && typeof lessonRecord.quiz === "object"
        ? (lessonRecord.quiz as Record<string, unknown>)
        : {};
    const rawOptions = Array.isArray(rawQuiz.options) ? rawQuiz.options : [];
    const safeOptions = ensureUniqueOptions(
        rawOptions.map((option) => toSafeString(option)).filter(Boolean),
        fallbackLesson.quiz.options,
    );
    const lessonTitle = toSafeString(lessonRecord.title, fallbackLesson.title);
    const answerCandidate = toSafeString(rawQuiz.answer, fallbackLesson.quiz.answer);

    return {
        id: toSafeString(lessonRecord.id, fallbackLesson.id),
        title: lessonTitle,
        context: toSafeRichText(lessonRecord.context, fallbackLesson.context),
        content: toSafeRichText(lessonRecord.content, fallbackLesson.content),
        example: toSafeRichText(lessonRecord.example, fallbackLesson.example),
        quiz: {
            question: toSafeString(rawQuiz.question, fallbackLesson.quiz.question),
            options: safeOptions,
            answer: safeOptions.includes(answerCandidate) ? answerCandidate : safeOptions[0],
            explanation: toSafeString(rawQuiz.explanation, fallbackLesson.quiz.explanation),
        },
        video: normalizeLessonVideo(
            lessonRecord.video,
            `${input.topic} Learning Path`,
            module.title,
            lessonTitle
        ),
        diagram: normalizeLessonDiagram(
            lessonRecord.diagram,
            input.topic,
            module.title,
            lessonTitle,
            lessonDraft.focus
        ),
        exercise: toSafeRichText(lessonRecord.exercise, fallbackLesson.exercise),
        summary: toSafeRichText(lessonRecord.summary, fallbackLesson.summary),
    };
}

function buildFallbackModuleContent(
    input: CourseGenerationRequest,
    module: OutlineModuleDraft,
    moduleIndex: number
): StructuredModule {
    const lessons = module.lessons.map((lessonDraft, lessonIndex) =>
        buildFallbackLesson(input, module, lessonDraft, lessonIndex)
    );

    return {
        id: buildId("module", module.title, moduleIndex),
        title: module.title,
        description: module.description,
        lessons,
        moduleQuiz: buildFallbackModuleQuiz(module.title, lessons),
        miniRevision: buildFallbackMiniRevision(module.title, lessons),
    };
}

function normalizeGeneratedModule(
    rawModule: unknown,
    outlineModule: OutlineModuleDraft,
    moduleIndex: number,
    input: CourseGenerationRequest
): StructuredModule {
    const fallbackModule = buildFallbackModuleContent(input, outlineModule, moduleIndex);

    if (!rawModule || typeof rawModule !== "object") {
        return fallbackModule;
    }

    const moduleRecord = rawModule as Record<string, unknown>;
    const rawLessons = Array.isArray(moduleRecord.lessons) ? moduleRecord.lessons : [];
    const lessonTarget = getTargetLessonCount(input.level, moduleIndex);
    const lessons = rawLessons
        .map((lessonValue, lessonIndex) =>
            normalizeGeneratedLesson(
                lessonValue,
                outlineModule,
                outlineModule.lessons[lessonIndex] || outlineModule.lessons[outlineModule.lessons.length - 1],
                lessonIndex,
                input
            )
        )
        .slice(0, 5);

    while (lessons.length < lessonTarget) {
        const lessonIndex = lessons.length;
        const lessonDraft = outlineModule.lessons[lessonIndex] || outlineModule.lessons[outlineModule.lessons.length - 1];
        lessons.push(buildFallbackLesson(input, outlineModule, lessonDraft, lessonIndex));
    }

    const fallbackModuleQuiz = buildFallbackModuleQuiz(outlineModule.title, lessons);
    const rawModuleQuiz = moduleRecord.moduleQuiz && typeof moduleRecord.moduleQuiz === "object"
        ? (moduleRecord.moduleQuiz as Record<string, unknown>)
        : {};

    return {
        id: toSafeString(moduleRecord.id, fallbackModule.id),
        title: toSafeString(moduleRecord.title, fallbackModule.title),
        description: toSafeString(moduleRecord.description, fallbackModule.description),
        lessons: lessons.slice(0, 5),
        moduleQuiz: {
            title: toSafeString(rawModuleQuiz.title, fallbackModuleQuiz.title),
            description: toSafeString(rawModuleQuiz.description, fallbackModuleQuiz.description),
            passingScore: Math.max(
                1,
                Math.min(MODULE_QUIZ_QUESTION_COUNT, Number(rawModuleQuiz.passingScore) || fallbackModuleQuiz.passingScore),
            ),
            questions: normalizeAssessmentQuestions(
                rawModuleQuiz.questions,
                fallbackModuleQuiz.questions,
                MODULE_QUIZ_QUESTION_COUNT,
                `module-${slugifySegment(toSafeString(moduleRecord.title, fallbackModule.title))}-quiz`,
            ),
        },
        miniRevision: normalizeMiniRevision(moduleRecord.miniRevision, toSafeString(moduleRecord.title, fallbackModule.title), lessons.slice(0, 5)),
    };
}

function normalizeFinalAssessment(
    rawAssessment: unknown,
    courseTitle: string,
    modules: StructuredModule[]
): StructuredFinalAssessment {
    const fallback = buildFallbackFinalAssessment(courseTitle, modules);
    const source = rawAssessment && typeof rawAssessment === "object" ? (rawAssessment as Record<string, unknown>) : {};

    return {
        title: toSafeString(source.title, fallback.title),
        description: toSafeString(source.description, fallback.description),
        passingScore: Math.max(
            1,
            Math.min(FINAL_ASSESSMENT_QUESTION_COUNT, Number(source.passingScore) || fallback.passingScore),
        ),
        questions: normalizeAssessmentQuestions(
            source.questions,
            fallback.questions,
            FINAL_ASSESSMENT_QUESTION_COUNT,
            `final-${slugifySegment(courseTitle)}`,
        ),
    };
}

async function enrichModuleVideos(modules: StructuredModule[]): Promise<StructuredModule[]> {
    return Promise.all(
        modules.map(async (module) => ({
            ...module,
            lessons: await Promise.all(
                module.lessons.map(async (lesson) => ({
                    ...lesson,
                    video: await resolveStructuredLessonVideo(lesson.video),
                }))
            ),
        }))
    );
}

function buildOutlinePrompt(input: CourseGenerationRequest): string {
    const topicLabel = normalizeTopicLabel(input.topic);

    return `
You are designing a structured interactive course.

Return valid JSON only.

Requirements:
- Topic: ${topicLabel}
- Difficulty: ${input.level}
- Duration: ${input.duration}
- Create exactly ${getTargetModuleCount(input.level)} modules.
- Each module must include ${input.level === "beginner" ? "3 or 4" : input.level === "intermediate" ? "4 or 5" : "4 or 5"} lesson drafts.
- The course must be highly practical, detailed, and perfectly sequenced from fundamentals to advanced application.
- Each lesson should have a clear, unique title that avoids generic labels.
- The objectives should be ambitious and clearly state what the learner will "be able to do" by the end.
- Avoid redundant words like "course", "class", or "tutorial" in titles.
- Use a tone that is encouraging, professional, and engaging.

JSON shape:
{
  "courseTitle": "string",
  "difficulty": "beginner | intermediate | advanced",
  "duration": "string",
  "objectives": ["string"],
  "prerequisites": ["string"],
  "modules": [
    {
      "title": "string",
      "description": "string",
      "lessons": [
        {
          "title": "string",
          "focus": "string"
        }
      ]
    }
  ]
}
`.trim();
}

function buildModulePrompt(input: CourseGenerationRequest, outline: OutlineDraft, module: OutlineModuleDraft): string {
    const topicLabel = normalizeTopicLabel(input.topic);
    const lessonTitles = module.lessons
        .map((lesson, index) => `${index + 1}. ${lesson.title}: ${lesson.focus}`)
        .join("\n");

    return `
You are writing one module of an interactive learning course.

Return valid JSON only.

Course title: ${outline.courseTitle}
Topic: ${topicLabel}
Difficulty: ${outline.difficulty}
Duration: ${outline.duration}
Course objectives: ${outline.objectives.join(" | ")}
Prerequisites: ${outline.prerequisites.join(" | ")}

Current module:
Title: ${module.title}
Description: ${module.description}
Lesson plan:
${lessonTitles}

Write this module with the exact lesson sequence above.

For each lesson, write high-quality, long-form educational content:
- title: Unique and descriptive.
- context: 2 deep sentences on why this specific sub-topic matters in the real world.
- content: 4 to 5 rich, informative paragraphs (at least 150 words total per lesson) that deeply explain the theory, mechanics, and logic of the lesson. Start with a clear theory-first explanation, then build into cause-and-effect, process, and application. Don't just summarize; provide a comprehensive explanation that builds the learner's knowledge from the ground up.
- example: A realistic, multi-step scenario or case study.
- quiz: A challenging multiple choice question with 4 distinct options, the correct answer, and a helpful explanation.
- video: A highly relevant YouTube search query, title, and a compelling reason to watch.
- diagram: A detailed 4-step process showing exactly how the concept works.
- exercise: A hands-on, practical activity with instructions.
- summary: A clear takeaway that connects to the module's goal.

Also include:
- moduleQuiz: exactly 10 multiple choice questions, each with 4 options, correct answer string, explanation, and a passingScore of 6
- miniRevision: a short targeted revision plan for learners who score 5 or below with title, summary, focusAreas, refresher, and practice

The video searchQuery must be specific, educational, and useful for YouTube search.
The diagram must be accurate, concrete, and visually easy to translate into a learning flow.
The moduleQuiz must test actual understanding from the module lessons, not generic trivia.
The miniRevision must be concise, supportive, and focused on misunderstandings learners are likely to make in this module.

JSON shape:
{
  "title": "string",
  "description": "string",
  "lessons": [
    {
      "title": "string",
      "context": "string",
      "content": "string",
      "example": "string",
      "quiz": {
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "answer": "string",
        "explanation": "string"
      },
      "video": {
        "title": "string",
        "searchQuery": "string",
        "summary": "string"
      },
      "diagram": {
        "title": "string",
        "description": "string",
        "steps": [
          {
            "title": "string",
            "detail": "string"
          }
        ]
      },
      "exercise": "string",
      "summary": "string"
    }
  ],
  "moduleQuiz": {
    "title": "string",
    "description": "string",
    "passingScore": 6,
    "questions": [
      {
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "answer": "string",
        "explanation": "string"
      }
    ]
  },
  "miniRevision": {
    "title": "string",
    "summary": "string",
    "focusAreas": ["string"],
    "refresher": "string",
    "practice": "string"
  }
}
`.trim();
}

function buildFinalAssessmentPrompt(course: StructuredCourse): string {
    const moduleSummary = course.modules
        .map((module, moduleIndex) => {
            const lessons = module.lessons.map((lesson, lessonIndex) => `${lessonIndex + 1}. ${lesson.title}`).join(" | ");
            return `Module ${moduleIndex + 1}: ${module.title} -> ${lessons}`;
        })
        .join("\n");

    return `
You are designing a final assessment for a structured course.

Return valid JSON only.

Course title: ${course.courseTitle}
Difficulty: ${course.difficulty}
Duration: ${course.duration}
Objectives: ${course.objectives.join(" | ")}

Course map:
${moduleSummary}

Requirements:
- Create exactly ${FINAL_ASSESSMENT_QUESTION_COUNT} multiple choice questions.
- Each question must have 4 options, one correct answer string, and a short explanation.
- Questions should cover the whole course, not just one module.
- Set passingScore to 8.

JSON shape:
{
  "title": "string",
  "description": "string",
  "passingScore": 8,
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": "string",
      "explanation": "string"
    }
  ]
}
`.trim();
}

export async function generateStructuredCourse(input: CourseGenerationRequest): Promise<StructuredCourse> {
    const normalizedInput: CourseGenerationRequest = {
        topic: normalizeTopicLabel(toSafeString(input.topic)),
        level: normalizeDifficulty(input.level, "beginner"),
        duration: toSafeString(input.duration, "Self-paced"),
    };

    const outlineRaw = hasCourseAiAccess()
        ? await generateStructuredJson<OutlineDraft>(buildOutlinePrompt(normalizedInput)).catch(() => buildFallbackOutline(normalizedInput))
        : buildFallbackOutline(normalizedInput);
    const outline = normalizeOutline(outlineRaw, normalizedInput);

    const baseModules = await Promise.all(
        outline.modules.map(async (module, moduleIndex) => {
            const moduleRaw = hasCourseAiAccess()
                ? await generateStructuredJson<GeneratedModuleDraft>(buildModulePrompt(normalizedInput, outline, module)).catch(() => null)
                : null;

            return normalizeGeneratedModule(moduleRaw, module, moduleIndex, normalizedInput);
        })
    );
    const modules = await enrichModuleVideos(baseModules);

    const draftCourse: StructuredCourse = {
        courseTitle: outline.courseTitle,
        difficulty: normalizeDifficulty(outline.difficulty, normalizedInput.level),
        duration: outline.duration,
        objectives: outline.objectives,
        prerequisites:
            outline.prerequisites.length > 0
                ? outline.prerequisites
                : [...DEFAULT_PREREQUISITES[normalizedInput.level]],
        modules,
        finalAssessment: buildFallbackFinalAssessment(outline.courseTitle, modules),
        certificateTemplate: buildFallbackCertificateTemplate(outline.courseTitle),
    };

    const finalAssessmentRaw = hasCourseAiAccess()
        ? await generateStructuredJson<GeneratedFinalAssessmentDraft>(buildFinalAssessmentPrompt(draftCourse)).catch(() => null)
        : null;

    return {
        ...draftCourse,
        finalAssessment: normalizeFinalAssessment(finalAssessmentRaw, draftCourse.courseTitle, modules),
    };
}
