"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const sections = [
    { id: "overview", title: "Overview", icon: "📖" },
    { id: "how-i-built-it", title: "How I Built It", icon: "🔨" },
    { id: "design-decisions", title: "Design Decisions", icon: "🎨" },
    { id: "features", title: "Features", icon: "✨" },
    { id: "tech-stack", title: "Tech Stack", icon: "🛠️" },
    { id: "architecture", title: "Architecture", icon: "🏗️" },
    { id: "ai-integration", title: "AI Integration", icon: "🤖" },
    { id: "gamification", title: "Gamification", icon: "🎮" },
    { id: "challenges", title: "Challenges & Solutions", icon: "🧩" },
    { id: "getting-started", title: "Getting Started", icon: "🚀" },
    { id: "api", title: "API Reference", icon: "📡" },
];

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState("overview");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-comic-paper">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b-4 border-comic-ink">
                <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 md:gap-3 group">
                        <div className="w-10 h-10 bg-comic-yellow border-3 border-comic-ink rounded-lg flex items-center justify-center text-xl rotate-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-12 transition-transform">
                            🚀
                        </div>
                        <span className="text-xl md:text-2xl font-black tracking-tight text-comic-ink">
                            WeMakeLessons
                        </span>
                    </Link>
                    <div className="flex items-center gap-2 md:gap-4">
                        <span className="hidden md:inline-block px-3 py-1 bg-comic-blue text-white font-black text-sm rounded-full border-2 border-comic-ink">
                            📚 Documentation
                        </span>
                        <Link href="/login">
                            <button className="btn-primary text-sm px-4 py-2">
                                Get Started
                            </button>
                        </Link>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 md:px-6 py-6 md:py-12">
                {/* Mobile TOC Toggle Button */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden flex items-center gap-2 mb-4 px-4 py-3 bg-white border-2 border-comic-ink rounded-xl font-black text-comic-ink shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] w-full justify-between"
                >
                    <span className="flex items-center gap-2">
                        📚 Table of Contents
                    </span>
                    {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

                    {/* Sidebar Navigation - Hidden on mobile unless toggled */}
                    <aside className={`lg:w-64 shrink-0 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
                        <div className="lg:sticky lg:top-28">
                            <nav className="comic-box p-4 bg-white">
                                <h3 className="font-black text-lg mb-4 text-comic-ink hidden lg:block">Contents</h3>
                                <ul className="space-y-1 lg:space-y-2">
                                    {sections.map((section) => (
                                        <li key={section.id}>
                                            <a
                                                href={`#${section.id}`}
                                                onClick={() => {
                                                    setActiveSection(section.id);
                                                    setSidebarOpen(false);
                                                }}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all text-sm lg:text-base ${activeSection === section.id
                                                    ? "bg-comic-yellow text-comic-ink"
                                                    : "text-gray-600 hover:bg-gray-100"
                                                    }`}
                                            >
                                                <span>{section.icon}</span>
                                                <span>{section.title}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-w-0">
                        <div className="comic-box p-6 md:p-10 bg-white">

                            {/* Hero */}
                            <div className="text-center mb-12 pb-8 border-b-4 border-dashed border-gray-200">
                                <h1 className="text-4xl md:text-5xl font-black mb-4 text-comic-ink">
                                    WeMakeLessons <span className="text-comic-blue">Docs</span>
                                </h1>
                                <p className="text-xl font-bold text-gray-500 max-w-2xl mx-auto">
                                    Learn how WeMakeLessons transforms any topic into an interactive, gamified learning adventure using AI.
                                </p>
                            </div>

                            {/* Overview Section */}
                            <section id="overview" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                                    <span className="text-comic-blue">📖</span> Overview
                                </h2>
                                <div className="prose-lg font-bold text-gray-600 space-y-4">
                                    <p>
                                        <strong className="text-comic-ink">WeMakeLessons</strong> is an AI-powered educational platform that transforms any topic into engaging, gamified learning experiences. Whether you want to learn about dinosaurs, space travel, coding, or any other subject, our AI creates personalized courses instantly.
                                    </p>
                                    <div className="bg-comic-yellow/20 border-l-4 border-comic-yellow p-4 rounded-r-lg">
                                        <p className="text-comic-ink">
                                            <strong>🎯 Mission:</strong> Make learning fun and accessible for everyone by combining the power of AI with game-like experiences.
                                        </p>
                                    </div>
                                    <h3 className="text-xl font-black text-comic-ink mt-6">How It Works</h3>
                                    <ol className="list-decimal list-inside space-y-2">
                                        <li><strong>Pick a Topic</strong> - Enter any subject you want to learn about</li>
                                        <li><strong>AI Generation</strong> - Our AI creates a custom course with lessons and quizzes</li>
                                        <li><strong>Learn & Play</strong> - Complete lessons, take quizzes, earn XP and level up!</li>
                                    </ol>
                                </div>
                            </section>

                            {/* How I Built It Section */}
                            <section id="how-i-built-it" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                                    <span className="text-comic-blue">🔨</span> How I Built It
                                </h2>
                                <div className="font-bold text-gray-600 space-y-6">
                                    <p>
                                        This project was built with the help of <strong className="text-comic-ink">Gemini Code Assist (Antigravity)</strong>,
                                        Google's AI-powered coding assistant. Here's the complete development journey:
                                    </p>

                                    <div className="bg-comic-blue/10 border-l-4 border-comic-blue p-4 rounded-r-lg">
                                        <p className="text-comic-ink">
                                            <strong>⏱️ Total Development Time:</strong> ~3 hours from concept to fully functional app
                                        </p>
                                    </div>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">🚀 Phase 1: Project Setup (15 mins)</h3>
                                    <ul className="list-disc list-inside space-y-2 ml-4">
                                        <li>Created Next.js 15 project with App Router and TypeScript</li>
                                        <li>Configured Tailwind CSS v4 with custom theme variables</li>
                                        <li>Set up Firebase project for authentication and database</li>
                                        <li>Installed dependencies: react-markdown, react-hot-toast, lucide-react</li>
                                    </ul>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">🎨 Phase 2: Design System (30 mins)</h3>
                                    <ul className="list-disc list-inside space-y-2 ml-4">
                                        <li>Created comic-book inspired visual language with bold borders and shadows</li>
                                        <li>Defined color palette: comic-yellow, comic-blue, comic-red, comic-green</li>
                                        <li>Built reusable CSS classes: .comic-box, .btn-primary, .comic-badge</li>
                                        <li>Added custom fonts: Bangers (headings), Comic Neue (body)</li>
                                        <li>Created dot-pattern background for authentic comic feel</li>
                                    </ul>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">🔐 Phase 3: Authentication (20 mins)</h3>
                                    <ul className="list-disc list-inside space-y-2 ml-4">
                                        <li>Implemented Firebase Auth with Google Sign-In and Email/Password</li>
                                        <li>Created AuthContext for global user state management</li>
                                        <li>Built login page with animated mascot and comic-style form</li>
                                        <li>Added success/error toasts with sound effects</li>
                                    </ul>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">🤖 Phase 4: AI Course Generation (45 mins)</h3>
                                    <ul className="list-disc list-inside space-y-2 ml-4">
                                        <li>Integrated Google Gemini AI (gemini-2.0-flash) via Vercel AI SDK</li>
                                        <li>Created structured prompts for consistent course output</li>
                                        <li>Built API route <code className="bg-gray-200 px-1 rounded">/api/generate</code> for course creation</li>
                                        <li>Implemented fallback courses for offline/error scenarios</li>
                                        <li>Added AI tutor (Ollie) with contextual help during lessons</li>
                                    </ul>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">📚 Phase 5: Course Experience (40 mins)</h3>
                                    <ul className="list-disc list-inside space-y-2 ml-4">
                                        <li>Built course page with mission-style progress tracking</li>
                                        <li>Created lesson viewer with custom markdown rendering</li>
                                        <li>Implemented quiz system with answer feedback and explanations</li>
                                        <li>Added anti-cheat tab-switch detection during quizzes</li>
                                        <li>Built progress persistence to Firestore</li>
                                    </ul>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">🎮 Phase 6: Gamification (30 mins)</h3>
                                    <ul className="list-disc list-inside space-y-2 ml-4">
                                        <li>Implemented XP system with quiz score bonuses</li>
                                        <li>Created level-up mechanics and progress bars</li>
                                        <li>Built leaderboard with mock users for social competition</li>
                                        <li>Added daily challenges system</li>
                                        <li>Implemented gems/rewards system</li>
                                    </ul>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">📱 Phase 7: Polish & Responsiveness (20 mins)</h3>
                                    <ul className="list-disc list-inside space-y-2 ml-4">
                                        <li>Made all pages fully mobile responsive</li>
                                        <li>Added loading states and skeleton screens</li>
                                        <li>Implemented image fallbacks with loading indicators</li>
                                        <li>Added sound effects for interactions</li>
                                        <li>Created documentation page</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Design Decisions Section */}
                            <section id="design-decisions" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                                    <span className="text-comic-blue">🎨</span> Design Decisions
                                </h2>
                                <div className="font-bold text-gray-600 space-y-6">

                                    <h3 className="text-xl font-black text-comic-ink">Why Comic Book Style?</h3>
                                    <p>
                                        The comic book aesthetic was chosen to make learning feel like an adventure, not a chore.
                                        Bold borders, vibrant colors, and playful animations create a sense of fun and excitement
                                        that traditional educational platforms often lack.
                                    </p>
                                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                                        <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 text-center">
                                            <div className="text-3xl mb-2">🎯</div>
                                            <p className="text-sm">Bold visual hierarchy draws attention to key content</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 text-center">
                                            <div className="text-3xl mb-2">🧠</div>
                                            <p className="text-sm">Playful design reduces learning anxiety</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 text-center">
                                            <div className="text-3xl mb-2">💫</div>
                                            <p className="text-sm">Memorable visuals improve retention</p>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-comic-ink mt-8">Why Next.js 15 with App Router?</h3>
                                    <ul className="list-disc list-inside space-y-2 ml-4">
                                        <li><strong>Server Components:</strong> Better performance with less JavaScript sent to client</li>
                                        <li><strong>Built-in API Routes:</strong> No need for separate backend server</li>
                                        <li><strong>File-based Routing:</strong> Clean, organized page structure</li>
                                        <li><strong>React 19 Features:</strong> Access to latest React improvements</li>
                                    </ul>

                                    <h3 className="text-xl font-black text-comic-ink mt-8">Why Firebase?</h3>
                                    <ul className="list-disc list-inside space-y-2 ml-4">
                                        <li><strong>Quick Setup:</strong> Authentication and database in minutes, not hours</li>
                                        <li><strong>Real-time:</strong> Firestore enables live updates without refresh</li>
                                        <li><strong>Scalable:</strong> Handles growth without infrastructure changes</li>
                                        <li><strong>Free Tier:</strong> Perfect for MVPs and side projects</li>
                                    </ul>

                                    <h3 className="text-xl font-black text-comic-ink mt-8">Why Gemini AI over OpenAI?</h3>
                                    <ul className="list-disc list-inside space-y-2 ml-4">
                                        <li><strong>Generous Free Tier:</strong> More requests per minute for testing</li>
                                        <li><strong>Fast Response:</strong> gemini-2.0-flash is optimized for speed</li>
                                        <li><strong>Structured Output:</strong> Excellent at following JSON schemas</li>
                                        <li><strong>Cost Effective:</strong> Lower cost per token at scale</li>
                                    </ul>

                                    <h3 className="text-xl font-black text-comic-ink mt-8">Fallback-First Philosophy</h3>
                                    <p>
                                        Rather than showing errors when AI fails, WeMakeLessons gracefully falls back to
                                        pre-built courses. This ensures users always have a great experience, even when
                                        external services have issues.
                                    </p>
                                    <div className="bg-comic-green/10 border-l-4 border-comic-green p-4 rounded-r-lg mt-4">
                                        <p className="text-comic-ink">
                                            <strong>💡 Key Principle:</strong> Never let infrastructure problems become user problems.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Features Section */}
                            <section id="features" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                                    <span className="text-comic-blue">✨</span> Features
                                </h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {[
                                        { icon: "🤖", title: "AI Course Generation", desc: "Generate complete courses on any topic in seconds using Google Gemini AI" },
                                        { icon: "🎮", title: "Gamification", desc: "Earn XP, level up, collect gems, and maintain streaks" },
                                        { icon: "📝", title: "Interactive Quizzes", desc: "Test your knowledge with auto-generated quizzes after each lesson" },
                                        { icon: "🦉", title: "AI Tutor (Ollie)", desc: "Get help from our AI tutor when you're stuck on a concept" },
                                        { icon: "🏆", title: "Leaderboard", desc: "Compete with other learners and climb the rankings" },
                                        { icon: "🔥", title: "Daily Challenges", desc: "Complete challenges to earn bonus XP and rewards" },
                                        { icon: "📊", title: "Progress Tracking", desc: "Track your learning journey with detailed progress stats" },
                                        { icon: "🎨", title: "Beautiful UI", desc: "Comic-book inspired design that makes learning fun" },
                                    ].map((feature, i) => (
                                        <div key={i} className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                                            <div className="text-2xl mb-2">{feature.icon}</div>
                                            <h3 className="font-black text-lg text-comic-ink">{feature.title}</h3>
                                            <p className="font-bold text-gray-500 text-sm">{feature.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Tech Stack Section */}
                            <section id="tech-stack" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                                    <span className="text-comic-blue">🛠️</span> Tech Stack
                                </h2>
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-black text-xl text-comic-ink mb-3">Frontend</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {["Next.js 15", "React 19", "TypeScript", "Tailwind CSS v4", "Lucide Icons"].map((tech) => (
                                                <span key={tech} className="px-3 py-1 bg-comic-blue text-white font-bold rounded-full text-sm border-2 border-comic-ink">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-comic-ink mb-3">Backend & Database</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {["Firebase Auth", "Firestore Database", "Next.js API Routes"].map((tech) => (
                                                <span key={tech} className="px-3 py-1 bg-comic-green text-white font-bold rounded-full text-sm border-2 border-comic-ink">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-comic-ink mb-3">AI & APIs</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {["Google Gemini AI", "Vercel AI SDK", "react-markdown"].map((tech) => (
                                                <span key={tech} className="px-3 py-1 bg-comic-yellow text-comic-ink font-bold rounded-full text-sm border-2 border-comic-ink">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-comic-ink mb-3">Other Libraries</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {["react-hot-toast", "use-sound", "canvas-confetti"].map((tech) => (
                                                <span key={tech} className="px-3 py-1 bg-gray-200 text-gray-700 font-bold rounded-full text-sm border-2 border-gray-400">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Architecture Section */}
                            <section id="architecture" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                                    <span className="text-comic-blue">🏗️</span> Architecture
                                </h2>
                                <div className="font-bold text-gray-600 space-y-4">
                                    <p>WeMakeLessons follows a modern, serverless architecture:</p>

                                    <div className="bg-gray-900 text-green-400 p-6 rounded-xl font-mono text-sm overflow-x-auto">
                                        <pre>{`wml-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes (generate, tutor)
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── course/[id]/        # Course & lesson pages
│   │   └── login/              # Authentication
│   ├── components/             # Reusable UI components
│   ├── context/                # React Context (Auth)
│   └── lib/                    # Utilities & services
│       ├── ai.ts               # AI generation logic
│       ├── firebase.ts         # Firebase configuration
│       └── fallbackCourses.ts  # Offline course data
├── public/                     # Static assets
└── package.json`}</pre>
                                    </div>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">Data Flow</h3>
                                    <ol className="list-decimal list-inside space-y-2">
                                        <li><strong>User Authentication</strong> - Firebase Auth handles login/signup with Google or email</li>
                                        <li><strong>Course Generation</strong> - API route calls Gemini AI to generate structured course content</li>
                                        <li><strong>Data Storage</strong> - Courses and progress saved to Firestore</li>
                                        <li><strong>Rendering</strong> - React components render markdown content with custom styling</li>
                                    </ol>
                                </div>
                            </section>

                            {/* AI Integration Section */}
                            <section id="ai-integration" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                                    <span className="text-comic-blue">🤖</span> AI Integration
                                </h2>
                                <div className="font-bold text-gray-600 space-y-4">
                                    <p>
                                        We use <strong className="text-comic-ink">Google Gemini AI</strong> (gemini-2.0-flash) for intelligent content generation.
                                    </p>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">Course Generation</h3>
                                    <p>When a user enters a topic, we send a structured prompt to Gemini:</p>
                                    <div className="bg-gray-100 p-4 rounded-xl text-sm">
                                        <p className="text-gray-700">The AI generates:</p>
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                            <li>Course title and description</li>
                                            <li>Learning objectives</li>
                                            <li>4+ lessons with rich markdown content</li>
                                            <li>Quiz questions with explanations</li>
                                            <li>Difficulty and age-appropriate metadata</li>
                                        </ul>
                                    </div>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">AI Tutor (Ollie)</h3>
                                    <p>
                                        The AI tutor provides contextual help during lessons. It receives the lesson content as context and answers questions in a friendly, educational manner.
                                    </p>

                                    <div className="bg-comic-blue/10 border-l-4 border-comic-blue p-4 rounded-r-lg mt-4">
                                        <p className="text-comic-ink">
                                            <strong>💡 Fallback System:</strong> If AI generation fails, the app uses pre-built courses from <code className="bg-gray-200 px-1 rounded">fallbackCourses.ts</code> to ensure users always have content.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Gamification Section */}
                            <section id="gamification" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                                    <span className="text-comic-blue">🎮</span> Gamification
                                </h2>
                                <div className="font-bold text-gray-600 space-y-4">
                                    <p>
                                        Gamification is core to WeMakeLessons. We use game mechanics to motivate continuous learning.
                                    </p>

                                    <div className="grid md:grid-cols-2 gap-4 mt-6">
                                        <div className="p-4 bg-comic-yellow/20 rounded-xl border-2 border-comic-yellow">
                                            <h4 className="font-black text-comic-ink flex items-center gap-2">
                                                ⚡ Experience Points (XP)
                                            </h4>
                                            <p className="text-sm mt-2">Earn XP by completing lessons and quizzes. Higher quiz scores = more XP!</p>
                                        </div>
                                        <div className="p-4 bg-comic-blue/20 rounded-xl border-2 border-comic-blue">
                                            <h4 className="font-black text-comic-ink flex items-center gap-2">
                                                🛡️ Levels
                                            </h4>
                                            <p className="text-sm mt-2">Level up as you accumulate XP. Each level requires more XP than the last.</p>
                                        </div>
                                        <div className="p-4 bg-comic-red/20 rounded-xl border-2 border-comic-red">
                                            <h4 className="font-black text-comic-ink flex items-center gap-2">
                                                🔥 Streaks
                                            </h4>
                                            <p className="text-sm mt-2">Maintain daily learning streaks. Don't break the chain!</p>
                                        </div>
                                        <div className="p-4 bg-comic-green/20 rounded-xl border-2 border-comic-green">
                                            <h4 className="font-black text-comic-ink flex items-center gap-2">
                                                💎 Gems
                                            </h4>
                                            <p className="text-sm mt-2">Collect gems as premium currency for future features.</p>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">Anti-Cheat System</h3>
                                    <p>
                                        During quizzes, we track tab switches to discourage looking up answers. Users receive a warning if they leave the quiz page.
                                    </p>
                                </div>
                            </section>

                            {/* Challenges & Solutions Section */}
                            <section id="challenges" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                                    <span className="text-comic-blue">🧩</span> Challenges & Solutions
                                </h2>
                                <div className="font-bold text-gray-600 space-y-6">
                                    <p>
                                        Building WeMakeLessons wasn't without challenges. Here's how I tackled the major obstacles:
                                    </p>

                                    <div className="space-y-6">
                                        {/* Challenge 1 */}
                                        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-comic-red/20 p-4 border-b-2 border-gray-200">
                                                <h3 className="font-black text-comic-ink flex items-center gap-2">
                                                    <span>❌</span> Challenge: AI Output Inconsistency
                                                </h3>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <p><strong>Problem:</strong> Gemini AI sometimes returned malformed JSON or didn't follow the expected schema, causing the app to crash.</p>
                                                <div className="bg-comic-green/10 p-3 rounded-lg">
                                                    <p className="flex items-center gap-2">
                                                        <span>✅</span>
                                                        <strong>Solution:</strong> Implemented strict JSON schema validation with Zod. Added try/catch wrapper and fallback to pre-built courses when AI fails. Also added structured prompts with explicit JSON examples.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Challenge 2 */}
                                        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-comic-red/20 p-4 border-b-2 border-gray-200">
                                                <h3 className="font-black text-comic-ink flex items-center gap-2">
                                                    <span>❌</span> Challenge: Image Loading & Broken Images
                                                </h3>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <p><strong>Problem:</strong> AI-generated image URLs often failed to load, leaving broken image icons throughout lessons.</p>
                                                <div className="bg-comic-green/10 p-3 rounded-lg">
                                                    <p className="flex items-center gap-2">
                                                        <span>✅</span>
                                                        <strong>Solution:</strong> Created a custom LessonImage component with 3-tier fallback: Primary source → Unsplash search → Placeholder.co with topic text. Added loading states to show "Loading image..." while fetching.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Challenge 3 */}
                                        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-comic-red/20 p-4 border-b-2 border-gray-200">
                                                <h3 className="font-black text-comic-ink flex items-center gap-2">
                                                    <span>❌</span> Challenge: Quiz Cheating Prevention
                                                </h3>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <p><strong>Problem:</strong> Users could easily switch tabs to Google answers during quizzes, defeating the learning purpose.</p>
                                                <div className="bg-comic-green/10 p-3 rounded-lg">
                                                    <p className="flex items-center gap-2">
                                                        <span>✅</span>
                                                        <strong>Solution:</strong> Implemented visibility change detection using document.visibilitychange event. Shows warning modal when user leaves quiz tab, counts switch attempts, and discourages cheating without being too punitive.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Challenge 4 */}
                                        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-comic-red/20 p-4 border-b-2 border-gray-200">
                                                <h3 className="font-black text-comic-ink flex items-center gap-2">
                                                    <span>❌</span> Challenge: Mobile Responsiveness
                                                </h3>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <p><strong>Problem:</strong> Comic-style design with heavy shadows and borders looked cluttered on small screens.</p>
                                                <div className="bg-comic-green/10 p-3 rounded-lg">
                                                    <p className="flex items-center gap-2">
                                                        <span>✅</span>
                                                        <strong>Solution:</strong> Used Tailwind responsive prefixes (md:, lg:) extensively. Reduced border widths, shadows, and padding on mobile. Hid non-essential decorative elements. Adjusted font sizes proportionally.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Challenge 5 */}
                                        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-comic-red/20 p-4 border-b-2 border-gray-200">
                                                <h3 className="font-black text-comic-ink flex items-center gap-2">
                                                    <span>❌</span> Challenge: Progress Tracking Complexity
                                                </h3>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <p><strong>Problem:</strong> Tracking which lessons were completed, quiz scores, and XP across multiple courses was complex.</p>
                                                <div className="bg-comic-green/10 p-3 rounded-lg">
                                                    <p className="flex items-center gap-2">
                                                        <span>✅</span>
                                                        <strong>Solution:</strong> Created separate Firestore collections: users (profile + stats), courses (content), and course_progress (per-user per-course tracking). Used arrayUnion for atomic lesson completion updates.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Challenge 6 */}
                                        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-comic-red/20 p-4 border-b-2 border-gray-200">
                                                <h3 className="font-black text-comic-ink flex items-center gap-2">
                                                    <span>❌</span> Challenge: Markdown Rendering Consistency
                                                </h3>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <p><strong>Problem:</strong> AI-generated markdown rendered inconsistently, with different heading sizes, list styles, and image placements.</p>
                                                <div className="bg-comic-green/10 p-3 rounded-lg">
                                                    <p className="flex items-center gap-2">
                                                        <span>✅</span>
                                                        <strong>Solution:</strong> Created custom ReactMarkdown component overrides for h1, h2, h3, p, ul, li, blockquote, strong, and img elements. Each maps to styled Tailwind classes matching the comic theme.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-comic-yellow/20 border-l-4 border-comic-yellow p-4 rounded-r-lg mt-6">
                                        <p className="text-comic-ink">
                                            <strong>🎓 Lesson Learned:</strong> Always build with graceful degradation in mind. External services will fail - your app shouldn't.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Getting Started Section */}
                            <section id="getting-started" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                                    <span className="text-comic-blue">🚀</span> Getting Started
                                </h2>
                                <div className="font-bold text-gray-600 space-y-4">
                                    <h3 className="text-xl font-black text-comic-ink">Prerequisites</h3>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Node.js 18+</li>
                                        <li>npm or yarn</li>
                                        <li>Firebase account</li>
                                        <li>Google AI API key</li>
                                    </ul>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">Installation</h3>
                                    <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-sm overflow-x-auto">
                                        <pre>{`# Clone the repository
git clone https://github.com/yourusername/wml-app.git

# Install dependencies
cd wml-app
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase and Gemini API keys

# Run development server
npm run dev`}</pre>
                                    </div>

                                    <h3 className="text-xl font-black text-comic-ink mt-6">Environment Variables</h3>
                                    <div className="bg-gray-100 p-4 rounded-xl text-sm font-mono">
                                        <pre>{`NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key`}</pre>
                                    </div>
                                </div>
                            </section>

                            {/* API Reference Section */}
                            <section id="api" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                                    <span className="text-comic-blue">📡</span> API Reference
                                </h2>
                                <div className="font-bold text-gray-600 space-y-6">

                                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-comic-blue text-white p-3 font-black flex items-center gap-2">
                                            <span className="bg-white text-comic-blue px-2 py-0.5 rounded text-sm">POST</span>
                                            /api/generate
                                        </div>
                                        <div className="p-4">
                                            <p className="mb-2">Generate a new course using AI</p>
                                            <p className="text-sm text-gray-500">Request body:</p>
                                            <pre className="bg-gray-100 p-2 rounded text-sm mt-1">{`{ "topic": "string" }`}</pre>
                                            <p className="text-sm text-gray-500 mt-2">Response: GeneratedCourse object</p>
                                        </div>
                                    </div>

                                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-comic-green text-white p-3 font-black flex items-center gap-2">
                                            <span className="bg-white text-comic-green px-2 py-0.5 rounded text-sm">POST</span>
                                            /api/tutor
                                        </div>
                                        <div className="p-4">
                                            <p className="mb-2">Ask the AI tutor a question</p>
                                            <p className="text-sm text-gray-500">Request body:</p>
                                            <pre className="bg-gray-100 p-2 rounded text-sm mt-1">{`{
  "lessonContext": "string",
  "question": "string",
  "isQuizRelated": boolean
}`}</pre>
                                            <p className="text-sm text-gray-500 mt-2">Response: <code>{`{ "response": "string" }`}</code></p>
                                        </div>
                                    </div>

                                </div>
                            </section>

                            {/* Footer */}
                            <div className="mt-12 pt-8 border-t-4 border-dashed border-gray-200 text-center">
                                <p className="font-bold text-gray-500">
                                    Built with ❤️ by{" "}
                                    <a
                                        href="https://hakkan.is-a.dev"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-comic-blue hover:underline font-black"
                                    >
                                        Hakkan
                                    </a>
                                </p>
                                <div className="mt-4">
                                    <Link href="/">
                                        <button className="btn-primary">
                                            ← Back to Home
                                        </button>
                                    </Link>
                                </div>
                            </div>

                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
