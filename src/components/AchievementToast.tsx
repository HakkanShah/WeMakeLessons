"use client";

interface AchievementToastProps {
    show: boolean;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
    onClose: () => void;
}

export default function AchievementToast({ show, title, description, icon, xpReward, onClose }: AchievementToastProps) {
    if (!show) return null;

    return (
        <div
            className="fixed top-20 right-4 z-50 animate-achievement"
            onAnimationEnd={onClose}
        >
            <div className="comic-box p-4 bg-gradient-to-r from-comic-yellow to-yellow-400 border-comic-ink min-w-[300px]">
                <div className="flex items-center gap-4">
                    {/* Icon with glow */}
                    <div className="w-16 h-16 bg-white rounded-xl border-2 border-comic-ink flex items-center justify-center text-4xl animate-glow">
                        {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-comic-ink/60 mb-1">
                            🎉 Achievement Unlocked!
                        </p>
                        <h3 className="font-black text-lg text-comic-ink leading-tight">
                            {title}
                        </h3>
                        <p className="text-sm font-bold text-comic-ink/70">
                            {description}
                        </p>
                        <p className="text-sm font-black text-comic-ink mt-1">
                            +{xpReward} XP Bonus
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
