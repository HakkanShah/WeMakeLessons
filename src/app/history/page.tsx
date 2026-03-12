"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import QuestHistoryPanel from "@/components/course/QuestHistoryPanel";
import Sidebar from "@/components/Sidebar";
import { db } from "@/lib/firebase";
import { fetchQuestHistory, type QuestHistoryItem } from "@/lib/questHistory";
import { useDashboardData } from "@/lib/useDashboardData";

export default function HistoryPage() {
    const router = useRouter();
    const { user, loading, stats, userName, signOut } = useDashboardData();

    const [history, setHistory] = useState<QuestHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [historySearch, setHistorySearch] = useState("");
    const [historyFilter, setHistoryFilter] = useState<"all" | "fresh" | "active" | "completed">("all");
    const deferredHistorySearch = useDeferredValue(historySearch.trim().toLowerCase());

    async function loadHistory() {
        if (!user) {
            return;
        }

        setHistoryLoading(true);
        setHistoryError(null);

        try {
            const nextHistory = await fetchQuestHistory(db, user.uid);
            setHistory(nextHistory);
        } catch (error) {
            console.error(error);
            setHistoryError(error instanceof Error ? error.message : "Failed to load quest history.");
        } finally {
            setHistoryLoading(false);
        }
    }

    useEffect(() => {
        if (!user) {
            return;
        }

        void loadHistory();
    }, [user]);

    if (loading || !user) {
        return null;
    }

    const filteredHistory = history.filter((item) => {
        const filterMatch = historyFilter === "all" ? true : item.status === historyFilter;
        const searchMatch = deferredHistorySearch
            ? `${item.title} ${item.topic}`.toLowerCase().includes(deferredHistorySearch)
            : true;

        return filterMatch && searchMatch;
    });

    function handleResumeQuest(item: QuestHistoryItem) {
        const target = item.currentLessonId
            ? `/course/${item.id}?lesson=${encodeURIComponent(item.currentLessonId)}`
            : `/course/${item.id}`;
        router.push(target);
    }

    function handleRemixQuest(item: QuestHistoryItem) {
        router.push(
            `/generate?topic=${encodeURIComponent(item.topic)}&level=${encodeURIComponent(item.difficulty.toLowerCase())}&duration=${encodeURIComponent(item.duration)}`
        );
    }

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

            <main className="lg:ml-80 min-h-screen px-4 pb-12 pt-24 md:px-8 lg:px-12">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="inline-flex rounded-full border-[3px] border-black bg-comic-yellow px-4 py-1 text-xs font-black uppercase tracking-[0.18em] text-black">
                                History
                            </div>
                            <h1 className="mt-3 text-4xl font-black leading-tight text-black md:text-6xl">
                                Your complete quest history.
                            </h1>
                            <p className="mt-2 max-w-3xl text-lg font-bold leading-8 text-gray-600">
                                Every generated course, every progress checkpoint, and every finished adventure lives here.
                            </p>
                        </div>

                        <Link
                            href="/generate"
                            className="inline-flex rounded-2xl border-[4px] border-black bg-comic-blue px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[6px_6px_0px_0px_#000]"
                        >
                            Forge New Quest
                        </Link>
                    </div>
                </div>

                <QuestHistoryPanel
                    items={history}
                    visibleItems={filteredHistory}
                    loading={historyLoading}
                    error={historyError}
                    searchValue={historySearch}
                    filter={historyFilter}
                    onSearchChange={setHistorySearch}
                    onFilterChange={setHistoryFilter}
                    onResume={handleResumeQuest}
                    onRemix={handleRemixQuest}
                    onRetry={() => {
                        void loadHistory();
                    }}
                />
            </main>
        </div>
    );
}
