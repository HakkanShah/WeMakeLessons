"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";

const avatars = ['🦊', '🐼', '🦁', '🐯', '🦅', '🐺', '🦋', '🐨', '🦉', '🐸', '🐙', '🦜', '🐻', '🐷', '🦩', '🐲', '🦄', '🐬', '🦚', '🐝'];

export default function ProfilePage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [name, setName] = useState("");
    const [avatar, setAvatar] = useState("👤");
    const [stats, setStats] = useState({ xp: 0, level: 1, streak: 0, gems: 0 });
    const [showAvatars, setShowAvatars] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            getDoc(doc(db, "users", user.uid)).then(d => {
                if (d.exists()) {
                    const data = d.data();
                    setName(data.displayName || "");
                    setAvatar(data.photoURL || "👤");
                    setStats(data.stats || stats);
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

    return (
        <div className="min-h-screen">
            <Sidebar
                userName={name || "Explorer"}
                userAvatar={avatar}
                xp={stats.xp} level={stats.level} streak={stats.streak} gems={stats.gems}
                onSignOut={signOut}
            />

            <main className="lg:ml-80 pt-24 p-4 md:p-8 lg:p-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-black text-black text-outline mb-8 animate-bounce-slow inline-block">My Hero Card</h1>

                    <div className="comic-box bg-white overflow-hidden relative">
                        {/* Hero Header */}
                        <div className="h-40 bg-[url('https://www.transparenttextures.com/patterns/comic-dots.png')] bg-comic-blue border-b-4 border-black relative">
                            <div className="absolute inset-0 bg-white/10"></div>
                        </div>

                        <div className="px-8 pb-8">
                            <div className="flex flex-col md:flex-row items-end -mt-20 mb-8 gap-6">
                                <div className="relative group">
                                    <button
                                        onClick={() => setShowAvatars(!showAvatars)}
                                        className="w-40 h-40 bg-white rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_#000] flex items-center justify-center text-8xl hover:scale-105 transition-transform group-hover:rotate-2 relative z-10 overflow-hidden"
                                    >
                                        {avatar?.startsWith('http') ? (
                                            <img src={avatar} alt="Hero Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            avatar
                                        )}
                                        <div className="absolute -bottom-2 -right-2 bg-comic-yellow text-black w-10 h-10 flex items-center justify-center rounded-lg border-2 border-black rotate-12 group-hover:rotate-0 transition-transform z-20 text-xl shadow-sm">
                                            ✏️
                                        </div>
                                    </button>
                                </div>

                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-black text-black uppercase mb-1 bg-white inline-block px-2 border-2 border-black rotate-1">Hero Name</label>
                                    <input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full text-4xl font-black text-black bg-transparent border-b-4 border-black focus:border-comic-blue outline-none py-2"
                                        placeholder="Secret Identity"
                                    />
                                </div>

                                <button
                                    onClick={save}
                                    className="btn-primary whitespace-nowrap"
                                >
                                    💾 Save Card
                                </button>
                            </div>

                            {showAvatars && (
                                <div className="mb-8 p-6 bg-comic-yellow border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_#000] animate-bounce-slow">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-black text-black uppercase">Choose Your Look</h3>
                                        <button onClick={() => setShowAvatars(false)} className="text-2xl font-black hover:scale-110 transition-transform">❌</button>
                                    </div>
                                    <div className="flex flex-wrap gap-4 justify-center">
                                        {avatars.map(a => (
                                            <button
                                                key={a}
                                                onClick={() => setAvatar(a)}
                                                className={`w-16 h-16 text-4xl bg-white border-2 border-black rounded-xl hover:scale-110 hover:-rotate-6 transition-transform shadow-[2px_2px_0px_0px_#000] flex items-center justify-center ${avatar === a ? 'bg-comic-blue rotate-6 scale-110' : ''}`}
                                            >
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                                {[
                                    { label: "XP", value: stats.xp.toLocaleString(), icon: "⚡", bg: "bg-comic-yellow" },
                                    { label: "Level", value: stats.level, icon: "🛡️", bg: "bg-comic-blue" },
                                    { label: "Streak", value: stats.streak, icon: "🔥", bg: "bg-comic-red" },
                                    { label: "Gems", value: stats.gems, icon: "💎", bg: "bg-comic-green" },
                                ].map((stat) => (
                                    <div key={stat.label} className={`p-4 ${stat.bg} border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] text-center transform hover:-translate-y-1 transition-transform`}>
                                        <div className="text-3xl mb-1 drop-shadow-md">{stat.icon}</div>
                                        <p className="text-2xl font-black text-white text-outline">{stat.value}</p>
                                        <p className="text-xs font-black text-black uppercase bg-white/50 inline-block px-2 rounded">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
