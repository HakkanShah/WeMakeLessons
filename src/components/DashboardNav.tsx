"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardNavProps {
    userName: string;
    gems: number;
    onSignOut: () => void;
}

const navItems = [
    { href: "/dashboard", label: "Home", icon: "🏠", emoji: "🏠" },
    { href: "/dashboard/challenges", label: "Challenges", icon: "🎯", emoji: "🎯" },
    { href: "/dashboard/leaderboard", label: "Leaderboard", icon: "🏆", emoji: "🏆" },
    { href: "/dashboard/rewards", label: "Rewards", icon: "🎁", emoji: "🎁" },
];

export default function DashboardNav({ userName, gems, onSignOut }: DashboardNavProps) {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-50 bg-white border-b-[3px] border-comic-ink shadow-sm">
            <div className="max-w-7xl mx-auto px-6">
                {/* Top Bar */}
                <div className="h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-comic-yellow border-[3px] border-comic-ink rounded-lg flex items-center justify-center text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                🦉
                            </div>
                            <span className="text-2xl font-black tracking-tight hidden md:block">WML</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Gems Display */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 border-2 border-purple-300 rounded-full">
                            <span>💎</span>
                            <span className="font-black text-purple-700">{gems}</span>
                        </div>

                        <Link href="/profile">
                            <button className="flex items-center gap-2 px-3 py-1.5 border-2 border-comic-ink rounded-full hover:bg-gray-50 transition-colors font-bold text-sm">
                                <span>👤</span>
                                <span className="hidden sm:inline">{userName}</span>
                            </button>
                        </Link>

                        <button
                            onClick={onSignOut}
                            className="w-9 h-9 border-2 border-comic-ink rounded-full bg-comic-red text-white flex items-center justify-center hover:bg-comic-red-dark transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none text-sm"
                            title="Sign Out"
                        >
                            👋
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <nav className="flex gap-1 -mb-[3px]">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== "/dashboard" && pathname?.startsWith(item.href));

                        return (
                            <Link key={item.href} href={item.href}>
                                <button className={`
                                    px-4 py-3 font-bold text-sm flex items-center gap-2 border-[3px] border-b-0 rounded-t-xl transition-all
                                    ${isActive
                                        ? 'bg-comic-paper border-comic-ink text-comic-ink translate-y-[3px]'
                                        : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'
                                    }
                                `}>
                                    <span>{item.emoji}</span>
                                    <span className="hidden md:inline">{item.label}</span>
                                </button>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}
