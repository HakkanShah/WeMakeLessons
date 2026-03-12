"use client";

import { useEffect, useRef, useState } from "react";
import type { StructuredLessonDiagram } from "@/lib/structuredCourse";

interface LessonDiagramCardProps {
    diagram: StructuredLessonDiagram;
}

/**
 * Escape special Mermaid characters in labels so the chart doesn't break.
 */
function escapeMermaidLabel(text: string): string {
    return text
        .replace(/"/g, "'")
        .replace(/[[\]{}()#&;]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Build a Mermaid flowchart definition from structured diagram steps.
 */
function buildMermaidDefinition(diagram: StructuredLessonDiagram): string {
    const lines: string[] = [];

    // Theming via init directive
    lines.push(
        "%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#ffe066', 'primaryTextColor': '#1e1e2e', 'primaryBorderColor': '#1e1e2e', 'lineColor': '#1e1e2e', 'secondaryColor': '#e9f5ff', 'tertiaryColor': '#eefbf1', 'fontFamily': 'inherit', 'fontSize': '14px' }}}%%"
    );
    lines.push("graph TD");

    diagram.steps.forEach((step, index) => {
        const nodeId = `S${index}`;
        const label = escapeMermaidLabel(step.title);
        const detail = escapeMermaidLabel(step.detail).slice(0, 80);

        if (index === 0) {
            lines.push(`    ${nodeId}(["🟢 ${label}"])`);
        } else if (index === diagram.steps.length - 1) {
            lines.push(`    ${nodeId}((("🏁 ${label}")))`);
        } else {
            lines.push(`    ${nodeId}("${label}")`);
        }

        if (index < diagram.steps.length - 1) {
            const nextId = `S${index + 1}`;
            lines.push(`    ${nodeId} -->|"${detail}"| ${nextId}`);
        }
    });

    lines.push("");
    lines.push("    classDef startNode fill:#dcfce7,stroke:#1e1e2e,stroke-width:3px,color:#1e1e2e,font-weight:900");
    lines.push("    classDef endNode fill:#e9f5ff,stroke:#1e1e2e,stroke-width:3px,color:#1e1e2e,font-weight:900");
    lines.push("    classDef midNode fill:#fff7d6,stroke:#1e1e2e,stroke-width:2px,color:#1e1e2e,font-weight:700");
    lines.push(`    class S0 startNode`);
    lines.push(`    class S${diagram.steps.length - 1} endNode`);
    if (diagram.steps.length > 2) {
        const midIds = diagram.steps.slice(1, -1).map((_, i) => `S${i + 1}`).join(",");
        lines.push(`    class ${midIds} midNode`);
    }

    return lines.join("\n");
}

export default function LessonDiagramCard({ diagram }: LessonDiagramCardProps) {
    // Use a raw ref to an outer wrapper; Mermaid renders into an inner
    // <div> that React never touches, so removeChild conflicts are avoided.
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [svgHtml, setSvgHtml] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const lastStepIndex = diagram.steps.length - 1;
    const [activeStep, setActiveStep] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function render() {
            setLoading(true);
            setSvgHtml(null);
            setError(null);

            try {
                const mermaid = (await import("mermaid")).default;
                mermaid.initialize({
                    startOnLoad: false,
                    theme: "base",
                    securityLevel: "loose",
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true,
                        curve: "basis",
                        padding: 16,
                        nodeSpacing: 40,
                        rankSpacing: 60,
                    },
                    themeVariables: {
                        primaryColor: "#ffe066",
                        primaryTextColor: "#1e1e2e",
                        primaryBorderColor: "#1e1e2e",
                        lineColor: "#1e1e2e",
                        secondaryColor: "#e9f5ff",
                        tertiaryColor: "#eefbf1",
                        fontFamily: "inherit",
                    },
                });

                const definition = buildMermaidDefinition(diagram);
                const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

                const { svg } = await mermaid.render(uniqueId, definition);
                if (!cancelled) {
                    setSvgHtml(svg);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Mermaid render error:", err);
                if (!cancelled) {
                    setError("Diagram could not be rendered. Showing step-by-step view instead.");
                    setLoading(false);
                }
            }
        }

        void render();

        return () => {
            cancelled = true;
        };
    }, [diagram]);

    // When svgHtml changes, inject it into the wrapper ref directly
    // This avoids React's DOM diffing touching Mermaid's generated SVG
    useEffect(() => {
        if (!wrapperRef.current) return;

        if (svgHtml) {
            wrapperRef.current.innerHTML = svgHtml;
        } else {
            wrapperRef.current.innerHTML = "";
        }
    }, [svgHtml]);

    // Clean up Mermaid SVG on unmount to prevent orphaned nodes
    useEffect(() => {
        const node = wrapperRef.current;
        return () => {
            if (node) {
                node.innerHTML = "";
            }
        };
    }, []);

    return (
        <section className="quest-canvas overflow-hidden">
            {/* Header */}
            <div className="border-b-[3px] border-black bg-gradient-to-r from-comic-blue/10 via-comic-purple/10 to-comic-green/10 px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-black bg-comic-blue px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white shadow-[3px_3px_0px_0px_#000]">
                                📊 Diagram
                            </span>
                            <span className="rounded-full border-2 border-comic-green bg-comic-green/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-comic-green-dark">
                                {diagram.steps.length} steps
                            </span>
                        </div>
                        <h3 className="mt-3 text-2xl font-black leading-tight text-comic-ink [overflow-wrap:anywhere]">
                            {diagram.title}
                        </h3>
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                            {diagram.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Mermaid flowchart — rendered via dangerouslySetInnerHTML would also
                conflict with React, so we use a ref-based approach that React ignores */}
            <div className="p-5 md:p-6">
                <div className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000] overflow-x-auto">
                    {error && (
                        <p className="mb-3 rounded-xl bg-comic-yellow/20 px-3 py-2 text-xs font-bold text-amber-700">
                            ⚠️ {error}
                        </p>
                    )}

                    {/* Loading state */}
                    {loading && !error && (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
                            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-comic-blue border-t-transparent" />
                            <p className="text-xs font-bold uppercase tracking-wider">Rendering diagram...</p>
                        </div>
                    )}

                    {/* Mermaid SVG container — React never manages children of this div */}
                    <div
                        ref={wrapperRef}
                        className="mermaid-container flex items-center justify-center"
                        suppressHydrationWarning
                    />
                </div>
            </div>

            {/* Interactive step cards */}
            <div className="border-t-[3px] border-black bg-gradient-to-b from-comic-yellow/5 to-white px-5 py-5 md:px-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 mb-4">
                    Step-by-step breakdown
                </p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {diagram.steps.map((step, index) => (
                        <button
                            key={`${step.title}-${index}`}
                            type="button"
                            onClick={() => setActiveStep(activeStep === index ? null : index)}
                            className={`group relative rounded-2xl border-[3px] p-4 text-left transition-all shadow-[3px_3px_0px_0px_#000] ${
                                activeStep === index
                                    ? "border-comic-blue bg-comic-blue/10 -translate-y-1 shadow-[5px_5px_0px_0px_#000]"
                                    : index === 0
                                        ? "border-comic-green bg-comic-green/5 hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_#000]"
                                        : index === lastStepIndex
                                            ? "border-comic-blue bg-comic-blue/5 hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_#000]"
                                            : "border-black bg-white hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_#000]"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-[2px] border-black text-sm font-black shadow-[2px_2px_0px_0px_#000] ${
                                    index === 0
                                        ? "bg-comic-green text-white"
                                        : index === lastStepIndex
                                            ? "bg-comic-blue text-white"
                                            : "bg-comic-yellow text-black"
                                }`}>
                                    {index === 0 ? "🟢" : index === lastStepIndex ? "🏁" : index + 1}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                        {index === 0 ? "Start" : index === lastStepIndex ? "Outcome" : `Stage ${index}`}
                                    </p>
                                    <p className="mt-0.5 text-sm font-black leading-5 text-comic-ink [overflow-wrap:anywhere]">
                                        {step.title}
                                    </p>
                                </div>
                            </div>

                            {activeStep === index && (
                                <div className="mt-3 rounded-xl border-2 border-comic-blue/30 bg-white p-3 animate-fade-in">
                                    <p className="text-sm leading-6 text-slate-700 font-medium">
                                        {step.detail}
                                    </p>
                                </div>
                            )}

                            {index < lastStepIndex && (
                                <div className="absolute -bottom-3 left-1/2 z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-black bg-white text-[10px] font-black text-comic-blue-dark shadow-[1px_1px_0px_0px_#000]">
                                    ↓
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
