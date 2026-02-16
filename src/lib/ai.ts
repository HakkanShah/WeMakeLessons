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
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
] as const;

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
const MIN_NON_VIDEO_VISUALS_PER_LESSON = 4;
const TARGET_GIF_VISUALS_PER_LESSON = 5;

function tokenize(value: string): string[] {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2);
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

function lessonAssetsChanged(before: VisualAsset[] = [], after: VisualAsset[] = []): boolean {
    if (before.length !== after.length) return true;
    for (let i = 0; i < before.length; i++) {
        if (before[i]?.type !== after[i]?.type || before[i]?.url !== after[i]?.url) return true;
    }
    return false;
}

function parseDurationToSeconds(isoDuration: string): number {
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(isoDuration);
    if (!match) return 0;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

function scoreVideoCandidate(candidate: YouTubeCandidate, topicTokens: string[], lessonTokens: string[]): number {
    const fullText = `${candidate.title} ${candidate.description} ${candidate.channelTitle}`.toLowerCase();
    let score = 0;

    const tokenMatchCount = [...topicTokens, ...lessonTokens].filter((token) => fullText.includes(token)).length;
    score += tokenMatchCount * 3;

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
        limit: 12,
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
    language?: string
): Promise<GiphyMediaCandidate[]> {
    if (!giphyFetch) return [];

    const candidateMap = new Map<string, GiphyMediaCandidate>();
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
    );

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
        if (candidateMap.size >= 24) break;
    }

    if (candidateMap.size === 0) {
        const [trendingGifs, trendingStickers] = await Promise.allSettled([
            giphyFetch.trending({ type: "gifs", limit: 12, rating: "pg" }),
            giphyFetch.trending({ type: "stickers", limit: 12, rating: "pg" }),
        ]);

        if (trendingGifs.status === "fulfilled") {
            addCandidates(
                trendingGifs.value.data
                    .map((gif) => mapGiphyGifToCandidate(gif as GiphyGifLike, "gifs"))
                    .filter((candidate): candidate is GiphyMediaCandidate => Boolean(candidate))
            );
        }
        if (trendingStickers.status === "fulfilled") {
            addCandidates(
                trendingStickers.value.data
                    .map((gif) => mapGiphyGifToCandidate(gif as GiphyGifLike, "stickers"))
                    .filter((candidate): candidate is GiphyMediaCandidate => Boolean(candidate))
            );
        }
    }

    return Array.from(candidateMap.values());
}

async function findBestYouTubeVideo(
    query: string,
    topicTokens: string[],
    lessonTokens: string[],
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
        videoCategoryId: "27", // Education
    });
    if (languageCode) searchParams.set("relevanceLanguage", languageCode);

    const searchResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`, {
        method: "GET",
        cache: "no-store",
    });
    if (!searchResponse.ok) {
        console.warn(`YouTube search failed (${searchResponse.status}) for query: ${query}`);
        return null;
    }

    const searchJson = (await searchResponse.json()) as {
        items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; description?: string; channelTitle?: string } }>;
    };
    const videoIds = (searchJson.items || [])
        .map((item) => item.id?.videoId || "")
        .filter(Boolean)
        .slice(0, 12);
    if (videoIds.length === 0) return null;

    const detailsParams = new URLSearchParams({
        key: YOUTUBE_API_KEY,
        part: "contentDetails,status,snippet",
        id: videoIds.join(","),
        maxResults: "12",
    });
    const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${detailsParams.toString()}`, {
        method: "GET",
        cache: "no-store",
    });
    if (!detailsResponse.ok) {
        console.warn(`YouTube details lookup failed (${detailsResponse.status}) for query: ${query}`);
        return null;
    }

    const detailsJson = (await detailsResponse.json()) as {
        items?: Array<{
            id?: string;
            snippet?: { title?: string; description?: string; channelTitle?: string };
            contentDetails?: { duration?: string };
            status?: { embeddable?: boolean };
        }>;
    };

    const candidates: YouTubeCandidate[] = (detailsJson.items || [])
        .map((item) => {
            const videoId = toSafeString(item.id);
            if (!videoId) return null;
            const duration = parseDurationToSeconds(toSafeString(item.contentDetails?.duration, "PT0S"));
            return {
                videoId,
                title: toSafeString(item.snippet?.title),
                description: toSafeString(item.snippet?.description),
                channelTitle: toSafeString(item.snippet?.channelTitle, "YouTube"),
                durationSeconds: duration,
                embeddable: item.status?.embeddable !== false,
            } satisfies YouTubeCandidate;
        })
        .filter((candidate): candidate is YouTubeCandidate => Boolean(candidate));

    if (candidates.length === 0) return null;

    candidates.sort(
        (a, b) =>
            scoreVideoCandidate(b, topicTokens, lessonTokens) -
            scoreVideoCandidate(a, topicTokens, lessonTokens)
    );
    return candidates[0] || null;
}

async function enrichCourseWithYouTubeVideos(course: GeneratedCourse, topic: string): Promise<GeneratedCourse> {
    if (!YOUTUBE_API_KEY || !course.lessons?.length) return course;

    try {
        const topicTokens = tokenize(topic);
        const language = course.metadata?.language;

        const enrichedLessons = await Promise.all(
            course.lessons.map(async (lesson) => {
                const existingAssets = filterVideoGifAssets(lesson.visualAssets || []);
                const existingVideo = existingAssets.find((asset) => asset.type === "video");
                if (existingVideo) {
                    return {
                        ...lesson,
                        visualAssets: prioritizeVisualAssets(uniqueAssetsByUrl(existingAssets)).slice(
                            0,
                            MAX_VISUAL_ASSETS_PER_LESSON
                        ),
                    };
                }

                const lessonTokens = tokenize(lesson.title);
                const primaryQuery = `${topic} ${lesson.title} explained tutorial`;
                const fallbackQuery = `${topic} ${lesson.title} beginner lesson`;
                const bestVideo =
                    (await findBestYouTubeVideo(primaryQuery, topicTokens, lessonTokens, language)) ||
                    (await findBestYouTubeVideo(fallbackQuery, topicTokens, lessonTokens, language));
                if (!bestVideo) {
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
        if (!didChangeAnyLesson) return course;

        return {
            ...course,
            lessons: enrichedLessons,
            metadata: {
                ...(course.metadata || {}),
                videoEnriched: true,
                videoCoverage: `${lessonsWithVideo}/${course.lessons.length}`,
            },
        };
    } catch (error) {
        console.warn("YouTube enrichment skipped:", error);
        return course;
    }
}

async function enrichCourseWithGiphyAssets(course: GeneratedCourse, topic: string): Promise<GeneratedCourse> {
    if (!giphyFetch || !course.lessons?.length) return course;

    try {
        const topicTokens = tokenize(topic);
        const language = course.metadata?.language;

        const enrichedLessons = await Promise.all(
            course.lessons.map(async (lesson) => {
                const existingAssets = filterVideoGifAssets(lesson.visualAssets || []);
                const existingVideos = existingAssets.filter((asset) => asset.type === "video");
                const existingNonVideos = existingAssets.filter(
                    (asset) => asset.type === "gif" && isHttpUrl(asset.url)
                );
                const existingGifs = existingNonVideos.filter((asset) => asset.type === "gif");

                const lessonTokens = tokenize(lesson.title);
                const allCandidates = await getGiphyCandidatesForLesson(topic, lesson.title, language);
                if (allCandidates.length === 0) {
                    return {
                        ...lesson,
                        visualAssets: prioritizeVisualAssets(uniqueAssetsByUrl(existingAssets)).slice(
                            0,
                            MAX_VISUAL_ASSETS_PER_LESSON
                        ),
                    };
                }

                const animatedPool = [...allCandidates].sort(
                    (a, b) =>
                        scoreGiphyCandidate(b, topicTokens, lessonTokens) -
                        scoreGiphyCandidate(a, topicTokens, lessonTokens)
                );

                const curatedAssets: VisualAsset[] = [];

                if (existingGifs[0]) curatedAssets.push(existingGifs[0]);
                if (existingGifs[1]) curatedAssets.push(existingGifs[1]);

                const usedUrls = new Set(curatedAssets.map((asset) => asset.url));

                while (
                    curatedAssets.filter((asset) => asset.type === "gif").length < TARGET_GIF_VISUALS_PER_LESSON &&
                    curatedAssets.length < MAX_VISUAL_ASSETS_PER_LESSON - 1
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

                while (curatedAssets.length < MIN_NON_VIDEO_VISUALS_PER_LESSON) {
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
                ]).slice(0, MAX_VISUAL_ASSETS_PER_LESSON - 1);

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

        return {
            ...course,
            lessons: enrichedLessons,
            metadata: {
                ...(course.metadata || {}),
                gifEnriched: true,
                stickerEnriched: true,
                giphyEnriched: true,
            },
        };
    } catch (error) {
        console.warn("GIPHY enrichment skipped:", error);
        return course;
    }
}

async function enrichCourseVisualAssets(course: GeneratedCourse, topic: string): Promise<GeneratedCourse> {
    const courseWithImages = await enrichCourseWithGiphyAssets(course, topic);
    return enrichCourseWithYouTubeVideos(courseWithImages, topic);
}

async function generateWithFallback(
    prompt: string | { text: string }[],
    maxRetries = 1
): Promise<string> {
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
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
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
        const jsonPayload = extractJsonPayload(text);
        const parsed = JSON.parse(jsonPayload) as unknown;

        const normalizedCourse = normalizeCourse(parsed, {
            topic: params.topic,
            difficulty: params.difficulty,
            targetAge: params.targetAge,
            language: params.language,
        });
        return enrichCourseVisualAssets(normalizedCourse, params.topic);
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
            return enrichCourseVisualAssets(normalizedCourse, params.topic);
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
            return enrichCourseVisualAssets(normalizedCourse, params.topic);
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
        return enrichCourseVisualAssets(normalizedCourse, params.topic);
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
        const text = await generateWithFallback(prompt);
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
        return enrichCourseVisualAssets(normalizedCourse, topic);
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
