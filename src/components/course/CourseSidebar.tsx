"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { StructuredCourse } from "@/lib/structuredCourse";

interface CourseSidebarProps {
    course: StructuredCourse;
    activeLessonId: string;
    completedLessonIds: string[];
    lockedModuleIds: string[];
    passedModuleIds: string[];
    revisionModuleIds: string[];
    onSelectLesson: (lessonId: string) => void;
}

const MODULE_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
    passed: {
        bg: "bg-gradient-to-br from-[#e6faea] to-[#d1f7dc]",
        border: "border-comic-green-dark",
        accent: "text-comic-green-dark",
    },
    review: {
        bg: "bg-gradient-to-br from-[#fff7d6] to-[#fff0b8]",
        border: "border-comic-yellow-dark",
        accent: "text-amber-700",
    },
    active: {
        bg: "bg-gradient-to-br from-[#e9f5ff] to-[#d1ebff]",
        border: "border-comic-blue",
        accent: "text-comic-blue-dark",
    },
    locked: {
        bg: "bg-slate-100",
        border: "border-slate-300",
        accent: "text-slate-400",
    },
};

const STATUS_ICONS: Record<string, string> = {
    passed: "✅",
    review: "🔄",
    active: "📖",
    locked: "🔒",
};

export default function CourseSidebar({
    course,
    activeLessonId,
    completedLessonIds,
    lockedModuleIds,
    passedModuleIds,
    revisionModuleIds,
    onSelectLesson,
}: CourseSidebarProps) {
    const completedSet = new Set(completedLessonIds);
    const lockedModuleSet = new Set(lockedModuleIds);
    const passedModuleSet = new Set(passedModuleIds);
    const revisionModuleSet = new Set(revisionModuleIds);
    const totalLessons = course.modules.reduce((count, m) => count + m.lessons.length, 0);
    const completedCount = completedLessonIds.length;
    const courseProgress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    // Find which module the active lesson belongs to
    const activeModuleIndex = course.modules.findIndex((m) =>
        m.lessons.some((l) => l.id === activeLessonId)
    );

    // Open the active module by default
    const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>(() => {
        const initial: Record<number, boolean> = {};
        if (activeModuleIndex >= 0) initial[activeModuleIndex] = true;
        return initial;
    });

    function toggleModule(index: number) {
        setExpandedModules((prev) => ({ ...prev, [index]: !prev[index] }));
    }

    function getModuleStatus(moduleId: string): "locked" | "passed" | "review" | "active" {
        if (lockedModuleSet.has(moduleId)) return "locked";
        if (passedModuleSet.has(moduleId)) return "passed";
        if (revisionModuleSet.has(moduleId)) return "review";
        return "active";
    }

    return (
        <aside className="space-y-4 xl:sticky xl:top-6">
            {/* Course title + progress */}
            <section className="quest-surface overflow-hidden p-5">
                <p className="quest-section-label">Mission chapters</p>
                <h2 className="mt-3 text-xl font-black leading-tight text-comic-ink [overflow-wrap:anywhere]">
                    {course.courseTitle}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                    <span className="quest-chip bg-comic-yellow/30">{course.difficulty}</span>
                    <span className="quest-chip bg-comic-blue/20">{course.duration}</span>
                    <span className="quest-chip bg-white">{course.modules.length} modules</span>
                </div>

                <div className="mt-4 rounded-[1.2rem] border-[3px] border-black bg-gradient-to-r from-[#fff8ef] to-[#fff3dc] p-3 shadow-[3px_3px_0px_0px_#000]">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Progress</p>
                        <p className="text-sm font-black text-comic-ink">{courseProgress}%</p>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-black bg-white">
                        <div
                            className="h-full rounded-full bg-comic-blue progress-stripes"
                            style={{ width: `${Math.max(courseProgress, completedCount > 0 ? 8 : 0)}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-600">
                        {completedCount}/{totalLessons} lessons
                    </p>
                </div>
            </section>

            {/* Module list — all visible, expandable lessons */}
            <div className="quest-surface p-3 space-y-2">
                {course.modules.map((courseModule, moduleIndex) => {
                    const status = getModuleStatus(courseModule.id);
                    const colors = MODULE_COLORS[status];
                    const completedLessons = courseModule.lessons.filter((lesson) => completedSet.has(lesson.id)).length;
                    const isExpanded = expandedModules[moduleIndex] ?? false;
                    const isLocked = status === "locked";
                    const hasActiveLesson = courseModule.lessons.some((l) => l.id === activeLessonId);

                    return (
                        <div key={courseModule.id}>
                            {/* Module header — always visible, clickable to expand */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (isLocked) {
                                        toast.error("Finish the current module assessment to unlock this module.");
                                        return;
                                    }
                                    toggleModule(moduleIndex);
                                }}
                                className={`w-full rounded-[1.2rem] border-[3px] ${colors.border} ${colors.bg} p-3 text-left transition-all shadow-[3px_3px_0px_0px_#000] ${
                                    isLocked ? "cursor-not-allowed opacity-70" : "hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000]"
                                } ${hasActiveLesson ? "ring-2 ring-comic-blue ring-offset-1" : ""}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-[2px] border-black bg-white text-sm shadow-[2px_2px_0px_0px_#000]">
                                        {STATUS_ICONS[status]}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                                Module {moduleIndex + 1}
                                            </p>
                                            <span className={`text-[10px] font-black uppercase tracking-[0.14em] ${colors.accent}`}>
                                                {completedLessons}/{courseModule.lessons.length}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-sm font-black leading-5 text-comic-ink [overflow-wrap:anywhere]">
                                            {courseModule.title}
                                        </p>
                                    </div>
                                    {!isLocked && (
                                        <span className={`text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                                            ▼
                                        </span>
                                    )}
                                </div>

                                {/* Mini progress bar */}
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full border border-black/20 bg-white/60">
                                    <div
                                        className="h-full rounded-full bg-comic-blue"
                                        style={{ width: `${courseModule.lessons.length > 0 ? (completedLessons / courseModule.lessons.length) * 100 : 0}%` }}
                                    />
                                </div>
                            </button>

                            {/* Lesson list — expandable */}
                            {isExpanded && !isLocked && (
                                <div className="mt-1.5 space-y-1 pl-4 animate-fade-in">
                                    {courseModule.lessons.map((lesson, lessonIndex) => {
                                        const isActive = lesson.id === activeLessonId;
                                        const isCompleted = completedSet.has(lesson.id);

                                        return (
                                            <button
                                                key={lesson.id}
                                                type="button"
                                                onClick={() => onSelectLesson(lesson.id)}
                                                className={`flex w-full items-center gap-2.5 rounded-xl border-[2px] px-3 py-2 text-left transition-all ${
                                                    isActive
                                                        ? "border-comic-blue bg-comic-blue/10 shadow-[2px_2px_0px_0px_#000]"
                                                        : isCompleted
                                                            ? "border-comic-green bg-comic-green/10 hover:bg-comic-green/20"
                                                            : "border-slate-200 bg-white hover:border-black hover:shadow-[2px_2px_0px_0px_#000]"
                                                }`}
                                            >
                                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[2px] border-black text-[10px] font-black ${
                                                    isCompleted
                                                        ? "bg-comic-green text-white"
                                                        : isActive
                                                            ? "bg-comic-blue text-white"
                                                            : "bg-white text-comic-ink"
                                                }`}>
                                                    {isCompleted ? "✓" : lessonIndex + 1}
                                                </span>
                                                <p className={`text-xs font-bold leading-4 [overflow-wrap:anywhere] ${
                                                    isActive ? "text-comic-blue-dark" : isCompleted ? "text-comic-green-dark" : "text-slate-700"
                                                }`}>
                                                    {lesson.title}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
