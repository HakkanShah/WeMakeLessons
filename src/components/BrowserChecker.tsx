"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useSound } from "@/hooks/useSound";

export default function BrowserChecker() {
    const countRef = useRef(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasCheckedRef = useRef(false);
    const { playScoreRetry } = useSound();

    useEffect(() => {
        if (hasCheckedRef.current) return;
        hasCheckedRef.current = true;

        const triggerToast = () => {
            countRef.current += 1;
            const canDismissPermanently = countRef.current >= 3;

            // Play attention sound
            playScoreRetry();

            toast(
                (t) => (
                    <div className="flex flex-col gap-3 min-w-[350px]">
                        <div className="flex items-start gap-4">
                            <div className="text-4xl animate-bounce">🦖</div>
                            <div className="flex-1">
                                <h3 className="font-black text-xl uppercase tracking-tighter text-black">
                                    Browser Alert!
                                </h3>
                                <p className="font-bold text-sm leading-tight text-gray-800 mt-1">
                                    Please use <span className="text-blue-600 bg-blue-100 px-1 rounded">Google Chrome</span>.
                                </p>
                                <p className="text-xs font-bold text-gray-500 mt-1">
                                    Voice features are not supported in this browser.
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden border-2 border-black/10 mt-1">
                            <div
                                className="h-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${(countRef.current / 3) * 100}%` }}
                            />
                        </div>

                        <p className="text-[10px] font-black text-right text-gray-400 uppercase tracking-widest">
                            Reminder {countRef.current}/3
                        </p>

                        <button
                            onClick={() => {
                                toast.dismiss(t.id);
                                if (canDismissPermanently && intervalRef.current) {
                                    clearInterval(intervalRef.current);
                                    intervalRef.current = null;
                                }
                            }}
                            className={`w-full rounded-xl border-2 border-black px-4 py-3 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:shadow-none transition-all ${canDismissPermanently
                                ? "bg-gray-800 text-white hover:bg-gray-900"
                                : "bg-yellow-400 text-black hover:bg-yellow-500"
                                }`}
                        >
                            {canDismissPermanently ? "Don't show again" : "Okay, got it!"}
                        </button>
                    </div>
                ),
                {
                    duration: 60000,
                    id: "browser-check-toast",
                    position: "top-center",
                    style: {
                        backgroundColor: "#fff",
                        color: "#000",
                        border: "5px solid #000",
                        boxShadow: "12px 12px 0px 0px #000", // Deeper shadow as requested
                        borderRadius: "20px",
                        padding: "20px",
                        maxWidth: "500px" // Wider as requested
                    },
                }
            );
        };

        const checkBrowser = () => {
            const userAgent = navigator.userAgent;

            // Check for strict Chrome (Exclude Edge and Opera)
            const isChrome = userAgent.indexOf("Chrome") > -1;
            const isEdge = userAgent.indexOf("Edg") > -1;
            const isOpera = userAgent.indexOf("OPR") > -1;
            const isStrictChrome = isChrome && !isEdge && !isOpera;

            if (!isStrictChrome) {
                // Show immediately
                triggerToast();

                // Repeat every 60 seconds
                intervalRef.current = setInterval(triggerToast, 60000);
            }
        };

        checkBrowser();

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [playScoreRetry]);

    return null;
}
