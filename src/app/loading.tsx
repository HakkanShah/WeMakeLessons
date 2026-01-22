export default function Loading() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-comic-paper">
            <div className="relative">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-comic-yellow border-4 border-comic-ink rounded-2xl flex items-center justify-center text-5xl md:text-6xl animate-bounce shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-3">
                    🚀
                </div>
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-48 h-4 bg-black/10 rounded-full blur-xl animate-pulse"></div>
            </div>

            <h2 className="mt-16 text-3xl md:text-5xl font-black text-comic-ink tracking-wide animate-pulse text-center">
                Loading Adventure...
            </h2>

            <div className="mt-8 flex gap-2">
                <div className="w-4 h-4 bg-comic-blue rounded-full animate-bounce [animation-delay:-0.3s] border-2 border-comic-ink"></div>
                <div className="w-4 h-4 bg-comic-red rounded-full animate-bounce [animation-delay:-0.15s] border-2 border-comic-ink"></div>
                <div className="w-4 h-4 bg-comic-green rounded-full animate-bounce border-2 border-comic-ink"></div>
            </div>
        </div>
    );
}
