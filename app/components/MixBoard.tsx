"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMixAction } from "@/app/actions";
import type {
  PromptChain,
  PromptChainMix,
  PromptChainMixEntry,
} from "@/lib/types";

export default function MixBoard({
  chains,
  mixes,
  entries,
  missing,
}: {
  chains: PromptChain[];
  mixes: PromptChainMix[];
  entries: PromptChainMixEntry[];
  missing: boolean;
}) {
  const router = useRouter();
  const mix = mixes[0];
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(mix?.name ?? "Default mix");
  const [notes, setNotes] = useState(mix?.notes ?? "");
  const [active, setActive] = useState(mix?.is_active ?? true);
  const [rows, setRows] = useState(
    entries
      .filter((entry) => !mix || entry.mix_id === mix.id)
      .map((entry) => ({ chain_id: entry.chain_id, weight: Number(entry.weight) }))
  );
  const [status, setStatus] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Math.max(0, row.weight), 0),
    [rows]
  );
  const chainName = useMemo(
    () => Object.fromEntries(chains.map((chain) => [chain.id, chain.name])),
    [chains]
  );

  const save = () => {
    if (!mix) return;
    startTransition(async () => {
      const res = await saveMixAction({
        mixId: mix.id,
        name,
        notes,
        is_active: active,
        entries: rows,
      });
      if (!res.success) {
        setOk(false);
        setStatus(res.error || "Could not save the mix.");
        return;
      }
      setOk(true);
      setStatus("Saved.");
      router.refresh();
    });
  };

  return (
    <div className="telemetry-suite">
      <div className="page-header-row">
        <div>
          <span className="kicker">Mix</span>
          <h1 className="page-title">
            How often each chain <span className="text-gradient">gets the photo</span>
          </h1>
        </div>
        <p className="page-sub">
          Higher weight means that chain is more likely to write the caption.
          Keep it simple.
        </p>
      </div>

      {missing || !mix ? (
        <div className="schema-banner">
          The mix table is not ready in this Supabase project yet.
        </div>
      ) : (
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
              <span className="kicker">Active</span>
              <select
                className="admin-input"
                value={active ? "true" : "false"}
                onChange={(event) => setActive(event.target.value === "true")}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="admin-field-label" style={{ gridColumn: "1 / -1" }}>
              <span className="kicker">Notes</span>
              <textarea
                className="admin-input"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>

          <div style={{ marginTop: "22px" }}>
            <span className="kicker">Weights</span>
            {rows.map((row, index) => (
              <div key={`${row.chain_id}-${index}`} className="admin-toolbar" style={{ marginTop: "10px" }}>
                <select
                  className="admin-input"
                  value={row.chain_id}
                  onChange={(event) =>
                    setRows((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, chain_id: event.target.value } : item
                      )
                    )
                  }
                >
                  {chains.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name}
                    </option>
                  ))}
                </select>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  step="0.1"
                  value={row.weight}
                  onChange={(event) =>
                    setRows((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, weight: Number(event.target.value) }
                          : item
                      )
                    )
                  }
                  style={{ maxWidth: "120px" }}
                />
                <div className="weight-track" style={{ minWidth: "140px" }}>
                  <div className="weight-bar">
                    <div
                      className="weight-fill"
                      style={{
                        width: `${total > 0 ? (Math.max(0, row.weight) / total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="leader-sub">
                    {total > 0
                      ? `${Math.round((Math.max(0, row.weight) / total) * 100)}%`
                      : "0%"}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    setRows((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: "12px" }}
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  { chain_id: chains[0]?.id || "", weight: 1 },
                ])
              }
              disabled={chains.length === 0}
            >
              Add chain
            </button>
          </div>

          {status ? (
            <p className={ok ? "bootstrap-success" : "form-error"}>{status}</p>
          ) : null}

          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: "18px" }}
            disabled={isPending}
            onClick={save}
          >
            {isPending ? "Saving…" : "Save mix"}
          </button>
        </section>
      )}

      {rows.length > 0 ? (
        <section className="telemetry-panel">
          <span className="kicker">Tonight&apos;s odds</span>
          <h2 className="section-title" style={{ marginTop: "6px" }}>
            Who writes more
          </h2>
          <div className="mini-leaderboard">
            {[...rows]
              .sort((a, b) => b.weight - a.weight)
              .map((row) => (
                <div key={row.chain_id} className="leader-row">
                  <span className="leader-name">
                    {chainName[row.chain_id] || "Unknown chain"}
                  </span>
                  <span className="leader-metric">
                    {total > 0
                      ? `${Math.round((Math.max(0, row.weight) / total) * 100)}%`
                      : "0%"}
                  </span>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
