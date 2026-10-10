"use client";

import { useActionState, useState } from "react";
import { saveAnnouncementAction, type AdminFormState } from "@/app/actions/admin";
import { Callout } from "@/components/ui";

const EMPTY: AdminFormState = {};

export type AnnouncementDraft = {
  id?: string;
  title: string;
  excerpt: string | null;
  body: string;
  pinned: boolean;
  published: boolean;
};

export function AnnouncementForm({ initial }: { initial?: AnnouncementDraft }) {
  const [state, formAction, pending] = useActionState(saveAnnouncementAction, EMPTY);
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [published, setPublished] = useState(initial?.published ?? false);
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      {state.error && <Callout tone="danger">{state.error}</Callout>}

      <div>
        <label htmlFor="ann-title" className="label">Title *</label>
        <input
          id="ann-title"
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className={`field ${err.title ? "field-error" : ""}`}
        />
        {err.title && <p className="mt-1.5 text-xs text-red-600">{err.title}</p>}
      </div>

      <div>
        <label htmlFor="ann-excerpt" className="label">
          Short summary <span className="text-ink-3">(shown on cards)</span>
        </label>
        <input
          id="ann-excerpt"
          name="excerpt"
          defaultValue={initial?.excerpt ?? ""}
          maxLength={300}
          className="field"
        />
      </div>

      <div>
        <label htmlFor="ann-body" className="label">Body *</label>
        <textarea
          id="ann-body"
          name="body"
          rows={8}
          required
          defaultValue={initial?.body ?? ""}
          className={`field resize-y ${err.body ? "field-error" : ""}`}
          placeholder="Blank lines create new paragraphs."
        />
        {err.body && <p className="mt-1.5 text-xs text-red-600">{err.body}</p>}
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-[#1f4d3d]"
          />
          Pin to the top
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-[#1f4d3d]"
          />
          Published
        </label>

        {/* FormData reads "on" for a checked box, so mirror the state. */}
        {pinned && <input type="hidden" name="pinned" value="on" />}
        {published && <input type="hidden" name="published" value="on" />}
      </div>

      <div className="flex justify-end gap-2">
        <a href="/admin/announcements" className="btn-secondary">
          Cancel
        </a>
        <button type="submit" disabled={pending} className="btn-primary px-6">
          {pending ? "Saving…" : initial?.id ? "Save changes" : "Publish"}
        </button>
      </div>
    </form>
  );
}
