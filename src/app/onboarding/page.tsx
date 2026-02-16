"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

const LEARNING_STYLES = [
    { id: "visual", label: "Visual", icon: "👀", desc: "I learn best with pictures, diagrams, and videos.", color: "bg-blue-100 border-blue-400" },
    { id: "reading", label: "Reading and Writing", icon: "📘", desc: "I learn best by reading and taking notes.", color: "bg-green-100 border-green-400" },
    { id: "handson", label: "Hands On", icon: "🧪", desc: "I learn best by trying activities and examples.", color: "bg-orange-100 border-orange-400" },
    { id: "listening", label: "Listening", icon: "🎧", desc: "I learn best by hearing explanations.", color: "bg-purple-100 border-purple-400" },
];

const INTERESTS = [
    { id: "science", label: "Science", icon: "🔬" },
    { id: "math", label: "Mathematics", icon: "🧮" },
    { id: "history", label: "History", icon: "🏛️" },
    { id: "art", label: "Art and Design", icon: "🎨" },
    { id: "technology", label: "Technology", icon: "💻" },
    { id: "languages", label: "Languages", icon: "🌍" },
    { id: "music", label: "Music", icon: "🎵" },
    { id: "sports", label: "Sports", icon: "⚽" },
    { id: "nature", label: "Nature", icon: "🌿" },
    { id: "space", label: "Space", icon: "🚀" },
    { id: "cooking", label: "Cooking", icon: "🍳" },
    { id: "animals", label: "Animals", icon: "🐾" },
    { id: "gaming", label: "Game Design", icon: "🎮" },
    { id: "writing", label: "Creative Writing", icon: "✍️" },
    { id: "business", label: "Business", icon: "💼" },
    { id: "health", label: "Health", icon: "🩺" },
];

const COUNTRIES = ["United States", "United Kingdom", "Canada", "Australia", "India", "Germany", "France", "Spain", "Mexico", "Brazil", "Japan", "South Korea", "China", "Nigeria", "South Africa", "Philippines", "Indonesia", "Turkey", "Egypt", "Other"];
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Arabic", "Hindi", "Chinese", "Japanese", "Korean", "Turkish", "Filipino"];
const GRADE_LEVELS = ["Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade", "College/University", "Adult Learner"];

const STEP_META: Record<number, { title: string; subtitle: string; icon: string; voice: string }> = {
    1: {
        title: "Personal Information",
        subtitle: "Enter your age, country, and grade level.",
        icon: "🧒",
        voice: "Step one. Enter your age, country, and grade level.",
    },
    2: {
        title: "Learning Preferences",
        subtitle: "Choose how you learn best.",
        icon: "🧠",
        voice: "Step two. Choose your preferred learning styles.",
    },
    3: {
        title: "Interests",
        subtitle: "Select the topics you like most.",
        icon: "⭐",
        voice: "Step three. Select at least three interests.",
    },
    4: {
        title: "Language Settings",
        subtitle: "Choose your language options.",
        icon: "🌐",
        voice: "Final step. Choose your language settings.",
    },
};

export default function OnboardingPage() {
    const { user, loading, refreshProfile } = useAuth();
    const router = useRouter();
    const { playIntro, cancel, voiceModeEnabled, hasVoiceSupport } = useTextToSpeech();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    const [age, setAge] = useState<number | "">("");
    const [country, setCountry] = useState("United States");
    const [gradeLevel, setGradeLevel] = useState("5th Grade");
    const [learningStyles, setLearningStyles] = useState<string[]>([]);
    const [interests, setInterests] = useState<string[]>([]);
    const [language, setLanguage] = useState("English");
    const [englishLevel, setEnglishLevel] = useState<string>("native");

    const TOTAL_STEPS = 4;
    const progressPercent = Math.round((step / TOTAL_STEPS) * 100);

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    useEffect(() => {
        if (!user || loading || !voiceModeEnabled || !hasVoiceSupport) return;
        cancel();
        const stepMeta = STEP_META[step];
        if (!stepMeta) return;
        playIntro(`onboarding-step-${step}`, stepMeta.voice);
    }, [step, user, loading, voiceModeEnabled, hasVoiceSupport, playIntro, cancel]);

    const toggleLearningStyle = (style: string) => {
        setLearningStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]));
    };

    const toggleInterest = (interest: string) => {
        setInterests((prev) => {
            if (prev.includes(interest)) return prev.filter((i) => i !== interest);
            if (prev.length >= 5) {
                toast.error("You can select up to 5 interests.");
                return prev;
            }
            return [...prev, interest];
        });
    };

    const getStepValidationMessage = (currentStep: number): string | null => {
        if (currentStep === 1) {
            if (age === "" || age <= 0) return "Please enter a valid age.";
            if (!country) return "Please select a country.";
            if (!gradeLevel) return "Please select a grade level.";
            return null;
        }
        if (currentStep === 2) {
            if (learningStyles.length === 0) return "Please select at least one learning style.";
            return null;
        }
        if (currentStep === 3) {
            if (interests.length < 3) return "Please select at least 3 interests.";
            return null;
        }
        if (currentStep === 4) {
            if (!language) return "Please choose a language.";
            return null;
        }
        return null;
    };

    const getStepHint = () => {
        const validation = getStepValidationMessage(step);
        return validation || "Great! This step is complete.";
    };

    const handleNextStep = () => {
        const validation = getStepValidationMessage(step);
        if (validation) {
            toast.error(validation);
            return;
        }
        if (step < TOTAL_STEPS) setStep((prev) => prev + 1);
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
                performanceHistory: {
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

            await refreshProfile();
            toast.success("Profile setup is complete.");
            router.push("/dashboard");
        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleCompleteClick = () => {
        if (saving) {
            toast("Saving profile...");
            return;
        }
        const validation = getStepValidationMessage(step);
        if (validation) {
            toast.error(validation);
            return;
        }
        void handleComplete();
    };

    if (!user || loading) return null;

    const selectedInterests = INTERESTS.filter((interest) => interests.includes(interest.id));

    return (
        <div className="min-h-[100dvh] bg-comic-paper bg-dot-pattern p-2 md:p-4">
            <div className="mx-auto flex h-[calc(100dvh-1rem)] max-w-6xl flex-col gap-4 md:h-[calc(100dvh-2rem)]">
                <section className="comic-box shrink-0 bg-white px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-black md:text-3xl">Complete Your Profile 🎨</h1>
                            <p className="mt-1 text-sm font-bold text-gray-500">Step {step} of {TOTAL_STEPS}: {STEP_META[step]?.title}</p>
                        </div>
                        <div className="rounded-full border-2 border-black bg-comic-yellow px-3 py-1 text-xs font-black uppercase tracking-widest">
                            {progressPercent}%
                        </div>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-black bg-gray-100">
                        <div className="h-full bg-gradient-to-r from-comic-blue via-comic-yellow to-comic-green transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                </section>

                <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(270px,1fr)]">
                    <section className="comic-box flex min-h-0 flex-col bg-white p-5 md:p-6">
                        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
                            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gradient-to-r from-blue-50 to-yellow-50 p-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{STEP_META[step]?.icon}</span>
                                    <div>
                                        <h2 className="text-xl font-black">{STEP_META[step]?.title}</h2>
                                        <p className="text-sm font-bold text-gray-600">{STEP_META[step]?.subtitle}</p>
                                    </div>
                                </div>
                            </div>

                            {step === 1 && (
                                <div className="space-y-5">
                                    <div>
                                        <label className="mb-2 block text-sm font-black uppercase">Age</label>
                                        <input
                                            type="number"
                                            min={4}
                                            max={100}
                                            value={age}
                                            onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : "")}
                                            className="w-full rounded-xl border-[3px] border-black px-4 py-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#000]"
                                            placeholder="Enter your age"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-black uppercase">Country</label>
                                        <select
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            className="w-full rounded-xl border-[3px] border-black bg-white px-4 py-3 font-bold"
                                        >
                                            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-black uppercase">Grade Level</label>
                                        <select
                                            value={gradeLevel}
                                            onChange={(e) => setGradeLevel(e.target.value)}
                                            className="w-full rounded-xl border-[3px] border-black bg-white px-4 py-3 font-bold"
                                        >
                                            {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <p className="text-sm font-bold text-gray-500">Select one or more learning styles.</p>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {LEARNING_STYLES.map((style) => {
                                            const isSelected = learningStyles.includes(style.id);
                                            return (
                                                <button
                                                    key={style.id}
                                                    onClick={() => toggleLearningStyle(style.id)}
                                                    className={`rounded-xl border-[3px] p-4 text-left transition-all ${isSelected ? `${style.color} border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` : "border-gray-200 bg-white hover:border-gray-400"}`}
                                                >
                                                    <div className="mb-1 flex items-center gap-2">
                                                        <span className="text-xl">{style.icon}</span>
                                                        <p className="text-base font-black">{style.label}</p>
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-600">{style.desc}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-5">
                                    <p className="text-sm font-bold text-gray-500">Select 3 to 5 interests.</p>
                                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3">
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-500">Selected ({interests.length}/5)</p>
                                        {selectedInterests.length > 0 ? (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {selectedInterests.map((item) => (
                                                    <span key={item.id} className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black">
                                                        {item.icon} {item.label}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm font-bold text-gray-400">No interests selected yet.</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                        {INTERESTS.map((interest) => {
                                            const isSelected = interests.includes(interest.id);
                                            return (
                                                <button
                                                    key={interest.id}
                                                    onClick={() => toggleInterest(interest.id)}
                                                    className={`rounded-xl border-[3px] p-3 text-left text-sm font-black transition-all ${isSelected ? "border-black bg-comic-yellow shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" : "border-gray-200 bg-white hover:border-gray-400"}`}
                                                >
                                                    <span className="mr-1">{interest.icon}</span>
                                                    {interest.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-5">
                                    <div>
                                        <label className="mb-2 block text-sm font-black uppercase">Primary Language</label>
                                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                            {LANGUAGES.map((lang) => (
                                                <button
                                                    key={lang}
                                                    onClick={() => setLanguage(lang)}
                                                    className={`rounded-xl border-[3px] p-3 text-sm font-black transition-all ${language === lang ? "border-black bg-comic-blue text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" : "border-gray-200 bg-white hover:border-gray-400"}`}
                                                >
                                                    {lang}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {language !== "English" && (
                                        <div>
                                            <label className="mb-2 block text-sm font-black uppercase">English Level</label>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                {["beginner", "intermediate", "advanced"].map((level) => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setEnglishLevel(level)}
                                                        className={`rounded-xl border-[3px] p-3 text-sm font-black uppercase transition-all ${englishLevel === level ? "border-black bg-comic-green text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" : "border-gray-200 bg-white hover:border-gray-400"}`}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 shrink-0 border-t-[3px] border-dashed border-gray-200 pt-4">
                            <div className="flex items-center justify-between gap-3">
                                {step > 1 ? (
                                    <button
                                        onClick={() => setStep((prev) => prev - 1)}
                                        className="rounded-xl border-[3px] border-black bg-white px-6 py-3 text-lg font-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                    >
                                        Back
                                    </button>
                                ) : (
                                    <div />
                                )}
                                {step < TOTAL_STEPS ? (
                                    <button
                                        onClick={handleNextStep}
                                        className="rounded-xl border-[3px] border-black bg-comic-blue px-8 py-3 text-lg font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1"
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCompleteClick}
                                        className="rounded-xl border-[3px] border-black bg-comic-green px-8 py-3 text-lg font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1"
                                    >
                                        {saving ? "Saving..." : "Finish Setup"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>

                    <aside className="comic-box hidden min-h-0 bg-white p-5 lg:flex lg:flex-col">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Summary</h3>
                        <p className="mt-2 text-sm font-bold text-gray-600">{getStepHint()}</p>
                        <div className="mt-4 space-y-2 overflow-y-auto pr-1">
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">Age: {age || "Not set"}</div>
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">Country: {country}</div>
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">Grade: {gradeLevel}</div>
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">Learning Styles: {learningStyles.length}</div>
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">Interests: {interests.length}/5</div>
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700">Language: {language}</div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
