import { buildLessonVideoSearchQuery, buildYouTubeSearchUrl, isHttpUrl } from "@/lib/lessonMedia";

export type CourseDifficulty = "beginner" | "intermediate" | "advanced";

export interface StructuredCourseQuiz {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
}

export interface StructuredAssessmentQuestion {
    id: string;
    question: string;
    options: string[];
    answer: string;
    explanation: string;
}

export interface StructuredLessonVideo {
    title: string;
    url: string;
    searchQuery: string;
    summary: string;
}

export interface StructuredLessonDiagramStep {
    title: string;
    detail: string;
}

export interface StructuredLessonDiagram {
    title: string;
    description: string;
    steps: StructuredLessonDiagramStep[];
}

export interface StructuredLessonRegeneration {
    context: string;
    content: string;
    example: string;
    exercise: string;
    summary: string;
    diagram: StructuredLessonDiagram;
}

export interface StructuredModuleRevision {
    title: string;
    summary: string;
    focusAreas: string[];
    refresher: string;
    practice: string;
}

export interface StructuredModuleQuiz {
    title: string;
    description: string;
    passingScore: number;
    questions: StructuredAssessmentQuestion[];
}

export interface StructuredFinalAssessment {
    title: string;
    description: string;
    passingScore: number;
    questions: StructuredAssessmentQuestion[];
}

export interface StructuredCertificateTemplate {
    title: string;
    subtitle: string;
}

export interface StructuredCourseMetadata {
    topic?: string;
    language?: string;
    learningGoals?: string;
    providerStyle?: string;
    [key: string]: unknown;
}

export interface StructuredLesson extends StructuredLessonRegeneration {
    id: string;
    title: string;
    quiz: StructuredCourseQuiz;
    video: StructuredLessonVideo;
}

export interface StructuredModule {
    id: string;
    title: string;
    description: string;
    lessons: StructuredLesson[];
    moduleQuiz: StructuredModuleQuiz;
    miniRevision: StructuredModuleRevision;
}

export interface StructuredCourse {
    courseTitle: string;
    difficulty: CourseDifficulty;
    duration: string;
    objectives: string[];
    prerequisites: string[];
    modules: StructuredModule[];
    finalAssessment: StructuredFinalAssessment;
    certificateTemplate: StructuredCertificateTemplate;
    metadata?: StructuredCourseMetadata;
}

export interface StructuredCourseDocument extends StructuredCourse {
    creatorId?: string;
    createdAt?: unknown;
    updatedAt?: unknown;
    description?: string;
    topic?: string;
    version?: number;
}

export interface FlattenedStructuredLesson extends StructuredLesson {
    moduleId: string;
    moduleTitle: string;
    moduleDescription: string;
    moduleIndex: number;
    lessonIndex: number;
    lessonNumber: number;
}

const MODULE_QUIZ_QUESTION_COUNT = 10;
const FINAL_ASSESSMENT_QUESTION_COUNT = 12;

const DEFAULT_OBJECTIVES = [
    "Build a clear understanding of the topic fundamentals.",
    "Apply the concepts through guided examples and practice.",
    "Retain the material by checking comprehension in each lesson.",
] as const;

const DEFAULT_PREREQUISITES = [
    "Curiosity and willingness to practice.",
    "A notebook or document for taking notes.",
] as const;

const DEFAULT_FEEDBACK = "Review the explanation, then try the concept again in the practice task.";

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

const toStringList = (value: unknown, fallback: readonly string[]): string[] => {
    if (!Array.isArray(value)) {
        return [...fallback];
    }

    const normalized = value
        .map((item) => toSafeString(item))
        .filter(Boolean);

    return normalized.length > 0 ? normalized : [...fallback];
};

export function normalizeDifficulty(value: unknown, fallback: CourseDifficulty = "beginner"): CourseDifficulty {
    const normalized = toSafeString(value, fallback).toLowerCase();
    if (normalized === "beginner" || normalized === "intermediate" || normalized === "advanced") {
        return normalized;
    }
    return fallback;
}

export function slugifySegment(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "item";
}

function buildId(prefix: string, value: string, index: number): string {
    return `${prefix}-${index + 1}-${slugifySegment(value)}`;
}

function ensureUniqueOptions(options: string[], fallbackOptions: string[]): string[] {
    const merged = [...options, ...fallbackOptions]
        .map((option) => toSafeString(option))
        .filter(Boolean);

    return Array.from(new Set(merged)).slice(0, 4);
}

function normalizeQuiz(rawQuiz: unknown, lessonTitle: string): StructuredCourseQuiz {
    const quizSource = rawQuiz && typeof rawQuiz === "object" ? (rawQuiz as Record<string, unknown>) : {};
    const rawOptions = Array.isArray(quizSource.options) ? quizSource.options : [];
    const options = rawOptions
        .map((option) => toSafeString(option))
        .filter(Boolean)
        .slice(0, 4);

    const safeOptions = ensureUniqueOptions(options, [
        `It explains the main idea behind ${lessonTitle}.`,
        `It ignores the subject mechanism entirely.`,
        `It replaces practice with guesswork.`,
        `It is unrelated to the lesson.`,
    ]);

    const providedAnswer = toSafeString(quizSource.answer, safeOptions[0]);
    const answer = safeOptions.includes(providedAnswer) ? providedAnswer : safeOptions[0];

    return {
        question: toSafeString(quizSource.question, `Which statement best matches ${lessonTitle}?`),
        options: safeOptions,
        answer,
        explanation: toSafeString(quizSource.explanation, DEFAULT_FEEDBACK),
    };
}

function normalizeDiagramStep(rawStep: unknown, fallbackTitle: string, fallbackDetail: string): StructuredLessonDiagramStep {
    const value = rawStep && typeof rawStep === "object" ? (rawStep as Record<string, unknown>) : {};

    return {
        title: toSafeString(value.title, fallbackTitle),
        detail: toSafeString(value.detail, fallbackDetail),
    };
}

function buildDefaultDiagram(lessonTitle: string, moduleTitle: string): StructuredLessonDiagram {
    return {
        title: `${lessonTitle} Flow Chart`,
        description: `A step-by-step visual flow showing how ${lessonTitle.toLowerCase()} connects to ${moduleTitle}.`,
        steps: [
            {
                title: "Subject context",
                detail: `Recognize where ${lessonTitle.toLowerCase()} matters inside ${moduleTitle.toLowerCase()}.`,
            },
            {
                title: "Domain terms",
                detail: `Identify the main terminology behind ${lessonTitle.toLowerCase()}.`,
            },
            {
                title: "Process flow",
                detail: `Follow one concrete process example from start to finish without skipping steps.`,
            },
            {
                title: "Applied scenario",
                detail: `Apply the same flow in a short scenario-based task to reinforce the concept.`,
            },
        ],
    };
}

function normalizeDiagram(rawDiagram: unknown, lessonTitle: string, moduleTitle: string): StructuredLessonDiagram {
    const fallback = buildDefaultDiagram(lessonTitle, moduleTitle);
    const source = rawDiagram && typeof rawDiagram === "object" ? (rawDiagram as Record<string, unknown>) : {};
    const rawSteps = Array.isArray(source.steps) ? source.steps : [];
    const steps = rawSteps
        .map((step, stepIndex) =>
            normalizeDiagramStep(
                step,
                fallback.steps[stepIndex]?.title || `Step ${stepIndex + 1}`,
                fallback.steps[stepIndex]?.detail || `Clarify the ${lessonTitle.toLowerCase()} flow.`,
            )
        )
        .filter((step) => Boolean(step.title && step.detail))
        .slice(0, 5);

    const safeSteps = steps.length >= 3 ? steps : fallback.steps;

    return {
        title: toSafeString(source.title, fallback.title),
        description: toSafeString(source.description, fallback.description),
        steps: safeSteps,
    };
}

function buildDefaultVideo(lessonTitle: string, moduleTitle: string, courseTitle: string): StructuredLessonVideo {
    const searchQuery = buildLessonVideoSearchQuery({
        courseTitle,
        moduleTitle,
        lessonTitle,
    });

    return {
        title: `${lessonTitle} Walkthrough`,
        url: buildYouTubeSearchUrl(searchQuery),
        searchQuery,
        summary: `Watch a guided explanation of ${lessonTitle.toLowerCase()} before or after the lesson to reinforce the concept with a teacher-led walkthrough.`,
    };
}

function normalizeVideo(
    rawVideo: unknown,
    lessonTitle: string,
    moduleTitle: string,
    courseTitle: string,
): StructuredLessonVideo {
    const fallback = buildDefaultVideo(lessonTitle, moduleTitle, courseTitle);
    const source = rawVideo && typeof rawVideo === "object" ? (rawVideo as Record<string, unknown>) : {};
    const searchQuery = toSafeString(source.searchQuery, fallback.searchQuery);
    const rawUrl = toSafeString(source.url);
    const url = isHttpUrl(rawUrl) ? rawUrl : buildYouTubeSearchUrl(searchQuery);

    return {
        title: toSafeString(source.title, fallback.title),
        url,
        searchQuery,
        summary: toSafeString(source.summary, fallback.summary),
    };
}

function buildDefaultLessonRegeneration(lessonTitle: string, moduleTitle: string): StructuredLessonRegeneration {
    const diagram = buildDefaultDiagram(lessonTitle, moduleTitle);

    return {
        context: `${lessonTitle} explains how key ideas in ${moduleTitle} operate in realistic subject scenarios.`,
        content: [
            `${lessonTitle} introduces the essential terms and relationships used in ${moduleTitle}. Each term should be linked to a concrete element in the process or system.`,
            `The mechanism is explained through cause-and-effect: identify inputs and conditions, trace each transformation step, and determine the outputs or outcomes.`,
            `A realistic scenario then applies the same terms and process flow so the concept can be used in actual subject questions.`,
        ].join("\n\n"),
        example: `Example: solve one realistic ${moduleTitle.toLowerCase()} scenario using ${lessonTitle.toLowerCase()} with explicit domain terms.`,
        exercise: `Practice: apply ${lessonTitle.toLowerCase()} to a new scenario and justify the answer with two factual statements.`,
        summary: `You should now be able to explain the terms, process flow, and outcomes for ${lessonTitle.toLowerCase()} in context.`,
        diagram,
    };
}

const GUIDANCE_STYLE_PATTERNS = [
    /should be taught/i,
    /study advice/i,
    /define the key terms first/i,
    /learner should/i,
    /how to study/i,
    /in your own words/i,
    /teach a friend/i,
    /learning strategy/i,
] as const;

function isGuidanceStyleSupport(support: StructuredLessonRegeneration): boolean {
    const combined = [support.context, support.content, support.example, support.exercise, support.summary]
        .join(" ")
        .toLowerCase();

    const guidanceSignals = GUIDANCE_STYLE_PATTERNS.filter((pattern) => pattern.test(combined)).length;
    const placeholderSignals = /\b[a-z]+ key terms\b|\b[a-z]+ process steps\b|\b[a-z]+ inputs and outputs\b/i.test(combined);
    const genericSignals = /(guided analysis|core concept|common mistakes)/i.test(combined);

    return guidanceSignals >= 2 || placeholderSignals || genericSignals;
}

function normalizeLesson(rawLesson: unknown, courseTitle: string, moduleTitle: string, lessonIndex: number): StructuredLesson | null {
    if (!rawLesson || typeof rawLesson !== "object") {
        return null;
    }

    const lesson = rawLesson as Record<string, unknown>;
    const title = toSafeString(lesson.title, `Lesson ${lessonIndex + 1}`);
    const fallback = buildDefaultLessonRegeneration(title, moduleTitle);
    const normalizedSupport: StructuredLessonRegeneration = {
        context: toSafeRichText(lesson.context, fallback.context),
        content: toSafeRichText(lesson.content, fallback.content),
        example: toSafeRichText(lesson.example, fallback.example),
        exercise: toSafeRichText(lesson.exercise, fallback.exercise),
        summary: toSafeRichText(lesson.summary, fallback.summary),
        diagram: normalizeDiagram(lesson.diagram, title, moduleTitle),
    };
    const safeSupport = isGuidanceStyleSupport(normalizedSupport) ? fallback : normalizedSupport;

    return {
        id: toSafeString(lesson.id, buildId("lesson", `${moduleTitle}-${title}`, lessonIndex)),
        title,
        context: safeSupport.context,
        content: safeSupport.content,
        example: safeSupport.example,
        quiz: normalizeQuiz(lesson.quiz, title),
        video: normalizeVideo(lesson.video, title, moduleTitle, courseTitle),
        diagram: safeSupport.diagram,
        exercise: safeSupport.exercise,
        summary: safeSupport.summary,
    };
}

function buildFallbackAssessmentQuestion(
    stem: string,
    correctAnswer: string,
    distractors: string[],
    explanation: string,
    questionId: string,
): StructuredAssessmentQuestion {
    const options = ensureUniqueOptions([correctAnswer, ...distractors], [
        correctAnswer,
        "It ignores the main concept completely.",
        "It jumps to memorization without understanding.",
        "It focuses on an unrelated topic.",
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
                `Avoid examples so the lesson stays abstract.`,
                `Replace ${lesson.title.toLowerCase()} with an unrelated idea.`,
            ],
            `${lesson.title} is about understanding the concept and applying it in the module context.`,
            buildId("module-quiz-question", `${moduleTitle}-${lesson.title}-goal`, lessonIndex * 2),
        ),
        buildFallbackAssessmentQuestion(
            `Which action best reinforces ${lesson.title}?`,
            `Trace the example, review the diagram, and try the practice task yourself.`,
            [
                "Skip the example and move on without practice.",
                "Memorize one line without understanding the flow.",
                "Ignore the summary and guess the next step.",
            ],
            `The strongest reinforcement comes from combining explanation, visual flow, and practice.`,
            buildId("module-quiz-question", `${moduleTitle}-${lesson.title}-practice`, lessonIndex * 2 + 1),
        ),
    ]));

    while (questions.length < MODULE_QUIZ_QUESTION_COUNT) {
        const index = questions.length;
        questions.push(
            buildFallbackAssessmentQuestion(
                `Which study sequence fits ${moduleTitle} best?`,
                "Start with context, understand the concept, review the example, and then practice it.",
                [
                    "Memorize the summary first and ignore the example.",
                    "Jump to the quiz without reading the lesson.",
                    "Study unrelated topics before this module is clear.",
                ],
                `${moduleTitle} is designed to move from understanding to application.`,
                buildId("module-quiz-question", `${moduleTitle}-sequence`, index),
            )
        );
    }

    return {
        title: `${moduleTitle} Module Assessment`,
        description: `Answer all 10 questions to verify mastery of ${moduleTitle}. Score 6 or above to unlock the next module.`,
        passingScore: 6,
        questions: questions.slice(0, MODULE_QUIZ_QUESTION_COUNT),
    };
}

function normalizeAssessmentQuestion(
    rawQuestion: unknown,
    fallback: StructuredAssessmentQuestion,
    questionId: string,
): StructuredAssessmentQuestion {
    const source = rawQuestion && typeof rawQuestion === "object" ? (rawQuestion as Record<string, unknown>) : {};
    const rawOptions = Array.isArray(source.options) ? source.options : [];
    const options = rawOptions
        .map((option) => toSafeString(option))
        .filter(Boolean);
    const safeOptions = ensureUniqueOptions(options, fallback.options);
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
    prefix: string,
): StructuredAssessmentQuestion[] {
    const value = Array.isArray(rawQuestions) ? rawQuestions : [];
    const questions = value
        .map((question, index) =>
            normalizeAssessmentQuestion(
                question,
                fallbackQuestions[index] || fallbackQuestions[fallbackQuestions.length - 1],
                buildId(prefix, `${prefix}-${index + 1}`, index),
            )
        )
        .slice(0, targetCount);

    while (questions.length < targetCount) {
        const fallbackQuestion = fallbackQuestions[questions.length] || fallbackQuestions[fallbackQuestions.length % fallbackQuestions.length];
        questions.push({
            ...fallbackQuestion,
            id: buildId(prefix, `${fallbackQuestion.question}-${questions.length + 1}`, questions.length),
        });
    }

    return questions.slice(0, targetCount);
}

function buildDefaultMiniRevision(moduleTitle: string, lessons: StructuredLesson[]): StructuredModuleRevision {
    const focusAreas = lessons.slice(0, 4).map((lesson) => lesson.title);

    return {
        title: `${moduleTitle} Mini Revision`,
        summary: `Revisit the most important ideas from ${moduleTitle} before you retake the mastery quiz.`,
        focusAreas: focusAreas.length > 0 ? focusAreas : ["Core ideas", "Examples", "Practice flow"],
        refresher: `Start by reviewing the lesson context, the example, and the flow chart for each core idea in ${moduleTitle}. Then explain the concept out loud in your own words.`,
        practice: `Pick one lesson from ${moduleTitle}, rebuild the diagram steps from memory, and solve the practice task again without looking at the answer.`,
    };
}

function normalizeMiniRevision(rawRevision: unknown, moduleTitle: string, lessons: StructuredLesson[]): StructuredModuleRevision {
    const fallback = buildDefaultMiniRevision(moduleTitle, lessons);
    const source = rawRevision && typeof rawRevision === "object" ? (rawRevision as Record<string, unknown>) : {};

    return {
        title: toSafeString(source.title, fallback.title),
        summary: toSafeString(source.summary, fallback.summary),
        focusAreas: toStringList(source.focusAreas, fallback.focusAreas).slice(0, 6),
        refresher: toSafeString(source.refresher, fallback.refresher),
        practice: toSafeString(source.practice, fallback.practice),
    };
}

function normalizeModule(rawModule: unknown, moduleIndex: number, courseTitle: string): StructuredModule | null {
    if (!rawModule || typeof rawModule !== "object") {
        return null;
    }

    const moduleValue = rawModule as Record<string, unknown>;
    const title = toSafeString(moduleValue.title, `Module ${moduleIndex + 1}`);
    const rawLessons = Array.isArray(moduleValue.lessons) ? moduleValue.lessons : [];
    const lessons = rawLessons
        .map((lesson, lessonIndex) => normalizeLesson(lesson, courseTitle, title, lessonIndex))
        .filter((lesson): lesson is StructuredLesson => Boolean(lesson));

    if (lessons.length === 0) {
        return null;
    }

    const fallbackModuleQuiz = buildFallbackModuleQuiz(title, lessons);

    return {
        id: toSafeString(moduleValue.id, buildId("module", title, moduleIndex)),
        title,
        description: toSafeString(
            moduleValue.description,
            `This module builds the ideas you need before moving to the next stage of the course.`
        ),
        lessons,
        moduleQuiz: {
            title: toSafeString(
                moduleValue.moduleQuiz && typeof moduleValue.moduleQuiz === "object"
                    ? (moduleValue.moduleQuiz as Record<string, unknown>).title
                    : undefined,
                fallbackModuleQuiz.title,
            ),
            description: toSafeString(
                moduleValue.moduleQuiz && typeof moduleValue.moduleQuiz === "object"
                    ? (moduleValue.moduleQuiz as Record<string, unknown>).description
                    : undefined,
                fallbackModuleQuiz.description,
            ),
            passingScore: Math.max(
                1,
                Math.min(
                    MODULE_QUIZ_QUESTION_COUNT,
                    Number(
                        moduleValue.moduleQuiz && typeof moduleValue.moduleQuiz === "object"
                            ? (moduleValue.moduleQuiz as Record<string, unknown>).passingScore
                            : fallbackModuleQuiz.passingScore
                    ) || fallbackModuleQuiz.passingScore,
                ),
            ),
            questions: normalizeAssessmentQuestions(
                moduleValue.moduleQuiz && typeof moduleValue.moduleQuiz === "object"
                    ? (moduleValue.moduleQuiz as Record<string, unknown>).questions
                    : undefined,
                fallbackModuleQuiz.questions,
                MODULE_QUIZ_QUESTION_COUNT,
                `module-quiz-${slugifySegment(title)}`,
            ),
        },
        miniRevision: normalizeMiniRevision(moduleValue.miniRevision, title, lessons),
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
                "You memorize one phrase without understanding the process.",
                "You avoid the diagram, the example, and the practice task.",
            ],
            `Course mastery means understanding the concept and applying it correctly in context.`,
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
                    "Skip the hard parts and guess the answers.",
                    "Memorize summaries without applying the ideas.",
                    "Ignore feedback and never revise mistakes.",
                ],
                `${courseTitle} is designed for active understanding, not passive memorization.`,
                buildId("final-question", `${courseTitle}-mastery`, index),
            )
        );
    }

    return {
        title: `${courseTitle} Final Assessment`,
        description: `Complete the final assessment to demonstrate overall mastery and unlock your certificate.`,
        passingScore: 8,
        questions: questions.slice(0, FINAL_ASSESSMENT_QUESTION_COUNT),
    };
}

function normalizeFinalAssessment(rawAssessment: unknown, courseTitle: string, modules: StructuredModule[]): StructuredFinalAssessment {
    const fallback = buildFallbackFinalAssessment(courseTitle, modules);
    const source = rawAssessment && typeof rawAssessment === "object" ? (rawAssessment as Record<string, unknown>) : {};

    return {
        title: toSafeString(source.title, fallback.title),
        description: toSafeString(source.description, fallback.description),
        passingScore: Math.max(
            1,
            Math.min(
                FINAL_ASSESSMENT_QUESTION_COUNT,
                Number(source.passingScore) || fallback.passingScore,
            ),
        ),
        questions: normalizeAssessmentQuestions(
            source.questions,
            fallback.questions,
            FINAL_ASSESSMENT_QUESTION_COUNT,
            `final-${slugifySegment(courseTitle)}`,
        ),
    };
}

function buildDefaultCertificateTemplate(courseTitle: string): StructuredCertificateTemplate {
    return {
        title: "Certificate of Mastery",
        subtitle: `Awarded for successfully completing ${courseTitle}.`,
    };
}

function normalizeCertificateTemplate(rawTemplate: unknown, courseTitle: string): StructuredCertificateTemplate {
    const fallback = buildDefaultCertificateTemplate(courseTitle);
    const source = rawTemplate && typeof rawTemplate === "object" ? (rawTemplate as Record<string, unknown>) : {};

    return {
        title: toSafeString(source.title, fallback.title),
        subtitle: toSafeString(source.subtitle, fallback.subtitle),
    };
}

function normalizeMetadata(rawMetadata: unknown, rawTopic?: unknown): StructuredCourseMetadata | undefined {
    const source = rawMetadata && typeof rawMetadata === "object" ? (rawMetadata as Record<string, unknown>) : {};
    const topic = toSafeString(rawTopic ?? source.topic);
    const language = toSafeString(source.language);
    const learningGoals = toSafeString(source.learningGoals);
    const providerStyle = toSafeString(source.providerStyle);

    const metadata: StructuredCourseMetadata = {};
    if (topic) metadata.topic = topic;
    if (language) metadata.language = language;
    if (learningGoals) metadata.learningGoals = learningGoals;
    if (providerStyle) metadata.providerStyle = providerStyle;

    return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function chunkLegacyLessons(lessons: StructuredLesson[], courseTitle: string): StructuredModule[] {
    const chunkSize = 4;
    const modules: StructuredModule[] = [];

    for (let index = 0; index < lessons.length; index += chunkSize) {
        const chunk = lessons.slice(index, index + chunkSize);
        const moduleNumber = modules.length + 1;
        const title = `Module ${moduleNumber}`;

        modules.push({
            id: `module-${moduleNumber}`,
            title,
            description: "Imported from a legacy course format.",
            lessons: chunk,
            moduleQuiz: buildFallbackModuleQuiz(title, chunk),
            miniRevision: buildDefaultMiniRevision(title, chunk),
        });
    }

    if (modules.length === 0) {
        const title = "Module 1";
        modules.push({
            id: "module-1",
            title,
            description: "Imported from a legacy course format.",
            lessons: [],
            moduleQuiz: buildFallbackModuleQuiz(title, []),
            miniRevision: buildDefaultMiniRevision(title, []),
        });
    }

    return modules.map((module) => ({
        ...module,
        moduleQuiz: {
            ...module.moduleQuiz,
            questions: normalizeAssessmentQuestions(
                module.moduleQuiz.questions,
                module.moduleQuiz.questions,
                MODULE_QUIZ_QUESTION_COUNT,
                `legacy-module-quiz-${slugifySegment(courseTitle)}-${slugifySegment(module.title)}`,
            ),
        },
    }));
}

function normalizeLegacyCourse(rawCourse: Record<string, unknown>): StructuredCourse {
    const courseTitle = toSafeString(rawCourse.title, "Generated Course");
    const rawLessons = Array.isArray(rawCourse.lessons) ? rawCourse.lessons : [];
    const lessons = rawLessons
        .map((lesson, lessonIndex) => normalizeLesson(lesson, courseTitle, "Legacy Module", lessonIndex))
        .filter((lesson): lesson is StructuredLesson => Boolean(lesson));
    const modules = chunkLegacyLessons(lessons, courseTitle).filter((module) => module.lessons.length > 0);

    return {
        courseTitle,
        difficulty: normalizeDifficulty(
            rawCourse.difficulty ??
            (rawCourse.metadata && typeof rawCourse.metadata === "object"
                ? (rawCourse.metadata as Record<string, unknown>).difficulty
                : undefined)
        ),
        duration: toSafeString(rawCourse.duration, "Self-paced"),
        objectives: toStringList(rawCourse.learningObjectives, DEFAULT_OBJECTIVES),
        prerequisites: toStringList(rawCourse.prerequisites, DEFAULT_PREREQUISITES),
        modules,
        finalAssessment: normalizeFinalAssessment(rawCourse.finalAssessment, courseTitle, modules),
        certificateTemplate: normalizeCertificateTemplate(rawCourse.certificateTemplate, courseTitle),
        metadata: normalizeMetadata(rawCourse.metadata, rawCourse.topic),
    };
}

export function normalizeStructuredLessonRegeneration(
    rawValue: unknown,
    lessonTitle: string,
    moduleTitle: string,
): StructuredLessonRegeneration {
    const fallback = buildDefaultLessonRegeneration(lessonTitle, moduleTitle);
    const source = rawValue && typeof rawValue === "object" ? (rawValue as Record<string, unknown>) : {};
    const normalizedSupport: StructuredLessonRegeneration = {
        context: toSafeRichText(source.context, fallback.context),
        content: toSafeRichText(source.content, fallback.content),
        example: toSafeRichText(source.example, fallback.example),
        exercise: toSafeRichText(source.exercise, fallback.exercise),
        summary: toSafeRichText(source.summary, fallback.summary),
        diagram: normalizeDiagram(source.diagram, lessonTitle, moduleTitle),
    };

    return isGuidanceStyleSupport(normalizedSupport) ? fallback : normalizedSupport;
}

export function normalizeStoredCourse(rawCourse: unknown): StructuredCourse {
    if (!rawCourse || typeof rawCourse !== "object") {
        throw new Error("Course data is invalid.");
    }

    const value = rawCourse as Record<string, unknown>;

    if (!Array.isArray(value.modules)) {
        return normalizeLegacyCourse(value);
    }

    const courseTitle = toSafeString(value.courseTitle ?? value.title, "Generated Course");

    const modules = value.modules
        .map((moduleValue, moduleIndex) => normalizeModule(moduleValue, moduleIndex, courseTitle))
        .filter((moduleValue): moduleValue is StructuredModule => Boolean(moduleValue));

    if (modules.length === 0) {
        return normalizeLegacyCourse(value);
    }

    return {
        courseTitle,
        difficulty: normalizeDifficulty(
            value.difficulty ??
            (value.metadata && typeof value.metadata === "object"
                ? (value.metadata as Record<string, unknown>).difficulty
                : undefined)
        ),
        duration: toSafeString(value.duration, "Self-paced"),
        objectives: toStringList(value.objectives ?? value.learningObjectives, DEFAULT_OBJECTIVES),
        prerequisites: toStringList(value.prerequisites, DEFAULT_PREREQUISITES),
        modules,
        finalAssessment: normalizeFinalAssessment(value.finalAssessment, courseTitle, modules),
        certificateTemplate: normalizeCertificateTemplate(value.certificateTemplate, courseTitle),
        metadata: normalizeMetadata(value.metadata, value.topic),
    };
}

export function flattenStructuredLessons(course: StructuredCourse): FlattenedStructuredLesson[] {
    return course.modules.flatMap((module, moduleIndex) =>
        module.lessons.map((lesson, lessonIndex) => ({
            ...lesson,
            moduleId: module.id,
            moduleTitle: module.title,
            moduleDescription: module.description,
            moduleIndex,
            lessonIndex,
            lessonNumber:
                course.modules
                    .slice(0, moduleIndex)
                    .reduce((count, currentModule) => count + currentModule.lessons.length, 0) +
                lessonIndex +
                1,
        }))
    );
}

export function getCourseLessonCount(course: { modules?: unknown; lessons?: unknown }): number {
    if (Array.isArray(course.modules)) {
        return course.modules.reduce((count, moduleValue) => {
            const moduleRecord =
                moduleValue && typeof moduleValue === "object" ? (moduleValue as Record<string, unknown>) : null;
            const lessons = Array.isArray(moduleRecord?.lessons) ? moduleRecord.lessons : [];
            return count + lessons.length;
        }, 0);
    }

    return Array.isArray(course.lessons) ? course.lessons.length : 0;
}

export function buildCourseDescription(course: StructuredCourse): string {
    const lessonCount = flattenStructuredLessons(course).length;
    const objective = course.objectives[0] || "Build practical understanding step by step.";

    return `${objective} ${course.modules.length} modules, ${lessonCount} lessons, mastery quizzes, and a final assessment over ${course.duration.toLowerCase()}.`;
}
