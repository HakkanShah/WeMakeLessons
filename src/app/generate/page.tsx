"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import toast from "react-hot-toast";
import { playSound } from "@/lib/sounds";

export default function GeneratePage() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        topic: "",
        targetAge: "kids",
        language: "English",
        difficulty: "beginner",
        learningGoals: "",
    });

    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        playSound("click");
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error("Failed");
            const { course } = await res.json();
            const ref = await addDoc(collection(db, "courses"), {
                ...course,
                metadata: formData,
                creatorId: user.uid,
                createdAt: serverTimestamp(),
            });
            playSound("success");
            toast.success("Course Generated! 🚀");
            router.push(`/course/${ref.id}`);
        } catch (e) {
            console.error(e);
            playSound("error");
            toast.error("Mission Failed! 💥");
            setError("Oops! The magic machine got stuck. Please try again! 🪄");
        } finally {
            setLoading(false);
        }
    };

    const suggestions = [
        { label: "Dinosaurs", icon: "🦖", color: "bg-comic-green" },
        { label: "Space Travel", icon: "🚀", color: "bg-comic-blue" },
        { label: "Superheroes", icon: "🦸", color: "bg-comic-red" },
        { label: "Magic Tricks", icon: "🎩", color: "bg-purple-400" },
        { label: "Ocean Life", icon: "🐳", color: "bg-cyan-400" },
        { label: "Robots", icon: "🤖", color: "bg-gray-400" },
        { label: "Video Game Design", icon: "🎮", color: "bg-indigo-400" },
        { label: "Ancient Egypt", icon: "🏺", color: "bg-yellow-400" },
        { label: "Detective Skills", icon: "🔍", color: "bg-orange-400" },
        { label: "Comic Book Writing", icon: "💬", color: "bg-pink-400" },
    ];

    if (!user) return null;

    return (
        <div className="min-h-screen">
            <Sidebar
                userName={user.displayName || "Explorer"}
                userAvatar={user.photoURL || "👤"}
                xp={0} level={1} streak={0} gems={0}
                onSignOut={signOut}
            />

            <main className="lg:ml-80 pt-24 p-4 md:p-8 lg:p-12 relative overflow-hidden">
                {/* Floating Shapes Background */}
                <div className="absolute top-20 right-20 text-9xl opacity-10 rotate-12 pointer-events-none">✨</div>
                <div className="absolute bottom-20 left-20 text-9xl opacity-10 -rotate-12 pointer-events-none">🎨</div>

                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="text-center mb-10">
                        <div className="inline-block px-4 py-2 bg-comic-blue border-2 border-black rounded-lg text-white font-black uppercase shadow-[4px_4px_0px_0px_#000] -rotate-2 mb-4">
                            AI Magic Machine 🪄
                        </div>
                        <h1 className="text-5xl font-black text-black text-outline mb-4">Create Your Adventure</h1>
                        <p className="text-xl font-bold text-gray-500 max-w-lg mx-auto">
                            Type what you want to learn, and our magic robots will build a fun course just for you!
                        </p>
                    </div>

                    <div className="comic-box p-8 bg-white mb-10 transform rotate-1">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <label className="block text-xl font-black text-black mb-3">
                                    I want to learn about...
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. How rockets work"
                                    className="w-full px-6 py-4 rounded-xl border-4 border-black font-bold text-xl outline-none focus:shadow-[4px_4px_0px_0px_#000] focus:-translate-y-1 transition-all placeholder:text-gray-300"
                                    value={formData.topic}
                                    onChange={e => setFormData({ ...formData, topic: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-4 bg-comic-yellow/20 rounded-xl border-2 border-black border-dashed">
                                    <label className="block text-sm font-black text-black uppercase mb-2">My Age Group</label>
                                    <select
                                        className="w-full p-2 bg-white border-2 border-black rounded-lg font-bold outline-none cursor-pointer"
                                        value={formData.targetAge}
                                        onChange={e => setFormData({ ...formData, targetAge: e.target.value })}
                                    >
                                        <option value="kids">👶 Kids (5-12)</option>
                                        <option value="teens">🧑 Teens (13-18)</option>
                                        <option value="adults">👨 Adults (18+)</option>
                                    </select>
                                </div>
                                <div className="p-4 bg-comic-blue/20 rounded-xl border-2 border-black border-dashed">
                                    <label className="block text-sm font-black text-black uppercase mb-2">Challenge Level</label>
                                    <select
                                        className="w-full p-2 bg-white border-2 border-black rounded-lg font-bold outline-none cursor-pointer"
                                        value={formData.difficulty}
                                        onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                                    >
                                        <option value="beginner">🌱 Easy Peasy</option>
                                        <option value="intermediate">🌿 Medium Fun</option>
                                        <option value="advanced">🌳 Super Smart</option>
                                    </select>
                                </div>
                                <div className="p-4 bg-comic-red/20 rounded-xl border-2 border-black border-dashed">
                                    <label className="block text-sm font-black text-black uppercase mb-2">Language</label>
                                    <select
                                        className="w-full p-2 bg-white border-2 border-black rounded-lg font-bold outline-none cursor-pointer"
                                        value={formData.language}
                                        onChange={e => setFormData({ ...formData, language: e.target.value })}
                                    >
                                        <option value="English">🇺🇸 English</option>
                                        <option value="Spanish">🇪🇸 Spanish</option>
                                        <option value="French">🇫🇷 French</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-5 rounded-xl font-black text-2xl uppercase tracking-widest border-4 border-black transition-all flex items-center justify-center gap-3 ${loading
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    : "bg-comic-green text-white shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] active:translate-y-1 active:shadow-[2px_2px_0px_0px_#000]"
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin text-3xl">⚙️</span>
                                        Building...
                                    </>
                                ) : (
                                    <>
                                        <span className="text-3xl">✨</span>
                                        Create My Course!
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div>
                        <p className="text-center font-black text-black uppercase tracking-widest mb-6">Popular Ideas</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            {suggestions.map((s, i) => (
                                <button
                                    key={s.label}
                                    onClick={() => {
                                        playSound("click");
                                        setFormData({ ...formData, topic: s.label });
                                    }}
                                    onMouseEnter={() => playSound("hover")}
                                    className={`px-6 py-3 bg-white border-2 border-black rounded-xl font-bold flex items-center gap-2 shadow-[2px_2px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#000] transition-all transform ${i % 2 === 0 ? 'rotate-1' : '-rotate-1'} hover:rotate-0`}
                                >
                                    <span className={`w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center ${s.color}`}>{s.icon}</span>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
