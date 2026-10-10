import type { Metadata } from "next";
import { AnnouncementForm } from "@/components/admin/announcement-form";

export const metadata: Metadata = { title: "New announcement" };
export const dynamic = "force-dynamic";

export default function NewAnnouncementPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold">New announcement</h2>
        <p className="mt-1 text-sm text-ink-3">
          Appears on the news page and the homepage once published.
        </p>
      </div>
      <div className="card p-6">
        <AnnouncementForm />
      </div>
    </div>
  );
}
