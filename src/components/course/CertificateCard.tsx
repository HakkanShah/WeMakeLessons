"use client";

import type { CourseCertificate } from "@/lib/certificates";

interface CertificateCardProps {
    certificate: CourseCertificate;
    onDownload: (certificate: CourseCertificate) => void;
    onOpenCourse?: (courseId: string) => void;
}

export default function CertificateCard({ certificate, onDownload, onOpenCourse }: CertificateCardProps) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Issued certificate</p>
                        <h3 className="mt-2 text-3xl font-semibold leading-tight text-slate-900">{certificate.certificateTitle}</h3>
                        <p className="mt-2 text-lg leading-7 text-slate-700">{certificate.courseTitle}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Final score</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900">{certificate.finalScore}/{certificate.totalQuestions}</p>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Recipient</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{certificate.recipientName}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Issued</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{certificate.issuedAtLabel}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Certificate no.</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{certificate.certificateNumber}</p>
                    </div>
                </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => onDownload(certificate)}
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                    Download Certificate
                </button>
                {onOpenCourse && (
                    <button
                        type="button"
                        onClick={() => onOpenCourse(certificate.courseId)}
                        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Open Course
                    </button>
                )}
            </div>
        </article>
    );
}
