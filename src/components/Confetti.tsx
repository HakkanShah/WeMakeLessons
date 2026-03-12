"use client";

import { useState, useEffect } from "react";

interface ConfettiProps {
    trigger: boolean;
    duration?: number;
}

const colors = ['#FFD43B', '#FF6B6B', '#4DABF7', '#51CF66', '#CC5DE8', '#FF922B'];

export default function Confetti({ trigger, duration = 3000 }: ConfettiProps) {
    const [particles, setParticles] = useState<{ id: number; color: string; left: number; delay: number; size: number }[]>([]);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (trigger) {
            const newParticles = Array.from({ length: 50 }, (_, i) => ({
                id: i,
                color: colors[Math.floor(Math.random() * colors.length)],
                left: Math.random() * 100,
                delay: Math.random() * 0.5,
                size: Math.random() * 8 + 4,
            }));
            setParticles(newParticles);
            setShow(true);

            const timer = setTimeout(() => {
                setShow(false);
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [trigger, duration]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute animate-confetti"
                    style={{
                        left: `${particle.left}%`,
                        top: '-20px',
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        backgroundColor: particle.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '0',
                        animationDelay: `${particle.delay}s`,
                    }}
                />
            ))}
        </div>
    );
}
