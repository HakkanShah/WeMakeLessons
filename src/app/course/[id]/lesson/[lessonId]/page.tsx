import { redirect } from "next/navigation";

export default async function LegacyLessonRedirect({
    params,
}: {
    params: Promise<{ id: string; lessonId: string }>;
}) {
    const { id, lessonId } = await params;
    redirect(`/course/${id}?lesson=${encodeURIComponent(lessonId)}`);
}
