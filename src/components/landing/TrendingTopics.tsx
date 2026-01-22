"use client";

const topics = [
    "🦖 Dinosaurs", "🚀 Space Travel", "🎨 Digital Art", "🐍 Python Coding",
    "🌋 Volcanoes", "♟️ Chess Strategy", "🎸 Guitar Basics", "chef Cooking",
    "🏰 Medieval History", "🤖 AI & Robots", "🌊 Ocean Life", "🎬 Filmmaking"
];

export default function TrendingTopics() {
    return (
        <div className="w-full bg-black py-4 overflow-hidden border-y-4 border-comic-ink transform -rotate-1 relative z-20 hover:rotate-0 transition-transform">
            <div className="flex animate-marquee whitespace-nowrap gap-8">
                {[...topics, ...topics, ...topics].map((topic, i) => (
                    <span key={i} className="text-2xl font-black text-comic-yellow uppercase tracking-widest px-4 border-r-2 border-comic-yellow/30">
                        {topic}
                    </span>
                ))}
            </div>
        </div>
    );
}

// Ensure you add this keyframe to your globals.css or tailwind config if not present:
// @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
// .animate-marquee { animation: marquee 20s linear infinite; }
