"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Link } from "lucide-react";
import toast from "react-hot-toast";
import { playSound } from "@/lib/sounds";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    role: "student",
                    createdAt: serverTimestamp(),
                    stats: {
                        xp: 0,
                        level: 1,
                        streak: 0
                    }
                });
            }

            router.push("/dashboard");
        } catch (error) {
            console.error("Login failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // ... same auth logic ...
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                router.push("/dashboard");
            } else {
                const result = await createUserWithEmailAndPassword(auth, email, password);
                const user = result.user;
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    email: user.email,
                    role: "student",
                    createdAt: serverTimestamp(),
                    stats: { xp: 0, level: 1, streak: 0 }
                });
                router.push("/dashboard");
            }
        } catch (error) {
            playSound("error");
            toast.error("Auth failed! Check your magic words 🧙‍♂️");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-6 relative overflow-hidden">

            {/* Background Blobs */}
            <div className="absolute top-0 left-0 w-40 md:w-64 h-40 md:h-64 bg-comic-blue rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float-slow"></div>
            <div className="absolute bottom-0 right-0 w-40 md:w-64 h-40 md:h-64 bg-comic-yellow rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float-slow" style={{ animationDelay: '1s' }}></div>

            {/* Home Link */}
            <div className="absolute top-4 left-4 md:top-6 md:left-6 z-50">
                <a href="/" className="flex items-center gap-2 font-black text-black hover:scale-105 transition-transform">
                    <span className="bg-white border-2 border-black rounded-lg w-8 h-8 flex items-center justify-center text-lg shadow-[2px_2px_0px_0px_#000]">⬅️</span>
                    <span className="hidden md:inline">Back to Home</span>
                </a>
            </div>

            <div className="w-full max-w-md relative z-10">

                {/* Mascot Header */}
                <div className="flex justify-center mb-4 md:mb-6">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-white border-3 md:border-4 border-comic-ink rounded-full flex items-center justify-center text-3xl md:text-5xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                        🦉
                    </div>
                </div>

                {/* Comic Card */}
                <div className="bg-white border-[2px] md:border-[3px] border-comic-ink rounded-2xl p-5 md:p-8 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative rotate-1">

                    {/* Tape Effect */}
                    <div className="absolute -top-2 md:-top-3 left-1/2 -translate-x-1/2 w-24 md:w-32 h-6 md:h-8 bg-comic-yellow/30 rotate-1 transform"></div>

                    <h2 className="text-2xl md:text-3xl font-black text-center mb-1 md:mb-2">
                        {isLogin ? "Welcome Back!" : "Join the Club!"}
                    </h2>
                    <p className="text-center font-bold text-gray-500 text-sm md:text-base mb-6 md:mb-8">
                        {isLogin ? "Ready for another adventure?" : "Let's get your journey started!"}
                    </p>

                    {/* Google Button */}
                    <button
                        onClick={() => {
                            playSound("click");
                            handleGoogleLogin();
                        }}
                        disabled={loading}
                        className="w-full btn-secondary mb-4 md:mb-6 flex items-center justify-center gap-2 md:gap-3 hover:-translate-y-1 transition-all text-sm md:text-base py-2 md:py-3"
                    >
                        <span className="text-lg md:text-xl font-black bg-white rounded-full w-7 h-7 md:w-8 md:h-8 flex items-center justify-center border-2 border-black text-comic-blue">G</span>
                        Continue with Google
                    </button>

                    <div className="relative mb-4 md:mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t-2 border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs md:text-sm">
                            <span className="px-2 bg-white text-gray-500 font-bold">OR USE EMAIL</span>
                        </div>
                    </div>

                    <form onSubmit={(e) => { playSound("click"); handleEmailAuth(e); }} className="space-y-3 md:space-y-4">
                        <div>
                            <label className="block font-bold mb-1 ml-1 text-xs md:text-sm">Email Address</label>
                            <input
                                type="email"
                                placeholder="you@awesome.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full comic-input bg-gray-50 text-sm md:text-base py-2 md:py-3"
                                required
                            />
                        </div>
                        <div>
                            <label className="block font-bold mb-1 ml-1 text-xs md:text-sm">Password</label>
                            <input
                                type="password"
                                placeholder="Shhh... secret!"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full comic-input bg-gray-50 text-sm md:text-base py-2 md:py-3"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary text-base md:text-lg mt-3 md:mt-4 py-3 md:py-4 shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000]"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <span className="animate-spin">⚙️</span> Loading...
                                </span>
                            ) : (isLogin ? "Let's Go! 🚀" : "Create Account ✨")}
                        </button>
                    </form>

                </div>

                {/* Footer Link */}
                <div className="text-center mt-6 md:mt-8">
                    <button
                        onClick={() => {
                            playSound("click");
                            setIsLogin(!isLogin);
                        }}
                        className="font-bold text-comic-blue hover:text-comic-blue-dark text-base md:text-lg underline decoration-wavy decoration-2"
                    >
                        {isLogin ? "Need an account? Sign Up!" : "Already have an account? Log In!"}
                    </button>
                </div>

            </div>
        </div>
    );
}
