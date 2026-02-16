"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

const LEARNING_STYLES = [
    { id: "visual", label: "Visual Learner", icon: "👁️", desc: "I learn best with images, diagrams & videos", color: "bg-blue-100 border-blue-400" },
    { id: "reading", label: "Reading & Writing", icon: "📖", desc: "I learn best by reading and taking notes", color: "bg-green-100 border-green-400" },
    { id: "handson", label: "Hands-On", icon: "🖐️", desc: "I learn best by doing and experimenting", color: "bg-orange-100 border-orange-400" },
    { id: "listening", label: "Listening", icon: "🎧", desc: "I learn best by hearing explanations", color: "bg-purple-100 border-purple-400" },
];

const INTERESTS = [
    { id: "science", label: "Science", icon: "🔬" },
    { id: "math", label: "Mathematics", icon: "🧮" },
    { id: "history", label: "History", icon: "🏛️" },
    { id: "art", label: "Art & Design", icon: "🎨" },
    { id: "technology", label: "Technology", icon: "💻" },
    { id: "languages", label: "Languages", icon: "🌏" },
    { id: "music", label: "Music", icon: "🎵" },
    { id: "sports", label: "Sports", icon: "⚽" },
    { id: "nature", label: "Nature", icon: "🌿" },
    { id: "space", label: "Space", icon: "🚀" },
    { id: "cooking", label: "Cooking", icon: "🍳" },
    { id: "animals", label: "Animals", icon: "🐾" },
    { id: "gaming", label: "Game Design", icon: "🎮" },
    { id: "writing", label: "Creative Writing", icon: "✍️" },
    { id: "business", label: "Business", icon: "💼" },
    { id: "health", label: "Health", icon: "🏥" },
];

const COUNTRIES = [
    "United States", "United Kingdom", "Canada", "Australia", "India",
    "Germany", "France", "Spain", "Mexico", "Brazil",
    "Japan", "South Korea", "China", "Nigeria", "South Africa",
    "Philippines", "Indonesia", "Turkey", "Egypt", "Other"
];

const LANGUAGES = [
    { value: "English", flag: "🇺🇸" },
    { value: "Spanish", flag: "🇪🇸" },
    { value: "French", flag: "🇫🇷" },
    { value: "German", flag: "🇩🇪" },
    { value: "Portuguese", flag: "🇧🇷" },
    { value: "Arabic", flag: "🇸🇦" },
    { value: "Hindi", flag: "🇮🇳" },
    { value: "Chinese", flag: "🇨🇳" },
    { value: "Japanese", flag: "🇯🇵" },
    { value: "Korean", flag: "🇰🇷" },
    { value: "Turkish", flag: "🇹🇷" },
    { value: "Filipino", flag: "🇵🇭" },
];

const GRADE_LEVELS = [
    "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade",
    "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade",
    "11th Grade", "12th Grade", "College/University", "Adult Learner"
];

const STEP_META: Record<number, { title: string; subtitle: string; icon: string; voice: string }> = {
    1: {
        title: "About You",
        subtitle: "Age, country, and grade help us tune examples",
        icon: "👤",
        voice: "Step one. Tell us about your age, location, and grade level.",
    },
    2: {
        title: "Learning Style",
        subtitle: "Pick the ways you absorb information best",
        icon: "🧠",
        voice: "Step two. Choose your preferred learning styles so we can adapt lessons for you.",
    },
    3: {
        title: "Interests",
        subtitle: "Choose topics you enjoy to personalize course ideas",
        icon: "⭐",
        voice: "Step three. Select at least three interests so recommendations match your curiosity.",
    },
    4: {
        title: "Language",
        subtitle: "Set your learning language and English comfort level",
        icon: "🌍",
        voice: "Final step. Choose your language so learning feels natural.",
    },
};

export default function OnboardingPage() {
    const { user, loading, refreshProfile } = useAuth();
    const router = useRouter();
    const { playIntro, cancel, voiceModeEnabled, hasVoiceSupport } = useTextToSpeech();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Form state
    const [age, setAge] = useState<number | "">("");
    const [country, setCountry] = useState("United States");
    const [gradeLevel, setGradeLevel] = useState("5th Grade");
    const [learningStyles, setLearningStyles] = useState<string[]>([]);
    const [interests, setInterests] = useState<string[]>([]);
    const [language, setLanguage] = useState("English");
    const [englishLevel, setEnglishLevel] = useState<string>("native");

    const TOTAL_STEPS = 4;

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user || loading || !voiceModeEnabled || !hasVoiceSupport) return;
        cancel();
        const stepMeta = STEP_META[step];
        if (!stepMeta) return;
        playIntro(`onboarding-step-${step}`, stepMeta.voice);
    }, [step, user, loading, voiceModeEnabled, hasVoiceSupport, playIntro, cancel]);

    const toggleLearningStyle = (style: string) => {
        setLearningStyles(prev =>
            prev.includes(style)
                ? prev.filter(s => s !== style)
                : [...prev, style]
        );
    };

    const toggleInterest = (interest: string) => {
        setInterests(prev =>
            prev.includes(interest)
                ? prev.filter(i => i !== interest)
                : prev.length < 5 ? [...prev, interest] : prev
        );
    };

    const canProceed = () => {
        switch (step) {
            case 1: return age !== "" && age > 0 && country && gradeLevel;
            case 2: return learningStyles.length > 0;
            case 3: return interests.length >= 3;
            case 4: return language !== "";
            default: return false;
        }
    };

    const handleComplete = async () => {
        if (!user) return;
        setSaving(true);

        try {
            const learningProfile = {
                age: Number(age),
                country,
                gradeLevel,
                learningStyles,
                interests,
                language,
                englishLevel: language !== "English" ? englishLevel : "native",
            };

            await updateDoc(doc(db, "users", user.uid), {
                learningProfile,
                onboardingCompleted: true,
                "performanceHistory": {
                    visualScore: 50,
                    readingScore: 50,
                    handsonScore: 50,
                    listeningScore: 50,
                    averageQuizScore: 0,
                    totalLessonsCompleted: 0,
                    currentDifficulty: "beginner",
                    strongTopics: [],
                    weakTopics: [],
                    lastUpdated: serverTimestamp(),
                },
            });

            await refreshProfile(); // Update context state so we don't get redirected back

            toast.success("Profile set up! Let's start learning! 🚀");
            router.push("/dashboard");
        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error("Oops! Something went wrong. Try again!");
        } finally {
            setSaving(false);
        }
    };

    if (!user || loading) return null;

    return (
        <div className="min-h-screen bg-comic-paper bg-dot-pattern flex items-center justify-center p-4">
            {/* Background decorations */}
            <div className="fixed top-10 left-10 text-8xl opacity-10 rotate-12 pointer-events-none">✨</div>
            <div className="fixed bottom-10 right-10 text-8xl opacity-10 -rotate-12 pointer-events-none">🎓</div>

            <div className="w-full max-w-6xl">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-black text-sm uppercase tracking-widest text-gray-400">
                            Step {step} of {TOTAL_STEPS}
                        </span>
                        <span className="font-black text-sm text-comic-blue">
                            {Math.round((step / TOTAL_STEPS) * 100)}%
                        </span>
                    </div>
                    <div className="h-4 bg-white rounded-full border-[3px] border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div
                            className="h-full bg-gradient-to-r from-comic-blue to-comic-green transition-all duration-500 ease-out"
                            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                        />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                        {Array.from({ length: TOTAL_STEPS }, (_, idx) => {
                            const current = idx + 1;
                            const meta = STEP_META[current];
                            const isActive = step === current;
                            const isPassed = step > current;
                            return (
                                <div
                                    key={current}
                                    className={`rounded-lg border-2 px-3 py-2 text-xs font-black uppercase tracking-wide text-center transition-all ${
                                        isActive
                                            ? "border-black bg-comic-blue text-white"
                                            : isPassed
                                              ? "border-black bg-comic-green text-white"
                                              : "border-gray-300 bg-white text-gray-400"
                                    }`}
                                >
                                    {meta?.title || `Step ${current}`}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] items-start">
                    {/* Card */}
                    <div className="comic-box p-8 md:p-10 bg-white relative">
                    {/* Step 1: About You */}
                    {step === 1 && (
                        <div className="animate-fade-in">
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">👋</div>
                                <h1 className="text-3xl md:text-4xl font-black text-black mb-2">Tell Us About You!</h1>
                                <p className="text-lg font-bold text-gray-500">So we can make learning perfect for you</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-black text-black uppercase mb-2">How Old Are You?</label>
                                    <input
                                        type="number"
                                        min={4}
                                        max={100}
                                        value={age}
                                        onChange={e => setAge(e.target.value ? parseInt(e.target.value) : "")}
                                        placeholder="Enter your age"
                                        className="w-full px-5 py-4 rounded-xl border-[3px] border-black font-bold text-xl outline-none focus:shadow-[4px_4px_0px_0px_#000] focus:-translate-y-0.5 transition-all placeholder:text-gray-300"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-black uppercase mb-2">Where Are You From?</label>
                                    <select
                                        value={country}
                                        onChange={e => setCountry(e.target.value)}
                                        className="w-full px-5 py-4 rounded-xl border-[3px] border-black font-bold text-lg outline-none cursor-pointer focus:shadow-[4px_4px_0px_0px_#000] transition-all bg-white"
                                    >
                                        {COUNTRIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-black uppercase mb-2">What Grade Are You In?</label>
                                    <select
                                        value={gradeLevel}
                                        onChange={e => setGradeLevel(e.target.value)}
                                        className="w-full px-5 py-4 rounded-xl border-[3px] border-black font-bold text-lg outline-none cursor-pointer focus:shadow-[4px_4px_0px_0px_#000] transition-all bg-white"
                                    >
                                        {GRADE_LEVELS.map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Learning Style */}
                    {step === 2 && (
                        <div className="animate-fade-in">
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">🧠</div>
                                <h1 className="text-3xl md:text-4xl font-black text-black mb-2">How Do You Learn Best?</h1>
                                <p className="text-lg font-bold text-gray-500">Pick all that apply — we&apos;ll adapt to you!</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {LEARNING_STYLES.map(style => {
                                    const isSelected = learningStyles.includes(style.id);
                                    return (
                                        <button
                                            key={style.id}
                                            onClick={() => toggleLearningStyle(style.id)}
                                            className={`
                                                p-5 rounded-xl border-[3px] text-left transition-all duration-200
                                                ${isSelected
                                                    ? `${style.color} border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1 scale-[1.02]`
                                                    : 'bg-white border-gray-200 hover:border-gray-400 hover:-translate-y-0.5'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-3xl">{style.icon}</span>
                                                <span className="font-black text-lg">{style.label}</span>
                                                {isSelected && <span className="ml-auto text-xl">✓</span>}
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 pl-12">{style.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Interests */}
                    {step === 3 && (
                        <div className="animate-fade-in">
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">⭐</div>
                                <h1 className="text-3xl md:text-4xl font-black text-black mb-2">What Excites You?</h1>
                                <p className="text-lg font-bold text-gray-500">Pick 3 to 5 topics you love ({interests.length}/5 selected)</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {INTERESTS.map(interest => {
                                    const isSelected = interests.includes(interest.id);
                                    const isFull = interests.length >= 5 && !isSelected;
                                    return (
                                        <button
                                            key={interest.id}
                                            onClick={() => toggleInterest(interest.id)}
                                            disabled={isFull}
                                            className={`
                                                p-4 rounded-xl border-[3px] text-center transition-all duration-200 flex flex-col items-center gap-2
                                                ${isSelected
                                                    ? 'bg-comic-yellow border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-1 scale-105'
                                                    : isFull
                                                        ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                                                        : 'bg-white border-gray-200 hover:border-gray-400 hover:-translate-y-0.5'
                                                }
                                            `}
                                        >
                                            <span className="text-3xl">{interest.icon}</span>
                                            <span className="font-black text-sm">{interest.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Language */}
                    {step === 4 && (
                        <div className="animate-fade-in">
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">🌍</div>
                                <h1 className="text-3xl md:text-4xl font-black text-black mb-2">Your Language</h1>
                                <p className="text-lg font-bold text-gray-500">We&apos;ll teach in your language</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-black text-black uppercase mb-2">Primary Language</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {LANGUAGES.map(lang => (
                                            <button
                                                key={lang.value}
                                                onClick={() => setLanguage(lang.value)}
                                                className={`
                                                    p-4 rounded-xl border-[3px] text-center transition-all duration-200 flex items-center justify-center gap-2
                                                    ${language === lang.value
                                                        ? 'bg-comic-blue text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-1'
                                                        : 'bg-white border-gray-200 hover:border-gray-400 hover:-translate-y-0.5'
                                                    }
                                                `}
                                            >
                                                <span className="text-2xl">{lang.flag}</span>
                                                <span className="font-black">{lang.value}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {language !== "English" && (
                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-black text-black uppercase mb-2">Your English Level</label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {[
                                                { value: "beginner", label: "Beginner", icon: "🌱", desc: "Just starting" },
                                                { value: "intermediate", label: "Intermediate", icon: "🌿", desc: "Can communicate" },
                                                { value: "advanced", label: "Advanced", icon: "🌳", desc: "Very comfortable" },
                                            ].map(level => (
                                                <button
                                                    key={level.value}
                                                    onClick={() => setEnglishLevel(level.value)}
                                                    className={`
                                                        p-4 rounded-xl border-[3px] text-center transition-all duration-200
                                                        ${englishLevel === level.value
                                                            ? 'bg-comic-green text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-1'
                                                            : 'bg-white border-gray-200 hover:border-gray-400 hover:-translate-y-0.5'
                                                        }
                                                    `}
                                                >
                                                    <div className="text-2xl mb-1">{level.icon}</div>
                                                    <div className="font-black text-sm">{level.label}</div>
                                                    <div className="text-xs font-bold opacity-70">{level.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center mt-10 pt-6 border-t-[3px] border-dashed border-gray-200">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(prev => prev - 1)}
                                className="px-6 py-3 rounded-xl border-[3px] border-black font-black text-lg bg-white hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 transition-all"
                            >
                                ← Back
                            </button>
                        ) : (
                            <div />
                        )}

                        {step < TOTAL_STEPS ? (
                            <button
                                onClick={() => setStep(prev => prev + 1)}
                                disabled={!canProceed()}
                                className={`
                                    px-8 py-3 rounded-xl border-[3px] border-black font-black text-lg text-white transition-all
                                    ${canProceed()
                                        ? 'bg-comic-blue shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0'
                                        : 'bg-gray-300 cursor-not-allowed opacity-60'
                                    }
                                `}
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                onClick={handleComplete}
                                disabled={!canProceed() || saving}
                                className={`
                                    px-8 py-3 rounded-xl border-[3px] border-black font-black text-lg text-white transition-all flex items-center gap-2
                                    ${canProceed() && !saving
                                        ? 'bg-comic-green shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0'
                                        : 'bg-gray-300 cursor-not-allowed opacity-60'
                                    }
                                `}
                            >
                                {saving ? (
                                    <>
                                        <span className="animate-spin">⚙️</span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        🚀 Let&apos;s Go!
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    </div>

                    <aside className="comic-box bg-white p-6 lg:sticky lg:top-6">
                        <div className="mb-4">
                            <div className="text-sm font-black uppercase tracking-widest text-gray-400 mb-1">Current Step</div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{STEP_META[step]?.icon}</span>
                                <div>
                                    <h3 className="text-xl font-black">{STEP_META[step]?.title}</h3>
                                    <p className="text-sm font-bold text-gray-500">{STEP_META[step]?.subtitle}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t-2 border-dashed border-gray-200">
                            <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Profile Snapshot</h4>
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">
                                Age: {age || "Not set"}
                            </div>
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">
                                Grade: {gradeLevel}
                            </div>
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">
                                Styles: {learningStyles.length}
                            </div>
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">
                                Interests: {interests.length}/5
                            </div>
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">
                                Language: {language}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
