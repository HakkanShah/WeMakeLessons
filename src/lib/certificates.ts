import type { Firestore } from "firebase/firestore";
import { collection, getDocs, query, where } from "firebase/firestore";

export interface CourseCertificate {
    id: string;
    userId: string;
    courseId: string;
    courseTitle: string;
    recipientName: string;
    certificateTitle: string;
    certificateSubtitle: string;
    difficulty: string;
    duration: string;
    finalScore: number;
    totalQuestions: number;
    certificateNumber: string;
    issuedAtLabel: string;
    issuedAtRaw: unknown;
}

function toDate(value: unknown): Date | null {
    if (!value) return null;

    if (value instanceof Date) return value;

    if (typeof value === "object") {
        const candidate = value as { toDate?: () => Date; seconds?: number };
        if (typeof candidate.toDate === "function") {
            return candidate.toDate();
        }
        if (typeof candidate.seconds === "number") {
            return new Date(candidate.seconds * 1000);
        }
    }

    return null;
}

function formatDateLabel(value: unknown, emptyLabel: string): string {
    const date = toDate(value);
    if (!date) return emptyLabel;

    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

export function buildCertificateNumber(courseId: string, userId: string): string {
    const coursePart = courseId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "COURSE";
    const userPart = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "USER";
    return `WML-${coursePart}-${userPart}`;
}

export function buildCertificateSvg(certificate: CourseCertificate): string {
    const safeRecipient = certificate.recipientName.replace(/[<&>"]/g, "");
    const safeCourse = certificate.courseTitle.replace(/[<&>"]/g, "");
    const safeTitle = certificate.certificateTitle.replace(/[<&>"]/g, "");
    const safeSubtitle = certificate.certificateSubtitle.replace(/[<&>"]/g, "");

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100" role="img" aria-label="${safeTitle}">
  <rect width="1600" height="1100" fill="#f5f0df"/>
  <rect x="38" y="38" width="1524" height="1024" rx="32" fill="#fffdf5" stroke="#000000" stroke-width="10"/>
  <rect x="82" y="82" width="1436" height="936" rx="26" fill="#f7fbff" stroke="#000000" stroke-width="4"/>
  <rect x="110" y="110" width="1380" height="160" rx="30" fill="#55acee" stroke="#000000" stroke-width="6"/>
  <text x="800" y="184" text-anchor="middle" font-family="Georgia, serif" font-size="38" font-weight="700" fill="#ffffff">WeMakeLessons</text>
  <text x="800" y="238" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="900" fill="#ffffff">${safeTitle}</text>

  <text x="800" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#444444">This certifies that</text>
  <text x="800" y="462" text-anchor="middle" font-family="Georgia, serif" font-size="96" font-weight="700" fill="#000000">${safeRecipient}</text>
  <text x="800" y="560" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#444444">${safeSubtitle}</text>
  <text x="800" y="642" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="900" fill="#111111">${safeCourse}</text>

  <rect x="220" y="735" width="340" height="130" rx="24" fill="#ffda47" stroke="#000000" stroke-width="5"/>
  <rect x="630" y="735" width="340" height="130" rx="24" fill="#d9f7dd" stroke="#000000" stroke-width="5"/>
  <rect x="1040" y="735" width="340" height="130" rx="24" fill="#f9e8b8" stroke="#000000" stroke-width="5"/>

  <text x="390" y="786" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#444444">Final Score</text>
  <text x="390" y="838" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="900" fill="#000000">${certificate.finalScore}/${certificate.totalQuestions}</text>

  <text x="800" y="786" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#444444">Challenge Level</text>
  <text x="800" y="838" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#000000">${certificate.difficulty}</text>

  <text x="1210" y="786" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#444444">Issued</text>
  <text x="1210" y="838" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="900" fill="#000000">${certificate.issuedAtLabel}</text>

  <line x1="220" y1="940" x2="520" y2="940" stroke="#000000" stroke-width="4"/>
  <line x1="1080" y1="940" x2="1380" y2="940" stroke="#000000" stroke-width="4"/>
  <text x="220" y="984" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#444444">Lead Tutor Signature</text>
  <text x="1080" y="984" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#444444">Certificate No. ${certificate.certificateNumber}</text>
</svg>
`.trim();
}

export function downloadCertificate(certificate: CourseCertificate) {
    const svg = buildCertificateSvg(certificate);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${certificate.courseTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-certificate.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function fetchCertificates(db: Firestore, userId: string): Promise<CourseCertificate[]> {
    const snapshot = await getDocs(query(collection(db, "certificates"), where("userId", "==", userId)));

    return snapshot.docs
        .map((document) => normalizeCertificateRecord(document.id, document.data() as Record<string, unknown>, userId))
        .sort((left, right) => {
            const leftTime = toDate(left.issuedAtRaw)?.getTime() || 0;
            const rightTime = toDate(right.issuedAtRaw)?.getTime() || 0;
            return rightTime - leftTime;
        });
}

export function normalizeCertificateRecord(id: string, data: Record<string, unknown>, fallbackUserId: string): CourseCertificate {
    return {
        id,
        userId: String(data.userId || fallbackUserId),
        courseId: String(data.courseId || ""),
        courseTitle: String(data.courseTitle || "Untitled Course"),
        recipientName: String(data.recipientName || "Learner"),
        certificateTitle: String(data.certificateTitle || "Certificate of Mastery"),
        certificateSubtitle: String(data.certificateSubtitle || "Awarded for successfully completing a structured learning path."),
        difficulty: String(data.difficulty || "Beginner"),
        duration: String(data.duration || "Self-paced"),
        finalScore: Number(data.finalScore || 0),
        totalQuestions: Number(data.totalQuestions || 0),
        certificateNumber: String(data.certificateNumber || buildCertificateNumber(String(data.courseId || ""), fallbackUserId)),
        issuedAtLabel: formatDateLabel(data.issuedAt, "Recently"),
        issuedAtRaw: data.issuedAt,
    } satisfies CourseCertificate;
}
