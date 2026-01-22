"use client";

import { useDashboardData } from "@/lib/useDashboardData";
import Sidebar from "@/components/Sidebar";
import { mockUsers, getLevelTitle } from "@/lib/mockUsers";

export default function LeaderboardPage() {
    const { user, loading, stats, userName, signOut } = useDashboardData();

    if (loading) return null;
    if (!user) return null;

    const sortedUsers = [...mockUsers].sort((a, b) => b.xp - a.xp);
    const topThree = sortedUsers.slice(0, 3);
    const rest = sortedUsers.slice(3);

    return (
        <div className="min-h-screen">
            <Sidebar
                userName={userName}
                userAvatar={user.photoURL || "👤"}
                xp={stats.xp}
                level={stats.level}
                streak={stats.streak}
                gems={stats.gems}
                onSignOut={signOut}
            />

            <main className="lg:ml-80 pt-24 p-4 md:p-8 lg:p-12">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-black text-black text-outline mb-4 inline-block transform -rotate-2">
                            Hall of Fame 🏆
                        </h1>
                        <p className="text-xl font-bold text-gray-500">
                            See who's leading the legendary race!
                        </p>
                    </div>

                    {/* Top 3 Podium */}
                    <div className="flex flex-col md:flex-row justify-center items-end gap-6 mb-16 px-4">
                        {/* 2nd Place */}
                        <div className="order-2 md:order-1 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full border-4 border-black bg-gray-300 flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_#000] mb-4 relative z-10">
                                {topThree[1].avatar}
                                <div className="absolute -bottom-3 bg-gray-300 text-black border-2 border-black px-2 rounded-lg font-black text-sm">#2</div>
                            </div>
                            <div className="comic-box bg-white p-4 w-48 text-center h-48 flex flex-col justify-end bg-gradient-to-t from-gray-100 to-white">
                                <h3 className="font-black text-lg truncate w-full">{topThree[1].name}</h3>
                                <p className="text-gray-500 font-bold text-sm mb-2">{getLevelTitle(topThree[1].level).title}</p>
                                <div className="bg-black text-white rounded-lg py-1 font-black">
                                    {topThree[1].xp.toLocaleString()} XP
                                </div>
                            </div>
                        </div>

                        {/* 1st Place */}
                        <div className="order-1 md:order-2 flex flex-col items-center -mt-12">
                            <div className="relative">
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-6xl animate-bounce">👑</div>
                                <div className="w-32 h-32 rounded-full border-4 border-black bg-comic-yellow flex items-center justify-center text-6xl shadow-[6px_6px_0px_0px_#000] mb-4 relative z-10">
                                    {topThree[0].avatar}
                                    <div className="absolute -bottom-4 bg-comic-yellow text-black border-2 border-black px-3 py-1 rounded-lg font-black text-lg">#1</div>
                                </div>
                            </div>
                            <div className="comic-box bg-white p-6 w-56 text-center h-64 flex flex-col justify-end bg-gradient-to-t from-yellow-50 to-white transform scale-105 z-0 border-4 border-black">
                                <h3 className="font-black text-xl truncate w-full mb-1">{topThree[0].name}</h3>
                                <p className="text-comic-blue-dark font-black text-sm mb-4 uppercase tracking-wider">{getLevelTitle(topThree[0].level).title}</p>
                                <div className="bg-comic-yellow border-2 border-black text-black rounded-xl py-2 font-black text-xl shadow-[2px_2px_0px_0px_#000]">
                                    {topThree[0].xp.toLocaleString()} XP
                                </div>
                            </div>
                        </div>

                        {/* 3rd Place */}
                        <div className="order-3 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full border-4 border-black bg-orange-300 flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_#000] mb-4 relative z-10">
                                {topThree[2].avatar}
                                <div className="absolute -bottom-3 bg-orange-300 text-black border-2 border-black px-2 rounded-lg font-black text-sm">#3</div>
                            </div>
                            <div className="comic-box bg-white p-4 w-48 text-center h-40 flex flex-col justify-end bg-gradient-to-t from-orange-50 to-white">
                                <h3 className="font-black text-lg truncate w-full">{topThree[2].name}</h3>
                                <p className="text-gray-500 font-bold text-sm mb-2">{getLevelTitle(topThree[2].level).title}</p>
                                <div className="bg-black text-white rounded-lg py-1 font-black">
                                    {topThree[2].xp.toLocaleString()} XP
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* The Rest List */}
                    <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_#000]">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b-4 border-black">
                                    <th className="pb-4 pl-4 font-black uppercase text-gray-500">Rank</th>
                                    <th className="pb-4 font-black uppercase text-gray-500">Hero</th>
                                    <th className="pb-4 font-black uppercase text-gray-500 hidden sm:table-cell">Title</th>
                                    <th className="pb-4 pr-4 text-right font-black uppercase text-gray-500">XP</th>
                                </tr>
                            </thead>
                            <tbody className="text-lg">
                                {rest.map((rUser, index) => (
                                    <tr key={index} className="group hover:bg-yellow-50 transition-colors">
                                        <td className="py-4 pl-4 font-black text-gray-400 group-hover:text-black">#{index + 4}</td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                                    {rUser.avatar}
                                                </div>
                                                <span className="font-bold">{rUser.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 hidden sm:table-cell">
                                            <span className="px-2 py-1 bg-gray-100 border border-black rounded text-xs font-bold uppercase group-hover:bg-white">
                                                {getLevelTitle(rUser.level).title}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-right font-black text-comic-blue group-hover:text-comic-blue-dark">
                                            {rUser.xp.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
