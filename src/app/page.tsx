import Link from "next/link";
import { Button } from "@/components/ui/button";
import TrendingTopics from "@/components/landing/TrendingTopics";
import FeatureGrid from "@/components/landing/FeatureGrid";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden selection:bg-comic-yellow selection:text-comic-ink">



      {/* Header */}
      <header className="relative z-50 container mx-auto px-4 md:px-6 h-20 md:h-24 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 md:gap-3 group cursor-pointer">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-comic-yellow border-3 md:border-4 border-comic-ink rounded-lg flex items-center justify-center text-xl md:text-2xl rotate-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-12 transition-transform animate-bounce-slow">
            🚀
          </div>
          <span className="text-xl md:text-3xl font-black tracking-tight text-comic-ink drop-shadow-sm group-hover:scale-105 transition-transform">
            WeMakeLessons
          </span>
        </Link>
        <div className="flex gap-2 md:gap-4 items-center">
          <Link href="/docs">
            <button className="hidden md:block px-4 py-2 font-black text-gray-600 hover:text-comic-blue transition-colors">
              📚 Docs
            </button>
          </Link>
          <Link href="/login">
            <button className="hidden md:block px-6 py-2 font-black border-4 border-black bg-white hover:bg-gray-50 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all rounded-xl text-lg uppercase tracking-wide">
              Log In
            </button>
          </Link>
          <Link href="/login">
            <button className="btn-primary text-sm md:text-base px-4 py-2 md:px-6 md:py-3 transform hover:scale-105 transition-transform duration-200 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              Start! 🚀
            </button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-16 md:pb-24 text-center">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">

          {/* Badge */}
          <div className="inline-block animate-pop">
            <span className="px-4 md:px-6 py-2 bg-white border-2 md:border-3 border-comic-ink rounded-full text-sm md:text-lg font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-2 inline-block">
              ✨ Learning is a GAME now!
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-comic-ink leading-tight tracking-tight drop-shadow-sm">
            Turn <span className="text-comic-blue underline decoration-wavy decoration-2 md:decoration-4 decoration-comic-yellow">Any Topic</span> <br />
            Into an <span className="inline-block bg-comic-yellow px-2 md:px-4 transform -rotate-2 border-3 md:border-4 border-comic-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-white text-stroke">Adventure!</span>
          </h1>

          <p className="text-base md:text-xl lg:text-2xl font-bold text-gray-600 max-w-2xl mx-auto leading-relaxed px-2">
            No more boring textbooks. Just tell us what you want to learn, and we'll build a game just for you! 🎮📚
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6 pt-6 md:pt-8 px-4">
            <Link href="/login" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto btn-primary text-lg md:text-2xl px-8 md:px-12 py-4 md:py-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all group relative overflow-hidden">
                <span className="relative z-10">Create Account ⚡</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </button>
            </Link>
            <Link href="#how-it-works" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto btn-secondary text-base md:text-xl px-6 md:px-10 py-3 md:py-5 hover:-translate-y-1 transition-all">
                How It Works? 🤔
              </button>
            </Link>
          </div>

        </div>
      </section>

      {/* Trending Topics Marquee */}
      <TrendingTopics />

      {/* Feature Grid */}
      <FeatureGrid />

      {/* How It Works - Comic Strip Style */}
      <section id="how-it-works" className="relative z-10 bg-comic-blue border-y-4 border-black py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-5xl font-black text-center mb-12 md:mb-16 text-white text-outline underline decoration-white decoration-4 md:decoration-8 decoration-wavy">
            Your Journey Begins...
          </h2>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">

            {/* Panel 1 - Pick a Topic */}
            <div className="comic-box p-6 md:p-8 relative bg-white transform hover:-translate-y-3 hover:rotate-1 transition-all duration-300 group">
              <div className="absolute -top-5 -left-3 md:-top-6 md:-left-4 w-10 h-10 md:w-12 md:h-12 bg-comic-red border-4 border-black rounded-full flex items-center justify-center font-black text-white text-lg md:text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10">1</div>
              <div className="h-40 md:h-48 rounded-xl mb-6 flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50">
                <img
                  src="/images/pick_topic.png"
                  alt="Pick a topic illustration"
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-black mb-2 text-black">Pick Any Topic</h3>
              <p className="font-bold text-gray-600 text-base md:text-lg leading-relaxed">
                Dinosaurs 🦖, Space 🚀, Coding 💻 - tell us what excites you and we'll create a personalized adventure!
              </p>
            </div>

            {/* Panel 2 - AI Magic */}
            <div className="comic-box p-6 md:p-8 relative bg-white md:rotate-2 transform hover:-translate-y-3 hover:rotate-0 transition-all duration-300 group">
              <div className="absolute -top-5 -left-3 md:-top-6 md:-left-4 w-10 h-10 md:w-12 md:h-12 bg-comic-yellow border-4 border-black rounded-full flex items-center justify-center font-black text-black text-lg md:text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10">2</div>
              <div className="h-40 md:h-48 rounded-xl mb-6 flex items-center justify-center overflow-hidden bg-gradient-to-br from-yellow-50 to-orange-50">
                <img
                  src="/images/ai_magic.png"
                  alt="AI magic illustration"
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-black mb-2 text-black">AI Creates Your World</h3>
              <p className="font-bold text-gray-600 text-base md:text-lg leading-relaxed">
                Our smart owl "Ollie" builds custom lessons, quizzes, and challenges tailored just for you in seconds! ✨
              </p>
            </div>

            {/* Panel 3 - Play to Learn */}
            <div className="comic-box p-6 md:p-8 relative bg-white md:-rotate-1 transform hover:-translate-y-3 hover:rotate-0 transition-all duration-300 group">
              <div className="absolute -top-5 -left-3 md:-top-6 md:-left-4 w-10 h-10 md:w-12 md:h-12 bg-comic-green border-4 border-black rounded-full flex items-center justify-center font-black text-white text-lg md:text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10">3</div>
              <div className="h-40 md:h-48 rounded-xl mb-6 flex items-center justify-center overflow-hidden bg-gradient-to-br from-green-50 to-teal-50">
                <img
                  src="/images/play_learn.png"
                  alt="Play and learn illustration"
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-black mb-2 text-black">Play, Learn, Level Up!</h3>
              <p className="font-bold text-gray-600 text-base md:text-lg leading-relaxed">
                Earn XP ⚡, collect gems 💎, climb the leaderboard 🏆, and become the ultimate topic master!
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-comic-yellow border-b-4 border-black">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12 md:mb-16 text-outline">What Explorers Say 🗣️</h2>
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 md:p-8 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rotate-1 relative rounded-2xl">
              <span className="text-5xl md:text-6xl absolute -top-3 -left-3 text-comic-blue">❝</span>
              <p className="font-bold text-lg md:text-xl text-gray-700 mb-4 italic pt-4">
                "I learned about volcanoes and now I want to be a geologist! The quiz was super fun."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-comic-red rounded-full border-2 border-black flex items-center justify-center text-xl">🦖</div>
                <div>
                  <p className="font-black text-lg">Leo</p>
                  <p className="text-sm font-bold text-gray-500">Level 5 Explorer</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 md:p-8 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] -rotate-1 relative rounded-2xl">
              <span className="text-5xl md:text-6xl absolute -top-3 -left-3 text-comic-blue">❝</span>
              <p className="font-bold text-lg md:text-xl text-gray-700 mb-4 italic pt-4">
                "My daughter actually asks to study now. It's like magic! Best app ever."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-comic-blue rounded-full border-2 border-black flex items-center justify-center text-xl">👩</div>
                <div>
                  <p className="font-black text-lg">Sarah</p>
                  <p className="text-sm font-bold text-gray-500">Super Mom</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gamification Preview */}
      <section className="py-16 md:py-24 container mx-auto px-4 md:px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-8 md:mb-12">Level Up Your Brain! 🧠</h2>

        <div className="flex flex-wrap justify-center gap-4 md:gap-8">
          <div className="bg-comic-yellow px-6 md:px-8 py-3 md:py-4 rounded-xl border-3 md:border-4 border-comic-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform rotate-2 hover:-translate-y-1 transition-transform">
            <span className="text-xl md:text-3xl font-black">1250 XP ⚡</span>
          </div>
          <div className="bg-comic-blue px-6 md:px-8 py-3 md:py-4 rounded-xl border-3 md:border-4 border-comic-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform -rotate-1 text-white hover:-translate-y-1 transition-transform">
            <span className="text-xl md:text-3xl font-black">Level 5 🛡️</span>
          </div>
          <div className="bg-comic-red px-6 md:px-8 py-3 md:py-4 rounded-xl border-3 md:border-4 border-comic-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform rotate-3 text-white hover:-translate-y-1 transition-transform">
            <span className="text-xl md:text-3xl font-black">7 Day Streak 🔥</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-comic-ink bg-white py-8 md:py-12">
        <div className="container mx-auto px-4 text-center font-bold text-gray-500">
          <p className="mb-4 text-2xl">🦉</p>
          <p className="mb-2">© 2026 WeMakeLessons. Built for fun!</p>
          <p className="text-sm">
            Crafted with fun by{" "}
            <a
              href="https://hakkan.is-a.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-comic-blue hover:text-comic-blue-dark underline decoration-wavy decoration-2 font-black transition-colors"
            >
              Hakkan
            </a>
          </p>
        </div>
      </footer>

    </div>
  );
}
