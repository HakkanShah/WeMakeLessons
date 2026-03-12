"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-comic-paper bg-dot-pattern p-6">
            <div className="relative w-full max-w-md comic-box border-comic-red bg-white p-8 text-center animate-pop">
                <div className="absolute -right-12 -top-12 rotate-12 select-none text-9xl opacity-20 pointer-events-none md:opacity-100">
                    {"\u{1F4A5}"}
                </div>

                <div className="mb-6 text-6xl grayscale">{"\u{1F635}"}</div>

                <div className="mb-4 inline-block rotate-1 rounded bg-comic-red px-4 py-1 text-sm font-black uppercase tracking-widest text-white shadow-sm">
                    System Failure
                </div>

                <h2 className="mb-4 text-4xl font-black text-comic-ink">
                    Oops! Something Exploded!
                </h2>

                <p className="mb-8 text-lg font-bold text-gray-500">
                    Don&apos;t worry, our robo-mechanics are on it. It&apos;s just a small glitch in the matrix.
                </p>

                <div className="mb-8 overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50 p-4 text-left">
                    <p className="mb-1 text-xs font-mono uppercase text-gray-400">Error Code:</p>
                    <code className="break-all text-sm font-bold text-comic-red">
                        {error.message || "Unknown Error"}
                    </code>
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={reset}
                        className="btn-primary w-full py-4 text-xl"
                    >
                        {"\u{1F504}"} Try Again
                    </button>
                    <Link href="/dashboard" className="btn-secondary w-full py-4 text-xl">
                        {"\u{1F3E0}"} Return to Base
                    </Link>
                </div>
            </div>
        </div>
    );
}
