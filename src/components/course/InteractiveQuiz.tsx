"use client";

import type { StructuredCourseQuiz } from "@/lib/structuredCourse";

interface InteractiveQuizProps {
    quiz: StructuredCourseQuiz;
    selectedAnswer: string | null;
    onSelectAnswer: (answer: string) => void;
}

const OPTION_COLORS = [
    { bg: "bg-comic-blue/10", border: "border-comic-blue", hoverBg: "hover:bg-comic-blue/20", letter: "bg-comic-blue text-white" },
    { bg: "bg-comic-yellow/15", border: "border-comic-yellow-dark", hoverBg: "hover:bg-comic-yellow/25", letter: "bg-comic-yellow text-black" },
    { bg: "bg-comic-green/10", border: "border-comic-green", hoverBg: "hover:bg-comic-green/20", letter: "bg-comic-green text-white" },
    { bg: "bg-comic-purple/10", border: "border-comic-purple", hoverBg: "hover:bg-comic-purple/20", letter: "bg-comic-purple text-white" },
] as const;

export default function InteractiveQuiz({
    quiz,
    selectedAnswer,
    onSelectAnswer,
}: InteractiveQuizProps) {
    const hasAnswered = Boolean(selectedAnswer);
    const isCorrect = selectedAnswer === quiz.answer;

    return (
        <section className="quest-canvas overflow-hidden">
            {/* Header with comic feel */}
            <div className="relative border-b-[3px] border-black bg-gradient-to-r from-comic-yellow/30 via-comic-blue/10 to-comic-purple/20 px-6 py-5">
                <div className="absolute -top-1 left-6">
                    <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-black bg-comic-yellow px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0px_0px_#000]">
                        🧠 Quiz Time
                    </span>
                </div>
                <div className="mt-5">
                    <h3 className="text-2xl font-black leading-tight text-comic-ink md:text-3xl">
                        {quiz.question}
                    </h3>
                    <p className="mt-2 text-sm font-bold text-slate-500">
                        Pick the right answer below
                    </p>
                </div>
            </div>

            {/* Options grid */}
            <div className="grid gap-3 p-5 md:grid-cols-2">
                {quiz.options.map((option, optionIndex) => {
                    const isPicked = selectedAnswer === option;
                    const isRightOption = quiz.answer === option;
                    const color = OPTION_COLORS[optionIndex % OPTION_COLORS.length];

                    const stateClass = isPicked
                        ? isCorrect
                            ? "border-[3px] border-black bg-comic-green text-white shadow-[4px_4px_0px_0px_#000] scale-[1.02]"
                            : "border-[3px] border-black bg-comic-red text-white shadow-[4px_4px_0px_0px_#000] scale-[0.98]"
                        : hasAnswered && isRightOption
                            ? "border-[3px] border-black bg-comic-green text-white shadow-[4px_4px_0px_0px_#000]"
                            : hasAnswered
                                ? "border-[3px] border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                                : `border-[3px] ${color.border} ${color.bg} ${color.hoverBg} hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_#000] cursor-pointer`;

                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => { if (!hasAnswered) onSelectAnswer(option); }}
                            disabled={hasAnswered}
                            className={`group relative rounded-2xl px-5 py-5 text-left font-bold transition-all duration-200 shadow-[3px_3px_0px_0px_#000] ${stateClass}`}
                        >
                            <div className="flex items-start gap-4">
                                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[3px] border-black text-sm font-black shadow-[2px_2px_0px_0px_#000] ${
                                    isPicked || (hasAnswered && isRightOption) ? "bg-white text-comic-ink" : color.letter
                                }`}>
                                    {isPicked
                                        ? isCorrect ? "✓" : "✗"
                                        : hasAnswered && isRightOption
                                            ? "✓"
                                            : String.fromCharCode(65 + optionIndex)}
                                </span>
                                <span className="block pt-1.5 text-base leading-6">
                                    {option}
                                </span>
                            </div>

                            {/* Selected indicator */}
                            {isPicked && (
                                <div className="absolute -right-1 -top-1">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-[2px] border-black bg-white text-sm shadow-[2px_2px_0px_0px_#000]">
                                        {isCorrect ? "🎉" : "💥"}
                                    </span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Result feedback */}
            {hasAnswered && (
                <div className="border-t-[3px] border-black px-6 py-5">
                    <div
                        className={`rounded-2xl border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_#000] animate-pop ${
                            isCorrect
                                ? "bg-gradient-to-r from-comic-green to-comic-green-dark text-white"
                                : "bg-gradient-to-r from-comic-red to-comic-red-dark text-white"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{isCorrect ? "🏆" : "📖"}</span>
                            <div>
                                <p className="text-sm font-black uppercase tracking-[0.16em]">
                                    {isCorrect ? "Correct! Great work!" : "Not quite — review this"}
                                </p>
                                <p className="mt-1 text-base font-medium leading-6 opacity-90">
                                    {quiz.explanation}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
