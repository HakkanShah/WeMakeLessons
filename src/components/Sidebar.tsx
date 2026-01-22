"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { playSound } from "@/lib/sounds";

interface SidebarProps {
    userName: string;
    userAvatar?: string;
    xp: number;
    level: number;
    streak: number;
    gems: number;
    onSignOut: () => void;
}

const navItems = [
    { href: "/dashboard", label: "Home", icon: "🏠", color: "bg-comic-blue" },
    { href: "/dashboard/challenges", label: "Challenges", icon: "🎯", color: "bg-comic-red" },
    { href: "/dashboard/leaderboard", label: "Leaderboard", icon: "🏆", color: "bg-comic-yellow" },
    { href: "/dashboard/rewards", label: "Shop", icon: "🛍️", color: "bg-comic-green" },
    { href: "/generate", label: "Create", icon: "✨", color: "bg-purple-400" },
    { href: "/profile", label: "Profile", icon: "👤", color: "bg-orange-400" },
];

export default function Sidebar({ userName, userAvatar, xp, level, streak, gems, onSignOut }: SidebarProps) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isActive = (href: string) => {
        return pathname === href ||
            (href !== "/dashboard" && href !== "/generate" && href !== "/profile" && pathname?.startsWith(href));
    };

    return (
        <>
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-comic-paper border-b-4 border-black z-50 px-4 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 bg-comic-yellow border-2 border-black rounded-lg flex items-center justify-center text-black font-black text-xl shadow-[4px_4px_0px_0px_#000] group-hover:translate-1 group-hover:shadow-[2px_2px_0px_0px_#000] transition-all">
                        W
                    </div>
                    <span className="font-black text-2xl tracking-tight">WML</span>
                </Link>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_0px_#000]">
                        <span className="text-xl">💎</span>
                        <span className="font-black text-lg">{gems}</span>
                    </div>
                    <button
                        onClick={() => {
                            playSound(mobileMenuOpen ? "menuClose" : "menuOpen");
                            setMobileMenuOpen(!mobileMenuOpen);
                        }}
                        className="w-12 h-12 bg-white border-2 border-black rounded-lg flex items-center justify-center text-2xl shadow-[4px_4px_0px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[2px_2px_0px_0px_#000] transition-all"
                    >
                        {mobileMenuOpen ? "✕" : "☰"}
                    </button>
                </div>
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-80 bg-comic-paper border-r-4 border-black flex-col z-40 p-6 overflow-y-auto">
                {/* Logo */}
                <div className="mb-10 text-center">
                    <Link href="/dashboard" className="inline-flex items-center gap-3 group">
                        <div className="w-14 h-14 bg-comic-yellow border-4 border-black rounded-xl flex items-center justify-center text-black font-black text-3xl shadow-[6px_6px_0px_0px_#000] group-hover:-rotate-3 transition-transform">
                            W
                        </div>
                        <span className="font-black text-4xl tracking-tight group-hover:scale-105 transition-transform">WML</span>
                    </Link>
                </div>

                {/* User Stats Card */}
                <div className="mb-8 comic-box p-4 bg-white transform rotate-1 hover:rotate-0 transition-transform">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl bg-comic-blue border-4 border-black flex items-center justify-center text-3xl shadow-[4px_4px_0px_0px_#000]">
                            {userAvatar?.startsWith('http') ? (
                                <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                userAvatar || "👤"
                            )}
                        </div>
                        <div>
                            <p className="font-black text-xl leading-tight">{userName}</p>
                            <span className="inline-block px-2 py-1 bg-black text-white text-xs font-bold rounded uppercase mt-1">
                                Level {level}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-orange-100 border-2 border-black rounded-lg p-2 text-center">
                            <p className="text-xs font-bold uppercase">Streak</p>
                            <p className="font-black text-xl text-orange-600">{streak} 🔥</p>
                        </div>
                        <div className="bg-purple-100 border-2 border-black rounded-lg p-2 text-center">
                            <p className="text-xs font-bold uppercase">Gems</p>
                            <p className="font-black text-xl text-purple-600">{gems} 💎</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-3">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => playSound("navigate")}>
                            <div className={`flex items-center gap-4 px-4 py-4 rounded-xl border-4 font-black text-lg transition-all ${isActive(item.href)
                                ? `bg-white border-black shadow-[6px_6px_0px_0px_#000] -translate-y-1 -translate-x-1 z-10 relative`
                                : 'border-transparent text-gray-500 hover:bg-white hover:border-black hover:shadow-[4px_4px_0px_0px_#000] hover:text-black opacity-80 hover:opacity-100'
                                }`}>
                                <div className={`w-10 h-10 rounded-lg border-2 border-black flex items-center justify-center text-xl ${isActive(item.href) ? item.color : 'bg-gray-200'}`}>
                                    {item.icon}
                                </div>
                                <span className="tracking-wide">{item.label}</span>
                                {isActive(item.href) && (
                                    <span className="ml-auto text-2xl animate-bounce">👈</span>
                                )}
                            </div>
                        </Link>
                    ))}
                </nav>

                {/* Sign Out */}
                <button
                    onClick={() => {
                        playSound("click");
                        onSignOut();
                    }}
                    className="mt-8 w-full btn-danger"
                >
                    <span>🚪</span>
                    <span>EXIT GAME</span>
                </button>
            </aside>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40 top-20">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
                    <div className="relative bg-comic-paper h-full w-full max-w-sm border-r-4 border-black p-6 flex flex-col overflow-y-auto animate-in slide-in-from-left duration-300">

                        {/* Mobile User Stats */}
                        <div className="mb-8 comic-box p-4 bg-white">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-xl bg-comic-blue border-4 border-black flex items-center justify-center text-3xl shadow-[4px_4px_0px_0px_#000]">
                                    {userAvatar?.startsWith('http') ? (
                                        <img src={userAvatar} alt="User" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        userAvatar || "👤"
                                    )}
                                </div>
                                <div>
                                    <p className="font-black text-xl leading-tight">{userName}</p>
                                    <span className="inline-block px-2 py-1 bg-black text-white text-xs font-bold rounded uppercase mt-1">
                                        Level {level}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-orange-100 border-2 border-black rounded-lg p-2 text-center">
                                    <p className="text-xs font-bold uppercase">Streak</p>
                                    <p className="font-black text-xl text-orange-600">{streak} 🔥</p>
                                </div>
                                <div className="bg-purple-100 border-2 border-black rounded-lg p-2 text-center">
                                    <p className="text-xs font-bold uppercase">Gems</p>
                                    <p className="font-black text-xl text-purple-600">{gems} 💎</p>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Nav */}
                        <nav className="flex-1 space-y-3">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => {
                                        playSound("navigate");
                                        setMobileMenuOpen(false);
                                    }}
                                >
                                    <div className={`flex items-center gap-4 px-4 py-4 rounded-xl border-4 font-black text-lg transition-all ${isActive(item.href)
                                        ? `bg-white border-black shadow-[6px_6px_0px_0px_#000] z-10 relative`
                                        : 'border-transparent text-gray-500 hover:bg-white hover:border-black hover:text-black hover:shadow-[4px_4px_0px_0px_#000]'
                                        }`}>
                                        <div className={`w-10 h-10 rounded-lg border-2 border-black flex items-center justify-center text-xl ${isActive(item.href) ? item.color : 'bg-gray-200'}`}>
                                            {item.icon}
                                        </div>
                                        <span className="tracking-wide">{item.label}</span>
                                    </div>
                                </Link>
                            ))}
                        </nav>

                        <button
                            onClick={() => {
                                playSound("click");
                                onSignOut();
                            }}
                            className="mt-8 w-full btn-danger"
                        >
                            <span>🚪</span>
                            <span>EXIT GAME</span>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
