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
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-comic-paper bg-dot-pattern flex items-center justify-center p-6">
            <div className="max-w-md w-full comic-box bg-white p-8 text-center border-comic-red relative animate-pop">
                {/* Comic "BOOM" decoration */}
                <div className="absolute -top-12 -right-12 text-9xl transform rotate-12 select-none pointer-events-none opacity-20 md:opacity-100">
                    💥
                </div>

                <div className="text-6xl mb-6 grayscale">😵</div>

                <div className="inline-block px-4 py-1 bg-comic-red text-white font-black text-sm uppercase tracking-widest mb-4 rotate-1 rounded shadow-sm">
                    System Failure
                </div>

                <h2 className="text-4xl font-black mb-4 text-comic-ink">
                    Oops! Something Exploded!
                </h2>

                <p className="font-bold text-gray-500 mb-8 text-lg">
                    Don't worry, our robo-mechanics are on it. It's just a small glitch in the matrix.
                </p>

                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-8 text-left overflow-hidden">
                    <p className="text-xs font-mono text-gray-400 mb-1 uppercase">Error Code:</p>
                    <code className="text-sm font-bold text-comic-red break-all">
                        {error.message || "Unknown Error"}
                    </code>
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={reset}
                        className="btn-primary w-full py-4 text-xl"
                    >
                        🔄 Try Again
                    </button>
                    <Link href="/dashboard">
                        <button className="btn-secondary w-full py-4 text-xl">
                            🏠 Return to Base
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
