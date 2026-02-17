/**
 * WML Adaptive Learning Engine
 *
 * Core logic for:
 * - Calculating optimal learning modality
 * - Auto-adjusting difficulty based on performance
 * - Generating adaptive AI course prompts
 * - Recommending topics based on profile + performance
 */

// ── Types ──────────────────────────────────────────────────────

export interface LearningProfile {
    age: number;
    country: string;
    gradeLevel: string;
    learningStyles: ('visual' | 'reading' | 'handson' | 'listening')[];
    interests: string[];
    language: string;
    englishLevel?: 'beginner' | 'intermediate' | 'advanced' | 'native';
}

export interface PerformanceHistory {
    visualScore: number;
    readingScore: number;
    handsonScore: number;
    listeningScore: number;
    averageQuizScore: number;
    totalLessonsCompleted: number;
    currentDifficulty: 'beginner' | 'intermediate' | 'advanced';
    strongTopics: string[];
    weakTopics: string[];
    recentQuizScores?: number[];
    learnerTier?: LearnerTier;
    tierScore?: number;
    trend?: AdaptiveTrend;
    streakHealth?: StreakHealth;
    difficultyChangeReason?: string;
    lastDifficultyChangeDirection?: AdaptiveTrend;
    lastUpdated?: unknown; // Firestore Timestamp
}

export type Modality = 'visual' | 'reading' | 'handson' | 'listening';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type LearnerTier = 'beginner' | 'intermediate' | 'pro' | 'legend';
export type AdaptiveTrend = 'up' | 'down' | 'stable';
export type StreakHealth = 'strong' | 'warning' | 'critical';

interface AdaptiveUpdateOptions {
    currentStreak?: number;
    completionRatio?: number;
}

const tierOrder: LearnerTier[] = ['beginner', 'intermediate', 'pro', 'legend'];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeTopicText = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

// ── Modality Ranking ───────────────────────────────────────────

/**
 * Calculate the optimal content modality order for this student.
 * Combines their self-reported preferences with actual performance data.
 * Preference contributes 40%, performance contributes 60%.
 */
export function calculateOptimalModality(
    profile: LearningProfile,
    performance: PerformanceHistory
): Modality[] {
    const modalityScores: Record<Modality, number> = {
        visual: 0,
        reading: 0,
        handson: 0,
        listening: 0,
    };

    // Performance weight (60%)
    modalityScores.visual += performance.visualScore * 0.6;
    modalityScores.reading += performance.readingScore * 0.6;
    modalityScores.handson += performance.handsonScore * 0.6;
    modalityScores.listening += performance.listeningScore * 0.6;

    // Preference weight (40%) — selected styles get a bonus
    const preferenceBonus = 40;
    for (const style of profile.learningStyles) {
        modalityScores[style] += preferenceBonus;
    }

    // Sort by score descending
    return (Object.entries(modalityScores) as [Modality, number][])
        .sort((a, b) => b[1] - a[1])
        .map(([modality]) => modality);
}

// ── Difficulty Adjustment ──────────────────────────────────────

/**
 * Calculate the next difficulty level based on recent performance.
 * - Avg quiz score > 80% over 3+ lessons → bump up
 * - Avg quiz score < 50% over 3+ lessons → bump down
 * - Otherwise → stay the same
 */
export function calculateNextDifficultyWithReason(
    performance: PerformanceHistory
): { difficulty: Difficulty; reason: string; direction: AdaptiveTrend } {
    const { averageQuizScore, totalLessonsCompleted, currentDifficulty } = performance;
    const recentScores = performance.recentQuizScores || [];
    const rollingAverage =
        recentScores.length >= 3
            ? Math.round(recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length)
            : averageQuizScore;

    if (totalLessonsCompleted < 3) {
        return {
            difficulty: currentDifficulty,
            direction: "stable",
            reason: "Need more lessons before difficulty adapts.",
        };
    }

    if (rollingAverage >= 85) {
        if (currentDifficulty === "beginner") {
            return {
                difficulty: "intermediate",
                direction: "up",
                reason: `Average ${rollingAverage}% in recent quizzes. Difficulty increased to Intermediate.`,
            };
        }
        if (currentDifficulty === "intermediate") {
            return {
                difficulty: "advanced",
                direction: "up",
                reason: `Average ${rollingAverage}% in recent quizzes. Difficulty increased to Advanced.`,
            };
        }
        return {
            difficulty: "advanced",
            direction: "stable",
            reason: `Average ${rollingAverage}% in recent quizzes. Staying at Advanced.`,
        };
    }

    if (rollingAverage < 55) {
        if (currentDifficulty === "advanced") {
            return {
                difficulty: "intermediate",
                direction: "down",
                reason: `Average ${rollingAverage}% in recent quizzes. Difficulty lowered to Intermediate for support.`,
            };
        }
        if (currentDifficulty === "intermediate") {
            return {
                difficulty: "beginner",
                direction: "down",
                reason: `Average ${rollingAverage}% in recent quizzes. Difficulty lowered to Beginner for support.`,
            };
        }
        return {
            difficulty: "beginner",
            direction: "stable",
            reason: `Average ${rollingAverage}% in recent quizzes. Staying at Beginner for stronger foundations.`,
        };
    }

    return {
        difficulty: currentDifficulty,
        direction: "stable",
        reason: `Average ${rollingAverage}% in recent quizzes. Difficulty remains balanced.`,
    };
}

export function calculateNextDifficulty(
    performance: PerformanceHistory
): Difficulty {
    return calculateNextDifficultyWithReason(performance).difficulty;
}

function scoreToTier(score: number): LearnerTier {
    if (score >= 85) return "legend";
    if (score >= 70) return "pro";
    if (score >= 50) return "intermediate";
    return "beginner";
}

export function getStreakHealth(streak: number): StreakHealth {
    if (streak >= 7) return "strong";
    if (streak >= 3) return "warning";
    return "critical";
}

export function calculateTierScore(
    performance: PerformanceHistory,
    options: AdaptiveUpdateOptions = {}
): number {
    const streak = options.currentStreak ?? 0;
    const completionRatio = options.completionRatio ?? 1;
    const modalityAverage = Math.round(
        (performance.visualScore + performance.readingScore + performance.handsonScore + performance.listeningScore) / 4
    );
    const lessonMomentum = Math.min(100, performance.totalLessonsCompleted * 4);
    const difficultyBonus =
        performance.currentDifficulty === "advanced"
            ? 14
            : performance.currentDifficulty === "intermediate"
                ? 8
                : 2;
    const streakBonus = clamp(streak * 1.8, 0, 16);
    const completionBonus = completionRatio >= 0.65 ? 8 : completionRatio >= 0.35 ? 2 : -8;
    const weightedScore =
        performance.averageQuizScore * 0.45 +
        modalityAverage * 0.25 +
        lessonMomentum * 0.15 +
        streakBonus +
        difficultyBonus +
        completionBonus;

    return clamp(Math.round(weightedScore / 1.18), 0, 100);
}

export function applyAdaptiveStanding(
    performance: PerformanceHistory,
    options: AdaptiveUpdateOptions = {}
): PerformanceHistory {
    const tierScore = calculateTierScore(performance, options);
    const learnerTier = scoreToTier(tierScore);
    const streakHealth = getStreakHealth(options.currentStreak ?? 0);
    return {
        ...performance,
        tierScore,
        learnerTier,
        streakHealth,
    };
}

export function demoteLearnerTier(currentTier?: LearnerTier): LearnerTier {
    const tier = currentTier || "beginner";
    const currentIndex = tierOrder.indexOf(tier);
    if (currentIndex <= 0) return "beginner";
    return tierOrder[currentIndex - 1];
}

// ── Adaptive Course Prompt Builder ─────────────────────────────

/**
 * Build a comprehensive AI course generation prompt that incorporates
 * the student's profile and performance history.
 */
export function generateAdaptiveCoursePrompt(
    profile: LearningProfile,
    performance: PerformanceHistory,
    topic: string
): string {
    const optimalModalities = calculateOptimalModality(profile, performance);
    const difficulty = calculateNextDifficulty(performance);
    const primaryModality = optimalModalities[0];
    const secondaryModality = optimalModalities[1];

    // Build modality instructions
    const modalityInstructions: Record<Modality, string> = {
        visual: "Include many diagrams described in text, visual metaphors, charts, and image descriptions. Use markdown image placeholders with descriptive alt texts. Format content with tables and structured layouts.",
        reading: "Provide detailed written explanations, definitions, and note-style summaries. Include key takeaways and vocabulary lists. Use bullet points and numbered lists heavily.",
        handson: "Include practical exercises, experiments, and hands-on activities within lessons. Add 'Try It Yourself' sections. Frame content as step-by-step projects.",
        listening: "Write content in a conversational, narration-friendly tone. Include dialogue-style explanations and think-aloud walkthroughs. Keep sentences clear and spoken-word friendly.",
    };

    // Build language instructions
    let languageInstructions = `Write the course in ${profile.language}.`;
    if (profile.language !== "English" && profile.englishLevel) {
        if (profile.englishLevel === 'beginner') {
            languageInstructions += ` The student is a beginner in English. Use simple English terms only when necessary for technical vocabulary, and provide the ${profile.language} translation in parentheses.`;
        } else if (profile.englishLevel === 'intermediate') {
            languageInstructions += ` The student has intermediate English. You may use common English terms but explain complex vocabulary.`;
        }
    }

    // Build age-appropriate instructions
    let ageInstructions = `The student is ${profile.age} years old, in ${profile.gradeLevel} (${profile.country}).`;
    if (profile.age <= 8) {
        ageInstructions += " Use very simple language, short sentences, fun analogies, and lots of emoji. Make it playful and game-like.";
    } else if (profile.age <= 12) {
        ageInstructions += " Use clear, engaging language with real-world examples they can relate to. Include fun facts and interesting connections.";
    } else if (profile.age <= 16) {
        ageInstructions += " Use slightly more advanced vocabulary. Include real-world applications, current events connections, and critical thinking prompts.";
    } else {
        ageInstructions += " Use mature, academic language. Include in-depth analysis, research references, and complex problem-solving.";
    }

    // Performance context
    let performanceContext = "";
    if (performance.totalLessonsCompleted > 0) {
        performanceContext = `\nThe student's current performance:
- Average quiz score: ${performance.averageQuizScore}% (${difficulty === 'beginner' ? 'keep it accessible' : difficulty === 'advanced' ? 'challenge them' : 'balanced difficulty'})
 - Lessons completed: ${performance.totalLessonsCompleted}
 - Learner tier: ${performance.learnerTier || "beginner"} (tier score ${performance.tierScore ?? "n/a"})
 - Streak health: ${performance.streakHealth || "warning"}
${performance.strongTopics.length > 0 ? `- Strong in: ${performance.strongTopics.join(', ')} — you can reference these to build bridges to new concepts` : ''}
${performance.weakTopics.length > 0 ? `- Needs improvement in: ${performance.weakTopics.join(', ')} — include extra scaffolding for related concepts` : ''}`;
    }

    return `You are an expert adaptive course creator for WML (WeMakeLessons). Generate a complete educational course tailored to this specific student.

STUDENT PROFILE:
${ageInstructions}
${languageInstructions}
${performanceContext}

CONTENT STYLE:
Primary modality: ${primaryModality} — ${modalityInstructions[primaryModality]}
Secondary modality: ${secondaryModality} — ${modalityInstructions[secondaryModality]}

COURSE TOPIC: "${topic}"
DIFFICULTY LEVEL: ${difficulty}

REQUIREMENTS:
- Generate 4-6 lessons, each with 3-5 quiz questions
- Each lesson should primarily use ${primaryModality} modality with ${secondaryModality} as secondary
- Difficulty should match "${difficulty}" level calibrated for ${profile.gradeLevel}
- Include engaging, age-appropriate examples
- Include visual learning support in every lesson with at least 2 visual assets (images, GIFs, or videos)
- Quiz questions should test understanding, not just memorization
- Include explanations for correct answers

IMPORTANT: Return ONLY valid JSON in this exact format, no markdown code blocks:
{
    "title": "Course Title",
    "description": "Brief engaging description",
    "learningObjectives": ["objective1", "objective2", "objective3"],
    "lessons": [
        {
            "id": "lesson_1",
            "title": "Lesson Title",
            "content": "Full lesson content in markdown format...",
            "duration": 5,
            "contentType": "${primaryModality}",
            "visualAssets": [
                {
                    "type": "image",
                    "url": "https://example.com/asset.jpg",
                    "caption": "What this visual explains",
                    "altText": "Descriptive alt text for accessibility"
                }
            ],
            "quiz": [
                {
                    "question": "Question text?",
                    "options": ["A", "B", "C", "D"],
                    "correctAnswer": 0,
                    "explanation": "Why A is correct"
                }
            ]
        }
    ],
    "metadata": {
        "difficulty": "${difficulty}",
        "targetAge": "${profile.age}",
        "language": "${profile.language}",
        "primaryModality": "${primaryModality}",
        "gradeLevel": "${profile.gradeLevel}"
    }
}`;
}

// ── Topic Recommendations ──────────────────────────────────────

interface TopicRecommendation {
    topic: string;
    reason: string;
    icon: string;
    category: 'continue' | 'recommended' | 'challenge' | 'explore';
}

const TOPIC_MAP: Record<string, { topics: string[]; icon: string }> = {
    science: { topics: ["Volcanoes", "Human Body", "Chemistry Basics", "Electricity", "Ecosystems", "Weather & Climate"], icon: "🔬" },
    math: { topics: ["Fractions", "Geometry", "Algebra Basics", "Statistics", "Problem Solving"], icon: "🧮" },
    history: { topics: ["Ancient Egypt", "World War II", "The Renaissance", "Space Race", "Industrial Revolution"], icon: "🏛️" },
    art: { topics: ["Color Theory", "Digital Art Basics", "Famous Artists", "Photography", "Graphic Design"], icon: "🎨" },
    technology: { topics: ["How the Internet Works", "Coding Basics", "Artificial Intelligence", "Cybersecurity", "Robotics"], icon: "💻" },
    languages: { topics: ["Spanish Basics", "French Phrases", "Japanese Culture & Language", "Sign Language"], icon: "🌏" },
    music: { topics: ["Music Theory", "Famous Composers", "How Instruments Work", "Song Writing"], icon: "🎵" },
    sports: { topics: ["Olympic History", "Sports Science", "Nutrition for Athletes", "Soccer Tactics"], icon: "⚽" },
    nature: { topics: ["Rainforests", "Ocean Life", "Endangered Species", "Climate Change", "Plant Biology"], icon: "🌿" },
    space: { topics: ["The Solar System", "Black Holes", "Mars Exploration", "Stars & Galaxies", "Astronaut Training"], icon: "🚀" },
    cooking: { topics: ["Kitchen Science", "World Cuisines", "Baking Basics", "Nutrition & Diet"], icon: "🍳" },
    animals: { topics: ["Dinosaurs", "Marine Biology", "Animal Behavior", "Pets & Care", "Migration Patterns"], icon: "🐾" },
    gaming: { topics: ["Game Design Basics", "Pixel Art", "Level Design", "Game History"], icon: "🎮" },
    writing: { topics: ["Story Structure", "Poetry", "Journalism", "Creative Writing Prompts"], icon: "✍️" },
    business: { topics: ["Entrepreneurship", "Financial Literacy", "Marketing Basics", "Economics 101"], icon: "💼" },
    health: { topics: ["First Aid Basics", "Mental Health", "Anatomy", "Healthy Habits"], icon: "🏥" },
};

function resolveCategoryFromSignal(topicSignal: string): string | null {
    const normalizedSignal = normalizeTopicText(topicSignal);
    if (!normalizedSignal) return null;

    if (TOPIC_MAP[normalizedSignal]) return normalizedSignal;

    for (const categoryKey of Object.keys(TOPIC_MAP)) {
        if (
            normalizedSignal.includes(categoryKey) ||
            categoryKey.includes(normalizedSignal)
        ) {
            return categoryKey;
        }
    }

    for (const [categoryKey, category] of Object.entries(TOPIC_MAP)) {
        const hasTopicMatch = category.topics.some((topic) => {
            const normalizedTopic = normalizeTopicText(topic);
            return (
                normalizedTopic.includes(normalizedSignal) ||
                normalizedSignal.includes(normalizedTopic)
            );
        });
        if (hasTopicMatch) return categoryKey;
    }

    return null;
}

/**
 * Generate personalized topic recommendations based on student profile and performance.
 */
export function getRecommendedTopics(
    profile: LearningProfile,
    performance: PerformanceHistory,
    completedTopics: string[] = []
): TopicRecommendation[] {
    const recommendations: TopicRecommendation[] = [];
    const selectedTopics = new Set<string>();

    // 0. Reinforcement - if learner is weak in a topic, recommend focused practice first.
    for (const weakTopic of performance.weakTopics.slice(-2).reverse()) {
        const categoryKey = resolveCategoryFromSignal(weakTopic);
        if (!categoryKey) continue;
        const category = TOPIC_MAP[categoryKey];
        if (!category) continue;

        const reinforcementTopic = category.topics.find(
            (topic) =>
                !completedTopics.some((ct) => ct.toLowerCase().includes(topic.toLowerCase())) &&
                !selectedTopics.has(normalizeTopicText(topic))
        );
        if (!reinforcementTopic) continue;

        recommendations.push({
            topic: reinforcementTopic,
            reason: `Focus boost: strengthen ${weakTopic} with guided practice.`,
            icon: category.icon,
            category: "recommended",
        });
        selectedTopics.add(normalizeTopicText(reinforcementTopic));
    }

    // 0.5. Mastery extension - build on what learner is already good at.
    for (const strongTopic of performance.strongTopics.slice(-2).reverse()) {
        const categoryKey = resolveCategoryFromSignal(strongTopic);
        if (!categoryKey) continue;
        const category = TOPIC_MAP[categoryKey];
        if (!category) continue;

        const followupTopic = category.topics.find(
            (topic) =>
                !completedTopics.some((ct) => ct.toLowerCase().includes(topic.toLowerCase())) &&
                !selectedTopics.has(normalizeTopicText(topic))
        );
        if (!followupTopic) continue;

        recommendations.push({
            topic: followupTopic,
            reason: `You performed well in ${strongTopic}. Try this next.`,
            icon: category.icon,
            category: "recommended",
        });
        selectedTopics.add(normalizeTopicText(followupTopic));
    }

    // 1. Recommended - from interests
    for (const interest of profile.interests) {
        const category = TOPIC_MAP[interest];
        if (!category) continue;

        for (const topic of category.topics) {
            if (completedTopics.some((t) => t.toLowerCase().includes(topic.toLowerCase()))) continue;
            if (selectedTopics.has(normalizeTopicText(topic))) continue;

            recommendations.push({
                topic,
                reason: `Based on your interest in ${interest}`,
                icon: category.icon,
                category: "recommended",
            });
            selectedTopics.add(normalizeTopicText(topic));

            if (recommendations.filter((r) => r.category === "recommended").length >= 6) break;
        }
        if (recommendations.filter((r) => r.category === "recommended").length >= 6) break;
    }

    // 2. Challenge - from strong topics (fuzzy mapped to category)
    for (const strongTopic of performance.strongTopics) {
        const categoryKey = resolveCategoryFromSignal(strongTopic);
        if (!categoryKey) continue;

        const category = TOPIC_MAP[categoryKey];
        if (!category) continue;

        const advancedTopic = category.topics.find(
            (topic) =>
                !completedTopics.some((ct) => ct.toLowerCase().includes(topic.toLowerCase())) &&
                !selectedTopics.has(normalizeTopicText(topic))
        );

        if (advancedTopic) {
            recommendations.push({
                topic: `Advanced: ${advancedTopic}`,
                reason: `You're excelling in ${strongTopic} - ready for more?`,
                icon: "🏆",
                category: "challenge",
            });
            selectedTopics.add(normalizeTopicText(advancedTopic));
        }

        if (recommendations.filter((r) => r.category === "challenge").length >= 2) break;
    }

    // 3. Explore - topics outside interest profile
    const unexplored = Object.keys(TOPIC_MAP).filter((k) => !profile.interests.includes(k));
    for (const area of unexplored.slice(0, 3)) {
        const category = TOPIC_MAP[area];
        if (!category) continue;

        const exploreTopic = category.topics[0];
        if (selectedTopics.has(normalizeTopicText(exploreTopic))) continue;

        recommendations.push({
            topic: exploreTopic,
            reason: `Discover something new in ${area}`,
            icon: category.icon,
            category: "explore",
        });
        selectedTopics.add(normalizeTopicText(exploreTopic));

        if (recommendations.filter((r) => r.category === "explore").length >= 3) break;
    }

    return recommendations;
}

// ── Performance Update Helper ──────────────────────────────────

/**
 * Update performance history after a quiz is completed.
 * Uses exponential moving average to smooth scores.
 */
export function updatePerformanceAfterQuiz(
    currentPerformance: PerformanceHistory,
    quizScore: number,  // 0-100
    lessonModality: Modality,
    courseTopic: string,
    options: AdaptiveUpdateOptions = {},
): PerformanceHistory {
    const alpha = 0.3; // Smoothing factor — higher = recent scores matter more

    // Update modality score with exponential moving average
    const modalityKey = `${lessonModality}Score` as keyof PerformanceHistory;
    const currentModalityScore = currentPerformance[modalityKey] as number;
    const newModalityScore = Math.round(currentModalityScore * (1 - alpha) + quizScore * alpha);

    // Update overall average
    const totalLessons = currentPerformance.totalLessonsCompleted + 1;
    const newAverage = Math.round(
        (currentPerformance.averageQuizScore * currentPerformance.totalLessonsCompleted + quizScore) / totalLessons
    );
    const previousAverage = currentPerformance.averageQuizScore;

    // Update strong/weak topics
    const topicLower = courseTopic.toLowerCase();
    let strongTopics = [...currentPerformance.strongTopics];
    let weakTopics = [...currentPerformance.weakTopics];

    if (quizScore >= 80 && !strongTopics.includes(topicLower)) {
        strongTopics.push(topicLower);
        weakTopics = weakTopics.filter(t => t !== topicLower);
    } else if (quizScore < 50 && !weakTopics.includes(topicLower)) {
        weakTopics.push(topicLower);
        strongTopics = strongTopics.filter(t => t !== topicLower);
    }

    // Keep only last 5 strong/weak topics
    strongTopics = strongTopics.slice(-5);
    weakTopics = weakTopics.slice(-5);

    const updated: PerformanceHistory = {
        ...currentPerformance,
        [modalityKey]: newModalityScore,
        averageQuizScore: newAverage,
        totalLessonsCompleted: totalLessons,
        strongTopics,
        weakTopics,
        recentQuizScores: [...(currentPerformance.recentQuizScores || []), quizScore].slice(-5),
        trend:
            newAverage >= previousAverage + 3
                ? "up"
                : newAverage <= previousAverage - 3
                    ? "down"
                    : "stable",
    };

    const difficultyDecision = calculateNextDifficultyWithReason(updated);
    const withDifficulty: PerformanceHistory = {
        ...updated,
        currentDifficulty: difficultyDecision.difficulty,
        difficultyChangeReason: difficultyDecision.reason,
        lastDifficultyChangeDirection: difficultyDecision.direction,
    };

    return applyAdaptiveStanding(withDifficulty, options);
}


