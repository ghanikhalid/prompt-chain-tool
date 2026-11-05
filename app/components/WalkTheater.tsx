"use client";

import { useEffect, useRef } from "react";
import type { RunStepResult } from "@/lib/types";

export default function WalkTheater({
  imageUrl,
  steps,
  pendingName,
  live = false,
}: {
  imageUrl: string | null;
  steps: RunStepResult[];
  pendingName?: string | null;
  live?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll(".walk-step");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("is-in");
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    nodes.forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [steps.length, pendingName, imageUrl]);

  useEffect(() => {
    if (!live) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [live, steps.length, pendingName]);

  return (
    <div className="walk-theater" ref={rootRef}>
      {imageUrl ? (
        <div className="walk-still">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" />
        </div>
      ) : null}

      <div className="walk-steps">
        {steps.map((step, index) => (
          <article key={step.id} className="walk-step">
            <div className="walk-step-head">
              <span className="step-index">{index + 1}</span>
              <strong>{step.name}</strong>
              <span className="count-pill">
                {step.modelName} · {step.latencyMs}ms
              </span>
            </div>
            <p className="walk-step-output">{step.output}</p>
          </article>
        ))}

        {pendingName ? (
          <article className="walk-step walk-step-pending is-in">
            <div className="walk-step-head">
              <span className="step-index">{steps.length + 1}</span>
              <strong>{pendingName}</strong>
              <span className="count-pill">Looking…</span>
            </div>
            <p className="card-copy">This step is still looking at the frame.</p>
          </article>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
