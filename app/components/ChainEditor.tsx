"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteChainAction,
  saveChainAction,
} from "@/app/actions";
import Playground from "./Playground";
import { IconPlus, IconTrash } from "./Icons";
import type {
  LlmModel,
  PromptChain,
  PromptChainStep,
  StudioImage,
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
  images,
}: {
  chain: PromptChain;
  steps: PromptChainStep[];
  models: LlmModel[];
  images: StudioImage[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(chain.name);
  const [description, setDescription] = useState(chain.description ?? "");
  const [active, setActive] = useState(chain.is_active);
  const [drafts, setDrafts] = useState<DraftStep[]>(
    [...steps]
      .sort((a, b) => a.step_order - b.step_order)
      .map((step) => ({
        id: step.id,
        name: step.name,
        prompt_template: step.prompt_template,
        model_id: step.model_id,
      }))
  );
  const [status, setStatus] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const move = (index: number, dir: -1 | 1) => {
    setDrafts((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const save = () => {
    startTransition(async () => {
      const res = await saveChainAction({
        id: chain.id,
        name,
        description,
        is_active: active,
        steps: drafts,
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
          Write the steps in order. The last line is what members see on the
          photo.
        </p>
      </div>

      <div className="chain-editor-grid">
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
                        setDrafts((prev) => prev.filter((_, i) => i !== index))
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
                    <option value="">Whatever is free</option>
                    {models.map((model) => (
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
                    model_id: models[0]?.id ?? null,
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

        <Playground
          chains={[chain]}
          images={images}
          defaultChainId={chain.id}
        />
      </div>
    </div>
  );
}
