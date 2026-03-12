import "server-only";

import type { StructuredLessonVideo } from "@/lib/structuredCourse";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

interface YouTubeVideoCandidate {
    videoId: string;
    title: string;
    channelTitle: string;
    description: string;
}

const EDUCATIONAL_VIDEO_HINTS = [
    "explained",
    "tutorial",
    "lesson",
    "education",
    "beginner",
    "introduction",
    "fundamentals",
    "learn",
    "walkthrough",
] as const;

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

function getLanguageCode(language?: string): string | undefined {
    if (!language) return undefined;
    return LANGUAGE_CODE_MAP[language.toLowerCase()];
}

const NOISY_VIDEO_HINTS = [
    "shorts",
    "reaction",
    "meme",
    "prank",
    "music video",
    "compilation",
] as const;

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

function scoreVideoCandidate(candidate: YouTubeVideoCandidate, query: string): number {
    const haystack = `${candidate.title} ${candidate.description} ${candidate.channelTitle}`.toLowerCase();
    const queryTokens = query.toLowerCase().split(/\s+/).filter((token) => token.length > 2);
    let score = 0;

    for (const token of queryTokens) {
        if (haystack.includes(token)) {
            score += 8;
        }
    }

    for (const hint of EDUCATIONAL_VIDEO_HINTS) {
        if (haystack.includes(hint)) {
            score += 14;
        }
    }

    for (const hint of NOISY_VIDEO_HINTS) {
        if (haystack.includes(hint)) {
            score -= 18;
        }
    }

    return score;
}

export async function resolveStructuredLessonVideo(video: StructuredLessonVideo, language?: string): Promise<StructuredLessonVideo> {
    if (!YOUTUBE_API_KEY || !video.searchQuery) {
        return video;
    }

    try {
        const langCode = getLanguageCode(language);
        const params = new URLSearchParams({
            key: YOUTUBE_API_KEY,
            part: "snippet",
            q: video.searchQuery,
            maxResults: "5",
            type: "video",
            videoEmbeddable: "true",
            videoSyndicated: "true",
            videoDuration: "medium",
            safeSearch: "moderate",
        });

        if (langCode) {
            params.set("relevanceLanguage", langCode);
        }

        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
            cache: "no-store",
        });

        if (!response.ok) {
            return video;
        }

        const payload = await response.json() as {
            items?: Array<{
                id?: { videoId?: string };
                snippet?: {
                    title?: string;
                    description?: string;
                    channelTitle?: string;
                };
            }>;
        };

        const candidates = (payload.items || [])
            .map((item) => ({
                videoId: toSafeString(item.id?.videoId),
                title: toSafeString(item.snippet?.title),
                channelTitle: toSafeString(item.snippet?.channelTitle),
                description: toSafeString(item.snippet?.description),
            }))
            .filter((candidate) => candidate.videoId);

        if (candidates.length === 0) {
            return video;
        }

        const bestCandidate = [...candidates].sort(
            (left, right) => scoreVideoCandidate(right, video.searchQuery) - scoreVideoCandidate(left, video.searchQuery)
        )[0];

        if (!bestCandidate) {
            return video;
        }

        return {
            ...video,
            title: bestCandidate.title || video.title,
            url: `https://www.youtube.com/watch?v=${bestCandidate.videoId}`,
        };
    } catch {
        return video;
    }
}
