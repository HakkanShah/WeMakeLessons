// Mock users for leaderboard and competitive features
export interface MockUser {
    id: string;
    name: string;
    avatar: string;
    xp: number;
    level: number;
    streak: number;
    coursesCompleted: number;
    accuracy: number;
    title: string;
    joinedDaysAgo: number;
}

export const mockUsers: MockUser[] = [
    { id: "m1", name: "Alex Storm", avatar: "🦊", xp: 4520, level: 12, streak: 45, coursesCompleted: 8, accuracy: 92, title: "Champion", joinedDaysAgo: 120 },
    { id: "m2", name: "Maya Chen", avatar: "🐼", xp: 3890, level: 10, streak: 32, coursesCompleted: 7, accuracy: 88, title: "Expert", joinedDaysAgo: 95 },
    { id: "m3", name: "Jordan Blake", avatar: "🦁", xp: 3450, level: 9, streak: 28, coursesCompleted: 6, accuracy: 85, title: "Advanced", joinedDaysAgo: 80 },
    { id: "m4", name: "Sam Rivera", avatar: "🐯", xp: 2980, level: 8, streak: 21, coursesCompleted: 5, accuracy: 82, title: "Advanced", joinedDaysAgo: 70 },
    { id: "m5", name: "Riley Parker", avatar: "🦅", xp: 2540, level: 7, streak: 18, coursesCompleted: 5, accuracy: 79, title: "Intermediate", joinedDaysAgo: 65 },
    { id: "m6", name: "Taylor Kim", avatar: "🐺", xp: 2180, level: 6, streak: 14, coursesCompleted: 4, accuracy: 76, title: "Intermediate", joinedDaysAgo: 55 },
    { id: "m7", name: "Casey Lee", avatar: "🦋", xp: 1850, level: 5, streak: 12, coursesCompleted: 4, accuracy: 73, title: "Intermediate", joinedDaysAgo: 45 },
    { id: "m8", name: "Morgan Swift", avatar: "🐨", xp: 1520, level: 4, streak: 9, coursesCompleted: 3, accuracy: 71, title: "Beginner", joinedDaysAgo: 40 },
    { id: "m9", name: "Drew Martinez", avatar: "🦉", xp: 1280, level: 4, streak: 7, coursesCompleted: 3, accuracy: 68, title: "Beginner", joinedDaysAgo: 35 },
    { id: "m10", name: "Quinn Adams", avatar: "🐸", xp: 980, level: 3, streak: 5, coursesCompleted: 2, accuracy: 65, title: "Beginner", joinedDaysAgo: 28 },
    { id: "m11", name: "Avery Harper", avatar: "🐙", xp: 750, level: 2, streak: 4, coursesCompleted: 2, accuracy: 62, title: "Beginner", joinedDaysAgo: 22 },
    { id: "m12", name: "Charlie Stone", avatar: "🦜", xp: 580, level: 2, streak: 3, coursesCompleted: 1, accuracy: 60, title: "Beginner", joinedDaysAgo: 18 },
    { id: "m13", name: "Jamie Cruz", avatar: "🐻", xp: 420, level: 1, streak: 2, coursesCompleted: 1, accuracy: 58, title: "Beginner", joinedDaysAgo: 14 },
    { id: "m14", name: "Reese Wilson", avatar: "🐷", xp: 280, level: 1, streak: 2, coursesCompleted: 1, accuracy: 55, title: "Beginner", joinedDaysAgo: 10 },
    { id: "m15", name: "Skyler Frost", avatar: "🦩", xp: 150, level: 1, streak: 1, coursesCompleted: 0, accuracy: 50, title: "Newbie", joinedDaysAgo: 5 },
];

// Daily challenges configuration
export interface DailyChallenge {
    id: string;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
    gemReward: number;
    type: "lesson" | "quiz" | "streak" | "time" | "course";
    target: number;
}

export const dailyChallenges: DailyChallenge[] = [
    { id: "dc1", title: "Daily Scholar", description: "Complete 1 lesson", icon: "📖", xpReward: 20, gemReward: 1, type: "lesson", target: 1 },
    { id: "dc2", title: "Quiz Master", description: "Score 80%+ on any quiz", icon: "🎯", xpReward: 30, gemReward: 2, type: "quiz", target: 80 },
    { id: "dc3", title: "Streak Keeper", description: "Maintain your streak", icon: "🔥", xpReward: 15, gemReward: 1, type: "streak", target: 1 },
    { id: "dc4", title: "Perfect Score", description: "Get 100% on a quiz", icon: "💯", xpReward: 50, gemReward: 3, type: "quiz", target: 100 },
    { id: "dc5", title: "Speed Learner", description: "Complete 3 lessons", icon: "⚡", xpReward: 40, gemReward: 2, type: "lesson", target: 3 },
];

// Weekly challenges
export interface WeeklyChallenge {
    id: string;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
    gemReward: number;
    badgeReward?: string;
    progress: number;
    target: number;
}

export const weeklyChallenges: WeeklyChallenge[] = [
    { id: "wc1", title: "Course Conqueror", description: "Complete an entire course", icon: "🏆", xpReward: 150, gemReward: 10, badgeReward: "course_master", progress: 0, target: 1 },
    { id: "wc2", title: "Lesson Legend", description: "Complete 10 lessons", icon: "📚", xpReward: 100, gemReward: 5, progress: 0, target: 10 },
    { id: "wc3", title: "Accuracy Ace", description: "Average 85%+ quiz score", icon: "🎯", xpReward: 80, gemReward: 5, badgeReward: "accuracy_ace", progress: 0, target: 85 },
];

// Streak fire levels
export function getStreakLevel(streak: number): { emoji: string; multiplier: number; name: string } {
    if (streak >= 100) return { emoji: "👑🔥", multiplier: 2.5, name: "Legendary" };
    if (streak >= 30) return { emoji: "💜🔥", multiplier: 2.0, name: "Epic" };
    if (streak >= 14) return { emoji: "🔥🔥🔥", multiplier: 1.5, name: "Blazing" };
    if (streak >= 7) return { emoji: "🔥🔥", multiplier: 1.25, name: "Hot" };
    if (streak >= 3) return { emoji: "🔥", multiplier: 1.1, name: "Warming Up" };
    return { emoji: "✨", multiplier: 1.0, name: "Starting" };
}

// Level titles
export function getLevelTitle(level: number): { title: string; color: string } {
    if (level >= 50) return { title: "Grand Master", color: "text-purple-500" };
    if (level >= 30) return { title: "Champion", color: "text-yellow-500" };
    if (level >= 20) return { title: "Expert", color: "text-blue-500" };
    if (level >= 10) return { title: "Advanced", color: "text-green-500" };
    if (level >= 5) return { title: "Intermediate", color: "text-orange-500" };
    return { title: "Beginner", color: "text-gray-500" };
}

// XP required for each level
export function getXPForLevel(level: number): { required: number; total: number } {
    const total = level * 100 + level * 50;
    const previous = (level - 1) * 100 + (level - 1) * 50;
    return { required: total - previous, total };
}

// Find user's rank in leaderboard
export function getUserRank(userXP: number): number {
    const sortedUsers = [...mockUsers].sort((a, b) => b.xp - a.xp);
    let rank = 1;
    for (const user of sortedUsers) {
        if (userXP > user.xp) break;
        rank++;
    }
    return rank;
}
