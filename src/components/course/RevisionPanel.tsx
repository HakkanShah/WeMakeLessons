"use client";

import type { StructuredModuleRevision } from "@/lib/structuredCourse";

interface RevisionPanelProps {
    revision: StructuredModuleRevision;
    loading?: boolean;
    onRefresh: () => void;
}

export default function RevisionPanel({ revision, loading = false, onRefresh }: RevisionPanelProps) {
    return (
        <section className="comic-box p-6 md:p-8 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-800 font-medium">Review plan</p>
                    <h3 className="mt-2 text-3xl font-black leading-tight text-comic-ink">{revision.title}</h3>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-800 font-medium">{revision.summary}</p>
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    className="btn-secondary px-4 py-2"
                >
                    {loading ? "Refreshing..." : "Refresh review"}
                </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-3xl panel-border-sm bg-comic-paper p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-800 font-medium">Focus areas</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        {revision.focusAreas.map((area) => (
                            <span
                                key={area}
                                className="rounded-full bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 font-medium"
                            >
                                {area}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-3xl panel-border-sm bg-comic-paper p-5">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-800 font-medium">Quick refresher</p>
                        <p className="mt-3 text-sm leading-7 text-slate-800 font-medium">{revision.refresher}</p>
                    </div>
                    <div className="rounded-3xl panel-border-sm bg-comic-paper p-5">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-800 font-medium">Retry practice</p>
                        <p className="mt-3 text-sm leading-7 text-slate-800 font-medium">{revision.practice}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
