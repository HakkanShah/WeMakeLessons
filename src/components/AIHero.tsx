"use client";

import Link from "next/link";

export default function AIHero() {
    return (
        <div className="relative overflow-hidden comic-box p-6 md:p-8 bg-gradient-to-r from-comic-blue via-blue-600 to-purple-600 text-white mb-8">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-4 right-10 text-6xl opacity-20 animate-float-slow">✨</div>
                <div className="absolute bottom-4 right-20 text-4xl opacity-20 animate-float-slow" style={{ animationDelay: '1s' }}>🚀</div>
                <div className="absolute top-10 right-40 text-5xl opacity-20 animate-float-slow" style={{ animationDelay: '2s' }}>🤖</div>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                {/* Icon */}
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl border-2 border-white/30 flex items-center justify-center text-5xl shadow-xl">
                    🤖
                </div>

                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                    <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                        ✨ Powered by AI
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black mb-2">
                        AI Course Generator
                    </h2>
                    <p className="text-white/90 font-bold text-lg mb-4 max-w-xl">
                        Type <span className="text-comic-yellow">ANY topic</span> → Get a complete course with lessons, quizzes & XP rewards in seconds!
                    </p>

                    {/* Quick examples */}
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-sm font-bold">🐍 Python</span>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-sm font-bold">🌍 History</span>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-sm font-bold">🧮 Math</span>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-sm font-bold">🔬 Science</span>
                    </div>
                </div>

                {/* CTA Button */}
                <Link href="/generate">
                    <button className="bg-comic-yellow text-comic-ink border-[3px] border-comic-ink px-8 py-4 rounded-xl font-black text-lg uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] hover:scale-105 transition-all flex items-center gap-3">
                        <span>✨</span>
                        Create Course
                        <span>→</span>
                    </button>
                </Link>
            </div>

            {/* Stats bar */}
            <div className="relative z-10 flex justify-center md:justify-start gap-6 mt-6 pt-4 border-t border-white/20">
                <div className="text-center">
                    <p className="text-2xl font-black">∞</p>
                    <p className="text-xs font-bold opacity-70">Topics</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-black">5-7</p>
                    <p className="text-xs font-bold opacity-70">Lessons/Course</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-black">~3</p>
                    <p className="text-xs font-bold opacity-70">Quiz per Lesson</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-black">~150</p>
                    <p className="text-xs font-bold opacity-70">XP to Earn</p>
                </div>
            </div>
        </div>
    );
}
