"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { LearningProfile } from "@/lib/adaptiveEngine";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    hasCompletedOnboarding: boolean | null;
    learningProfile: LearningProfile | null;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    hasCompletedOnboarding: null,
    learningProfile: null,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
    const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setHasCompletedOnboarding(data.onboardingCompleted === true);
                        setLearningProfile(data.learningProfile || null);
                    } else {
                        setHasCompletedOnboarding(false);
                        setLearningProfile(null);
                    }
                } catch (error) {
                    console.error("Error checking onboarding status:", error);
                    setHasCompletedOnboarding(false);
                }
            } else {
                setHasCompletedOnboarding(null);
                setLearningProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const refreshProfile = async () => {
        if (!auth.currentUser) return;
        try {
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setHasCompletedOnboarding(data.onboardingCompleted === true);
            }
        } catch (error) {
            console.error("Error refreshing profile:", error);
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUser(null);
        setHasCompletedOnboarding(null);
        window.location.href = "/";
    };

    return (
        <AuthContext.Provider value={{ user, loading, hasCompletedOnboarding, learningProfile, signOut, refreshProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
