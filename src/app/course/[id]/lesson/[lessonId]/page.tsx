"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
    doc,
    getDoc,
    updateDoc,
    setDoc,
    arrayUnion,
    increment,
    serverTimestamp,
} from "firebase/firestore";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSound } from "@/hooks/useSound";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import {
    updatePerformanceAfterQuiz,
    type Difficulty,
    type LearnerTier,
    type PerformanceHistory,
} from "@/lib/adaptiveEngine";

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

interface VisualAsset {
    type: "image" | "gif" | "video";
    url: string;
    caption?: string;
    altText?: string;
}

interface Lesson {
    id: string;
    title: string;
    content: string;
    duration: number;
    contentType?: "visual" | "reading" | "handson" | "listening";
    visualAssets?: VisualAsset[];
    quiz: QuizQuestion[];
}

interface Course {
    title: string;
    lessons: Lesson[];
    metadata?: {
        primaryModality?: "visual" | "reading" | "handson" | "listening";
        difficulty?: string;
        [key: string]: unknown;
    };
    adaptiveMetadata?: {
        targetModality?: "visual" | "reading" | "handson" | "listening";
        [key: string]: unknown;
    };
}

interface AdaptiveStatusSnapshot {
    difficulty: Difficulty;
    learnerTier: LearnerTier;
    streakHealth: string;
    trend: string;
    reason: string;
    tierScore: number;
}

function createDefaultPerformanceHistory(): PerformanceHistory {
    return {
        visualScore: 50,
        readingScore: 50,
        handsonScore: 50,
        listeningScore: 50,
        averageQuizScore: 0,
        totalLessonsCompleted: 0,
        currentDifficulty: "beginner",
        strongTopics: [],
        weakTopics: [],
        recentQuizScores: [],
        learnerTier: "beginner",
        tierScore: 0,
        trend: "stable",
        streakHealth: "warning",
        difficultyChangeReason: "Need more lessons before difficulty adapts.",
        lastDifficultyChangeDirection: "stable",
    };
}

// Custom Image Component with Loading State and Fallback Strategy
const LessonImage = ({ src, alt, ...props }: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>) => {
    const initialSrc = typeof src === "string" ? src : undefined;
    const [imgSrc] = useState<string | undefined>(initialSrc);
    const [isLoading, setIsLoading] = useState(true);
    const [hasFailed, setHasFailed] = useState(false);

    const handleError = () => {
        setHasFailed(true);
        setIsLoading(false);
    };

    const handleLoad = () => {
        setIsLoading(false);
        setHasFailed(false);
    };

    return (
        <div className="my-8 transform rotate-1 hover:rotate-0 transition-transform duration-300">
            <div className="bg-white p-2 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden">
                {isLoading && !hasFailed && (
                    <div className="w-full h-[250px] bg-gradient-to-br from-comic-blue/20 to-comic-yellow/20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center animate-pulse">
                        <div className="text-4xl mb-2">🖼️</div>
                        <p className="font-black text-gray-400 text-sm uppercase tracking-wider">Loading image...</p>
                    </div>
                )}

                {hasFailed ? (
                    <div className="w-full h-auto py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center p-4">
                        <p className="font-bold text-gray-400 text-sm uppercase tracking-wider">Image unavailable</p>
                    </div>
                ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        {...props}
                        src={imgSrc}
                        alt={alt || "Lesson Image"}
                        onError={handleError}
                        onLoad={handleLoad}
                        className={`w-full h-auto rounded-lg border-2 border-gray-100 min-h-[200px] bg-gray-50 object-cover ${isLoading ? 'hidden' : 'block'}`}
                    />
                )}

            </div>
        </div>
    );
};

function getVideoEmbedUrl(rawUrl: string): string | null {
    try {
        const url = new URL(rawUrl);
        const host = url.hostname.replace(/^www\./i, "").toLowerCase();

        if (host.includes("youtube.com")) {
            const id = url.searchParams.get("v");
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        if (host === "youtu.be") {
            const id = url.pathname.replace("/", "");
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        if (host.includes("vimeo.com")) {
            const id = url.pathname.split("/").filter(Boolean)[0];
            return id ? `https://player.vimeo.com/video/${id}` : null;
        }

        return null;
    } catch {
        return null;
    }
}

function prioritizeVisualAssets(assets: VisualAsset[]): VisualAsset[] {
    const videos = assets.filter((asset) => asset.type === "video");
    const gifs = assets.filter((asset) => asset.type === "gif");
    return [...videos, ...gifs];
}

function parseImgAttribute(attributes: string, name: string): string | null {
    const doubleQuoted = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i");
    const singleQuoted = new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i");
    const unquoted = new RegExp(`${name}\\s*=\\s*([^\\s"'>]+)`, "i");

    const doubleMatch = attributes.match(doubleQuoted);
    if (doubleMatch?.[1]) return doubleMatch[1];

    const singleMatch = attributes.match(singleQuoted);
    if (singleMatch?.[1]) return singleMatch[1];

    const unquotedMatch = attributes.match(unquoted);
    if (unquotedMatch?.[1]) return unquotedMatch[1];

    return null;
}

function escapeMarkdownText(text: string): string {
    return text.replace(/([\\[\]_*`])/g, "\\$1");
}

function normalizeHtmlImagesToMarkdown(markdown: string): string {
    const withoutFigureMarkup = markdown
        .replace(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/gi, "")
        .replace(/<\/?figure\b[^>]*>/gi, "");

    const withMarkdownImages = withoutFigureMarkup.replace(/<img\b([^>]*?)\/?>/gi, (_, attributes: string) => {
        const src = parseImgAttribute(attributes, "src");
        if (!src) return "";

        const alt = parseImgAttribute(attributes, "alt") || "Lesson image";
        const markdownImage = `![${escapeMarkdownText(alt)}](${src})`;

        return `\n\n${markdownImage}\n\n`;
    });

    return withMarkdownImages
        .replace(/^\s*_?Caption:\s.*_?\s*$/gim, "")
        .replace(/^\s*(?:GIF|Sticker):\s.*$/gim, "")
        .replace(/^\s*[A-Za-z0-9][A-Za-z0-9 '&/,:.!-]{0,100}\bGIF\b\s*$/gim, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

const LONG_PARAGRAPH_CHAR_THRESHOLD = 260;
const SENTENCE_CHUNK_CHAR_TARGET = 220;
const SENTENCE_CHUNK_MAX_SENTENCES = 2;

function shouldKeepBlockAsIs(block: string): boolean {
    const trimmed = block.trim();
    if (!trimmed) return true;
    if (trimmed.includes("```")) return true;

    return (
        /^#{1,6}\s/.test(trimmed) ||
        /^[-*+]\s/.test(trimmed) ||
        /^\d+\.\s/.test(trimmed) ||
        /^>\s/.test(trimmed) ||
        /^!\[/.test(trimmed) ||
        /^\|.+\|$/.test(trimmed) ||
        /^-{3,}$/.test(trimmed) ||
        /^_{3,}$/.test(trimmed) ||
        /^\*{3,}$/.test(trimmed)
    );
}

function splitParagraphIntoComicChunks(paragraph: string): string[] {
    const compact = paragraph.replace(/\s+/g, " ").trim();
    if (!compact) return [];
    if (compact.length <= LONG_PARAGRAPH_CHAR_THRESHOLD) return [compact];

    const sentences = compact
        .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);

    if (sentences.length <= 1) return [compact];

    const chunks: string[] = [];
    let buffer: string[] = [];
    let bufferChars = 0;

    for (const sentence of sentences) {
        const sentenceLength = sentence.length;
        const exceedsByCount = buffer.length >= SENTENCE_CHUNK_MAX_SENTENCES;
        const exceedsByChars = bufferChars + sentenceLength > SENTENCE_CHUNK_CHAR_TARGET;

        if ((exceedsByCount || exceedsByChars) && buffer.length > 0) {
            chunks.push(buffer.join(" "));
            buffer = [sentence];
            bufferChars = sentenceLength;
            continue;
        }

        buffer.push(sentence);
        bufferChars += sentenceLength;
    }

    if (buffer.length > 0) {
        chunks.push(buffer.join(" "));
    }

    return chunks;
}

function addComicParagraphBreaks(markdown: string): string {
    const blocks = markdown
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean);

    const expandedBlocks: string[] = [];

    for (const block of blocks) {
        if (shouldKeepBlockAsIs(block)) {
            expandedBlocks.push(block);
            continue;
        }

        const chunked = splitParagraphIntoComicChunks(block);
        if (chunked.length === 0) continue;
        expandedBlocks.push(...chunked);
    }

    return expandedBlocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function splitLessonContent(markdown: string): [string, string, string] {
    const normalizedMarkdown = addComicParagraphBreaks(normalizeHtmlImagesToMarkdown(markdown));
    const withoutLeadingTitle = normalizedMarkdown
        .replace(/^#\s+.+$/m, "")
        .replace(/^##\s+.+$/m, "")
        .trim();
    const blocks = withoutLeadingTitle
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean);

    if (blocks.length <= 3) {
        return [
            blocks.slice(0, 1).join("\n\n"),
            blocks.slice(1, 2).join("\n\n"),
            blocks.slice(2).join("\n\n"),
        ];
    }

    const firstCut = Math.max(1, Math.floor(blocks.length * 0.35));
    const secondCut = Math.max(firstCut + 1, Math.floor(blocks.length * 0.7));
    return [
        blocks.slice(0, firstCut).join("\n\n"),
        blocks.slice(firstCut, secondCut).join("\n\n"),
        blocks.slice(secondCut).join("\n\n"),
    ];
}

function stripEmojiForSpeech(text: string): string {
    return text
        .replace(/\p{Extended_Pictographic}/gu, " ")
        .replace(/[\u200D\uFE0F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extractTextContent(node: React.ReactNode): string {
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractTextContent).join(" ");
    if (node && typeof node === "object" && "props" in node) {
        const withProps = node as { props?: { children?: React.ReactNode } };
        return extractTextContent(withProps.props?.children ?? "");
    }
    return "";
}

function isVisualCaptionText(text: string): boolean {
    const normalized = text
        .replace(/[_*`]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalized) return true;
    if (/^(?:GIF|Sticker|Caption):/i.test(normalized)) return true;
    return /^[A-Za-z0-9][A-Za-z0-9 '&/,:.!-]{0,100}\bGIF\b$/i.test(normalized);
}

const LESSON_PARAGRAPH_EMOJIS = ["🚀", "✨", "🧠", "🔍", "🎯", "🌈", "💡"];

function pickParagraphEmoji(text: string): string {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return "✨";

    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        hash = (hash + normalized.charCodeAt(i) * (i + 1)) % 2147483647;
    }

    return LESSON_PARAGRAPH_EMOJIS[hash % LESSON_PARAGRAPH_EMOJIS.length];
}

export default function LessonPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const courseId = params.id as string;
    const lessonId = params.lessonId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [lessonIndex, setLessonIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);

    // Quiz state
    const [showQuiz, setShowQuiz] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [quizScore, setQuizScore] = useState(0);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [adaptiveStatus, setAdaptiveStatus] = useState<AdaptiveStatusSnapshot>({
        difficulty: "beginner",
        learnerTier: "beginner",
        streakHealth: "warning",
        trend: "stable",
        reason: "Need more lessons before difficulty adapts.",
        tierScore: 0,
    });
    const [difficultyChangeHint, setDifficultyChangeHint] = useState<string>("");

    // AI Tutor state
    const [showTutor, setShowTutor] = useState(false);
    const [tutorMessages, setTutorMessages] = useState<
        { role: "user" | "assistant"; content: string }[]
    >([]);
    const [tutorInput, setTutorInput] = useState("");
    const [tutorLoading, setTutorLoading] = useState(false);

    // Sound Effects
    // Sound Effects
    const { playClick, playCorrect, playWrong, playQuizResult } = useSound();

    // Text to Speech
    const { speak, cancel, isSpeaking, hasVoiceSupport, voiceModeEnabled, setVoiceModeEnabled } = useTextToSpeech();

    // Anti-cheat state
    const [tabSwitchWarning, setTabSwitchWarning] = useState(false);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);

    useEffect(() => {
        if (!showQuiz) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitchCount((prev) => prev + 1);
                setTabSwitchWarning(true);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () =>
            document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [showQuiz]);

    useEffect(() => {
        async function fetchData() {
            if (!courseId || !lessonId) return;
            // Wait for auth to initialize to prevent false positive permission errors
            if (authLoading) return;

            setPermissionDenied(false); // Reset error state on new attempt

            try {
                const courseDoc = await getDoc(doc(db, "courses", courseId));
                if (courseDoc.exists()) {
                    const courseData = courseDoc.data() as Course;
                    setCourse(courseData);

                    const foundLesson = courseData.lessons.find((l) => l.id === lessonId);
                    const foundIndex = courseData.lessons.findIndex(
                        (l) => l.id === lessonId
                    );
                    if (foundLesson) {
                        setLesson(foundLesson);
                        setLessonIndex(foundIndex);
                    }
                }
            } catch (error: unknown) {
                const firebaseError = error as { code?: string; message?: string };
                if (
                    firebaseError?.code === "permission-denied" ||
                    firebaseError?.message?.includes("insufficient permissions")
                ) {
                    setPermissionDenied(true);
                } else {
                    console.error("Error fetching lesson:", error);
                }
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [courseId, lessonId, authLoading]);

    useEffect(() => {
        const fetchAdaptiveStatus = async () => {
            if (!user) return;
            try {
                const userSnap = await getDoc(doc(db, "users", user.uid));
                if (!userSnap.exists()) return;

                const userData = userSnap.data();
                const perf: PerformanceHistory = userData.performanceHistory || createDefaultPerformanceHistory();
                setAdaptiveStatus({
                    difficulty: perf.currentDifficulty || "beginner",
                    learnerTier: perf.learnerTier || "beginner",
                    streakHealth: perf.streakHealth || "warning",
                    trend: perf.trend || "stable",
                    reason: perf.difficultyChangeReason || "Need more lessons before difficulty adapts.",
                    tierScore: Number(perf.tierScore || 0),
                });
            } catch (error) {
                console.warn("Failed to fetch adaptive status:", error);
            }
        };

        if (user) fetchAdaptiveStatus();
    }, [user]);

    // Cleanup speech on unmount
    useEffect(() => {
        return () => cancel();
    }, [cancel]);

    // Auto-read quiz questions when they change
    useEffect(() => {
        if (voiceModeEnabled && showQuiz && !quizCompleted && lesson && hasVoiceSupport) {
            const currentQ = lesson.quiz[currentQuestionIndex];
            const textToSpeak = stripEmojiForSpeech(
                `${currentQ.question}. ${currentQ.options.map((opt, i) => `Option ${String.fromCharCode(65 + i)}, ${opt}`).join(". ")}`
            );
            speak(textToSpeak);
        }
    }, [currentQuestionIndex, showQuiz, voiceModeEnabled, quizCompleted, lesson, hasVoiceSupport, speak]);

    // Auto-read Lesson Content on Load
    useEffect(() => {
        if (voiceModeEnabled && !showQuiz && !quizCompleted && lesson && hasVoiceSupport) {
            // Robust Markdown Cleaning for TTS
            const cleanText = lesson.content
                // Remove images completely: ![alt](url)
                .replace(/!\[.*?\]\(.*?\)/g, '')
                // Remove HTML tags if any (e.g. <br>)
                .replace(/<[^>]*>/g, '')
                // Keep link text, remove url: [text](url) -> text
                .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
                // Remove heading markers: ### Title -> Title
                .replace(/^#+\s+/gm, '')
                // Remove bold/italic/code markers: * _ `
                .replace(/[*_`]/g, '')
                // Collapse multiple spaces/newlines to single space
                .replace(/\s+/g, ' ')
                .trim();

            speak(stripEmojiForSpeech(`${lesson.title}. ${cleanText}`));
        }
        // We only want to trigger this when the lesson ID changes or voice mode is initially enabled
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lesson?.id, hasVoiceSupport, voiceModeEnabled]);

    const handleAnswerSelect = (answerIndex: number) => {
        if (showResult) return;
        setSelectedAnswer(answerIndex);
    };

    const handleSubmitAnswer = () => {
        if (selectedAnswer === null || !lesson) return;

        const isCorrect =
            selectedAnswer === lesson.quiz[currentQuestionIndex].correctAnswer;
        if (isCorrect) {
            setQuizScore((prev) => prev + 1);
        }
        setShowResult(true);
    };

    const handleNextQuestion = async () => {
        if (!lesson) return;

        if (currentQuestionIndex < lesson.quiz.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
            setSelectedAnswer(null);
            setShowResult(false);
            return;
        }

        const scorePercentage = Math.round((quizScore / lesson.quiz.length) * 100);
        setQuizCompleted(true);
        playQuizResult(scorePercentage);

        if (!user) return;

        try {
            const progressRef = doc(db, "course_progress", `${user.uid}_${courseId}`);
            let completedLessons: string[] = [];
            let previousScore = 0;

            try {
                const progressSnap = await getDoc(progressRef);
                if (progressSnap.exists()) {
                    completedLessons =
                        Array.isArray(progressSnap.data().completedLessons)
                            ? (progressSnap.data().completedLessons as string[])
                            : [];
                    previousScore = Number(progressSnap.data()?.quizScores?.[lessonId] ?? 0);
                } else {
                    await setDoc(progressRef, {
                        userId: user.uid,
                        courseId,
                        completedLessons: [],
                        quizScores: {},
                        startedAt: serverTimestamp(),
                        lastAccessedAt: serverTimestamp(),
                    });
                }
            } catch (progressError) {
                console.warn("Progress read fallback triggered:", progressError);
            }

            const isReplay = completedLessons.includes(lessonId);
            const bestScore = Math.max(previousScore, scorePercentage);

            await setDoc(
                progressRef,
                {
                    userId: user.uid,
                    courseId,
                    completedLessons: arrayUnion(lessonId),
                    [`quizScores.${lessonId}`]: bestScore,
                    lastAccessedAt: serverTimestamp(),
                },
                { merge: true }
            );

            if (isReplay) return;

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) return;

            const userData = userSnap.data();
            const currentPerf: PerformanceHistory =
                userData.performanceHistory || createDefaultPerformanceHistory();

            const modality =
                lesson.contentType ||
                course?.metadata?.primaryModality ||
                course?.adaptiveMetadata?.targetModality ||
                "reading";
            const topic = course?.title || "General";
            const completionRatio =
                course?.lessons?.length && course.lessons.length > 0
                    ? new Set([...completedLessons, lessonId]).size / course.lessons.length
                    : 0;
            const currentStreak = Number(userData.stats?.streak || 0);
            const previousDifficulty = currentPerf.currentDifficulty;

            const newPerf = updatePerformanceAfterQuiz(currentPerf, scorePercentage, modality, topic, {
                currentStreak,
                completionRatio,
            });
            newPerf.lastUpdated = serverTimestamp();

            const nextAdaptiveStatus: AdaptiveStatusSnapshot = {
                difficulty: newPerf.currentDifficulty || "beginner",
                learnerTier: newPerf.learnerTier || "beginner",
                streakHealth: newPerf.streakHealth || "warning",
                trend: newPerf.trend || "stable",
                reason: newPerf.difficultyChangeReason || "Difficulty remains balanced.",
                tierScore: Number(newPerf.tierScore || 0),
            };
            setAdaptiveStatus(nextAdaptiveStatus);

            if (newPerf.currentDifficulty !== previousDifficulty) {
                setDifficultyChangeHint(
                    `Adaptive update: difficulty moved from ${previousDifficulty} to ${newPerf.currentDifficulty}.`
                );
            } else {
                setDifficultyChangeHint(nextAdaptiveStatus.reason);
            }

            const xpEarned = 10 + Math.floor(scorePercentage / 10);

            await updateDoc(userRef, {
                "stats.xp": increment(xpEarned),
                "stats.lastActive": serverTimestamp(),
                performanceHistory: newPerf,
            });

            const leaderboardRef = doc(db, "leaderboard", user.uid);
            await setDoc(
                leaderboardRef,
                {
                    userId: user.uid,
                    name: user.displayName || "Explorer",
                    avatar: user.photoURL || "User",
                    xp: increment(xpEarned),
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
        } catch (error) {
            console.error("Failed to persist quiz progress:", error);
        }
    };
    const handleAskTutor = async () => {
        if (!tutorInput.trim() || tutorLoading) return;

        const userMessage = tutorInput;
        setTutorMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setTutorInput("");
        setTutorLoading(true);

        try {
            const response = await fetch("/api/tutor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lessonContext: lesson?.content || "",
                    question: userMessage,
                    isQuizRelated: showQuiz,
                }),
            });

            const data = await response.json();
            setTutorMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.response },
            ]);
        } catch {
            setTutorMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Oops! Let me try again... 🙈" },
            ]);
        } finally {
            setTutorLoading(false);
        }
    };

    const handleNextLesson = () => {
        cancel(); // Stop speaking when navigating
        if (!course || lessonIndex >= course.lessons.length - 1) {
            router.push(`/course/${courseId}`);
            return;
        }
        router.push(`/course/${courseId}/lesson/${course.lessons[lessonIndex + 1].id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-comic-paper flex items-center justify-center">
                <div className="text-3xl font-black animate-bounce">Loading Page... 📄</div>
            </div>
        );
    }

    // Permission Denied UI
    if (permissionDenied) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-comic-paper">
                <div className="text-8xl mb-4 grayscale opacity-50">🔒</div>
                <h1 className="text-3xl font-black mb-4">Access Denied!</h1>
                <p className="text-xl font-bold text-gray-500 mb-8 max-w-md text-center">
                    You don&apos;t have permission to view this classified lesson.
                </p>
                <Link href="/dashboard">
                    <button className="btn-primary">Return to Base</button>
                </Link>
            </div>
        );
    }

    if (!lesson || !course) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-comic-paper">
                <div className="text-8xl mb-4 grayscale opacity-50">🚫</div>
                <h1 className="text-3xl font-black mb-4">Page Missing!</h1>
                <Link href="/dashboard">
                    <button className="btn-primary">Return to Base</button>
                </Link>
            </div>
        );
    }

    const scorePercent = lesson.quiz.length > 0 ? Math.round((quizScore / lesson.quiz.length) * 100) : 0;
    const structuredAssets = prioritizeVisualAssets(lesson.visualAssets || []);
    const primaryVideo = structuredAssets.find((asset) => asset.type === "video");
    const gifAssets = structuredAssets.filter((asset) => asset.type === "gif");
    const firstGifRow = gifAssets.slice(0, 2);
    const secondGifRow = gifAssets.slice(2, 5);
    const hasGifVisuals = gifAssets.length > 0;
    const [introContent, middleContent, finalContent] = splitLessonContent(lesson.content);

    const markdownComponents = {
        img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
            const src = typeof props.src === "string" ? props.src : "";
            if (!src) return null;
            return <LessonImage src={src} alt={props.alt || "Lesson Image"} />;
        },
        h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h1 className="mb-6 rounded-2xl border-4 border-black bg-comic-yellow px-4 py-3 text-3xl font-black uppercase tracking-wide text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:text-4xl">
                {props.children}
            </h1>
        ),
        h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h2 className="mb-4 mt-8 flex items-center gap-3 text-2xl font-black md:text-3xl">
                <span className="inline-flex items-center rounded-full border-2 border-black bg-comic-blue px-3 py-1 text-sm font-black uppercase text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    Panel
                </span>
                <span aria-hidden className="text-2xl">🎬</span>
                <span className="text-black">{props.children}</span>
            </h2>
        ),
        h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h3 className="mt-6 mb-3 inline-block rounded-lg border-2 border-black bg-comic-red px-3 py-1 text-xl font-black text-white md:text-2xl">
                {props.children}
            </h3>
        ),
        p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
            (() => {
                const paragraphText = extractTextContent(props.children);
                if (isVisualCaptionText(paragraphText)) return null;
                const paragraphEmoji = pickParagraphEmoji(paragraphText);

                return (
                    <p className="mb-4 flex items-start gap-3 rounded-xl border-2 border-black/20 bg-gradient-to-r from-white via-comic-yellow/15 to-comic-blue/15 px-4 py-3 text-lg leading-relaxed font-bold text-gray-700 md:text-xl">
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            {paragraphEmoji}
                        </span>
                        <span>{props.children}</span>
                    </p>
                );
            })()
        ),
        ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
            <ul className="my-6 space-y-3 rounded-xl border-2 border-black/15 bg-white/80 p-4">
                {props.children}
            </ul>
        ),
        ol: (props: React.OlHTMLAttributes<HTMLOListElement>) => (
            <ol className="my-6 list-decimal space-y-3 rounded-xl border-2 border-black/15 bg-comic-blue/10 p-4 pl-8">
                {props.children}
            </ol>
        ),
        li: (props: React.HTMLAttributes<HTMLLIElement>) => (
            <li className="flex items-start gap-3 text-lg font-bold text-gray-700">
                <span className="mt-1 text-xl text-comic-green">✅</span>
                <span>{props.children}</span>
            </li>
        ),
        blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
            <div className="relative my-8 rounded-r-2xl border-y-2 border-r-2 border-l-8 border-comic-yellow bg-comic-yellow/20 p-6 italic">
                <div className="pl-4 text-xl font-bold text-gray-800">
                    {props.children}
                </div>
            </div>
        ),
        a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
            <a
                {...props}
                target={props.target || "_blank"}
                rel={props.rel || "noopener noreferrer"}
                className="font-black text-comic-blue underline decoration-2 underline-offset-2 transition-colors hover:text-comic-blue-dark"
            >
                {props.children}
            </a>
        ),
        code: (props: React.HTMLAttributes<HTMLElement>) => (
            <code className={`rounded-md border border-black/20 bg-comic-ink px-1.5 py-0.5 text-sm font-black text-comic-yellow ${props.className || ""}`}>
                {props.children}
            </code>
        ),
        pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
            <pre className="my-6 overflow-x-auto rounded-xl border-[3px] border-black bg-comic-ink p-4 text-sm text-comic-yellow shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {props.children}
            </pre>
        ),
        hr: () => <hr className="my-8 h-2 rounded-full border-0 bg-[repeating-linear-gradient(90deg,#000_0_8px,#ffd43b_8px_16px)]" />,
        table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
            <div className="my-6 overflow-x-auto rounded-xl border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <table className="min-w-full border-collapse text-left text-sm font-bold" {...props} />
            </div>
        ),
        th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
            <th className="border-2 border-black bg-comic-blue px-3 py-2 font-black uppercase tracking-wide text-white" {...props} />
        ),
        td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
            <td className="border-2 border-black/30 bg-white px-3 py-2 text-gray-700" {...props} />
        ),
        em: (props: React.HTMLAttributes<HTMLElement>) => (
            <em className="rounded bg-comic-red/15 px-1 py-0.5 font-black not-italic text-comic-red-dark">
                {props.children}
            </em>
        ),
        strong: (props: React.HTMLAttributes<HTMLElement>) => (
            <strong className="rounded bg-comic-blue/20 px-1 py-0.5 font-black text-comic-blue-dark">
                {props.children}
            </strong>
        ),
    };

    return (
        <div className="min-h-screen bg-comic-paper bg-dot-pattern">
            {/* Anti-cheat Warning Modal */}
            {tabSwitchWarning && showQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="comic-box p-8 max-w-md bg-white border-comic-red animate-pop">
                        <div className="text-6xl mb-4 text-center">⚠️</div>
                        <h3 className="text-2xl font-black text-center mb-2">Oops! You Left!</h3>
                        <p className="font-bold text-gray-500 mb-6 text-center">
                            Hey! Try to stay focused on the quiz! 🎯
                        </p>
                        <p className="text-comic-red font-black text-center mb-6">
                            Switched tabs: {tabSwitchCount} times
                        </p>
                        <button
                            className="btn-danger w-full"
                            onClick={() => setTabSwitchWarning(false)}
                        >
                            I&apos;m Back! Let&apos;s Go! 💪
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white border-b-[3px] border-comic-ink h-20 px-6 flex items-center shadow-sm">
                <div className="container mx-auto flex items-center justify-between">
                    <Link href={`/course/${courseId}`}>
                        <button className="comic-button bg-white text-sm px-4 py-2 flex items-center gap-2 hover:bg-gray-100">
                            <span>←</span> Back
                        </button>
                    </Link>

                    <div className="hidden md:flex items-center gap-3">
                        <span className="font-black text-gray-400 uppercase tracking-widest text-sm">Now Reading:</span>
                        <span className="font-black text-lg truncate max-w-md">{lesson.title}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {hasVoiceSupport && (
                            <button
                                onClick={() => {
                                    playClick();
                                    if (isSpeaking) {
                                        cancel();
                                    }
                                    setVoiceModeEnabled(!voiceModeEnabled);
                                }}
                                className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-full font-bold border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all
                                    ${voiceModeEnabled
                                        ? 'bg-comic-blue text-white border-black'
                                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'}
                                `}
                                title={voiceModeEnabled ? "Turn Voice Off" : "Turn Voice On"}
                            >
                                <span className="text-lg">{voiceModeEnabled ? '🔊' : '🔇'}</span>
                                <span className="text-xs uppercase tracking-wide hidden sm:inline">
                                    {voiceModeEnabled ? 'Voice On' : 'Voice Off'}
                                </span>
                            </button>
                        )}
                        <div className="comic-badge bg-comic-yellow text-comic-ink">
                            Level {lessonIndex + 1}/{course.lessons.length}
                        </div>
                    </div>
                </div>
            </header>

            <main className={`container mx-auto pt-24 px-4 py-8 pb-32 ${showQuiz && !quizCompleted ? "max-w-6xl xl:max-w-7xl" : "max-w-4xl"}`}>
                {!showQuiz && !quizCompleted ? (
                    // LESSON CONTENT
                    <div className="relative">
                        <div className="absolute -top-4 -left-4 w-12 h-12 bg-comic-blue border-[3px] border-comic-ink rounded-full flex items-center justify-center font-black text-white text-xl z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            📖
                        </div>

                        <div className="comic-box p-8 md:p-12 relative bg-white">
                            <h1 className="text-4xl md:text-5xl font-black mb-8 text-center decoration-wavy decoration-comic-yellow decoration-4 underline-offset-8 underline">
                                {lesson.title}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                                <span className="comic-badge bg-gray-100 text-sm">
                                    🧠 {lesson.contentType || "mixed"}
                                </span>
                                <span className="comic-badge bg-gray-100 text-sm">
                                    🖼️ {lesson.visualAssets?.length || 0} visuals
                                </span>
                            </div>

                            {/* Read Lesson Button */}
                            {voiceModeEnabled && (
                                <div className="flex justify-center mb-8">
                                    <button
                                        onClick={() => {
                                            playClick();
                                            if (isSpeaking) {
                                                cancel();
                                            } else {
                                                // Robust Markdown Cleaning for TTS
                                                const cleanText = lesson.content
                                                    // Remove images completely: ![alt](url)
                                                    .replace(/!\[.*?\]\(.*?\)/g, '')
                                                    // Remove HTML tags if any (e.g. <br>)
                                                    .replace(/<[^>]*>/g, '')
                                                    // Keep link text, remove url: [text](url) -> text
                                                    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
                                                    // Remove heading markers: ### Title -> Title
                                                    .replace(/^#+\s+/gm, '')
                                                    // Remove bold/italic/code markers: * _ `
                                                    .replace(/[*_`]/g, '')
                                                    // Collapse multiple spaces/newlines to single space
                                                    .replace(/\s+/g, ' ')
                                                    .trim();

                                                speak(stripEmojiForSpeech(`${lesson.title}. ${cleanText}`));
                                            }
                                        }}
                                        className={`
                                            flex items-center gap-3 px-6 py-3 rounded-xl border-[3px] border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all
                                            ${isSpeaking ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}
                                        `}
                                    >
                                        <span className="text-2xl">{isSpeaking ? '⏹️' : '🗣️'}</span>
                                        <span>{isSpeaking ? 'Stop Reading' : 'Read Lesson Aloud'}</span>
                                    </button>
                                </div>
                            )}

                            {primaryVideo && (
                                <section className="mb-10">
                                    <div className="comic-box p-4 bg-white">
                                        {getVideoEmbedUrl(primaryVideo.url) ? (
                                            <iframe
                                                src={getVideoEmbedUrl(primaryVideo.url) || undefined}
                                                title={primaryVideo.caption || `${lesson.title} lesson video`}
                                                className="w-full aspect-video rounded-lg border-2 border-black"
                                                loading="lazy"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        ) : (
                                            <a
                                                href={primaryVideo.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block p-4 rounded-lg border-2 border-dashed border-gray-300 font-bold text-comic-blue hover:underline"
                                            >
                                                Open video resource
                                            </a>
                                        )}
                                        {primaryVideo.caption && (
                                            <p className="mt-2 text-sm font-bold text-gray-600">{primaryVideo.caption}</p>
                                        )}
                                    </div>
                                </section>
                            )}

                            {introContent && (
                                <section className="mb-8 rounded-2xl border-4 border-black bg-gradient-to-br from-yellow-50 via-white to-orange-100 p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] md:p-6">
                                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-black bg-comic-yellow px-3 py-1 text-xs font-black uppercase tracking-widest">
                                        Act 1: Kickoff
                                    </div>
                                    <ReactMarkdown components={markdownComponents}>{introContent}</ReactMarkdown>
                                </section>
                            )}

                            {firstGifRow.length > 0 && (
                                <section className="mb-10">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {firstGifRow.map((asset, index) => (
                                            <div key={`${asset.url}_${index}`} className="comic-box p-3 bg-white">
                                                <LessonImage
                                                    src={asset.url}
                                                    alt={asset.altText || asset.caption || `Lesson GIF ${index + 1}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {middleContent && (
                                <section className="mb-8 rounded-2xl border-4 border-black bg-gradient-to-br from-blue-50 via-white to-cyan-100 p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] md:p-6">
                                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-black bg-comic-blue px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
                                        Act 2: Deep Dive
                                    </div>
                                    <ReactMarkdown components={markdownComponents}>{middleContent}</ReactMarkdown>
                                </section>
                            )}

                            {secondGifRow.length > 0 && (
                                <section className="mb-10">
                                    <div className={`grid gap-4 ${secondGifRow.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                                        {secondGifRow.map((asset, index) => (
                                            <div key={`${asset.url}_${index + 2}`} className="comic-box p-3 bg-white">
                                                <LessonImage
                                                    src={asset.url}
                                                    alt={asset.altText || asset.caption || `Lesson GIF ${index + 3}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {!hasGifVisuals && (
                                <section className="mb-10">
                                    <div className="rounded-2xl border-4 border-dashed border-comic-red bg-white p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <p className="text-xs font-black uppercase tracking-widest text-comic-red-dark">
                                            Visual Panel Unavailable
                                        </p>
                                        <p className="mt-3 text-lg font-black text-comic-ink">
                                            No relevant visuals was found for this lesson.
                                        </p>
                                        <p className="mt-2 text-sm font-bold text-gray-600">
                                            Sorry for the inconvenience! We&apos;re on it to make sure every lesson gets its comic flair soon! 🚀
                                        </p>
                                    </div>
                                </section>
                            )}

                            {finalContent && (
                                <section className="rounded-2xl border-4 border-black bg-gradient-to-br from-green-50 via-white to-lime-100 p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] md:p-6">
                                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-black bg-comic-green px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
                                        Act 3: Wrap Up
                                    </div>
                                    <ReactMarkdown components={markdownComponents}>{finalContent}</ReactMarkdown>
                                </section>
                            )}

                            <div className="mt-8 w-full rounded-xl border-[3px] border-black bg-blue-50 p-4">
                                <p className="text-xs font-black uppercase tracking-widest text-blue-700">Adaptive Quiz Mode</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase">
                                        Difficulty: {adaptiveStatus.difficulty}
                                    </span>
                                    <span className="rounded-full border-2 border-black bg-comic-yellow px-3 py-1 text-xs font-black uppercase">
                                        Tier: {adaptiveStatus.learnerTier}
                                    </span>
                                    <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase">
                                        Streak health: {adaptiveStatus.streakHealth}
                                    </span>
                                </div>
                                <p className="mt-3 text-sm font-bold text-blue-900">
                                    {adaptiveStatus.reason}
                                </p>
                                <p className="mt-1 text-xs font-bold text-blue-700">
                                    Do well and the next quizzes get harder. Struggle and difficulty will ease automatically.
                                </p>
                            </div>

                            <div className="mt-12 flex flex-col items-center pt-8 border-t-[3px] border-dashed border-gray-200">
                                <p className="font-black text-gray-400 mb-4 uppercase tracking-widest">Read it all? Prove it!</p>
                                <button
                                    onClick={() => {
                                        playClick();
                                        setShowQuiz(true);
                                    }}
                                    className="relative group bg-comic-green hover:bg-green-500 text-white text-xl font-black px-8 py-4 rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center gap-3">
                                        <span className="text-2xl group-hover:animate-bounce">🎮</span>
                                        <span className="uppercase tracking-wide">Start The Quiz!</span>
                                    </span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 transform skew-y-12"></div>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : quizCompleted ? (
                    // QUIZ RESULTS
                    <div className="comic-box p-12 text-center bg-white border-comic-yellow animate-pop">
                        <div className="text-8xl mb-6 animate-bounce">
                            {scorePercent >= 80 ? "🏆" : scorePercent >= 50 ? "⭐" : "💪"}
                        </div>

                        <h2 className="text-5xl font-black mb-4">
                            {scorePercent >= 80 ? "INCREDIBLE!" : scorePercent >= 50 ? "NICE WORK!" : "NICE TRY!"}
                        </h2>

                        <div className="inline-block bg-comic-ink text-white px-6 py-2 rounded-lg font-black text-4xl mb-6 -rotate-2">
                            {scorePercent}%
                        </div>

                        <p className="text-xl font-bold text-gray-500 mb-10">
                            You got <span className="text-comic-ink border-b-4 border-comic-yellow">{quizScore}</span> out of {lesson.quiz.length} right!
                        </p>

                        <div className="mx-auto mb-8 max-w-2xl rounded-xl border-[3px] border-black bg-green-50 p-4 text-left">
                            <p className="text-xs font-black uppercase tracking-widest text-green-700">Adaptive update</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase">
                                    Difficulty: {adaptiveStatus.difficulty}
                                </span>
                                <span className="rounded-full border-2 border-black bg-comic-yellow px-3 py-1 text-xs font-black uppercase">
                                    Tier: {adaptiveStatus.learnerTier}
                                </span>
                                <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase">
                                    Tier score: {adaptiveStatus.tierScore}
                                </span>
                            </div>
                            <p className="mt-3 text-sm font-bold text-green-900">
                                {difficultyChangeHint || adaptiveStatus.reason}
                            </p>
                        </div>

                        <div className="flex justify-center gap-4">
                            {lessonIndex < course.lessons.length - 1 ? (
                                <button
                                    onClick={handleNextLesson}
                                    className="btn-primary text-xl px-10 py-4"
                                >
                                    🚀 Next Level
                                </button>
                            ) : (
                                <button
                                    onClick={() => router.push(`/course/${courseId}`)}
                                    className="btn-secondary text-xl px-10 py-4"
                                >
                                    🏠 Mission Complete
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    // QUIZ INTERFACE
                    <div className="comic-box relative w-full bg-white p-4 md:p-6">
                        <div className="mb-4 text-center lg:text-left">
                            <span className="inline-block rounded-full border-2 border-black bg-comic-yellow px-4 py-1 text-sm font-black uppercase tracking-widest text-comic-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                Quiz Time
                            </span>
                        </div>
                        <div className="lg:grid lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.65fr)] lg:gap-6">
                            <aside className="mb-4 rounded-xl border-2 border-black/20 bg-gradient-to-b from-yellow-50 to-white p-4 lg:mb-0 lg:flex lg:flex-col lg:gap-4">
                                <div className="text-center">
                                    <div className="mb-3 inline-block rounded-full bg-black px-3 py-1 text-xs font-black text-white md:text-sm">
                                        QUESTION {currentQuestionIndex + 1} OF {lesson.quiz.length}
                                    </div>
                                    <h2 className="text-xl font-black leading-snug md:text-2xl">
                                        {lesson.quiz[currentQuestionIndex].question}
                                    </h2>
                                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                                        <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase md:text-[11px]">
                                            Difficulty: {adaptiveStatus.difficulty}
                                        </span>
                                        <span className="rounded-full border-2 border-black bg-comic-yellow px-3 py-1 text-[10px] font-black uppercase md:text-[11px]">
                                            Tier: {adaptiveStatus.learnerTier}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 h-3 overflow-hidden rounded-full border-2 border-comic-ink bg-gray-100">
                                    <div
                                        className="h-full bg-comic-yellow"
                                        style={{ width: `${((currentQuestionIndex + 1) / lesson.quiz.length) * 100}%` }}
                                    />
                                </div>

                                {showResult && (
                                    <div className="mt-4 animate-fade-in rounded-xl border-[3px] border-comic-blue bg-blue-50 p-4 text-left lg:mt-0">
                                        <p className="mb-1 text-xs font-black uppercase tracking-wider text-blue-900">
                                            Did you know? {"\u{1F4A1}"}
                                        </p>
                                        <p className="text-sm font-bold leading-relaxed text-blue-900 md:text-base">
                                            {lesson.quiz[currentQuestionIndex].explanation}
                                        </p>
                                    </div>
                                )}
                            </aside>

                            <section className="flex min-h-0 flex-col">
                                <div className="grid gap-3 md:grid-cols-2 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                                    {lesson.quiz[currentQuestionIndex].options.map((option, i) => {
                                        const isCorrect = i === lesson.quiz[currentQuestionIndex].correctAnswer;
                                        const isSelected = selectedAnswer === i;

                                        const baseStyle = "transform transition-all duration-200 border-4 rounded-2xl p-4 text-left flex items-start justify-between text-base md:text-lg font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";
                                        let colorStyle = "bg-white border-black text-gray-700 hover:bg-gray-50";

                                        if (isSelected) {
                                            colorStyle = "bg-comic-blue text-white border-black ring-2 ring-blue-200/60 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]";
                                        }

                                        if (showResult) {
                                            if (isCorrect) colorStyle = "bg-comic-green text-white border-black ring-2 ring-green-200/60";
                                            else if (isSelected) colorStyle = "bg-comic-red text-white border-black ring-2 ring-red-200/60 opacity-90";
                                            else colorStyle = "bg-gray-100 text-gray-400 border-gray-300 shadow-none opacity-60";
                                        }

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    handleAnswerSelect(i);
                                                    playClick();
                                                }}
                                                disabled={showResult}
                                                className={`${baseStyle} ${colorStyle}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`
                                                        mt-0.5 h-8 w-8 shrink-0 rounded-full border-2 text-base font-black
                                                        flex items-center justify-center
                                                        ${isSelected || (showResult && isCorrect) ? "bg-white text-black border-transparent" : "bg-gray-100 text-gray-500 border-gray-300"}
                                                    `}>
                                                        {String.fromCharCode(65 + i)}
                                                    </div>
                                                    <span className="leading-snug">{option}</span>
                                                </div>

                                                {showResult && isCorrect && <span className="text-xl">{"\u{2705}"}</span>}
                                                {showResult && isSelected && !isCorrect && <span className="text-xl">{"\u{274C}"}</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="pt-4">
                                    {!showResult ? (
                                        <button
                                            onClick={() => {
                                                if (selectedAnswer !== null) {
                                                    const isCorrect = selectedAnswer === lesson.quiz[currentQuestionIndex].correctAnswer;
                                                    if (isCorrect) playCorrect();
                                                    else playWrong();
                                                    handleSubmitAnswer();
                                                }
                                            }}
                                            disabled={selectedAnswer === null}
                                            className="btn-primary group w-full py-3 text-lg disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <span>Lock In Answer</span>
                                            <span className="transition-transform group-hover:rotate-12">{"\u{1F512}"}</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                playClick();
                                                handleNextQuestion();
                                            }}
                                            className="w-full rounded-xl border-[3px] border-black bg-comic-green py-3 text-lg font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:bg-comic-green-dark hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        >
                                            {currentQuestionIndex < lesson.quiz.length - 1 ? (
                                                <>Next Question {"\u27A1\uFE0F"}</>
                                            ) : (
                                                <>See Results {"\u{1F680}"}</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </section>

                        </div>
                    </div>
                )}
            </main>

            {/* AI Tutor Floating Button */}
            <div className="fixed bottom-6 right-6 z-50">
                {!showTutor && (
                    <button
                        onClick={() => setShowTutor(true)}
                        className="w-16 h-16 bg-comic-yellow border-[3px] border-comic-ink rounded-full flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-110 transition-transform animate-bounce"
                    >
                        🦉
                    </button>
                )}

                {showTutor && (
                    <div className="w-80 md:w-96 bg-white border-[3px] border-comic-ink rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col animate-pop">
                        {/* Tutor Header */}
                        <div className="bg-comic-yellow p-4 border-b-[3px] border-comic-ink flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🦉</span>
                                <div className="leading-tight">
                                    <h3 className="font-black text-comic-ink">Ollie</h3>
                                    <p className="text-xs font-bold text-black/60">AI Tutor</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTutor(false)} className="text-2xl font-black hover:opacity-50">×</button>
                        </div>

                        {/* Chat Area */}
                        <div className="h-64 overflow-y-auto p-4 bg-white space-y-4">
                            {tutorMessages.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="font-bold text-gray-400">
                                        Stuck? Confused? <br /> Ask me anything!
                                    </p>
                                </div>
                            )}

                            {tutorMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`
                                        max-w-[85%] p-3 rounded-xl font-bold text-sm border-2
                                        ${msg.role === 'user'
                                            ? 'bg-comic-blue text-white border-comic-blue rounded-tr-none'
                                            : 'bg-gray-100 text-comic-ink border-gray-200 rounded-tl-none'}
                                    `}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {tutorLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 p-3 rounded-xl rounded-tl-none border-2 border-gray-200">
                                        <Loader2 className="animate-spin w-4 h-4" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-gray-50 border-t-[3px] border-comic-ink flex gap-2">
                            <input
                                className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 font-bold text-sm focus:outline-none focus:border-comic-blue"
                                placeholder="Type a question..."
                                value={tutorInput}
                                onChange={(e) => setTutorInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAskTutor()}
                            />
                            <button
                                onClick={handleAskTutor}
                                disabled={tutorLoading}
                                className="bg-comic-blue text-white p-2 rounded-lg border-2 border-comic-blue hover:bg-comic-blue-dark transition-colors"
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}







