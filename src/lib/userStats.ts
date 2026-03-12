export interface UserStats {
    xp: number;
    level: number;
    streak: number;
    gems: number;
}

export const DEFAULT_USER_STATS: UserStats = {
    xp: 0,
    level: 1,
    streak: 0,
    gems: 0,
};

const STAT_KEYS = ["xp", "level", "streak", "gems"] as const;

function asStatsRecord(raw: unknown): Record<string, unknown> {
    return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function toSafeNumber(value: unknown, fallback: number): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeUserStats(raw: unknown): UserStats {
    const source = asStatsRecord(raw);

    return {
        xp: Math.max(0, toSafeNumber(source.xp, DEFAULT_USER_STATS.xp)),
        level: Math.max(1, toSafeNumber(source.level, DEFAULT_USER_STATS.level)),
        streak: Math.max(0, toSafeNumber(source.streak, DEFAULT_USER_STATS.streak)),
        gems: Math.max(0, toSafeNumber(source.gems, DEFAULT_USER_STATS.gems)),
    };
}

export function mergeUserStats(raw: unknown): Record<string, unknown> & UserStats {
    return {
        ...asStatsRecord(raw),
        ...normalizeUserStats(raw),
    };
}

export function userStatsNeedBackfill(raw: unknown): boolean {
    const source = asStatsRecord(raw);
    const normalized = normalizeUserStats(raw);

    return STAT_KEYS.some((key) => source[key] !== normalized[key]);
}
