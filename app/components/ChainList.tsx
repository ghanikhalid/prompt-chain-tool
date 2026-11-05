"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createChainAction } from "@/app/actions";
import type { PromptChain, PromptChainMixEntry, PromptChainStep } from "@/lib/types";
import { IconPlus } from "./Icons";

export default function ChainList({
  chains,
  steps,
  entries,
  missing,
  error,
}: {
  chains: PromptChain[];
  steps: PromptChainStep[];
  entries: PromptChainMixEntry[];
  missing: boolean;
  error?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const stepCount = (id: string) =>
    steps.filter((step) => step.chain_id === id).length;
  const inMix = (id: string) => entries.some((entry) => entry.chain_id === id);

  const create = () => {
    startTransition(async () => {
      const res = await createChainAction();
      if (!res.success || !res.id) {
        setStatus(res.error || "Could not start a chain.");
        return;
      }
      router.push(`/chains/${res.id}`);
    });
  };

  return (
    <div className="telemetry-suite">
      <div className="page-header-row">
        <div>
          <span className="kicker">Chains</span>
          <h1 className="page-title">
            Sequences that <span className="text-gradient">write the line</span>
          </h1>
        </div>
        <p className="page-sub">
          A chain is a short stack of prompts. The club picks one from the mix
          when someone uploads a photo.
        </p>
      </div>

      <div className="admin-toolbar">
        <span className="count-pill">{chains.length} chains</span>
        <button
          type="button"
          className="btn-primary"
          onClick={create}
          disabled={isPending}
        >
          <IconPlus size={16} />
          {isPending ? "Opening…" : "New chain"}
        </button>
      </div>

      {missing ? (
        <div className="schema-banner">
          The chain tables are not ready in this Supabase project yet.
        </div>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {status ? <p className="form-error">{status}</p> : null}

      {chains.length === 0 && !missing ? (
        <section className="empty-card">
          <span className="kicker">Empty studio</span>
          <h2 className="gate-title">No chains yet</h2>
          <p className="empty-sub">
            New chains start with three steps: describe the photo, find the
            joke, then write five captions.
          </p>
        </section>
      ) : (
        <div className="chain-grid">
          {chains.map((chain) => (
            <Link key={chain.id} href={`/chains/${chain.id}`} className="chain-card">
              <div className="chain-card-top">
                <span className="kicker">{chain.is_active ? "Live" : "Resting"}</span>
                {inMix(chain.id) ? (
                  <span className="status-badge superadmin">In the mix</span>
                ) : (
                  <span className="status-badge member">Not mixed</span>
                )}
              </div>
              <h2 className="card-heading">{chain.name}</h2>
              <p className="card-copy">
                {chain.description || "No note on this one yet."}
              </p>
              <span className="count-pill">{stepCount(chain.id)} steps</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
