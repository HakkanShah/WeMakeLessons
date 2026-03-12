"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { DEFAULT_USER_STATS, mergeUserStats, normalizeUserStats, type UserStats, userStatsNeedBackfill } from "@/lib/userStats";

export function useDashboardData() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<UserStats>({ ...DEFAULT_USER_STATS });
    const [loadingData, setLoadingData] = useState(true);
    const [userName, setUserName] = useState("Explorer");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        async function fetchData() {
            if (!user) return;

            try {
                setUserName(user.displayName?.split(" ")[0] || "Explorer");

                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const rawStats = userData.stats;
                    const normalizedStats = normalizeUserStats(rawStats);

                    setStats(normalizedStats);

                    if (userStatsNeedBackfill(rawStats)) {
                        await updateDoc(doc(db, "users", user.uid), {
                            stats: mergeUserStats(rawStats),
                        });
                    }

                    // Streak logic
                    const statsRecord = rawStats && typeof rawStats === "object" ? (rawStats as { lastActive?: { toDate?: () => Date } }) : {};
                    const lastActive = statsRecord.lastActive?.toDate?.();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (lastActive) {
                        const lastDate = new Date(lastActive);
                        lastDate.setHours(0, 0, 0, 0);
                        const diffDays = Math.floor(
                            (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
                        );

                        if (diffDays === 1) {
                            await updateDoc(doc(db, "users", user.uid), {
                                "stats.streak": normalizedStats.streak + 1,
                                "stats.lastActive": serverTimestamp(),
                            });
                            setStats((prev) => ({ ...prev, streak: prev.streak + 1 }));
                        } else if (diffDays > 1) {
                            await updateDoc(doc(db, "users", user.uid), {
                                "stats.streak": 1,
                                "stats.lastActive": serverTimestamp(),
                            });
                            setStats((prev) => ({ ...prev, streak: 1 }));
                        }
                    } else {
                        await updateDoc(doc(db, "users", user.uid), {
                            "stats.streak": 1,
                            "stats.gems": 10,
                            "stats.lastActive": serverTimestamp(),
                        });
                        setStats((prev) => ({ ...prev, streak: 1, gems: 10 }));
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoadingData(false);
            }
        }

        if (user) {
            fetchData();
        }
    }, [user]);

    const handleClaimReward = async (xp: number, gems: number) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, "users", user.uid), {
                "stats.xp": stats.xp + xp,
                "stats.gems": stats.gems + gems,
            });
            setStats(prev => ({
                ...prev,
                xp: prev.xp + xp,
                gems: prev.gems + gems,
            }));
        } catch (error) {
            console.error("Error claiming reward:", error);
        }
    };

    return {
        user,
        loading,
        loadingData,
        stats,
        userName,
        signOut,
        handleClaimReward,
    };
}
