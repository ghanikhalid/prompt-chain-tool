"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteWalkAction } from "@/app/actions";
import { buildWalkList, type WalkListItem } from "@/lib/runMedia";
import type {
  GenerationRequest,
  LlmResponse,
  PromptChain,
  RunStepResult,
} from "@/lib/types";
import { IconTrash } from "./Icons";
import WalkTheater from "./WalkTheater";

function shortDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function walkSteps(item: WalkListItem, chainName: string): RunStepResult[] {
  if (item.walk?.steps.length) return item.walk.steps;
  return item.fallbackOutputs.map((output, index) => ({
    id: `${item.requestId}-${index}`,
    name: `Step ${index + 1}`,
    prompt: "",
    output,
    modelName: chainName,
    latencyMs: 0,
  }));
}

export default function RunsBoard({
  requests,
  responses,
  chains,
  missing,
  error,
}: {
  requests: GenerationRequest[];
  responses: LlmResponse[];
  chains: PromptChain[];
  missing: boolean;
  error?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const chainName = Object.fromEntries(chains.map((chain) => [chain.id, chain.name]));
  const walks = useMemo(
    () => buildWalkList(requests, responses),
    [requests, responses]
  );
  const [activeId, setActiveId] = useState<string | null>(walks[0]?.requestId ?? null);
  const active = walks.find((item) => item.requestId === activeId) ?? null;
  const activeSteps = active
    ? walkSteps(active, chainName[active.chainId ?? ""] || "Chain")
    : [];

  return (
    <div className="telemetry-suite">
      <div className="page-header-row">
        <div>
          <span className="kicker">Walks</span>
          <h1 className="page-title">
            Every time a chain <span className="text-gradient">looked at a still</span>
          </h1>
        </div>
        <p className="page-sub">
          Open a walk and scroll the steps. The photo stays clean. The lines live
          beside it.
        </p>
      </div>

      {missing ? (
        <div className="schema-banner">Run history is not in this database yet.</div>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}

      {walks.length === 0 && !missing ? (
        <section className="empty-card">
          <span className="kicker">Quiet</span>
          <h2 className="gate-title">No walks yet</h2>
          <p className="empty-sub">Open Try, drop a photo, and walk a chain.</p>
        </section>
      ) : (
        <div className="walk-layout">
          <div className="walk-rail" role="list">
            {walks.map((item) => {
              const steps = walkSteps(item, chainName[item.chainId ?? ""] || "Chain");
              const last = steps[steps.length - 1]?.output || "Still walking.";
              return (
                <div key={item.requestId} className="walk-card-wrap" role="listitem">
                  <button
                    type="button"
                    className={`walk-card ${activeId === item.requestId ? "active" : ""}`}
                    onClick={() => setActiveId(item.requestId)}
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="walk-card-thumb" />
                    ) : (
                      <div className="walk-card-thumb walk-card-thumb-empty" />
                    )}
                    <div className="walk-card-body">
                      <span className="kicker">{item.status}</span>
                      <strong className="walk-card-title">
                        {chainName[item.chainId ?? ""] || "Loose walk"}
                      </strong>
                      <p className="walk-card-line">{last.split("\n")[0]}</p>
                      <span className="count-pill">{shortDate(item.createdAt)}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="btn-ghost danger-btn walk-card-delete"
                    disabled={isPending}
                    onClick={() => {
                      if (!window.confirm("Delete this walk?")) return;
                      startTransition(async () => {
                        const res = await deleteWalkAction(item.requestId);
                        if (!res.success) return;
                        if (activeId === item.requestId) {
                          const next = walks.find((walk) => walk.requestId !== item.requestId);
                          setActiveId(next?.requestId ?? null);
                        }
                        router.refresh();
                      });
                    }}
                  >
                    <IconTrash size={14} />
                    Delete
                  </button>
                </div>
              );
            })}
          </div>

          <div className="walk-stage" key={activeId || "empty"}>
            {active ? (
              <WalkTheater imageUrl={active.imageUrl} steps={activeSteps} />
            ) : (
              <section className="empty-card">
                <span className="kicker">Pick a walk</span>
                <p className="empty-sub">Choose one on the left.</p>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
