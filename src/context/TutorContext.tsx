"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface TutorContextState {
    lessonContext: string;
    isQuizRelated: boolean;
}

interface TutorContextType extends TutorContextState {
    setTutorContext: (next: Partial<TutorContextState>) => void;
    resetTutorContext: () => void;
}

const defaultTutorState: TutorContextState = {
    lessonContext: "",
    isQuizRelated: false,
};

const TutorContext = createContext<TutorContextType | null>(null);

export function TutorProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<TutorContextState>(defaultTutorState);

    const setTutorContext = useCallback((next: Partial<TutorContextState>) => {
        setState((prev) => ({ ...prev, ...next }));
    }, []);

    const resetTutorContext = useCallback(() => {
        setState(defaultTutorState);
    }, []);

    const value = useMemo(
        () => ({
            lessonContext: state.lessonContext,
            isQuizRelated: state.isQuizRelated,
            setTutorContext,
            resetTutorContext,
        }),
        [state.lessonContext, state.isQuizRelated, setTutorContext, resetTutorContext]
    );

    return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export function useTutorContext() {
    const context = useContext(TutorContext);
    if (!context) {
        throw new Error("useTutorContext must be used within a TutorProvider");
    }
    return context;
}
