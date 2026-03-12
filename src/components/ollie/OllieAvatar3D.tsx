"use client";

import { useEffect, useState } from "react";

export type OllieExpression = "idle" | "listening" | "thinking" | "speaking";

interface OllieAvatarProps {
    expression?: OllieExpression;
}

/**
 * Large animated owl emoji avatar with CSS-driven expression animations.
 * Replaces the Three.js 3D avatar with lightweight, cross-browser-compatible emoji + CSS.
 */
export default function OllieAvatar({ expression = "idle" }: OllieAvatarProps) {
    const [blinkOpen, setBlinkOpen] = useState(true);

    // Periodic blink for idle state
    useEffect(() => {
        if (expression !== "idle" && expression !== "speaking") return;
        const interval = setInterval(() => {
            setBlinkOpen(false);
            setTimeout(() => setBlinkOpen(true), 150);
        }, 3200 + Math.random() * 1500);
        return () => clearInterval(interval);
    }, [expression]);

    const expressionConfig = {
        idle: {
            containerClass: "ollie-avatar--idle",
            ringClass: "",
            emoji: "🦉",
            label: "Ready to help!",
        },
        listening: {
            containerClass: "ollie-avatar--listening",
            ringClass: "ollie-ring--listening",
            emoji: "🦉",
            label: "I'm listening...",
        },
        thinking: {
            containerClass: "ollie-avatar--thinking",
            ringClass: "ollie-ring--thinking",
            emoji: "🦉",
            label: "Hmm, let me think...",
        },
        speaking: {
            containerClass: "ollie-avatar--speaking",
            ringClass: "ollie-ring--speaking",
            emoji: "🦉",
            label: "Speaking...",
        },
    };

    const config = expressionConfig[expression];

    return (
        <div className="ollie-avatar-wrapper">
            {/* Outer animated ring */}
            <div className={`ollie-avatar-ring ${config.ringClass}`} />

            {/* Secondary ring (pulse effect) */}
            {(expression === "listening" || expression === "speaking") && (
                <div className={`ollie-avatar-ring-secondary ${config.ringClass}`} />
            )}

            {/* Emoji container */}
            <div className={`ollie-avatar-emoji ${config.containerClass} ${!blinkOpen && expression !== "thinking" ? "ollie-avatar--blink" : ""}`}>
                <span className="ollie-emoji-face">{config.emoji}</span>

                {/* Expression overlays */}
                {expression === "listening" && (
                    <div className="ollie-expression-indicator">
                        <div className="ollie-sound-wave">
                            <span /><span /><span /><span /><span />
                        </div>
                    </div>
                )}

                {expression === "thinking" && (
                    <div className="ollie-thinking-dots">
                        <span>.</span><span>.</span><span>.</span>
                    </div>
                )}

                {expression === "speaking" && (
                    <div className="ollie-speaking-waves">
                        <span /><span /><span />
                    </div>
                )}
            </div>

        </div>
    );
}
