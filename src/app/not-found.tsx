import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-comic-paper bg-dot-pattern flex items-center justify-center p-6">
            <div className="max-w-md w-full comic-box bg-white p-8 text-center rotate-1">
                <div className="text-8xl mb-6 animate-bounce">🗺️</div>

                <h2 className="text-5xl font-black mb-4 text-comic-ink">
                    Lost in Space?
                </h2>

                <p className="font-bold text-gray-500 mb-8 text-xl">
                    We can't find the page you're looking for. It might have drifted into a black hole!
                </p>

                <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl mb-8 transform -rotate-1">
                    <p className="font-black text-yellow-800 uppercase tracking-widest text-sm mb-2">
                        Mission Status
                    </p>
                    <div className="text-4xl font-black text-comic-ink">
                        404
                    </div>
                </div>

                <Link href="/dashboard">
                    <button className="btn-primary w-full py-4 text-xl">
                        🚀 Take Me Home
                    </button>
                </Link>
            </div>
        </div>
    );
}
