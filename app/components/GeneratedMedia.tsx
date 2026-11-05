"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteWalkAction } from "@/app/actions";
import type { ChainMediaItem } from "@/lib/runMedia";
import { IconTrash } from "./Icons";

function shortDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function GeneratedMedia({
  items,
  emptyLabel = "Walk this chain on Try to see the stills it makes.",
}: {
  items: ChainMediaItem[];
  emptyLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const withMedia = items.filter((item) => item.imageUrl || item.caption);

  const remove = (requestId: string) => {
    if (!window.confirm("Delete this still and its walk?")) return;
    setBusyId(requestId);
    startTransition(async () => {
      const res = await deleteWalkAction(requestId);
      setBusyId(null);
      if (res.success) router.refresh();
    });
  };

  if (withMedia.length === 0) {
    return (
      <section className="empty-card">
        <span className="kicker">Media</span>
        <h2 className="gate-title">Nothing from this chain yet</h2>
        <p className="empty-sub">{emptyLabel}</p>
      </section>
    );
  }

  return (
    <div className="generated-media-grid">
      {withMedia.map((item) => (
        <article key={item.requestId} className="generated-media-card">
          {item.imageUrl ? (
            <div className="generated-media-stage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt="" />
            </div>
          ) : null}
          <div className="generated-media-body">
            <span className="kicker">{item.status}</span>
            {item.caption ? (
              <p className="generated-media-caption">{item.caption}</p>
            ) : (
              <p className="card-copy">Still working.</p>
            )}
            <div className="resource-actions">
              <span className="count-pill">{shortDate(item.createdAt)}</span>
              <button
                type="button"
                className="btn-ghost danger-btn"
                disabled={isPending && busyId === item.requestId}
                onClick={() => remove(item.requestId)}
              >
                <IconTrash size={14} />
                Delete
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
