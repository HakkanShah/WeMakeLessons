export default function FeatureGrid() {
    return (
        <section className="py-16 md:py-24 container mx-auto px-4 md:px-6">
            <div className="text-center mb-12 md:mb-16">
                <span className="bg-comic-blue text-white px-4 py-2 rounded-full font-black uppercase text-xs md:text-sm border-2 border-black mb-4 inline-block">
                    Why WeMakeLessons?
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-black text-outline">
                    More Than Just a Course
                </h2>
                <p className="text-base md:text-xl font-bold text-gray-500 mt-4 max-w-2xl mx-auto px-2">
                    We don't just dump text on you. We build an entire experience.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
                {/* Large Item: AI Guidance */}
                <div className="md:col-span-2 comic-box p-6 md:p-8 bg-comic-yellow relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white border-3 md:border-4 border-black rounded-full flex items-center justify-center text-3xl md:text-4xl mb-4 shadow-sm">
                            🦉
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black mb-2">Smart AI Tutor</h3>
                        <p className="font-bold text-black/70 text-base md:text-lg max-w-md">
                            Stuck on a question? Our AI tutor "Ollie" is always there to explain tricky concepts in simple terms.
                        </p>
                    </div>
                    <div className="absolute right-0 bottom-0 w-48 md:w-64 h-48 md:h-64 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors"></div>
                    <div className="absolute -right-4 md:-right-8 -bottom-4 md:-bottom-8 text-7xl md:text-9xl opacity-10 rotate-12">🧠</div>
                </div>

                {/* Medium Item: Gamification */}
                <div className="comic-box p-6 md:p-8 bg-comic-blue text-white relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="text-3xl md:text-4xl mb-4 animate-bounce-slow">🏆</div>
                        <h3 className="text-xl md:text-2xl font-black mb-2">XP & Ranks</h3>
                        <p className="font-medium text-white/90 text-sm md:text-base">
                            Earn XP, climb the leaderboard, and unlock cool avatars.
                        </p>
                    </div>
                </div>

                {/* Medium Item: Any Topic */}
                <div className="comic-box p-6 md:p-8 bg-white relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="text-3xl md:text-4xl mb-4">🎨</div>
                        <h3 className="text-xl md:text-2xl font-black mb-2">Limitless Topics</h3>
                        <p className="font-bold text-gray-500 text-sm md:text-base">
                            From Quantum Physics to Knitting. If you can type it, you can learn it.
                        </p>
                    </div>
                </div>

                {/* Large Item: Quizzes */}
                <div className="md:col-span-2 comic-box p-6 md:p-8 bg-comic-red text-white relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 md:gap-4 mb-4">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white border-3 md:border-4 border-black rounded-full flex items-center justify-center text-2xl md:text-3xl text-black shadow-sm">
                                📝
                            </div>
                            <span className="bg-black/20 px-2 md:px-3 py-1 rounded-lg font-bold uppercase text-xs md:text-sm">
                                Interactive
                            </span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black mb-2">Fun Quizzes</h3>
                        <p className="font-medium text-white/90 text-base md:text-lg max-w-lg">
                            Test your knowledge after every lesson. No stress, just quick checks to make sure you're mastering the material.
                        </p>
                    </div>
                    <div className="absolute -right-2 md:-right-4 top-1/2 -translate-y-1/2 text-[6rem] md:text-[10rem] opacity-20 rotate-12">✓</div>
                </div>
            </div>
        </section>
    );
}
