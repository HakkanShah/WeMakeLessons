"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { playSound } from "@/lib/sounds";

const avatars = ['🦊', '🐼', '🦁', '🐯', '🦅', '🐺', '🦋', '🐨', '🦉', '🐸', '🐙', '🦜', '🐻', '🐷', '🦩', '🐲', '🦄', '🐬', '🦚', '🐝'];

interface UserStats {
    xp: number;
    level: number;
    streak: number;
    gems: number;
}

interface PerformanceHistory {
    visualScore: number;
    readingScore: number;
    handsonScore: number;
    listeningScore: number;
    averageQuizScore: number;
    totalLessonsCompleted: number;
    strongTopics: string[];
    weakTopics: string[];
}

export default function ProfilePage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [name, setName] = useState("");
    const [avatar, setAvatar] = useState("👤");
    const [stats, setStats] = useState<UserStats>({ xp: 0, level: 1, streak: 0, gems: 0 });
    const [perf, setPerf] = useState<PerformanceHistory | null>(null);
    const [showAvatars, setShowAvatars] = useState(false);

    const { playIntro, voiceModeEnabled } = useTextToSpeech();

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    useEffect(() => {
        if (voiceModeEnabled && user && !loading) {
            playIntro("dashboard-profile", "Welcome to your command center, Explorer! Check your progress map and learning DNA.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voiceModeEnabled, loading, playIntro]);

    useEffect(() => {
        if (user) {
            getDoc(doc(db, "users", user.uid)).then(d => {
                if (d.exists()) {
                    const data = d.data();
                    setName(data.displayName || "");
                    setAvatar(data.photoURL || "👤");
                    setStats(data.stats || stats);
                    setPerf(data.performanceHistory || {
                        visualScore: 40,
                        readingScore: 60,
                        handsonScore: 30,
                        listeningScore: 50,
                        averageQuizScore: 0,
                        totalLessonsCompleted: 0,
                        strongTopics: [],
                        weakTopics: []
                    });
                }
            });
        }
    }, [user]);

    const save = async () => {
        if (!user) return;
        await updateDoc(doc(db, "users", user.uid), { displayName: name, photoURL: avatar });
        setShowAvatars(false);
    };

    if (!user) return null;

    const levels = [
        { lvl: 1, title: "Explorer", items: ["Basic Training"], unlocked: stats.level >= 1 },
        { lvl: 5, title: "Ranger", items: ["Field Missions"], unlocked: stats.level >= 5 },
        { lvl: 10, title: "Guardian", items: ["Advanced Ops"], unlocked: stats.level >= 10 },
        { lvl: 20, title: "Titan", items: ["Mastery"], unlocked: stats.level >= 20 },
        { lvl: 50, title: "Legend", items: ["Galaxy Class"], unlocked: stats.level >= 50 },
    ];

    const currentProgress = Math.min(100, (stats.level / 50) * 100);

    const p = perf || { visualScore: 20, readingScore: 20, handsonScore: 20, listeningScore: 20 };
    const v = Math.max(20, p.visualScore || 20);
    const r = Math.max(20, p.readingScore || 20);
    const h = Math.max(20, p.handsonScore || 20);
    const l = Math.max(20, p.listeningScore || 20);

    const radarPoints = `50,${50 - v * 0.3} ${50 + r * 0.3},50 50,${50 + h * 0.3} ${50 - l * 0.3},50`;

    return (
        <div className="min-h-screen">
            <style jsx global>{`
                .comic-dots { background-image: radial-gradient(#000 15%, transparent 16%), radial-gradient(#000 15%, transparent 16%); background-size: 10px 10px; background-position: 0 0, 5px 5px; opacity: 0.1; }
                .radar-scan { transform-origin: center; animation: radar-spin 4s linear infinite; }
                @keyframes radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .glitch-text:hover { animation: glitch 0.3s cubic-bezier(.25, .46, .45, .94) both infinite; }
                @keyframes glitch { 0% { transform: translate(0) } 20% { transform: translate(-2px, 2px) } 40% { transform: translate(-2px, -2px) } 60% { transform: translate(2px, 2px) } 80% { transform: translate(2px, -2px) } 100% { transform: translate(0) } }
                .stripes-pattern { background-image: linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent); background-size: 1rem 1rem; }
                .animate-slide { animation: slide 1s linear infinite; }
                @keyframes slide { from { background-position: 0 0; } to { background-position: 1rem 0; } }
            `}</style>
            <Sidebar
                userName={name || "Explorer"}
                userAvatar={avatar}
                xp={stats.xp} level={stats.level} streak={stats.streak} gems={stats.gems}
                onSignOut={signOut}
            />

            <main className="lg:ml-80 pt-24 p-4 md:p-8 lg:p-12">
                <div className="max-w-5xl mx-auto space-y-12">

                    {/* Hero Card Section */}
                    <div className="relative group">
                        <div className="absolute -top-6 -left-6 z-0 transform -rotate-3 text-7xl opacity-20 filter grayscale group-hover:rotate-0 transition-transform duration-500">🦸</div>
                        <h1 className="text-5xl font-black text-black text-outline mb-8 relative z-10 glitch-text cursor-default">Agent Profile</h1>

                        <div className="comic-box bg-white overflow-hidden relative transform hover:rotate-0 transition-transform duration-300">
                            <div className="h-48 bg-comic-blue border-b-4 border-black relative overflow-hidden group">
                                <div className="absolute inset-0 comic-dots"></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                <div className="absolute top-4 right-4 bg-black/80 text-white font-mono px-4 py-1 rounded-sm uppercase text-sm border border-white/30 backdrop-blur-sm shadow-lg tracking-widest">
                                    CLASSIFIED: #{user.uid.slice(0, 8)}
                                </div>
                            </div>

                            <div className="px-8 pb-8 relative">
                                <div className="flex flex-col md:flex-row items-end -mt-24 mb-8 gap-8 relative z-10">
                                    <div className="relative group perspective-1000">
                                        <button
                                            onClick={() => {
                                                setShowAvatars(!showAvatars);
                                                playSound("click");
                                            }}
                                            className="w-48 h-48 bg-white rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_#000] flex items-center justify-center text-8xl hover:scale-105 transition-all duration-300 group-hover:-rotate-1 relative overflow-hidden active:scale-95 active:shadow-none"
                                        >
                                            {avatar?.startsWith('http') ? (
                                                <img src={avatar} alt="Hero Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="transform group-hover:scale-110 transition-transform duration-300 inline-block">{avatar}</span>
                                            )}

                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[1px]">
                                                <span className="text-4xl transform scale-50 group-hover:scale-100 transition-transform duration-300">✏️</span>
                                            </div>
                                        </button>

                                        <div className="absolute -top-4 -right-4 bg-comic-yellow text-black font-black px-3 py-1 rounded border-2 border-black rotate-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] group-hover:rotate-0 group-hover:scale-110 transition-all duration-300 z-20">
                                            Lvl {stats.level}
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full space-y-6">
                                        <div className="relative group/input">
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block group-hover/input:text-comic-blue transition-colors">
                                                Code Name //
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-0 bottom-3 text-2xl text-gray-300 font-mono select-none pointer-events-none group-focus-within/input:text-comic-blue transition-colors">{">"}</span>
                                                <input
                                                    value={name}
                                                    onChange={e => setName(e.target.value)}
                                                    className="w-full text-5xl font-black text-black bg-transparent border-b-4 border-gray-200 focus:border-comic-blue outline-none py-2 pl-8 placeholder-gray-200 transition-colors uppercase font-mono tracking-tight"
                                                    placeholder="AGENT X"
                                                />
                                                <div className="absolute right-0 bottom-3 opacity-0 group-focus-within/input:opacity-100 transition-opacity animate-pulse text-comic-blue font-mono text-sm">
                                                    _EDITING
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4">
                                            <div className="px-4 py-2 bg-gray-100 text-black rounded font-bold uppercase text-sm border-2 border-black/10 flex items-center gap-2 group hover:bg-black hover:text-white transition-colors cursor-default">
                                                <span className="text-lg grayscale group-hover:grayscale-0 transition-all">⚡</span>
                                                <span>{stats.xp.toLocaleString()} XP</span>
                                            </div>
                                            <div className="px-4 py-2 bg-orange-50 text-orange-800 rounded font-bold uppercase text-sm border-2 border-orange-200 flex items-center gap-2 hover:bg-orange-500 hover:text-white hover:border-black transition-all cursor-default shadow-sm hover:shadow-md">
                                                <span className="animate-pulse">🔥</span>
                                                <span>{stats.streak} Day Streak</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    save();
                                                    playSound("success");
                                                }}
                                                className="ml-auto px-6 py-2 bg-comic-green text-white font-black rounded border-2 border-black uppercase text-sm shadow-[4px_4px_0px_0px_#000] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
                                            >
                                                <span>💾</span> Save Identity
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {showAvatars && (
                                    <div className="mb-8 p-6 bg-comic-yellow border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_#000] animate-bounce-in z-50 relative">
                                        <div className="flex justify-between items-center mb-4 border-b-2 border-black/20 pb-2">
                                            <h3 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                                                <span>🎭</span> Select Your Avatar
                                            </h3>
                                            <button onClick={() => setShowAvatars(false)} className="text-xl font-black hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-full hover:bg-black hover:text-white">✕</button>
                                        </div>
                                        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                                            {avatars.map(a => (
                                                <button
                                                    key={a}
                                                    onClick={() => {
                                                        setAvatar(a);
                                                        playSound("pop");
                                                    }}
                                                    className={`aspect-square text-3xl bg-white border-2 border-black rounded-lg hover:scale-110 hover:-rotate-6 transition-transform shadow-[2px_2px_0px_0px_#000] flex items-center justify-center ${avatar === a ? 'bg-comic-blue rotate-6 scale-110 ring-4 ring-black z-10' : 'hover:bg-gray-50'}`}
                                                >
                                                    {a}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Adventure Path - Grid Layout */}
                    <div className="group">
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-3xl font-black text-black flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                                <span className="text-4xl">🗺️</span> Adventure Map
                            </h2>
                            <div className="h-1 flex-1 bg-black/10 rounded-full border-b-2 border-black/10 group-hover:border-black/30 transition-colors"></div>
                        </div>

                        <div className="comic-box bg-white p-8">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                                {levels.map((level, i) => {
                                    const isUnlocked = stats.level >= level.lvl;
                                    const isCurrent = stats.level >= level.lvl && (i === levels.length - 1 || stats.level < levels[i + 1].lvl);
                                    const isNext = !isUnlocked && (i === 0 || stats.level >= levels[i - 1].lvl);

                                    return (
                                        <div key={level.lvl} className="relative flex flex-col items-center group/node">
                                            <div
                                                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-black transition-all duration-500 transform 
                                                ${isUnlocked ? "bg-gradient-to-br from-comic-yellow to-yellow-300 border-black shadow-[4px_4px_0px_0px_#000]" : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-400 text-gray-400"} 
                                                ${isCurrent ? "scale-110 ring-4 ring-comic-blue ring-offset-4" : ""}
                                                ${isNext ? "border-dashed ring-4 ring-comic-green/40 animate-pulse" : ""}
                                                group-hover/node:scale-110 group-hover/node:-translate-y-2`}
                                            >
                                                {isUnlocked ? "✓" : level.lvl}
                                            </div>

                                            <div className="mt-4 text-center">
                                                <p className={`font-black uppercase text-sm ${isUnlocked ? 'text-black' : 'text-gray-500'}`}>
                                                    {level.title}
                                                </p>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{level.items[0]}</p>
                                            </div>

                                            {isCurrent && (
                                                <div className="absolute -top-10 bg-comic-blue text-white text-xs font-black px-3 py-1 rounded-full shadow-lg animate-bounce">
                                                    YOU
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Learning DNA & Insights */}
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        {/* Learning Radar */}
                        <div className="group h-full">
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-3xl font-black text-black flex items-center gap-2 group-hover:scale-105 transition-transform origin-left">
                                    <span className="text-4xl animate-pulse-slow">🧬</span> Learning DNA
                                </h2>
                            </div>
                            <div className="comic-box bg-white p-6 flex flex-col items-center justify-center min-h-[400px] h-full relative overflow-hidden group/chart hover:border-comic-blue transition-colors duration-500">
                                <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

                                <div className="relative w-64 h-64">
                                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl transform group-hover/chart:scale-105 transition-transform duration-700">
                                        <circle cx="50" cy="50" r="30" fill="none" stroke="#333" strokeWidth="0.5" className="opacity-10" />

                                        {[10, 20, 30].map((r, i) => (
                                            <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2 2" />
                                        ))}

                                        <line x1="50" y1="20" x2="50" y2="80" stroke="#e5e7eb" strokeWidth="0.5" />
                                        <line x1="20" y1="50" x2="80" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />

                                        <polygon
                                            points={radarPoints}
                                            fill="rgba(59, 130, 246, 0.2)"
                                            stroke="#3b82f6"
                                            strokeWidth="2"
                                            strokeLinejoin="round"
                                            className="drop-shadow-lg transition-all duration-1000 ease-elastic"
                                        >
                                            <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
                                        </polygon>

                                        <circle cx="50" cy={50 - v * 0.3} r="2" fill="#3b82f6" />
                                        <circle cx={50 + r * 0.3} cy="50" r="2" fill="#3b82f6" />
                                        <circle cx="50" cy={50 + h * 0.3} r="2" fill="#3b82f6" />
                                        <circle cx={50 - l * 0.3} cy="50" r="2" fill="#3b82f6" />

                                        <line x1="50" y1="50" x2="50" y2="20" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="1" className="radar-scan origin-center" />

                                        <text x="50" y="14" textAnchor="middle" className="text-[4px] font-black uppercase fill-black">👁️ Visual</text>
                                        <text x="86" y="52" textAnchor="start" className="text-[4px] font-black uppercase fill-black">📖 Read</text>
                                        <text x="50" y="90" textAnchor="middle" className="text-[4px] font-black uppercase fill-black">🖐️ Hands</text>
                                        <text x="14" y="52" textAnchor="end" className="text-[4px] font-black uppercase fill-black">🎧 Audio</text>
                                    </svg>
                                </div>
                                <p className="mt-6 text-center text-xs font-black text-black uppercase tracking-widest border-t-2 border-black/10 pt-4 w-full">
                                    Last Analysis: {new Date().toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Insights */}
                        <div className="h-full flex flex-col">
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-3xl font-black text-black flex items-center gap-2">
                                    <span className="text-4xl">💡</span> Intel
                                </h2>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="comic-box p-6 bg-yellow-50 border-l-8 border-l-black flex gap-4 items-start transform rotate-1 transition-all hover:rotate-0 hover:scale-[1.02] hover:bg-yellow-100 group cursor-default shadow-sm hover:shadow-md">
                                    <div className="text-4xl group-hover:scale-125 transition-transform duration-300">🚀</div>
                                    <div>
                                        <h4 className="font-black text-lg uppercase mb-1 tracking-tight">Top Strength</h4>
                                        <p className="font-bold text-sm text-gray-700 leading-relaxed">You excel at <span className="bg-black text-white px-1">Science</span> topics! Keep pushing boundaries.</p>
                                    </div>
                                </div>

                                <div className="comic-box p-6 bg-blue-50 border-l-8 border-l-black flex gap-4 items-start transform -rotate-1 transition-all hover:rotate-0 hover:scale-[1.02] hover:bg-blue-100 group cursor-default shadow-sm hover:shadow-md">
                                    <div className="text-4xl group-hover:scale-125 transition-transform duration-300">🧠</div>
                                    <div>
                                        <h4 className="font-black text-lg uppercase mb-1 tracking-tight">Learning Style</h4>
                                        <p className="font-bold text-sm text-gray-700 leading-relaxed">Your <span className="bg-blue-600 text-white px-1">Visual</span> score is climbing. Try more video missions.</p>
                                    </div>
                                </div>

                                <div className="comic-box p-6 bg-green-50 border-l-8 border-l-black flex gap-4 items-start transform rotate-1 transition-all hover:rotate-0 hover:scale-[1.02] hover:bg-green-100 group cursor-default shadow-sm hover:shadow-md">
                                    <div className="text-4xl group-hover:scale-125 transition-transform duration-300">🎯</div>
                                    <div>
                                        <h4 className="font-black text-lg uppercase mb-1 tracking-tight">Next Goal</h4>
                                        <p className="font-bold text-sm text-gray-700 leading-relaxed">Reach <span className="bg-red-600 text-white px-1">Level {stats.level + 1}</span> to unlock customization.</p>
                                    </div>
                                </div>

                                <div className="comic-box p-6 bg-purple-50 border-l-8 border-l-black flex gap-4 items-start transform -rotate-1 transition-all hover:rotate-0 hover:scale-[1.02] hover:bg-purple-100 group cursor-default shadow-sm hover:shadow-md">
                                    <div className="text-4xl group-hover:scale-125 transition-transform duration-300">⭐</div>
                                    <div>
                                        <h4 className="font-black text-lg uppercase mb-1 tracking-tight">Achievements</h4>
                                        <p className="font-bold text-sm text-gray-700 leading-relaxed">You've completed <span className="bg-purple-600 text-white px-1">{perf?.totalLessonsCompleted || 0}</span> lessons. Keep it up!</p>
                                    </div>
                                </div>

                                <div className="comic-box p-6 bg-pink-50 border-l-8 border-l-black flex gap-4 items-start transform rotate-1 transition-all hover:rotate-0 hover:scale-[1.02] hover:bg-pink-100 group cursor-default shadow-sm hover:shadow-md">
                                    <div className="text-4xl group-hover:scale-125 transition-transform duration-300">📊</div>
                                    <div>
                                        <h4 className="font-black text-lg uppercase mb-1 tracking-tight">Performance</h4>
                                        <p className="font-bold text-sm text-gray-700 leading-relaxed">Average quiz score: <span className="bg-pink-600 text-white px-1">{perf?.averageQuizScore || 0}%</span>. Aiming for mastery!</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
