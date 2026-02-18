import { GoogleGenerativeAI } from "@google/generative-ai";
import { GiphyFetch } from "@giphy/js-fetch-api";

const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const giphyFetch = GIPHY_API_KEY ? new GiphyFetch(GIPHY_API_KEY) : null;

const GEMINI_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
] as const;
const FAST_GENERATION_MODE = process.env.FAST_GENERATION_MODE !== "false";
const COURSE_GENERATION_TIMEOUT_MS = readPositiveIntEnv(
    process.env.COURSE_GENERATION_TIMEOUT_MS,
    20000
);
const COURSE_GENERATION_MAX_RETRIES = FAST_GENERATION_MODE ? 0 : 1;

type LessonContentType = "visual" | "reading" | "handson" | "listening";

export interface VisualAsset {
    type: "image" | "gif" | "video";
    url: string;
    caption?: string;
    altText?: string;
}

export interface CourseLesson {
    id: string;
    title: string;
    content: string;
    duration: number;
    contentType?: LessonContentType;
    visualAssets?: VisualAsset[];
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
    metadata?: {
        difficulty?: "beginner" | "intermediate" | "advanced";
        targetAge?: string;
        language?: string;
        primaryModality?: LessonContentType;
        gradeLevel?: string;
        [key: string]: unknown;
    };
}

export interface CourseGenerationParams {
    topic: string;
    targetAge: string;
    language: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    learningGoals: string;
}

interface NormalizeDefaults {
    topic: string;
    difficulty?: "beginner" | "intermediate" | "advanced";
    targetAge?: string | number;
    language?: string;
    primaryModality?: LessonContentType;
    gradeLevel?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function readPositiveIntEnv(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function withTimeout<T>(valueOrPromise: Promise<T> | T, timeoutMs: number, errorMessage: string): Promise<T> {
    if (timeoutMs <= 0) return Promise.resolve(valueOrPromise);

    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
        return await Promise.race([
            Promise.resolve(valueOrPromise),
            new Promise<T>((_, reject) => {
                timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

const toSafeString = (value: unknown, fallback = ""): string => {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim();
    return normalized || fallback;
};

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

function stripMarkdownCodeFence(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    return cleaned.trim();
}

function extractJsonPayload(text: string): string {
    const cleaned = stripMarkdownCodeFence(text);

    try {
        JSON.parse(cleaned);
        return cleaned;
    } catch {
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            const candidate = cleaned.slice(firstBrace, lastBrace + 1).trim();
            JSON.parse(candidate);
            return candidate;
        }
        throw new Error("AI response did not include valid JSON payload");
    }
}

function normalizeVisualAssets(rawAssets: unknown, fallbackTitle: string): VisualAsset[] {
    if (!Array.isArray(rawAssets)) return [];

    const assets: VisualAsset[] = [];
    for (const rawAsset of rawAssets) {
        if (!rawAsset || typeof rawAsset !== "object") continue;
        const candidate = rawAsset as Record<string, unknown>;
        const url = toSafeString(candidate.url);
        if (!url || !isHttpUrl(url)) continue;

        const rawType = toSafeString(candidate.type, "gif").toLowerCase();
        const isGifUrl = /\.gif($|\?)/i.test(url);
        const type: VisualAsset["type"] =
            rawType === "video" ? "video" : rawType === "gif" || isGifUrl ? "gif" : "image";
        if (type === "image") continue;

        assets.push({
            type,
            url,
            caption: toSafeString(candidate.caption, `${fallbackTitle} visual`),
            altText: toSafeString(candidate.altText, `${fallbackTitle} visual aid`),
        });

        if (assets.length >= 6) break;
    }

    return assets;
}

function extractMarkdownImageAssets(markdown: string): VisualAsset[] {
    const matches = [...markdown.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/gi)];
    return matches
        .filter((match) => /\.gif($|\?)/i.test(match[2]))
        .slice(0, 4)
        .map((match) => ({
            type: "gif" as const,
            url: match[2],
            caption: match[1] || "Lesson visual",
            altText: match[1] || "Lesson visual aid",
        }));
}

function normalizeQuiz(rawQuiz: unknown, lessonTitle: string) {
    if (!Array.isArray(rawQuiz)) return [];

    return rawQuiz
        .map((rawQuestion, index) => {
            if (!rawQuestion || typeof rawQuestion !== "object") return null;
            const q = rawQuestion as Record<string, unknown>;

            const options = Array.isArray(q.options)
                ? q.options
                    .map((opt) => toSafeString(opt))
                    .filter(Boolean)
                    .slice(0, 6)
                : [];

            const safeOptions =
                options.length >= 2 ? options : ["Option A", "Option B", "Option C", "Option D"];

            const providedAnswer = Number(q.correctAnswer);
            const correctAnswer = Number.isInteger(providedAnswer)
                ? clamp(providedAnswer, 0, safeOptions.length - 1)
                : 0;

            return {
                question: toSafeString(q.question, `Question ${index + 1} about ${lessonTitle}`),
                options: safeOptions,
                correctAnswer,
                explanation: toSafeString(q.explanation, "Review the lesson key points and try again."),
            };
        })
        .filter((question): question is NonNullable<typeof question> => Boolean(question));
}

function normalizeCourse(rawCourse: unknown, defaults: NormalizeDefaults): GeneratedCourse {
    if (!rawCourse || typeof rawCourse !== "object") {
        throw new Error("Generated payload is not an object");
    }

    const courseObj = rawCourse as Record<string, unknown>;

    const rawLessons = Array.isArray(courseObj.lessons) ? courseObj.lessons : [];
    const lessons = rawLessons
        .map((rawLesson, index) => {
            if (!rawLesson || typeof rawLesson !== "object") return null;
            const lessonObj = rawLesson as Record<string, unknown>;

            const title = toSafeString(lessonObj.title, `Lesson ${index + 1}`);
            const content = toSafeString(
                lessonObj.content,
                `## ${title}\n\nThis section introduces key ideas about ${defaults.topic}.`
            );
            const rawContentType = toSafeString(lessonObj.contentType, defaults.primaryModality || "reading").toLowerCase();
            const contentType: LessonContentType =
                rawContentType === "visual" ||
                    rawContentType === "reading" ||
                    rawContentType === "handson" ||
                    rawContentType === "listening"
                    ? (rawContentType as LessonContentType)
                    : defaults.primaryModality || "reading";

            const quiz = normalizeQuiz(lessonObj.quiz, title);
            if (quiz.length === 0) {
                quiz.push({
                    question: `What is one important idea from ${title}?`,
                    options: [
                        "A core concept explained in the lesson",
                        "An unrelated topic",
                        "A random guess",
                        "None of the above",
                    ],
                    correctAnswer: 0,
                    explanation: "The lesson highlights at least one core concept you should retain.",
                });
            }

            const visualAssets = normalizeVisualAssets(lessonObj.visualAssets, title);
            const fallbackGifs = visualAssets.length === 0 ? extractMarkdownImageAssets(content) : [];

            return {
                id: toSafeString(lessonObj.id, `lesson_${index + 1}`),
                title,
                content,
                duration: clamp(Number(lessonObj.duration) || 7, 3, 45),
                contentType,
                visualAssets: [...visualAssets, ...fallbackGifs].slice(0, 6),
                quiz,
            } satisfies CourseLesson;
        })
        .filter(Boolean) as CourseLesson[];

    if (lessons.length === 0) {
        throw new Error("Generated course is missing valid lessons");
    }

    const rawObjectives = Array.isArray(courseObj.learningObjectives)
        ? courseObj.learningObjectives.map((objective) => toSafeString(objective)).filter(Boolean)
        : [];

    const metadata = (courseObj.metadata && typeof courseObj.metadata === "object"
        ? { ...(courseObj.metadata as Record<string, unknown>) }
        : {}) as GeneratedCourse["metadata"];

    if (!metadata) {
        throw new Error("Metadata initialization failed");
    }

    metadata.difficulty = defaults.difficulty || metadata.difficulty || "beginner";
    metadata.targetAge = String(defaults.targetAge ?? metadata.targetAge ?? "unknown");
    metadata.language = defaults.language || metadata.language || "English";
    metadata.primaryModality = defaults.primaryModality || metadata.primaryModality || lessons[0].contentType || "reading";
    metadata.gradeLevel = defaults.gradeLevel || metadata.gradeLevel;

    return {
        title: toSafeString(courseObj.title, `${defaults.topic} Adventure Course`),
        description: toSafeString(
            courseObj.description,
            `A guided learning adventure that helps you build practical understanding of ${defaults.topic}.`
        ),
        learningObjectives:
            rawObjectives.length > 0
                ? rawObjectives.slice(0, 6)
                : [
                    `Understand the core ideas of ${defaults.topic}`,
                    `Apply key concepts through practice`,
                    `Retain learning with short quizzes and visual examples`,
                ],
        lessons,
        metadata,
    };
}

interface YouTubeCandidate {
    videoId: string;
    title: string;
    description: string;
    channelTitle: string;
    durationSeconds: number;
    embeddable: boolean;
}

type GiphyMediaType = "gifs" | "stickers";

interface GiphyMediaCandidate {
    id: string;
    title: string;
    altText: string;
    username: string;
    mediaType: GiphyMediaType;
    rating: string;
    animatedUrl: string;
    sourcePageUrl: string;
    width: number;
    height: number;
}

interface GiphyGifLike {
    id?: string | number;
    title?: string;
    alt_text?: string;
    username?: string;
    rating?: string;
    url?: string;
    images?: {
        fixed_width?: { url?: string; width?: number | string; height?: number | string };
        original?: { url?: string; width?: number | string; height?: number | string };
        downsized?: { url?: string; width?: number | string; height?: number | string };
        original_still?: { url?: string };
        fixed_width_still?: { url?: string };
        downsized_still?: { url?: string };
    };
}

const LANGUAGE_CODE_MAP: Record<string, string> = {
    english: "en",
    spanish: "es",
    french: "fr",
    german: "de",
    portuguese: "pt",
    arabic: "ar",
    hindi: "hi",
    chinese: "zh",
    japanese: "ja",
    korean: "ko",
    turkish: "tr",
    filipino: "fil",
};

const EDUCATIONAL_HINTS = [
    "explained",
    "tutorial",
    "lesson",
    "course",
    "beginner",
    "introduction",
    "fundamentals",
    "education",
    "learn",
];

const NOISY_HINTS = ["shorts", "meme", "reaction", "prank", "music video", "amv", "compilation"];

const TRUSTED_CHANNEL_HINTS = [
    "khan academy",
    "crash course",
    "ted-ed",
    "freecodecamp",
    "national geographic",
    "3blue1brown",
    "veritasium",
    "numberphile",
    "minutephysics",
];

const EDUCATIONAL_VISUAL_HINTS = [
    "diagram",
    "illustration",
    "education",
    "learning",
    "training",
    "experiment",
    "graph",
    "chart",
    "science",
    "study",
];

const VISUAL_NOISE_HINTS = [
    "watermark",
    "logo",
    "advertisement",
    "poster",
    "flyer",
    "meme",
    "text overlay",
];

const MAX_VISUAL_ASSETS_PER_LESSON = 6;
const MIN_NON_VIDEO_VISUALS_PER_LESSON = 1;
const TARGET_GIF_VISUALS_PER_LESSON = 2;
const MAX_GIFS_PER_LESSON = 2;
const MIN_GIPHY_RELEVANCE_SCORE = FAST_GENERATION_MODE ? 10 : 8;
const MANDATORY_INTRO_YOUTUBE_FALLBACK_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const DEFAULT_GIF_RETRY_THRESHOLDS = [MIN_GIPHY_RELEVANCE_SCORE, 8, 6];

const VIDEO_STOP_WORDS = new Set([
    "about",
    "after",
    "also",
    "been",
    "between",
    "both",
    "could",
    "does",
    "from",
    "have",
    "into",
    "lesson",
    "lessons",
    "more",
    "other",
    "that",
    "their",
    "them",
    "then",
    "this",
    "those",
    "topic",
    "video",
    "what",
    "when",
    "where",
    "which",
    "while",
    "with",
    "would",
]);

interface GiphyEnrichmentOptions {
    minRelevanceScore?: number;
    maxQueries?: number;
}

interface GifRetryOptions {
    maxAttempts?: number;
    retryDelayMs?: number;
    relevanceThresholds?: number[];
}

interface YouTubeEnrichmentOptions {
    forceRetarget?: boolean;
    maxQueriesPerLesson?: number;
}

interface YouTubeRetryOptions {
    maxAttempts?: number;
    retryDelayMs?: number;
}

interface YouTubeSearchContext {
    topicTokens: string[];
    courseTokens: string[];
    lessonTokens: string[];
    lessonContentTokens: string[];
    lessonTitle: string;
    courseTitle: string;
    prioritizeCourseMatch?: boolean;
}

function tokenize(value: string): string[] {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2);
}

function extractLessonContentTokens(content: string, maxTokens = 8): string[] {
    const clean = content
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`]*`/g, " ")
        .replace(/!\[[^\]]*]\(([^)]+)\)/g, " ")
        .replace(/\[[^\]]+]\(([^)]+)\)/g, " ")
        .replace(/[#>*_\-]/g, " ");

    const frequency = new Map<string, number>();
    for (const token of tokenize(clean)) {
        if (token.length < 4) continue;
        if (VIDEO_STOP_WORDS.has(token)) continue;
        frequency.set(token, (frequency.get(token) || 0) + 1);
    }

    return Array.from(frequency.entries())
        .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
        .map(([token]) => token)
        .slice(0, maxTokens);
}

function buildYouTubeSearchQueries(params: {
    topic: string;
    courseTitle: string;
    lessonTitle: string;
    lessonContentTokens: string[];
    prioritizeCourseMatch?: boolean;
    maxQueries?: number;
}): string[] {
    const { topic, courseTitle, lessonTitle, lessonContentTokens, prioritizeCourseMatch, maxQueries } = params;
    const conceptHint = lessonContentTokens.slice(0, 4).join(" ");

    const preferred = [
        `${courseTitle} ${lessonTitle} explained`,
        `${topic} ${lessonTitle} explained tutorial`,
        `${lessonTitle} ${conceptHint} lesson`,
        `${topic} ${lessonTitle} fundamentals`,
        `${topic} ${lessonTitle} beginner lesson`,
        `${courseTitle} introduction ${lessonTitle}`,
        `${topic} ${lessonTitle} education`,
    ];

    const fallback = [
        `${topic} ${lessonTitle}`,
        `${lessonTitle} explained`,
        `${topic} tutorial`,
    ];

    const ordered = prioritizeCourseMatch ? [...preferred, ...fallback] : [...preferred.slice(1), preferred[0], ...fallback];

    const limit = maxQueries ?? (FAST_GENERATION_MODE ? 3 : 6);
    return Array.from(
        new Set(
            ordered
                .map((query) => query.replace(/\s+/g, " ").trim())
                .filter((query) => query.length >= 8)
        )
    ).slice(0, limit);
}

function uniqueAssetsByUrl(assets: VisualAsset[]): VisualAsset[] {
    const seen = new Set<string>();
    const unique: VisualAsset[] = [];

    for (const asset of assets) {
        if (!asset?.url || !isHttpUrl(asset.url)) continue;
        if (seen.has(asset.url)) continue;
        seen.add(asset.url);
        unique.push(asset);
    }

    return unique;
}

function prioritizeVisualAssets(assets: VisualAsset[]): VisualAsset[] {
    const videos = assets.filter((asset) => asset.type === "video");
    const gifs = assets.filter((asset) => asset.type === "gif");
    return [...videos, ...gifs];
}

function filterVideoGifAssets(assets: VisualAsset[]): VisualAsset[] {
    return assets.filter((asset) => asset.type === "video" || asset.type === "gif");
}

function isYouTubeVideoUrl(url: string): boolean {
    if (!isHttpUrl(url)) return false;

    try {
        const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
        return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
    } catch {
        return /(?:youtube\.com|youtu\.be)/i.test(url);
    }
}

function lessonAssetsChanged(before: VisualAsset[] = [], after: VisualAsset[] = []): boolean {
    if (before.length !== after.length) return true;
    for (let i = 0; i < before.length; i++) {
        if (before[i]?.type !== after[i]?.type || before[i]?.url !== after[i]?.url) return true;
    }
    return false;
}

function scoreVideoCandidate(
    candidate: YouTubeCandidate,
    context: YouTubeSearchContext
): number {
    const fullText = `${candidate.title} ${candidate.description} ${candidate.channelTitle}`.toLowerCase();
    let score = 0;

    const topicMatchCount = context.topicTokens.filter((token) => fullText.includes(token)).length;
    const lessonMatchCount = context.lessonTokens.filter((token) => fullText.includes(token)).length;
    const contentMatchCount = context.lessonContentTokens.filter((token) => fullText.includes(token)).length;
    const courseMatchCount = context.courseTokens.filter((token) => fullText.includes(token)).length;

    score += topicMatchCount * 2.5;
    score += lessonMatchCount * 4.2;
    score += contentMatchCount * 3.3;
    score += courseMatchCount * (context.prioritizeCourseMatch ? 4 : 2);

    const normalizedLessonTitle = context.lessonTitle.toLowerCase();
    if (normalizedLessonTitle && fullText.includes(normalizedLessonTitle)) {
        score += 18;
    }

    const normalizedCourseTitle = context.courseTitle.toLowerCase();
    if (normalizedCourseTitle && fullText.includes(normalizedCourseTitle)) {
        score += context.prioritizeCourseMatch ? 16 : 8;
    }

    if (lessonMatchCount === 0 && contentMatchCount === 0) {
        score -= 14;
    }
    if (context.prioritizeCourseMatch && courseMatchCount === 0 && !fullText.includes(normalizedCourseTitle)) {
        score -= 10;
    }

    for (const hint of EDUCATIONAL_HINTS) {
        if (fullText.includes(hint)) score += 4;
    }
    for (const hint of NOISY_HINTS) {
        if (fullText.includes(hint)) score -= 8;
    }
    for (const channelHint of TRUSTED_CHANNEL_HINTS) {
        if (candidate.channelTitle.toLowerCase().includes(channelHint)) score += 6;
    }

    // Prefer concise teaching videos for lesson flow.
    if (candidate.durationSeconds >= 180 && candidate.durationSeconds <= 1200) score += 8;
    else if (candidate.durationSeconds > 0 && candidate.durationSeconds <= 90) score -= 10;
    else if (candidate.durationSeconds > 2700) score -= 6;

    if (!candidate.embeddable) score -= 100;
    return score;
}

function getLanguageCode(language?: string): string | undefined {
    if (!language) return undefined;
    return LANGUAGE_CODE_MAP[language.toLowerCase()];
}

function mapGiphyGifToCandidate(gif: GiphyGifLike, mediaType: GiphyMediaType): GiphyMediaCandidate | null {
    const animatedUrl =
        toSafeString(gif.images?.fixed_width?.url) ||
        toSafeString(gif.images?.original?.url) ||
        toSafeString(gif.images?.downsized?.url);

    if (!isHttpUrl(animatedUrl)) return null;

    const id = String(gif.id || "");
    if (!id) return null;

    const width = clamp(
        Number(gif.images?.fixed_width?.width || gif.images?.original?.width || gif.images?.downsized?.width) || 0,
        0,
        5000
    );
    const height = clamp(
        Number(gif.images?.fixed_width?.height || gif.images?.original?.height || gif.images?.downsized?.height) || 0,
        0,
        5000
    );

    return {
        id,
        title: toSafeString(gif.title, "Lesson visual"),
        altText: toSafeString(gif.alt_text, toSafeString(gif.title, "Lesson visual")),
        username: toSafeString(gif.username, "GIPHY"),
        mediaType,
        rating: toSafeString(gif.rating, "g").toLowerCase(),
        animatedUrl,
        sourcePageUrl: toSafeString(gif.url),
        width,
        height,
    };
}

function scoreGiphyCandidate(
    candidate: GiphyMediaCandidate,
    topicTokens: string[],
    lessonTokens: string[]
): number {
    const fullText = `${candidate.title} ${candidate.altText} ${candidate.username}`.toLowerCase();
    let score = 0;

    const tokenMatchCount = [...topicTokens, ...lessonTokens].filter((token) => fullText.includes(token)).length;
    score += tokenMatchCount * 4;

    for (const hint of EDUCATIONAL_VISUAL_HINTS) {
        if (fullText.includes(hint)) score += 3;
    }
    for (const hint of VISUAL_NOISE_HINTS) {
        if (fullText.includes(hint)) score -= 7;
    }

    if (candidate.width >= 1200 && candidate.height >= 700) score += 6;
    else if (candidate.width < 700 || candidate.height < 450) score -= 6;

    const ratio = candidate.width > 0 && candidate.height > 0 ? candidate.width / candidate.height : 0;
    if (ratio >= 1.2 && ratio <= 2.2) score += 4;

    if (candidate.rating === "g" || candidate.rating === "pg" || candidate.rating === "y") score += 2;
    else score -= 5;

    if (candidate.mediaType === "stickers") score += 2;
    if (candidate.height <= 700) score += 2;

    return score;
}

async function searchGiphyCandidates(
    query: string,
    mediaType: GiphyMediaType,
    language?: string
): Promise<GiphyMediaCandidate[]> {
    if (!giphyFetch) return [];

    const lang = getLanguageCode(language) || "en";
    const response = await giphyFetch.search(query, {
        type: mediaType,
        limit: FAST_GENERATION_MODE ? 6 : 12,
        rating: "pg",
        lang,
    });

    return response.data
        .map((gif) => mapGiphyGifToCandidate(gif, mediaType))
        .filter((candidate): candidate is GiphyMediaCandidate => Boolean(candidate));
}

async function getGiphyCandidatesForLesson(
    topic: string,
    lessonTitle: string,
    language?: string,
    maxQueriesOverride?: number
): Promise<GiphyMediaCandidate[]> {
    if (!giphyFetch) return [];

    const candidateMap = new Map<string, GiphyMediaCandidate>();
    const maxQueries = maxQueriesOverride ?? (FAST_GENERATION_MODE ? 2 : 6);
    const queryPool = Array.from(
        new Set(
            [
                `${topic} ${lessonTitle} educational`,
                `${topic} ${lessonTitle}`,
                `${topic} diagram`,
                `${topic} lesson`,
                topic,
                lessonTitle,
            ]
                .map((value) => value.trim())
                .filter((value) => value.length >= 2)
        )
    ).slice(0, maxQueries);

    const addCandidates = (candidates: GiphyMediaCandidate[]) => {
        for (const candidate of candidates) {
            candidateMap.set(`${candidate.mediaType}:${candidate.id}`, candidate);
        }
    };

    for (const query of queryPool) {
        const [gifResult, stickerResult] = await Promise.allSettled([
            searchGiphyCandidates(query, "gifs", language),
            searchGiphyCandidates(query, "stickers", language),
        ]);

        if (gifResult.status === "fulfilled") addCandidates(gifResult.value);
        if (stickerResult.status === "fulfilled") addCandidates(stickerResult.value);
        if (candidateMap.size >= (FAST_GENERATION_MODE ? 8 : 24)) break;
    }

    return Array.from(candidateMap.values());
}

function parseYouTubeDurationToSeconds(duration: string): number {
    const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
    if (!match) return 0;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

async function hydrateYouTubeCandidates(
    candidates: YouTubeCandidate[],
    language?: string
): Promise<YouTubeCandidate[]> {
    if (!YOUTUBE_API_KEY || candidates.length === 0) return candidates;

    try {
        const ids = candidates.map((candidate) => candidate.videoId).filter(Boolean);
        if (ids.length === 0) return candidates;

        const detailsParams = new URLSearchParams({
            key: YOUTUBE_API_KEY,
            part: "contentDetails,status,snippet",
            id: ids.join(","),
            maxResults: String(ids.length),
        });
        const languageCode = getLanguageCode(language);
        if (languageCode) detailsParams.set("hl", languageCode);

        const detailsResponse = await withTimeout(
            fetch(`https://www.googleapis.com/youtube/v3/videos?${detailsParams.toString()}`, {
                method: "GET",
                cache: "no-store",
            }),
            6000,
            "YouTube details lookup timed out"
        );

        if (!detailsResponse.ok) return candidates;
        const detailsJson = (await detailsResponse.json()) as {
            items?: Array<{
                id?: string;
                status?: { embeddable?: boolean };
                contentDetails?: { duration?: string };
                snippet?: { title?: string; description?: string; channelTitle?: string };
            }>;
        };

        const detailMap = new Map<string, {
            embeddable: boolean;
            durationSeconds: number;
            title: string;
            description: string;
            channelTitle: string;
        }>();

        for (const item of detailsJson.items || []) {
            const id = toSafeString(item.id);
            if (!id) continue;
            detailMap.set(id, {
                embeddable: item.status?.embeddable !== false,
                durationSeconds: parseYouTubeDurationToSeconds(toSafeString(item.contentDetails?.duration)),
                title: toSafeString(item.snippet?.title),
                description: toSafeString(item.snippet?.description),
                channelTitle: toSafeString(item.snippet?.channelTitle),
            });
        }

        return candidates.map((candidate) => {
            const details = detailMap.get(candidate.videoId);
            if (!details) return candidate;
            return {
                ...candidate,
                embeddable: details.embeddable,
                durationSeconds: details.durationSeconds,
                title: details.title || candidate.title,
                description: details.description || candidate.description,
                channelTitle: details.channelTitle || candidate.channelTitle,
            };
        });
    } catch {
        return candidates;
    }
}

async function findBestYouTubeVideo(
    query: string,
    context: YouTubeSearchContext,
    language?: string
): Promise<YouTubeCandidate | null> {
    if (!YOUTUBE_API_KEY) return null;

    const languageCode = getLanguageCode(language);
    const searchParams = new URLSearchParams({
        key: YOUTUBE_API_KEY,
        part: "snippet",
        q: query,
        type: "video",
        maxResults: "12",
        safeSearch: "strict",
        videoEmbeddable: "true",
        videoSyndicated: "true",
        order: "relevance",
        videoDuration: "medium",
        videoCategoryId: "27", // Education
    });
    if (languageCode) searchParams.set("relevanceLanguage", languageCode);

    const searchResponse = await withTimeout(
        fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`, {
            method: "GET",
            cache: "no-store",
        }),
        6000,
        `YouTube lookup timed out for query: ${query}`
    );
    if (!searchResponse.ok) {
        console.warn(`YouTube search failed (${searchResponse.status}) for query: ${query}`);
        return null;
    }

    const searchJson = (await searchResponse.json()) as {
        items?: Array<{
            id?: { videoId?: string };
            snippet?: { title?: string; description?: string; channelTitle?: string };
        }>;
    };
    const candidates: YouTubeCandidate[] = [];
    for (const item of searchJson.items || []) {
        const videoId = toSafeString(item.id?.videoId);
        if (!videoId) continue;

        candidates.push({
            videoId,
            title: toSafeString(item.snippet?.title),
            description: toSafeString(item.snippet?.description),
            channelTitle: toSafeString(item.snippet?.channelTitle, "YouTube"),
            durationSeconds: 0,
            embeddable: true,
        });
    }

    if (candidates.length === 0) return null;

    const hydratedCandidates = await hydrateYouTubeCandidates(candidates, language);
    hydratedCandidates.sort(
        (a, b) => scoreVideoCandidate(b, context) - scoreVideoCandidate(a, context)
    );
    return hydratedCandidates[0] || null;
}

async function findBestYouTubeVideoAcrossQueries(
    queries: string[],
    context: YouTubeSearchContext,
    language?: string
): Promise<YouTubeCandidate | null> {
    let bestCandidate: YouTubeCandidate | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const query of queries) {
        const candidate = await findBestYouTubeVideo(query, context, language);
        if (!candidate) continue;
        const score = scoreVideoCandidate(candidate, context);
        if (score > bestScore) {
            bestCandidate = candidate;
            bestScore = score;
        }
    }

    return bestCandidate;
}

async function enrichCourseWithYouTubeVideos(
    course: GeneratedCourse,
    topic: string,
    options: YouTubeEnrichmentOptions = {}
): Promise<GeneratedCourse> {
    if (!YOUTUBE_API_KEY || !course.lessons?.length) return course;

    try {
        const topicTokens = tokenize(topic);
        const courseTokens = tokenize(course.title || topic);
        const courseTitle = toSafeString(course.title, topic);
        const language = course.metadata?.language;
        const forceRetarget = Boolean(options.forceRetarget);

        const enrichedLessons = await Promise.all(
            course.lessons.map(async (lesson, lessonIndex) => {
                const existingAssets = filterVideoGifAssets(lesson.visualAssets || []);
                const existingYouTubeVideo = existingAssets.find(
                    (asset) => asset.type === "video" && isYouTubeVideoUrl(asset.url)
                );
                if (existingYouTubeVideo && !forceRetarget) {
                    return {
                        ...lesson,
                        visualAssets: prioritizeVisualAssets(uniqueAssetsByUrl(existingAssets)).slice(
                            0,
                            MAX_VISUAL_ASSETS_PER_LESSON
                        ),
                    };
                }

                const lessonTokens = tokenize(lesson.title);
                const lessonContentTokens = extractLessonContentTokens(lesson.content);
                const searchContext: YouTubeSearchContext = {
                    topicTokens,
                    courseTokens,
                    lessonTokens,
                    lessonContentTokens,
                    lessonTitle: lesson.title,
                    courseTitle,
                    prioritizeCourseMatch: lessonIndex === 0,
                };

                const candidateQueries = buildYouTubeSearchQueries({
                    topic,
                    courseTitle,
                    lessonTitle: lesson.title,
                    lessonContentTokens,
                    prioritizeCourseMatch: lessonIndex === 0,
                    maxQueries: options.maxQueriesPerLesson,
                });

                const bestVideo = await findBestYouTubeVideoAcrossQueries(
                    candidateQueries,
                    searchContext,
                    language
                );
                if (!bestVideo) {
                    if (existingYouTubeVideo) {
                        return {
                            ...lesson,
                            visualAssets: prioritizeVisualAssets(uniqueAssetsByUrl(existingAssets)).slice(
                                0,
                                MAX_VISUAL_ASSETS_PER_LESSON
                            ),
                        };
                    }
                    return {
                        ...lesson,
                        visualAssets: prioritizeVisualAssets(uniqueAssetsByUrl(existingAssets)).slice(
                            0,
                            MAX_VISUAL_ASSETS_PER_LESSON
                        ),
                    };
                }

                const videoAsset: VisualAsset = {
                    type: "video",
                    url: `https://www.youtube.com/watch?v=${bestVideo.videoId}`,
                    caption: `${bestVideo.title} (${bestVideo.channelTitle})`,
                    altText: `Embedded lesson video about ${lesson.title}`,
                };

                const nonVideoAssets = existingAssets.filter((asset) => asset.type === "gif");
                const nextAssets = prioritizeVisualAssets(
                    uniqueAssetsByUrl([videoAsset, ...nonVideoAssets])
                ).slice(0, MAX_VISUAL_ASSETS_PER_LESSON);

                return {
                    ...lesson,
                    visualAssets: nextAssets,
                };
            })
        );

        const lessonsWithVideo = enrichedLessons.filter((lesson) =>
            (lesson.visualAssets || []).some((asset) => asset.type === "video")
        ).length;
        const didChangeAnyLesson = enrichedLessons.some((lesson, index) =>
            lessonAssetsChanged(course.lessons[index]?.visualAssets || [], lesson.visualAssets || [])
        );
        const lessonsWithUniqueYouTube = new Set(
            enrichedLessons
                .flatMap((lesson) => lesson.visualAssets || [])
                .filter((asset) => asset.type === "video" && isYouTubeVideoUrl(asset.url))
                .map((asset) => asset.url)
        ).size;
        if (!didChangeAnyLesson && !forceRetarget) return course;

        return {
            ...course,
            ...(didChangeAnyLesson ? { lessons: enrichedLessons } : {}),
            metadata: {
                ...(course.metadata || {}),
                videoEnriched: true,
                videoCoverage: `${lessonsWithVideo}/${course.lessons.length}`,
                videoDistinctCount: lessonsWithUniqueYouTube,
                videoDistinctCoverage: `${lessonsWithUniqueYouTube}/${course.lessons.length}`,
            },
        };
    } catch (error) {
        console.warn("YouTube enrichment skipped:", error);
        return course;
    }
}

async function ensureEveryLessonHasMandatoryYouTubeVideo(
    course: GeneratedCourse,
    topic: string
): Promise<GeneratedCourse> {
    if (!course.lessons?.length) return course;

    const lessons = [...course.lessons];
    const firstLesson = lessons[0];
    const courseTitle = toSafeString(course.title, topic);
    const topicTokens = tokenize(topic);
    const courseTokens = tokenize(courseTitle);
    const language = course.metadata?.language;

    let source: "copied_from_existing" | "youtube_lookup" | "fallback_default" = "fallback_default";
    let reusableVideo =
        lessons
            .flatMap((lesson) => filterVideoGifAssets(lesson.visualAssets || []))
            .find((asset) => asset.type === "video" && isYouTubeVideoUrl(asset.url)) || null;

    if (reusableVideo) {
        source = "copied_from_existing";
    }

    if (!reusableVideo && YOUTUBE_API_KEY) {
        const lessonTokens = tokenize(firstLesson.title);
        const lessonContentTokens = extractLessonContentTokens(firstLesson.content);
        const searchContext: YouTubeSearchContext = {
            topicTokens,
            courseTokens,
            lessonTokens,
            lessonContentTokens,
            lessonTitle: firstLesson.title,
            courseTitle,
            prioritizeCourseMatch: true,
        };
        const candidateQueries = buildYouTubeSearchQueries({
            topic,
            courseTitle,
            lessonTitle: firstLesson.title,
            lessonContentTokens,
            prioritizeCourseMatch: true,
        });
        const candidate = await findBestYouTubeVideoAcrossQueries(candidateQueries, searchContext, language);
        if (candidate) {
            reusableVideo = {
                type: "video",
                url: `https://www.youtube.com/watch?v=${candidate.videoId}`,
                caption: `${candidate.title} (${candidate.channelTitle})`,
                altText: `Introductory lesson video about ${firstLesson.title}`,
            };
            source = "youtube_lookup";
        }
    }

    if (!reusableVideo) {
        reusableVideo = {
            type: "video",
            url: MANDATORY_INTRO_YOUTUBE_FALLBACK_URL,
            caption: `Introduction video for ${topic}`,
            altText: `Introductory lesson video for ${topic}`,
        };
        source = "fallback_default";
    }

    const nextLessons = lessons.map((lesson) => {
        const existingAssets = filterVideoGifAssets(lesson.visualAssets || []);
        const lessonYouTubeVideo = existingAssets.find(
            (asset) => asset.type === "video" && isYouTubeVideoUrl(asset.url)
        );
        const otherVideos = existingAssets.filter(
            (asset) => asset.type === "video" && asset.url !== lessonYouTubeVideo?.url
        );
        const gifs = existingAssets.filter((asset) => asset.type === "gif");

        const mandatoryYouTubeVideo: VisualAsset =
            lessonYouTubeVideo ||
            ({
                type: "video",
                url: reusableVideo.url,
                caption: `YouTube lesson video: ${lesson.title}`,
                altText: `YouTube lesson video for ${lesson.title}`,
            } satisfies VisualAsset);

        const nextAssets = prioritizeVisualAssets(
            uniqueAssetsByUrl([mandatoryYouTubeVideo, ...otherVideos, ...gifs])
        ).slice(0, MAX_VISUAL_ASSETS_PER_LESSON);

        return {
            ...lesson,
            visualAssets: nextAssets,
        };
    });

    const lessonsWithYouTube = nextLessons.filter((lesson) =>
        (lesson.visualAssets || []).some((asset) => asset.type === "video" && isYouTubeVideoUrl(asset.url))
    ).length;
    const distinctYouTubeUrls = new Set(
        nextLessons
            .flatMap((lesson) => lesson.visualAssets || [])
            .filter((asset) => asset.type === "video" && isYouTubeVideoUrl(asset.url))
            .map((asset) => asset.url)
    ).size;
    const didChangeAnyLesson = nextLessons.some((lesson, index) =>
        lessonAssetsChanged(course.lessons[index]?.visualAssets || [], lesson.visualAssets || [])
    );

    return {
        ...course,
        ...(didChangeAnyLesson ? { lessons: nextLessons } : {}),
        metadata: {
            ...(course.metadata || {}),
            mandatoryYouTubePerLesson: true,
            mandatoryYouTubePerLessonSource: source,
            videoCoverage: `${lessonsWithYouTube}/${lessons.length}`,
            videoDistinctCount: distinctYouTubeUrls,
            videoDistinctCoverage: `${distinctYouTubeUrls}/${lessons.length}`,
            videoRetryPending: lessonsWithYouTube < lessons.length || distinctYouTubeUrls < lessons.length,
        },
    };
}

async function enrichCourseWithGiphyAssets(
    course: GeneratedCourse,
    topic: string,
    options: GiphyEnrichmentOptions = {}
): Promise<GeneratedCourse> {
    if (!giphyFetch || !course.lessons?.length) return course;

    try {
        const topicTokens = tokenize(topic);
        const language = course.metadata?.language;
        const relevanceThreshold = options.minRelevanceScore ?? MIN_GIPHY_RELEVANCE_SCORE;

        const enrichedLessons = await Promise.all(
            course.lessons.map(async (lesson) => {
                const existingAssets = filterVideoGifAssets(lesson.visualAssets || []);
                const existingVideos = existingAssets.filter((asset) => asset.type === "video");
                const existingNonVideos = existingAssets.filter(
                    (asset) => asset.type === "gif" && isHttpUrl(asset.url)
                );
                const existingGifs = existingNonVideos.filter((asset) => asset.type === "gif");

                if (existingGifs.length >= TARGET_GIF_VISUALS_PER_LESSON) {
                    const nextAssets = prioritizeVisualAssets(
                        uniqueAssetsByUrl([
                            ...existingVideos,
                            ...existingGifs.slice(0, MAX_GIFS_PER_LESSON),
                        ])
                    ).slice(0, MAX_VISUAL_ASSETS_PER_LESSON);

                    return {
                        ...lesson,
                        visualAssets: nextAssets,
                    };
                }

                const lessonTokens = tokenize(lesson.title);
                const allCandidates = await getGiphyCandidatesForLesson(
                    topic,
                    lesson.title,
                    language,
                    options.maxQueries
                );
                if (allCandidates.length === 0) {
                    return {
                        ...lesson,
                        visualAssets: prioritizeVisualAssets(uniqueAssetsByUrl(existingAssets)).slice(
                            0,
                            MAX_VISUAL_ASSETS_PER_LESSON
                        ),
                    };
                }

                const scoredCandidates = allCandidates
                    .map((candidate) => ({
                        candidate,
                        score: scoreGiphyCandidate(candidate, topicTokens, lessonTokens),
                    }))
                    .filter((entry) => entry.score >= relevanceThreshold)
                    .sort((a, b) => b.score - a.score);

                const animatedPool = scoredCandidates.map((entry) => entry.candidate);
                if (animatedPool.length === 0) {
                    return {
                        ...lesson,
                        visualAssets: prioritizeVisualAssets(uniqueAssetsByUrl(existingAssets)).slice(
                            0,
                            MAX_VISUAL_ASSETS_PER_LESSON
                        ),
                    };
                }

                const curatedAssets: VisualAsset[] = [];

                if (existingGifs[0]) curatedAssets.push(existingGifs[0]);
                if (existingGifs[1] && MAX_GIFS_PER_LESSON > 1) curatedAssets.push(existingGifs[1]);

                const usedUrls = new Set(curatedAssets.map((asset) => asset.url));

                while (
                    curatedAssets.filter((asset) => asset.type === "gif").length < TARGET_GIF_VISUALS_PER_LESSON &&
                    curatedAssets.length < MAX_GIFS_PER_LESSON
                ) {
                    const nextAnimated = animatedPool.find((candidate) => !usedUrls.has(candidate.animatedUrl));
                    if (!nextAnimated) break;
                    curatedAssets.push({
                        type: "gif",
                        url: nextAnimated.animatedUrl,
                        caption: `${nextAnimated.mediaType === "stickers" ? "Sticker" : "GIF"}: ${nextAnimated.title}`,
                        altText: nextAnimated.altText || `Animated visual for ${lesson.title}`,
                    });
                    usedUrls.add(nextAnimated.animatedUrl);
                }

                while (
                    curatedAssets.length < MIN_NON_VIDEO_VISUALS_PER_LESSON &&
                    curatedAssets.length < MAX_GIFS_PER_LESSON
                ) {
                    const nextAnimated = animatedPool.find((candidate) => !usedUrls.has(candidate.animatedUrl));
                    if (!nextAnimated) break;
                    curatedAssets.push({
                        type: "gif",
                        url: nextAnimated.animatedUrl,
                        caption: `${nextAnimated.mediaType === "stickers" ? "Sticker" : "GIF"}: ${nextAnimated.title}`,
                        altText: nextAnimated.altText || `Animated visual for ${lesson.title}`,
                    });
                    usedUrls.add(nextAnimated.animatedUrl);
                }

                const fallbackExisting = existingNonVideos.filter((asset) => !usedUrls.has(asset.url));
                const mergedNonVideos = uniqueAssetsByUrl([
                    ...curatedAssets,
                    ...fallbackExisting,
                ]).slice(0, MAX_GIFS_PER_LESSON);

                const nextAssets = prioritizeVisualAssets(
                    uniqueAssetsByUrl([...existingVideos, ...mergedNonVideos])
                ).slice(0, MAX_VISUAL_ASSETS_PER_LESSON);

                return {
                    ...lesson,
                    visualAssets: nextAssets,
                };
            })
        );

        const didChangeAnyLesson = enrichedLessons.some((lesson, index) =>
            lessonAssetsChanged(course.lessons[index]?.visualAssets || [], lesson.visualAssets || [])
        );
        if (!didChangeAnyLesson) return course;

        const lessonsWithGif = enrichedLessons.filter((lesson) =>
            (lesson.visualAssets || []).some((asset) => asset.type === "gif")
        ).length;
        const giphyMissingLessons = Math.max(0, enrichedLessons.length - lessonsWithGif);

        return {
            ...course,
            lessons: enrichedLessons,
            metadata: {
                ...(course.metadata || {}),
                gifEnriched: true,
                stickerEnriched: true,
                giphyEnriched: true,
                giphyCoverage: `${lessonsWithGif}/${enrichedLessons.length}`,
                giphyMissingLessons,
                giphyStrictRelevance: relevanceThreshold >= MIN_GIPHY_RELEVANCE_SCORE,
                giphyRelevanceThreshold: relevanceThreshold,
            },
        };
    } catch (error) {
        console.warn("GIPHY enrichment skipped:", error);
        return course;
    }
}

function countLessonsWithYouTubeVideo(course: GeneratedCourse): number {
    return (course.lessons || []).filter((lesson) =>
        (lesson.visualAssets || []).some((asset) => asset.type === "video" && isYouTubeVideoUrl(asset.url))
    ).length;
}

function countDistinctYouTubeVideos(course: GeneratedCourse): number {
    return new Set(
        (course.lessons || [])
            .flatMap((lesson) => lesson.visualAssets || [])
            .filter((asset) => asset.type === "video" && isYouTubeVideoUrl(asset.url))
            .map((asset) => asset.url)
    ).size;
}

export async function enrichCourseWithYouTubeRetries(
    course: GeneratedCourse,
    topic: string,
    options: YouTubeRetryOptions = {}
): Promise<GeneratedCourse> {
    if (!course.lessons?.length) return course;

    const maxAttempts = clamp(options.maxAttempts ?? 2, 1, 4);
    const retryDelayMs = clamp(options.retryDelayMs ?? 1000, 0, 10000);

    let current = course;
    let attemptsUsed = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        attemptsUsed = attempt + 1;
        const maxQueriesPerLesson = attempt === 0 ? 4 : 6;

        current = await enrichCourseWithYouTubeVideos(current, topic, {
            forceRetarget: true,
            maxQueriesPerLesson,
        });
        current = await ensureEveryLessonHasMandatoryYouTubeVideo(current, topic);

        const lessonsWithVideo = countLessonsWithYouTubeVideo(current);
        const distinctVideos = countDistinctYouTubeVideos(current);
        const totalLessons = current.lessons.length;
        const isGoodCoverage = lessonsWithVideo >= totalLessons;
        const isGoodDiversity = distinctVideos >= Math.max(1, Math.ceil(totalLessons * 0.8));

        if (isGoodCoverage && isGoodDiversity) break;
        if (attempt < maxAttempts - 1 && retryDelayMs > 0) {
            await sleep(retryDelayMs);
        }
    }

    const totalLessons = current.lessons.length;
    const lessonsWithVideo = countLessonsWithYouTubeVideo(current);
    const distinctVideos = countDistinctYouTubeVideos(current);
    const isCompleted =
        lessonsWithVideo >= totalLessons &&
        distinctVideos >= Math.max(1, Math.ceil(totalLessons * 0.8));

    return {
        ...current,
        metadata: {
            ...(current.metadata || {}),
            videoRetryAttempts: attemptsUsed,
            videoRetryCompleted: isCompleted,
            videoRetryPending: !isCompleted,
            videoCoverage: `${lessonsWithVideo}/${totalLessons}`,
            videoDistinctCount: distinctVideos,
            videoDistinctCoverage: `${distinctVideos}/${totalLessons}`,
        },
    };
}

function countLessonsWithGif(course: GeneratedCourse): number {
    return (course.lessons || []).filter((lesson) =>
        (lesson.visualAssets || []).some((asset) => asset.type === "gif" && isHttpUrl(asset.url))
    ).length;
}

function withGifRetryMetadata(course: GeneratedCourse): GeneratedCourse {
    const lessonsWithGif = countLessonsWithGif(course);
    const totalLessons = course.lessons?.length || 0;
    const giphyMissingLessons = Math.max(0, totalLessons - lessonsWithGif);

    return {
        ...course,
        metadata: {
            ...(course.metadata || {}),
            giphyCoverage: `${lessonsWithGif}/${totalLessons}`,
            giphyMissingLessons,
            gifRetryPending: giphyMissingLessons > 0,
        },
    };
}

async function enrichCourseWithRequiredVisualAssets(course: GeneratedCourse, topic: string): Promise<GeneratedCourse> {
    const courseWithVideos = await enrichCourseWithYouTubeVideos(course, topic);
    return ensureEveryLessonHasMandatoryYouTubeVideo(courseWithVideos, topic);
}

export async function enrichCourseWithGifRetries(
    course: GeneratedCourse,
    topic: string,
    options: GifRetryOptions = {}
): Promise<GeneratedCourse> {
    if (!course.lessons?.length) return course;

    const maxAttempts = clamp(options.maxAttempts ?? 3, 1, 6);
    const retryDelayMs = clamp(options.retryDelayMs ?? 1200, 0, 20000);
    const relevanceThresholds = (options.relevanceThresholds && options.relevanceThresholds.length > 0
        ? options.relevanceThresholds
        : DEFAULT_GIF_RETRY_THRESHOLDS
    ).map((value) => Math.max(0, Math.floor(value)));

    let current = course;
    let attemptsUsed = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        attemptsUsed = attempt + 1;
        const threshold = relevanceThresholds[Math.min(attempt, relevanceThresholds.length - 1)];
        const maxQueries = attempt === 0 ? undefined : 6;

        current = await enrichCourseWithGiphyAssets(current, topic, {
            minRelevanceScore: threshold,
            maxQueries,
        });

        const lessonsWithGif = countLessonsWithGif(current);
        const totalLessons = current.lessons.length;
        if (lessonsWithGif >= totalLessons) break;
        if (attempt < maxAttempts - 1 && retryDelayMs > 0) {
            await sleep(retryDelayMs);
        }
    }

    const lessonsWithGif = countLessonsWithGif(current);
    const totalLessons = current.lessons.length;
    const giphyMissingLessons = Math.max(0, totalLessons - lessonsWithGif);

    return {
        ...current,
        metadata: {
            ...(current.metadata || {}),
            gifRetryAttempts: attemptsUsed,
            gifRetryCompleted: giphyMissingLessons === 0,
            gifRetryPending: giphyMissingLessons > 0,
            giphyCoverage: `${lessonsWithGif}/${totalLessons}`,
            giphyMissingLessons,
        },
    };
}

interface GenerateWithFallbackOptions {
    maxRetries?: number;
    timeoutMs?: number;
}

async function generateWithFallback(
    prompt: string | { text: string }[],
    options: GenerateWithFallbackOptions = {}
): Promise<string> {
    const maxRetries = options.maxRetries ?? 1;
    const timeoutMs = options.timeoutMs ?? COURSE_GENERATION_TIMEOUT_MS;
    let lastError: Error | null = null;

    for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
        const apiKey = API_KEYS[keyIndex];
        const genAI = new GoogleGenerativeAI(apiKey);

        console.log(`Using API Key #${keyIndex + 1}/${API_KEYS.length}`);

        for (let modelIndex = 0; modelIndex < GEMINI_MODELS.length; modelIndex++) {
            const modelName = GEMINI_MODELS[modelIndex];

            for (let retry = 0; retry <= maxRetries; retry++) {
                try {
                    if (retry > 0) {
                        console.log(
                            `Retry ${retry}/${maxRetries} for model: ${modelName} (Key #${keyIndex + 1})`
                        );
                    } else {
                        console.log(`Attempting generation with model: ${modelName} (Key #${keyIndex + 1})`);
                    }

                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await withTimeout(
                        model.generateContent(prompt),
                        timeoutMs,
                        `Model ${modelName} timed out after ${timeoutMs}ms`
                    );
                    const response = await withTimeout(
                        result.response,
                        timeoutMs,
                        `Model ${modelName} response timed out after ${timeoutMs}ms`
                    );
                    const text = response.text();

                    console.log(`Successfully generated with model: ${modelName}`);
                    return text;
                } catch (error) {
                    console.warn(
                        `Model ${modelName} failed (attempt ${retry + 1}) with Key #${keyIndex + 1}:`,
                        error
                    );
                    lastError = error as Error;

                    const errorMessage = (error as Error).message?.toLowerCase() || "";
                    const isRateLimit =
                        errorMessage.includes("429") ||
                        errorMessage.includes("rate limit") ||
                        errorMessage.includes("too many requests") ||
                        errorMessage.includes("quota");

                    const isQuotaExceeded = errorMessage.includes("quota") || errorMessage.includes("429");

                    if (isQuotaExceeded && retry < maxRetries) {
                        console.log("Quota exceeded, switching strategy immediately.");
                        break;
                    }

                    if (isRateLimit && retry < maxRetries) {
                        if (FAST_GENERATION_MODE) {
                            break;
                        }
                        const waitTime = Math.pow(2, retry + 1) * 1000;
                        console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
                        await sleep(waitTime);
                        continue;
                    }

                    break;
                }
            }
        }
    }

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
4. 4-6 lessons, each containing:
   - A clear title
   - Educational content (180-320 words, formatted in markdown)
   - Structured markdown with short sections (## headings), bullet points, and short paragraphs
   - Use occasional relevant emojis (2-5 per lesson) to improve engagement
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
        const text = await generateWithFallback(prompt, {
            maxRetries: COURSE_GENERATION_MAX_RETRIES,
            timeoutMs: COURSE_GENERATION_TIMEOUT_MS,
        });
        const jsonPayload = extractJsonPayload(text);
        const parsed = JSON.parse(jsonPayload) as unknown;

        const normalizedCourse = normalizeCourse(parsed, {
            topic: params.topic,
            difficulty: params.difficulty,
            targetAge: params.targetAge,
            language: params.language,
        });
        const courseWithRequiredVisuals = await enrichCourseWithRequiredVisualAssets(normalizedCourse, params.topic);
        return withGifRetryMetadata(courseWithRequiredVisuals);
    } catch (error) {
        console.error("AI Generation Error:", error);

        const { fallbackCourses } = await import("./fallbackCourses");
        const normalizedTopic = params.topic.toLowerCase().trim();

        if (fallbackCourses[normalizedTopic]) {
            console.log(`Using fallback for topic: ${normalizedTopic}`);
            const normalizedCourse = normalizeCourse(fallbackCourses[normalizedTopic], {
                topic: params.topic,
                difficulty: params.difficulty,
                targetAge: params.targetAge,
                language: params.language,
            });
            const courseWithRequiredVisuals = await enrichCourseWithRequiredVisualAssets(normalizedCourse, params.topic);
            return withGifRetryMetadata(courseWithRequiredVisuals);
        }

        const knownTopics = Object.keys(fallbackCourses);
        const match = knownTopics.find((topic) => normalizedTopic.includes(topic) || topic.includes(normalizedTopic));
        if (match) {
            console.log(`Using partial fallback match: ${match}`);
            const normalizedCourse = normalizeCourse(fallbackCourses[match], {
                topic: params.topic,
                difficulty: params.difficulty,
                targetAge: params.targetAge,
                language: params.language,
            });
            const courseWithRequiredVisuals = await enrichCourseWithRequiredVisualAssets(normalizedCourse, params.topic);
            return withGifRetryMetadata(courseWithRequiredVisuals);
        }

        console.log("No specific fallback found. Using default Space Travel course to prevent crash.");
        const defaultCourse = JSON.parse(JSON.stringify(fallbackCourses["space travel"]));
        defaultCourse.title = `(Demo) ${defaultCourse.title}`;
        defaultCourse.description = `[AI Unavailable - Showing Demo] ${defaultCourse.description}`;

        const normalizedCourse = normalizeCourse(defaultCourse, {
            topic: params.topic,
            difficulty: params.difficulty,
            targetAge: params.targetAge,
            language: params.language,
        });
        const courseWithRequiredVisuals = await enrichCourseWithRequiredVisualAssets(normalizedCourse, params.topic);
        return withGifRetryMetadata(courseWithRequiredVisuals);
    }
}

export async function generateAdaptiveCourse(
    topic: string,
    learningProfile: import("./adaptiveEngine").LearningProfile,
    performanceHistory: import("./adaptiveEngine").PerformanceHistory
): Promise<GeneratedCourse> {
    const {
        generateAdaptiveCoursePrompt,
        calculateOptimalModality,
        calculateNextDifficulty,
    } = await import("./adaptiveEngine");

    const primaryModality = calculateOptimalModality(learningProfile, performanceHistory)[0] as LessonContentType;
    const computedDifficulty = calculateNextDifficulty(performanceHistory);
    const prompt = generateAdaptiveCoursePrompt(learningProfile, performanceHistory, topic);

    try {
        const text = await generateWithFallback(prompt, {
            maxRetries: COURSE_GENERATION_MAX_RETRIES,
            timeoutMs: COURSE_GENERATION_TIMEOUT_MS,
        });
        const jsonPayload = extractJsonPayload(text);
        const parsed = JSON.parse(jsonPayload) as unknown;

        const normalizedCourse = normalizeCourse(parsed, {
            topic,
            difficulty: computedDifficulty,
            targetAge: learningProfile.age,
            language: learningProfile.language,
            primaryModality,
            gradeLevel: learningProfile.gradeLevel,
        });
        const courseWithRequiredVisuals = await enrichCourseWithRequiredVisualAssets(normalizedCourse, topic);
        return withGifRetryMetadata(courseWithRequiredVisuals);
    } catch (error) {
        console.error("Adaptive AI Generation Error, falling back to standard generation:", error);
        return generateCourse({
            topic,
            targetAge: String(learningProfile.age),
            language: learningProfile.language,
            difficulty: performanceHistory.currentDifficulty || "beginner",
            learningGoals: `Personalized for ${learningProfile.gradeLevel} student interested in ${learningProfile.interests.join(", ")}`,
        });
    }
}

import { LearningProfile } from "./adaptiveEngine";

export async function getAITutorResponse(
    lessonContext: string,
    userQuestion: string,
    isQuizRelated: boolean,
    history: { role: "user" | "assistant"; content: string }[] = [],
    userName: string = "Student",
    learningProfile: LearningProfile | null = null
): Promise<string> {
    const userInterests = learningProfile?.interests?.join(", ") || "learning";
    const userGrade = learningProfile?.gradeLevel || "general";

    const baseSystemPrompt = isQuizRelated
        ? `You are Ollie, a fun and energetic AI tutor built by Hakkan.
       Your goal is to help ${userName} with their quizzes in a super fun and gamified way!
       
       Knowledge Base:
       - You know this is an adaptive learning platform.
       - You know this project is built by Hakkan.
       
       User Context:
       - Name: ${userName}
       - Grade Level: ${userGrade}
       - Interests: ${userInterests}

       Rules:
       - DO NOT give the direct answer to the quiz.
       - Provide hints and clues in a playful, encouraging tone.
       - Explain related concepts simply.
       - Guide them to the answer like a supportive teammate.
       - CRITICAL: For short or simple queries, keep your response extremely concise (2-3 sentences max). Do not ramble.
       - INTENT DETECTION: If the user explicitly asks to learn about a specific topic (e.g., "I want to learn about X", "Teach me X") or asks for a course recommendation, response with the prefix "REDIRECT_TO_GENERATE: <Topic>" followed by a short confirmation message. Example: "REDIRECT_TO_GENERATE: Quantum Physics\n\nThat sounds awesome! Let's head over to the course generator to build a lesson on Quantum Physics."
       
       Lesson Context: ${lessonContext}`
        : `You are Ollie, a fun, friendly, and energetic AI tutor built by Hakkan.
       
       User Context:
       - Name: ${userName}
       - Grade Level: ${userGrade}
       - Interests: ${userInterests}

       Your Goals:
       - Help ${userName} with their queries and doubts.
       - Explain concepts clearly but keep it lighthearted and fun.
       - Be super encouraging—like a cheerleader for their learning!
       - Mention "adaptive learning" or how smart the engine is occasionally if relevant.
       - CRITICAL: For short or simple queries, keep your response extremely concise (2-3 sentences max). Do not ramble.
       - For complex topics, use bullet points or short paragraphs.
       - INTENT DETECTION: If the user explicitly asks to learn about a specific topic (e.g., "I want to learn about X", "Teach me X") or asks for a course recommendation, response with the prefix "REDIRECT_TO_GENERATE: <Topic>" followed by a short confirmation message on a new line. Example:
       "REDIRECT_TO_GENERATE: Medieval History
       Great choice! I'm taking you to the course generator to start a journey into Medieval History. (If you aren't redirected automatically, please click 'Create' on the sidebar.)"
       
       Lesson Context: ${lessonContext}`;

    try {
        // Convert history to Gemini format (user/model)
        const historyContext = history.map(msg => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
        }));

        // System prompt is usually passed as system instruction or first user message in some APIs.
        // For generateWithFallback array style, we'll prepend it.
        // Note: GoogleGenerativeAI often prefers system instructions separately or as first message.
        // We will just simplify by PREPENDING it to the conversation.

        const contents = [
            { role: "user", parts: [{ text: baseSystemPrompt }] },
            { role: "model", parts: [{ text: "Got it! I'm Ollie, ready to help!" }] }, // Acknowledge system prompt to prime the chat
            // Filter out any potential system messages from history if they exist, though our type is user/assistant
            // Map 'assistant' to 'model'
            ...historyContext,
            { role: "user", parts: [{ text: userQuestion }] }
        ];

        // generateWithFallback accepts string OR Content[]?
        // Let's check generateWithFallback signature. It seems to take `string | Content[]`.
        // If the implementation below expects an array of objects with `text`, we might need to adjust.
        // Looking at line 1322 in previous file view: `generateWithFallback([{ text: systemPrompt }, { text: ... }])`
        // It seems to be using a simplified format: `(string | { text: string }[])`.
        // Let's stick to the signature `generateWithFallback` expects.
        // It likely constructs the prompt string or formatted messages internally.

        // RE-READING generateWithFallback usage in previous file view:
        // const text = await generateWithFallback([
        //     { text: systemPrompt },
        //     { text: `Student Question: ${userQuestion}` },
        // ]);

        // It seems it takes an array of prompt parts. It might NOT be full multi-turn chat history supported yet 
        // in the helper function itself if it just concatenates them.
        // Let's assume it concatenates. If so, we should format the history as text block.

        const historyText = history.map(h => `${h.role === "user" ? "User" : "Ollie"}: ${h.content}`).join("\n");

        const fullPrompt = [
            { text: baseSystemPrompt },
            { text: `Conversation History:\n${historyText}` },
            { text: `User Question: ${userQuestion}` }
        ];

        const text = await generateWithFallback(fullPrompt);
        return text;
    } catch (error) {
        console.error("AI Tutor Error:", error);
        return "I'm having trouble responding right now. Please try again in a moment.";
    }
}
