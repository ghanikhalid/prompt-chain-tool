"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteChainAction,
  deleteChainMediaAction,
  reorderStepsAction,
  saveChainAction,
} from "@/app/actions";
import GeneratedMedia from "./GeneratedMedia";
import { isUsableModelKey } from "@/lib/gemini";
import type { ChainMediaItem } from "@/lib/runMedia";
import { IconPlus, IconTrash } from "./Icons";
import type {
  LlmModel,
  PromptChain,
  PromptChainStep,
} from "@/lib/types";

type DraftStep = {
  id?: string;
  name: string;
  prompt_template: string;
  model_id: string | null;
};

export default function ChainEditor({
  chain,
  steps,
  models,
  media,
}: {
  chain: PromptChain;
  steps: PromptChainStep[];
  models: LlmModel[];
  media: ChainMediaItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(chain.name);
  const [description, setDescription] = useState(chain.description ?? "");
  const [active, setActive] = useState(chain.is_active);
  const usableModels = models.filter((model) => isUsableModelKey(model.model_key));
  const usableModelIds = new Set(usableModels.map((model) => model.id));
  const [drafts, setDrafts] = useState<DraftStep[]>(
    [...steps]
      .sort((a, b) => a.step_order - b.step_order)
      .map((step) => ({
        id: step.id,
        name: step.name,
        prompt_template: step.prompt_template,
        model_id: step.model_id && usableModelIds.has(step.model_id) ? step.model_id : null,
      }))
  );
  const [status, setStatus] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const persistOrder = (next: DraftStep[]) => {
    const ids = next.map((step) => step.id).filter((id): id is string => Boolean(id));
    if (ids.length === 0 || ids.length !== next.length) return;
    startTransition(async () => {
      const res = await reorderStepsAction(chain.id, ids);
      if (!res.success) {
        setOk(false);
        setStatus(res.error || "Could not reorder.");
        return;
      }
      setOk(true);
      setStatus("Order saved.");
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= drafts.length) return;
    const next = [...drafts];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setDrafts(next);
    persistOrder(next);
  };

  const save = () => {
    if (drafts.length < 2) {
      setOk(false);
      setStatus("A chain needs at least two steps.");
      return;
    }
    startTransition(async () => {
      const res = await saveChainAction({
        id: chain.id,
        name,
        description,
        is_active: active,
        steps: drafts.map((step) => ({
          ...step,
          model_id:
            step.model_id && usableModelIds.has(step.model_id)
              ? step.model_id
              : null,
        })),
      });
      if (!res.success) {
        setOk(false);
        setStatus(res.error || "Could not save.");
        return;
      }
      setOk(true);
      setStatus("Saved.");
      router.refresh();
    });
  };

  const remove = () => {
    if (!window.confirm("Delete this chain? The mix will drop it too.")) return;
    startTransition(async () => {
      const res = await deleteChainAction(chain.id);
      if (!res.success) {
        setOk(false);
        setStatus(res.error || "Could not delete.");
        return;
      }
      router.push("/chains");
    });
  };

  return (
    <div className="telemetry-suite">
      <div className="page-header-row">
        <div>
          <span className="kicker">Chain</span>
          <h1 className="page-title">
            {name || "Untitled"}{" "}
            <span className="text-gradient">on the page</span>
          </h1>
        </div>
        <p className="page-sub">
          Each step is its own prompt. Later steps get the photo and whatever
          the last step said.
        </p>
      </div>

      <div className="admin-quick-actions" style={{ marginBottom: "18px" }}>
        <Link href={`/try?chain=${chain.id}`} className="btn-primary">
          Try this chain
        </Link>
      </div>

      <section className="telemetry-panel">
          <div className="field-grid">
            <label className="admin-field-label">
              <span className="kicker">Name</span>
              <input
                className="admin-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="admin-field-label">
              <span className="kicker">Live</span>
              <select
                className="admin-input"
                value={active ? "true" : "false"}
                onChange={(event) => setActive(event.target.value === "true")}
              >
                <option value="true">Yes, the mix can pick this</option>
                <option value="false">Resting</option>
              </select>
            </label>
            <label className="admin-field-label" style={{ gridColumn: "1 / -1" }}>
              <span className="kicker">Note</span>
              <textarea
                className="admin-input"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>

          <div className="step-stack" style={{ marginTop: "22px" }}>
            {drafts.map((step, index) => (
              <article key={step.id ?? `new-${index}`} className="step-card">
                <div className="step-head">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="step-index">{index + 1}</span>
                    <input
                      className="admin-input"
                      value={step.name}
                      onChange={(event) =>
                        setDrafts((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, name: event.target.value } : item
                          )
                        )
                      }
                    />
                  </div>
                  <div className="resource-actions">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => move(index, 1)}
                      disabled={index === drafts.length - 1}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="btn-ghost danger-btn"
                      onClick={() =>
                        setDrafts((prev) =>
                          prev.length <= 2
                            ? prev
                            : prev.filter((_, i) => i !== index)
                        )
                      }
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
                <label className="admin-field-label">
                  <span className="kicker">Model</span>
                  <select
                    className="admin-input"
                    value={step.model_id ?? ""}
                    onChange={(event) =>
                      setDrafts((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? { ...item, model_id: event.target.value || null }
                            : item
                        )
                      )
                    }
                  >
                    <option value="">Whatever is available</option>
                    {usableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field-label">
                  <span className="kicker">Prompt</span>
                  <textarea
                    className="admin-input"
                    rows={5}
                    value={step.prompt_template}
                    onChange={(event) =>
                      setDrafts((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? { ...item, prompt_template: event.target.value }
                            : item
                        )
                      )
                    }
                  />
                  <span className="template-hint">
                    Use {"{{previous}}"} for the last step&apos;s line, {"{{input}}"}{" "}
                    for the optional nudge.
                  </span>
                </label>
              </article>
            ))}
          </div>

          <div className="admin-quick-actions" style={{ marginTop: "16px" }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                setDrafts((prev) => [
                  ...prev,
                  {
                    name: `Step ${prev.length + 1}`,
                    prompt_template:
                      "Rewrite {{previous}} so it only works because of a specific detail in the photo. Keep it under 12 words.",
                    model_id: null,
                  },
                ])
              }
            >
              <IconPlus size={14} />
              Add a step
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isPending}
              onClick={save}
            >
              {isPending ? "Saving…" : "Save chain"}
            </button>
            <button
              type="button"
              className="btn-ghost danger-btn"
              disabled={isPending}
              onClick={remove}
            >
              Delete
            </button>
          </div>

          {status ? (
            <p className={ok ? "bootstrap-success" : "form-error"}>{status}</p>
          ) : null}
        </section>

      <section>
        <div className="feed-header">
          <h2 className="section-title">Media from this chain</h2>
          <div className="admin-toolbar">
            <span className="count-pill">{media.length}</span>
            {media.length > 0 ? (
              <button
                type="button"
                className="btn-ghost danger-btn"
                disabled={isPending}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Delete every still and walk from this chain?"
                    )
                  ) {
                    return;
                  }
                  startTransition(async () => {
                    const res = await deleteChainMediaAction(chain.id);
                    if (!res.success) {
                      setOk(false);
                      setStatus(res.error || "Could not delete that media.");
                      return;
                    }
                    router.refresh();
                  });
                }}
              >
                <IconTrash size={14} />
                Delete all
              </button>
            ) : null}
          </div>
        </div>
        <GeneratedMedia items={media} />
      </section>
    </div>
  );
}
