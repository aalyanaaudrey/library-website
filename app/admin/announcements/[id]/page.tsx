import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AnnouncementForm, type AnnouncementDraft } from "@/components/admin/announcement-form";

export const metadata: Metadata = { title: "Edit announcement" };
export const dynamic = "force-dynamic";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await db.announcement.findUnique({ where: { id } });
  if (!a) notFound();

  const draft: AnnouncementDraft = {
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    pinned: a.pinned,
    published: !!a.publishedAt,
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold">Edit announcement</h2>
        <p className="mt-1 text-sm text-ink-3">{a.title}</p>
      </div>
      <div className="card p-6">
        <AnnouncementForm initial={draft} />
      </div>
    </div>
  );
}
