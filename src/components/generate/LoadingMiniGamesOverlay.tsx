"use client";

import { useEffect, useRef, useState } from "react";

import MiniTetris from "@/components/generate/MiniTetris";
import MiniTicTacToe from "@/components/generate/MiniTicTacToe";

const WAITING_GIFS = [
    "https://i.giphy.com/media/eeL8EcBBTwSMLACw6F/200w.gif",
    "https://i.giphy.com/media/z4lwT4QTkK3sYITR7Z/200w.gif",
    "https://i.giphy.com/media/3y0oCOkdKKRi0/200w.gif",
    "https://i.giphy.com/media/tlv0osk8muiDtDl2Wx/200w.gif",
    "https://i.giphy.com/media/zOvBKUUEERdNm/200w.gif",
    "https://i.giphy.com/media/HfFccPJv7a9k4/200w.gif",
    "https://i.giphy.com/media/3oKIPf1BaBDILVxbYA/200w.gif",
] as const;

const LOADING_MESSAGES = [
    "Calibrating your learning route.",
    "Building your module mission map.",
    "Tuning challenge level and pacing.",
    "Adding examples, visuals, and drills.",
    "Preparing module assessments.",
    "Assembling your final quest trial.",
    "Final quality checks in progress.",
] as const;

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export default function LoadingMiniGamesOverlay() {
    const [messageIndex, setMessageIndex] = useState(0);
    const [gifIndex, setGifIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const progressStageRef = useRef(0);
    const stallUntilRef = useRef(0);
    const progressStopsRef = useRef<{ first: number; second: number; third: number } | null>(null);

    useEffect(() => {
        WAITING_GIFS.forEach((url) => {
            const img = new Image();
            img.src = url;
        });

        const messageInterval = window.setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 1800);

        const gifInterval = window.setInterval(() => {
            setGifIndex((prev) => (prev + 1) % WAITING_GIFS.length);
        }, 3200);

        const firstStop = randomInt(18, 35);
        const secondStop = randomInt(Math.max(firstStop + 20, 58), 86);
        const thirdStop = randomInt(Math.max(secondStop + 8, 90), 99);
        progressStopsRef.current = { first: firstStop, second: secondStop, third: thirdStop };
        progressStageRef.current = 0;
        stallUntilRef.current = 0;

        const progressInterval = window.setInterval(() => {
            const stops = progressStopsRef.current;
            if (!stops) {
                return;
            }

            const now = Date.now();
            setProgress((prev) => {
                switch (progressStageRef.current) {
                    case 0: {
                        const next = Math.min(stops.first, prev + randomFloat(3.5, 6.8));
                        if (next >= stops.first) {
                            progressStageRef.current = 1;
                            stallUntilRef.current = now + randomInt(600, 1200);
                        }
                        return next;
                    }
                    case 1: {
                        if (now >= stallUntilRef.current) {
                            progressStageRef.current = 2;
                        }
                        return prev;
                    }
                    case 2: {
                        const next = Math.min(stops.second, prev + randomFloat(3.8, 6.4));
                        if (next >= stops.second) {
                            progressStageRef.current = 3;
                            stallUntilRef.current = now + randomInt(600, 1200);
                        }
                        return next;
                    }
                    case 3: {
                        if (now >= stallUntilRef.current) {
                            progressStageRef.current = 4;
                        }
                        return prev;
                    }
                    case 4: {
                        const next = Math.min(stops.third, prev + randomFloat(2.2, 4.1));
                        if (next >= stops.third) {
                            progressStageRef.current = 5;
                        }
                        return next;
                    }
                    default:
                        return Math.min(99, prev + randomFloat(0.2, 0.55));
                }
            });
        }, 95);

        return () => {
            window.clearInterval(messageInterval);
            window.clearInterval(gifInterval);
            window.clearInterval(progressInterval);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-comic-yellow/95 p-4 animate-fade-in">
            <div className="mx-auto w-full max-w-[1320px] py-2 lg:py-6">
                <div className="mb-4 rounded-2xl border-[4px] border-black bg-white/95 px-4 py-3 text-center shadow-[5px_5px_0px_0px_#000]">
                    <p className="text-sm font-black uppercase tracking-wide text-comic-ink md:text-base">
                        While generating your course, you can play mini games.
                    </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(460px,560px)_minmax(220px,0.8fr)] lg:items-start xl:gap-6">
                    <div className="order-2 mx-auto w-full max-w-[280px] lg:order-1">
                        <MiniTicTacToe />
                    </div>

                    <div className="order-1 lg:order-2">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-[repeating-conic-gradient(#0000_0deg_10deg,rgba(0,0,0,0.1)_10deg_20deg)] opacity-20 pointer-events-none scale-[2] animate-[spin_20s_linear_infinite]" />
                            <div className="relative z-10 rotate-1 transform border-[6px] border-black bg-white p-8 shadow-[12px_12px_0px_0px_#000] md:p-10">
                                <div className="flex flex-col items-center">
                                    <div className="mb-4 w-full rounded-xl border-4 border-black bg-gray-100 p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={WAITING_GIFS[gifIndex]}
                                            alt="Course generation in progress"
                                            loading="eager"
                                            decoding="async"
                                            fetchPriority="high"
                                            className="h-44 w-full rounded-lg object-cover md:h-52"
                                        />
                                        <div className="mt-2 flex justify-center gap-1.5">
                                            {WAITING_GIFS.map((_, i) => (
                                                <span
                                                    key={i}
                                                    className={`h-2.5 w-2.5 rounded-full border border-black ${i === gifIndex ? "bg-comic-blue" : "bg-white"}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <h2 className="mb-2 text-3xl font-black uppercase tracking-tight text-black md:text-4xl">
                                        Generating...
                                    </h2>

                                    <div className="relative mb-6 h-12 w-full rounded-xl border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                                        <div
                                            className="flex h-full items-center justify-end border-r-4 border-black bg-comic-blue px-3 transition-all duration-300 ease-linear"
                                            style={{ width: `${Math.max(5, progress)}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-black mix-blend-multiply">
                                            {Math.round(progress)}%
                                        </div>
                                    </div>

                                    <p className="animate-pulse text-center text-lg font-black text-gray-700 md:text-xl">
                                        {LOADING_MESSAGES[messageIndex]}
                                    </p>
                                    <p className="mt-3 text-center text-sm font-bold text-gray-600">
                                        It may take longer when the API is busy. Play a quick game while we tailor your course.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="order-3 mx-auto w-full max-w-[320px]">
                        <MiniTetris />
                    </div>
                </div>
            </div>
        </div>
    );
}
