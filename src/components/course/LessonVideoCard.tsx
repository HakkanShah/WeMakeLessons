import type { StructuredLessonVideo } from "@/lib/structuredCourse";
import { buildYouTubeEmbedUrl } from "@/lib/lessonMedia";

interface LessonVideoCardProps {
    video: StructuredLessonVideo;
    resolving?: boolean;
}

export default function LessonVideoCard({ video, resolving = false }: LessonVideoCardProps) {
    const embedUrl = buildYouTubeEmbedUrl(video.url);
    const actionLabel = embedUrl ? "Open on YouTube" : resolving ? "Open backup search" : "Search this video";

    return (
        <section className="flex h-full flex-col comic-box p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-800">
                    Step 2 - Required lesson video
                </p>
                {resolving && !embedUrl && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
                        Finding best match
                    </span>
                )}
            </div>
            <h3 className="mt-2 text-2xl font-black leading-tight text-comic-ink [overflow-wrap:anywhere]">{video.title}</h3>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-800">{video.summary}</p>
            <p className="mt-2 rounded-2xl border-[2px] border-black bg-comic-yellow/20 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-comic-ink">
                Every lesson contains one relevant video.
            </p>

            <div className="mt-5 overflow-hidden rounded-[24px] panel-border-sm bg-slate-50">
                {embedUrl ? (
                    <div className="aspect-video bg-black">
                        <iframe
                            src={embedUrl}
                            title={video.title}
                            className="h-full w-full"
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                        />
                    </div>
                ) : (
                    <div className="flex aspect-video flex-col items-center justify-center gap-4 px-6 text-center">
                        <div className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${resolving ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-800"}`}>
                            {resolving ? "Loading video" : "Search ready"}
                        </div>
                        <p className="max-w-sm text-base font-medium leading-7 text-slate-800">
                            {resolving
                                ? "Matching an embeddable lesson video for this stage. It will appear here automatically."
                                : "Open the recommended lesson video using the learning search below."}
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl panel-border-sm bg-slate-50 p-4">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-800">
                        {embedUrl ? "Reference search" : "Suggested search"}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-comic-ink [overflow-wrap:anywhere]">
                        {video.searchQuery}
                    </p>
                </div>

                <a
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary w-full"
                >
                    {actionLabel}
                </a>
            </div>
        </section>
    );
}
