"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import CertificateCard from "@/components/course/CertificateCard";
import Sidebar from "@/components/Sidebar";
import { db } from "@/lib/firebase";
import { downloadCertificate, fetchCertificates, type CourseCertificate } from "@/lib/certificates";
import { useDashboardData } from "@/lib/useDashboardData";

export default function CertificatesPage() {
    const router = useRouter();
    const { user, loading, stats, userName, signOut } = useDashboardData();

    const [certificates, setCertificates] = useState<CourseCertificate[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    useEffect(() => {
        async function loadCertificates() {
            if (!user) {
                return;
            }

            setPageLoading(true);
            setPageError(null);

            try {
                const nextCertificates = await fetchCertificates(db, user.uid);
                setCertificates(nextCertificates);
            } catch (error) {
                console.error(error);
                setPageError(error instanceof Error ? error.message : "Failed to load certificates.");
            } finally {
                setPageLoading(false);
            }
        }

        if (user) {
            void loadCertificates();
        }
    }, [user]);

    if (loading || !user) {
        return null;
    }

    return (
        <div className="min-h-screen">
            <Sidebar
                userName={userName}
                userAvatar={user.photoURL || "👤"}
                xp={stats.xp}
                level={stats.level}
                streak={stats.streak}
                gems={stats.gems}
                onSignOut={signOut}
            />

            <main className="lg:ml-80 min-h-screen px-4 pb-12 pt-24 md:px-8 lg:px-12">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="inline-flex rounded-full border-[3px] border-black bg-comic-yellow px-4 py-1 text-xs font-black uppercase tracking-[0.18em] text-black">
                                Certificates
                            </div>
                            <h1 className="mt-3 text-4xl font-black leading-tight text-black md:text-6xl">
                                Your mastery certificates.
                            </h1>
                            <p className="mt-2 max-w-3xl text-lg font-bold leading-8 text-gray-600">
                                Every final trial you clear ends here with a downloadable certificate.
                            </p>
                        </div>

                        <Link
                            href="/history"
                            className="inline-flex rounded-2xl border-[4px] border-black bg-comic-blue px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[6px_6px_0px_0px_#000]"
                        >
                            Open Quest Vault
                        </Link>
                    </div>

                    {pageError ? (
                        <div className="rounded-[32px] border-[4px] border-black bg-white p-8 text-center shadow-[8px_8px_0px_0px_#000]">
                            <p className="text-4xl">⚠️</p>
                            <h2 className="mt-4 text-3xl font-black text-black">Certificates failed to load.</h2>
                            <p className="mt-3 text-base font-bold leading-7 text-gray-600">{pageError}</p>
                        </div>
                    ) : pageLoading ? (
                        <div className="grid gap-5 xl:grid-cols-2">
                            {[1, 2].map((item) => (
                                <div key={item} className="h-80 animate-pulse rounded-[28px] border-[4px] border-gray-300 bg-gray-200" />
                            ))}
                        </div>
                    ) : certificates.length > 0 ? (
                        <div className="grid gap-6 xl:grid-cols-2">
                            {certificates.map((certificate) => (
                                <CertificateCard
                                    key={certificate.id}
                                    certificate={certificate}
                                    onDownload={downloadCertificate}
                                    onOpenCourse={(courseId) => router.push(`/course/${courseId}`)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[32px] border-[4px] border-black bg-white p-10 text-center shadow-[8px_8px_0px_0px_#000]">
                            <div className="text-6xl">📜</div>
                            <h2 className="mt-4 text-3xl font-black text-black">No certificates yet.</h2>
                            <p className="mt-3 text-base font-bold leading-7 text-gray-600">
                                Clear a course final trial and your certificate will appear here for download.
                            </p>
                            <Link
                                href="/history"
                                className="mt-6 inline-flex rounded-2xl border-[4px] border-black bg-comic-yellow px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-black shadow-[4px_4px_0px_0px_#000]"
                            >
                                Open History
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
