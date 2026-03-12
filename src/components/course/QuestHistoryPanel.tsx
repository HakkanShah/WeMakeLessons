"use client";

import type { QuestHistoryItem } from "@/lib/questHistory";

interface QuestHistoryPanelProps {
    items: QuestHistoryItem[];
    visibleItems: QuestHistoryItem[];
    loading: boolean;
    error: string | null;
    searchValue: string;
    filter: "all" | "fresh" | "active" | "completed";
    onSearchChange: (value: string) => void;
    onFilterChange: (value: "all" | "fresh" | "active" | "completed") => void;
    onResume: (item: QuestHistoryItem) => void;
    onRemix: (item: QuestHistoryItem) => void;
    onRetry: () => void;
}

const FILTERS: Array<{ id: "all" | "fresh" | "active" | "completed"; label: string }> = [
    { id: "all", label: "All" },
    { id: "fresh", label: "Fresh" },
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
];

const STATUS_STYLES: Record<QuestHistoryItem["status"], string> = {
    fresh: "bg-comic-yellow text-black",
    active: "bg-comic-blue text-white",
    completed: "bg-comic-green text-black",
};

function getCourseIcon(title: string) {
    const t = title.toLowerCase();
    if (t.includes("space") || t.includes("star")) return "🚀";
    if (t.includes("math") || t.includes("number")) return "🧮";
    if (t.includes("history") || t.includes("ancient")) return "🏛️";
    if (t.includes("science") || t.includes("chem")) return "🧪";
    if (t.includes("animal") || t.includes("nature")) return "🐾";
    if (t.includes("art") || t.includes("draw")) return "🎨";
    if (t.includes("code") || t.includes("program")) return "💻";
    if (t.includes("music")) return "🎵";
    return "🎒";
}

function getStatusLabel(status: QuestHistoryItem["status"]) {
    if (status === "completed") return "Completed";
    if (status === "active") return "In Progress";
    return "Fresh Drop";
}

function HistoryCard({
    item,
    onResume,
    onRemix,
}: {
    item: QuestHistoryItem;
    onResume: (item: QuestHistoryItem) => void;
    onRemix: (item: QuestHistoryItem) => void;
}) {
    return (
        <article className="rounded-[28px] border-[4px] border-black bg-white p-5 shadow-[6px_6px_0px_0px_#000] transition hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0px_0px_#000]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-black bg-[#fff8ef] text-3xl shadow-[3px_3px_0px_0px_#000]">
                        {getCourseIcon(item.title)}
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">{item.topic}</p>
                        <h3 className="text-xl font-black leading-tight text-black">{item.title}</h3>
                    </div>
                </div>
                <span className={`rounded-full border-[3px] border-black px-3 py-1 text-xs font-black uppercase ${STATUS_STYLES[item.status]}`}>
                    {getStatusLabel(item.status)}
                </span>
            </div>

            <p className="mt-4 line-clamp-3 text-sm font-bold leading-7 text-gray-600">{item.description}</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border-[3px] border-black bg-[#f7fbff] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Quest Build</p>
                    <p className="mt-2 text-lg font-black text-black">{item.modulesCount} modules</p>
                    <p className="text-sm font-bold text-gray-600">{item.lessonsCount} stages</p>
                </div>
                <div className="rounded-2xl border-[3px] border-black bg-[#fff8ef] p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Challenge</p>
                    <p className="mt-2 text-lg font-black text-black">{item.difficulty}</p>
                    <p className="text-sm font-bold text-gray-600">{item.duration}</p>
                </div>
            </div>

            <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                    <span>Progress</span>
                    <span>{item.progressPercent}%</span>
                </div>
                <div className="mt-2 h-4 overflow-hidden rounded-full border-[3px] border-black bg-white">
                    <div
                        className="h-full bg-comic-blue progress-stripes transition-all"
                        style={{ width: `${Math.max(item.progressPercent, item.completedLessons > 0 ? 8 : 0)}%` }}
                    />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm font-bold text-gray-600">
                    <span>{item.completedLessons}/{item.lessonsCount} stages cleared</span>
                    <span>{item.lastAccessedLabel}</span>
                </div>
            </div>

            <div className="mt-5 flex gap-3">
                <button
                    type="button"
                    onClick={() => onResume(item)}
                    className="flex-1 rounded-2xl border-[4px] border-black bg-comic-blue px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[4px_4px_0px_0px_#000]"
                >
                    {item.status === "completed" ? "Replay Quest" : item.status === "active" ? "Resume Quest" : "Open Quest"}
                </button>
                <button
                    type="button"
                    onClick={() => onRemix(item)}
                    className="rounded-2xl border-[4px] border-black bg-comic-yellow px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-black shadow-[4px_4px_0px_0px_#000]"
                >
                    Remix
                </button>
            </div>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
                Created {item.createdAtLabel}
            </p>
        </article>
    );
}

export default function QuestHistoryPanel({
    items,
    visibleItems,
    loading,
    error,
    searchValue,
    filter,
    onSearchChange,
    onFilterChange,
    onResume,
    onRemix,
    onRetry,
}: QuestHistoryPanelProps) {
    const totalLessons = items.reduce((sum, item) => sum + item.lessonsCount, 0);
    const activeCount = items.filter((item) => item.status === "active").length;
    const completedCount = items.filter((item) => item.status === "completed").length;
    const latestQuest = items[0] || null;

    return (
        <section className="mx-auto mt-10 max-w-7xl">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="inline-flex rounded-full border-[3px] border-black bg-comic-yellow px-4 py-1 text-xs font-black uppercase tracking-[0.18em] text-black">
                        Quest Vault
                    </div>
                    <h2 className="mt-3 text-4xl font-black leading-tight text-black md:text-5xl">
                        Every course you generated, all in one place.
                    </h2>
                    <p className="mt-2 text-base font-bold leading-7 text-gray-600">
                        Resume old adventures, remix a topic, or track which quests are fully conquered.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                        { label: "Forged", value: items.length },
                        { label: "Active", value: activeCount },
                        { label: "Completed", value: completedCount },
                        { label: "Stages", value: totalLessons },
                    ].map((stat, index) => (
                        <div
                            key={stat.label}
                            className={`rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-center shadow-[4px_4px_0px_0px_#000] ${index % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]"}`}
                        >
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">{stat.label}</p>
                            <p className="mt-1 text-2xl font-black text-black">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[32px] border-[4px] border-black bg-comic-blue p-6 text-white shadow-[8px_8px_0px_0px_#000]">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/80">Latest Drop</p>

                    {latestQuest ? (
                        <div className="mt-4 rounded-[28px] border-[4px] border-black bg-white p-5 text-black shadow-[5px_5px_0px_0px_#000]">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-black bg-comic-yellow text-4xl shadow-[3px_3px_0px_0px_#000]">
                                        {getCourseIcon(latestQuest.title)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">{latestQuest.topic}</p>
                                        <h3 className="text-2xl font-black leading-tight">{latestQuest.title}</h3>
                                        <p className="mt-1 text-sm font-bold text-gray-600">{latestQuest.createdAtLabel}</p>
                                    </div>
                                </div>
                                <span className={`rounded-full border-[3px] border-black px-3 py-1 text-xs font-black uppercase ${STATUS_STYLES[latestQuest.status]}`}>
                                    {getStatusLabel(latestQuest.status)}
                                </span>
                            </div>

                            <p className="mt-4 text-base font-bold leading-7 text-gray-700">{latestQuest.description}</p>

                            <div className="mt-5 grid gap-4 md:grid-cols-3">
                                <div className="rounded-2xl border-[3px] border-black bg-[#f7fbff] p-4">
                                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Modules</p>
                                    <p className="mt-2 text-2xl font-black">{latestQuest.modulesCount}</p>
                                </div>
                                <div className="rounded-2xl border-[3px] border-black bg-[#fff8ef] p-4">
                                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Stages</p>
                                    <p className="mt-2 text-2xl font-black">{latestQuest.lessonsCount}</p>
                                </div>
                                <div className="rounded-2xl border-[3px] border-black bg-[#eefbf1] p-4">
                                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Progress</p>
                                    <p className="mt-2 text-2xl font-black">{latestQuest.progressPercent}%</p>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => onResume(latestQuest)}
                                    className="rounded-2xl border-[4px] border-black bg-comic-blue px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[4px_4px_0px_0px_#000]"
                                >
                                    Jump In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onRemix(latestQuest)}
                                    className="rounded-2xl border-[4px] border-black bg-comic-yellow px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-black shadow-[4px_4px_0px_0px_#000]"
                                >
                                    Remix Topic
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-[28px] border-[4px] border-black bg-white p-6 text-black shadow-[5px_5px_0px_0px_#000]">
                            <p className="text-xl font-black">Your next quest will land here.</p>
                            <p className="mt-2 text-base font-bold leading-7 text-gray-600">
                                Generate one amazing course and your vault starts filling up immediately.
                            </p>
                        </div>
                    )}
                </div>

                <div className="rounded-[32px] border-[4px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_#000]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Finder</p>
                            <h3 className="mt-1 text-2xl font-black text-black">Search your archive</h3>
                        </div>
                        <div className="rounded-full border-[3px] border-black bg-comic-yellow px-3 py-1 text-xs font-black uppercase">
                            {visibleItems.length} showing
                        </div>
                    </div>

                    <input
                        value={searchValue}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search by title or topic"
                        className="mt-5 w-full rounded-2xl border-[3px] border-black bg-[#fff8ef] px-5 py-4 text-base font-bold text-black outline-none placeholder:text-gray-400"
                    />

                    <div className="mt-4 flex flex-wrap gap-3">
                        {FILTERS.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onFilterChange(item.id)}
                                className={`rounded-full border-[3px] border-black px-4 py-2 text-xs font-black uppercase tracking-[0.16em] shadow-[3px_3px_0px_0px_#000] ${filter === item.id ? "bg-comic-blue text-white" : "bg-white text-black"}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-6 rounded-3xl border-[3px] border-black bg-[#f7fbff] p-5">
                        <p className="text-sm font-black uppercase tracking-[0.16em] text-gray-500">Vault Notes</p>
                        <div className="mt-3 space-y-3 text-sm font-bold leading-7 text-gray-700">
                            <p>Resume any quest exactly where you left it.</p>
                            <p>Use Remix when a topic deserves a fresh run with a new challenge level.</p>
                            <p>Completed quests stay here as your personal learning trophy shelf.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                {error ? (
                    <div className="rounded-[32px] border-[4px] border-black bg-white p-8 text-center shadow-[8px_8px_0px_0px_#000]">
                        <div className="text-6xl">🌩️</div>
                        <h3 className="mt-4 text-3xl font-black text-black">Quest vault failed to load.</h3>
                        <p className="mt-2 text-base font-bold leading-7 text-gray-600">{error}</p>
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-6 rounded-2xl border-[4px] border-black bg-comic-yellow px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-black shadow-[4px_4px_0px_0px_#000]"
                        >
                            Reload Vault
                        </button>
                    </div>
                ) : loading ? (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="h-80 rounded-[28px] border-[4px] border-gray-300 bg-gray-200 animate-pulse"
                            />
                        ))}
                    </div>
                ) : visibleItems.length > 0 ? (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {visibleItems.map((item) => (
                            <HistoryCard
                                key={item.id}
                                item={item}
                                onResume={onResume}
                                onRemix={onRemix}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[32px] border-[4px] border-black bg-white p-10 text-center shadow-[8px_8px_0px_0px_#000]">
                        <div className="text-6xl">🗂️</div>
                        <h3 className="mt-4 text-3xl font-black text-black">
                            {items.length === 0 ? "No quests in the vault yet." : "No quests match this search."}
                        </h3>
                        <p className="mt-2 text-base font-bold leading-7 text-gray-600">
                            {items.length === 0
                                ? "Launch one great course and your full history starts here."
                                : "Try another keyword or switch the status filter."}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
