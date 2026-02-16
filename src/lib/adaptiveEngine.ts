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
    lastUpdated?: unknown; // Firestore Timestamp
}

export type Modality = 'visual' | 'reading' | 'handson' | 'listening';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

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
export function calculateNextDifficulty(
    performance: PerformanceHistory
): Difficulty {
    const { averageQuizScore, totalLessonsCompleted, currentDifficulty } = performance;

    // Need at least 3 completed lessons to make a difficulty change
    if (totalLessonsCompleted < 3) return currentDifficulty;

    if (averageQuizScore >= 80) {
        // Bump up
        if (currentDifficulty === 'beginner') return 'intermediate';
        if (currentDifficulty === 'intermediate') return 'advanced';
        return 'advanced';
    }

    if (averageQuizScore < 50) {
        // Bump down
        if (currentDifficulty === 'advanced') return 'intermediate';
        if (currentDifficulty === 'intermediate') return 'beginner';
        return 'beginner';
    }

    return currentDifficulty;
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
    };

    // Recalculate difficulty
    updated.currentDifficulty = calculateNextDifficulty(updated);

    return updated;
}


