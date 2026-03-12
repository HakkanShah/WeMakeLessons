"use client";

import type { StructuredAssessmentQuestion } from "@/lib/structuredCourse";

export interface AssessmentState {
    answers: Record<string, string>;
    score: number | null;
    passed: boolean;
    submittedAt: string | null;
}

interface AssessmentPanelProps {
    badge: string;
    title: string;
    description: string;
    questions: StructuredAssessmentQuestion[];
    passingScore: number;
    state: AssessmentState;
    submitting?: boolean;
    onSelectAnswer: (questionId: string, answer: string) => void;
    onSubmit: () => void;
    submitLabel: string;
}

export default function AssessmentPanel({
    badge,
    title,
    description,
    questions,
    passingScore,
    state,
    submitting = false,
    onSelectAnswer,
    onSubmit,
    submitLabel,
}: AssessmentPanelProps) {
    const answeredCount = questions.filter((question) => Boolean(state.answers[question.id])).length;
    const isSubmitted = state.score !== null;

    return (
        <section className="comic-box p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-800">{badge}</p>
                    <h3 className="mt-2 text-3xl font-black leading-tight text-comic-ink">{title}</h3>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-800">{description}</p>
                </div>
                <div className="rounded-2xl panel-border-sm bg-slate-50 px-4 py-3 text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-800">Passing score</p>
                    <p className="mt-1 text-2xl font-black text-comic-ink">{passingScore}/{questions.length}</p>
                </div>
            </div>

            <div className="mt-5 rounded-2xl panel-border-sm bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 text-sm font-black uppercase tracking-[0.16em] text-slate-800">
                    <span>{answeredCount}/{questions.length} answered</span>
                    {isSubmitted && state.score !== null && (
                        <span>{state.score}/{questions.length} scored</span>
                    )}
                </div>
            </div>

            <div className="mt-6 space-y-5">
                {questions.map((question, questionIndex) => {
                    const selectedAnswer = state.answers[question.id] || "";
                    const hasSelection = Boolean(selectedAnswer);
                    const isCorrect = selectedAnswer === question.answer;

                    return (
                        <article
                            key={question.id}
                            className="rounded-3xl panel-border-sm bg-slate-50 p-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                                    {questionIndex + 1}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-lg font-black leading-tight text-comic-ink">{question.question}</h4>
                                    <div className="mt-4 grid gap-3">
                                        {question.options.map((option) => {
                                            const isChosen = selectedAnswer === option;
                                            const isRightOption = question.answer === option;
                                            const baseClass = !isSubmitted
                                                ? isChosen
                                                    ? "border-sky-500 bg-sky-50"
                                                    : "comic-box hover:bg-comic-paper hover:translate-x-1 hover:-translate-y-1 transition-transform"
                                                : isChosen
                                                    ? isCorrect
                                                        ? "border-[3px] border-black bg-comic-green ring-[3px] ring-black shadow-comic text-white"
                                                        : "border-[3px] border-black bg-comic-red-dark ring-[3px] ring-black shadow-comic text-white"
                                                    : isRightOption
                                                        ? "border-[3px] border-black bg-comic-green ring-[3px] ring-black shadow-comic text-white"
                                                        : "border-slate-200 bg-white";

                                            return (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    onClick={() => onSelectAnswer(question.id, option)}
                                                    disabled={isSubmitted || submitting}
                                                    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${baseClass} ${isSubmitted ? "cursor-default" : ""}`}
                                                >
                                                    {option}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {isSubmitted && hasSelection && (
                                        <div className={`mt-4 rounded-2xl border p-4 ${isCorrect ? "border-[3px] border-black bg-comic-green ring-[3px] ring-black shadow-comic text-white" : "border-[3px] border-black bg-comic-red-dark ring-[3px] ring-black shadow-comic text-white"}`}>
                                            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-800">
                                                {isCorrect ? "Correct" : "Review This"}
                                            </p>
                                            <p className="mt-2 text-sm leading-7 text-slate-800">{question.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={onSubmit}
                disabled={submitting || answeredCount !== questions.length}
                className="mt-6 btn-primary w-full"
            >
                {submitting ? "Checking..." : submitLabel}
            </button>
            {answeredCount !== questions.length && (
                <p className="mt-3 text-sm leading-6 text-slate-800">
                    Answer every question before you submit this assessment.
                </p>
            )}
        </section>
    );
}
