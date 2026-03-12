export interface LessonVideoLookupInput {
    courseTitle: string;
    moduleTitle: string;
    lessonTitle: string;
}

function normalizeText(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

export function isHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(normalizeText(value));
}

export function buildLessonVideoSearchQuery({
    courseTitle,
    moduleTitle,
    lessonTitle,
}: LessonVideoLookupInput): string {
    const parts = [courseTitle, moduleTitle, lessonTitle, "explained tutorial"]
        .map((value) => normalizeText(value))
        .filter(Boolean);

    return parts.join(" ");
}

export function buildYouTubeSearchUrl(searchQuery: string): string {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(normalizeText(searchQuery))}`;
}

export function extractYouTubeVideoId(url: string): string | null {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        if (host === "youtu.be") {
            return parsed.pathname.replace(/^\/+/, "") || null;
        }

        if (host === "youtube.com" || host.endsWith(".youtube.com")) {
            if (parsed.pathname === "/watch") {
                return parsed.searchParams.get("v");
            }

            const embedMatch = parsed.pathname.match(/^\/embed\/([^/?#]+)/);
            if (embedMatch) {
                return embedMatch[1] || null;
            }
        }
    } catch {
        return null;
    }

    return null;
}

export function buildYouTubeEmbedUrl(url: string): string | null {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
        return null;
    }

    return `https://www.youtube.com/embed/${videoId}?rel=0`;
}
