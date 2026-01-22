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

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

interface Lesson {
    id: string;
    title: string;
    content: string;
    duration: number;
    quiz: QuizQuestion[];
}

interface Course {
    title: string;
    lessons: Lesson[];
}

// Custom Image Component with Fallback Strategy
const LessonImage = ({ src, alt, ...props }: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>) => {
    const [imgSrc, setImgSrc] = useState(src);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        setImgSrc(src);
        setAttempt(0);
    }, [src]);

    const handleError = () => {
        if (attempt === 0 && alt) {
            // First fallback: Try Unsplash (User Request)
            // Note: source.unsplash.com is deprecated but often requested. 
            // We follow up with a safety net if this fails.
            setAttempt(1);
            setImgSrc(`https://source.unsplash.com/800x400/?${encodeURIComponent(alt)}`);
        } else if (attempt === 1 && alt) {
            // Second fallback: Placehold.co (Reliable safety net)
            setAttempt(2);
            setImgSrc(`https://placehold.co/800x400/FFD43B/000000?text=${encodeURIComponent(alt)}`);
        }
    };

    return (
        <div className="my-8 transform rotate-1 hover:rotate-0 transition-transform duration-300">
            <div className="bg-white p-2 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    {...props}
                    src={imgSrc}
                    alt={alt || "Lesson Image"}
                    onError={handleError}
                    className="w-full h-auto rounded-lg border-2 border-gray-100 min-h-[200px] bg-gray-50 object-cover"
                />
                {alt && (
                    <p className="text-center font-black text-sm uppercase tracking-widest mt-2 text-gray-400">
                        {alt}
                    </p>
                )}
            </div>
        </div>
    );
};

export default function LessonPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const courseId = params.id as string;
    const lessonId = params.lessonId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [lessonIndex, setLessonIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // Quiz state
    const [showQuiz, setShowQuiz] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [quizScore, setQuizScore] = useState(0);
    const [quizCompleted, setQuizCompleted] = useState(false);

    // AI Tutor state
    const [showTutor, setShowTutor] = useState(false);
    const [tutorMessages, setTutorMessages] = useState<
        { role: "user" | "assistant"; content: string }[]
    >([]);
    const [tutorInput, setTutorInput] = useState("");
    const [tutorLoading, setTutorLoading] = useState(false);

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
            } catch (error) {
                console.error("Error fetching lesson:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [courseId, lessonId]);

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
        } else {
            setQuizCompleted(true);

            if (user) {
                const progressRef = doc(
                    db,
                    "course_progress",
                    `${user.uid}_${courseId}`
                );
                const currentQ = lesson.quiz[currentQuestionIndex];
                const finalScore = quizScore + (selectedAnswer === currentQ.correctAnswer ? 1 : 0);
                const score = Math.round((finalScore / lesson.quiz.length) * 100);

                await setDoc(progressRef, {
                    userId: user.uid,
                    courseId: courseId,
                    completedLessons: arrayUnion(lessonId),
                    [`quizScores.${lessonId}`]: score,
                    lastAccessedAt: serverTimestamp(),
                }, { merge: true });

                const userRef = doc(db, "users", user.uid);
                const xpEarned = 10 + Math.floor(score / 10);
                await updateDoc(userRef, {
                    "stats.xp": increment(xpEarned),
                    "stats.lastActive": serverTimestamp(),
                });
            }
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
        } catch (error) {
            setTutorMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Oops! Let me try again... 🙈" },
            ]);
        } finally {
            setTutorLoading(false);
        }
    };

    const handleNextLesson = () => {
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
                            I'm Back! Let's Go! 💪
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

                    <div className="comic-badge bg-comic-yellow text-comic-ink">
                        Level {lessonIndex + 1}/{course.lessons.length}
                    </div>
                </div>
            </header>

            <main className="container mx-auto max-w-4xl pt-24 px-4 py-8 pb-32">
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

                            <div className="space-y-6">
                                <ReactMarkdown
                                    components={{
                                        img: LessonImage,
                                        h1: ({ node, ...props }) => (
                                            <h1 className="text-4xl md:text-5xl font-black mb-6 text-black decoration-wavy decoration-comic-yellow decoration-4 underline underline-offset-8">
                                                {props.children}
                                            </h1>
                                        ),
                                        h2: ({ node, ...props }) => (
                                            <h2 className="text-3xl font-black mb-4 mt-8 flex items-center gap-3">
                                                <span className="text-comic-blue">#</span>
                                                <span className="text-black">{props.children}</span>
                                            </h2>
                                        ),
                                        h3: ({ node, ...props }) => (
                                            <h3 className="text-2xl font-black mb-3 mt-6 text-gray-800">
                                                {props.children}
                                            </h3>
                                        ),
                                        p: ({ node, ...props }) => (
                                            <p className="text-lg md:text-xl font-bold text-gray-600 leading-relaxed mb-4">
                                                {props.children}
                                            </p>
                                        ),
                                        ul: ({ node, ...props }) => (
                                            <ul className="space-y-3 my-6 pl-4">
                                                {props.children}
                                            </ul>
                                        ),
                                        li: ({ node, ...props }) => (
                                            <li className="flex items-start gap-3 font-bold text-gray-700 text-lg">
                                                <span className="text-comic-green text-xl mt-1">✓</span>
                                                <span>{props.children}</span>
                                            </li>
                                        ),
                                        blockquote: ({ node, ...props }) => (
                                            <div className="bg-comic-yellow/20 border-l-8 border-comic-yellow p-6 my-8 rounded-r-xl italic relative">
                                                <span className="absolute -top-4 -left-3 text-4xl">💡</span>
                                                <div className="text-xl font-bold text-gray-800 pl-4">
                                                    {props.children}
                                                </div>
                                            </div>
                                        ),
                                        strong: ({ node, ...props }) => (
                                            <strong className="text-comic-blue font-black">
                                                {props.children}
                                            </strong>
                                        ),
                                    }}
                                >
                                    {lesson.content}
                                </ReactMarkdown>
                            </div>

                            <div className="mt-12 text-center pt-8 border-t-[3px] border-dashed border-gray-200">
                                <p className="font-black text-gray-400 mb-4 uppercase tracking-widest">Read it all? Prove it!</p>
                                <button
                                    onClick={() => setShowQuiz(true)}
                                    className="btn-success text-2xl px-12 py-6 transform hover:scale-105 transition-transform"
                                >
                                    🎮 Start The Quiz!
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
                    <div className="comic-box p-8 md:p-12 relative bg-white">
                        <div className="text-center mb-8">
                            <div className="inline-block px-4 py-1 bg-black text-white font-black rounded-full text-sm mb-4">
                                QUESTION {currentQuestionIndex + 1} OF {lesson.quiz.length}
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black">
                                {lesson.quiz[currentQuestionIndex].question}
                            </h2>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-4 bg-gray-100 rounded-full border-2 border-comic-ink mb-8 overflow-hidden">
                            <div
                                className="h-full bg-comic-yellow"
                                style={{ width: `${((currentQuestionIndex + 1) / lesson.quiz.length) * 100}%` }}
                            />
                        </div>

                        <div className="grid gap-4 mb-8">
                            {lesson.quiz[currentQuestionIndex].options.map((option, i) => {
                                const isCorrect = i === lesson.quiz[currentQuestionIndex].correctAnswer;
                                const isSelected = selectedAnswer === i;

                                let btnClass = "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"; // Default

                                if (isSelected) {
                                    btnClass = "bg-comic-blue text-white border-comic-blue transform scale-[1.02]";
                                }

                                if (showResult) {
                                    if (isCorrect) btnClass = "bg-comic-green text-white border-comic-green";
                                    else if (isSelected) btnClass = "bg-comic-red text-white border-comic-red";
                                    else btnClass = "opacity-50 bg-gray-100 border-gray-200";
                                }

                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleAnswerSelect(i)}
                                        disabled={showResult}
                                        className={`
                                            w-full text-left p-4 rounded-xl font-bold border-[3px] transition-all text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]
                                            ${btnClass}
                                        `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{option}</span>
                                            {showResult && isCorrect && <span>✅</span>}
                                            {showResult && isSelected && !isCorrect && <span>❌</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {showResult && (
                            <div className="mb-8 bg-blue-50 border-2 border-blue-200 p-4 rounded-xl text-blue-900 font-bold">
                                <span className="mr-2">💡</span>
                                {lesson.quiz[currentQuestionIndex].explanation}
                            </div>
                        )}

                        <div className="text-center">
                            {!showResult ? (
                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={selectedAnswer === null}
                                    className="btn-primary w-full md:w-auto min-w-[200px] text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Lock Answer 🔒
                                </button>
                            ) : (
                                <button
                                    onClick={handleNextQuestion}
                                    className="btn-success w-full md:w-auto min-w-[200px] text-xl"
                                >
                                    {currentQuestionIndex < lesson.quiz.length - 1 ? "Next Question ➡️" : "Show Results 🏆"}
                                </button>
                            )}
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
