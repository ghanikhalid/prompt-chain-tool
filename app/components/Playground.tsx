"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runChainAction } from "@/app/actions";
import type { PromptChain, RunStepResult, StudioImage } from "@/lib/types";
import { IconCamera } from "./Icons";

export default function Playground({
  chains,
  images,
  defaultChainId,
}: {
  chains: PromptChain[];
  images: StudioImage[];
  defaultChainId?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [chainId, setChainId] = useState(defaultChainId || chains[0]?.id || "");
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RunStepResult[] | null>(null);
  const [caption, setCaption] = useState<string | null>(null);

  const activeChains = useMemo(
    () => chains.filter((chain) => chain.is_active) || chains,
    [chains]
  );
  const options = activeChains.length > 0 ? activeChains : chains;

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setImageUrl("");
    setPreview(URL.createObjectURL(file));
    setResults(null);
    setCaption(null);
  };

  const run = () => {
    const file = fileRef.current?.files?.[0];
    if (!file && !imageUrl) {
      setError("Drop a photo first.");
      return;
    }
    if (!chainId) {
      setError("Pick a chain.");
      return;
    }

    const form = new FormData();
    form.set("chain_id", chainId);
    form.set("note", note);
    if (file) form.set("image", file);
    if (imageUrl) form.set("image_url", imageUrl);

    setError(null);
    startTransition(async () => {
      const res = await runChainAction(form);
      if (!res.success) {
        setError(res.error || "The chain did not finish.");
        return;
      }
      setResults(res.steps ?? []);
      setCaption(res.caption ?? null);
      router.refresh();
    });
  };

  return (
    <section className="upload-studio">
      <div className="panel-header-split">
        <div>
          <span className="kicker">Try it</span>
          <h2 className="upload-heading">Drop a photo. Walk the chain.</h2>
          <p className="card-copy">
            Each step sees the picture. Later steps can use{" "}
            <code>{"{{previous}}"}</code> to punch up the last line.
          </p>
        </div>
      </div>

      <div className="playground-split" style={{ marginTop: "22px" }}>
        <div>
          <input
            ref={fileRef}
            className="sr-only-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => onFile(event.target.files?.[0])}
          />
          <button
            type="button"
            className="dropzone"
            onClick={() => fileRef.current?.click()}
            style={{ width: "100%" }}
          >
            {preview ? (
              <div className="dropzone-preview-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="dropzone-preview" />
                {caption ? <div className="meme-scrim" /> : null}
                {caption ? (
                  <p className="meme-overlay-caption">
                    {caption.split("\n").find((line) => line.trim()) ?? caption}
                  </p>
                ) : null}
                <span className="dropzone-change-pill">Change photo</span>
              </div>
            ) : (
              <div className="dropzone-empty">
                <div className="dropzone-icon">
                  <IconCamera size={22} />
                </div>
                <p className="dropzone-title">Drop a still from the night</p>
                <p className="dropzone-hint">JPG, PNG, WebP, or GIF · under 4.5 MB</p>
              </div>
            )}
          </button>

          {images.length > 0 ? (
            <div className="storage-thumb-strip">
              {images.slice(0, 8).map((image) => (
                <button
                  key={image.id}
                  type="button"
                  className={`storage-thumb-btn ${imageUrl === image.image_url ? "active" : ""}`}
                  onClick={() => {
                    if (fileRef.current) fileRef.current.value = "";
                    setImageUrl(image.image_url);
                    setPreview(image.image_url);
                    setResults(null);
                    setCaption(null);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.image_url} alt={image.alt_text || ""} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="upload-controls" style={{ width: "100%" }}>
          <label className="admin-field-label" style={{ width: "100%" }}>
            <span className="kicker">Chain</span>
            <select
              className="admin-input"
              value={chainId}
              onChange={(event) => setChainId(event.target.value)}
              disabled={Boolean(defaultChainId)}
            >
              {options.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field-label" style={{ width: "100%" }}>
            <span className="kicker">Optional nudge</span>
            <textarea
              className="admin-input"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Drier. Meaner. More specific about the shoes."
            />
          </label>

          <label className="admin-field-label" style={{ width: "100%" }}>
            <span className="kicker">Or paste a URL</span>
            <input
              className="admin-input"
              value={imageUrl}
              onChange={(event) => {
                setImageUrl(event.target.value);
                if (event.target.value) {
                  if (fileRef.current) fileRef.current.value = "";
                  setPreview(event.target.value);
                }
              }}
              placeholder="https://"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button
            type="button"
            className="btn-primary"
            disabled={isPending || options.length === 0}
            onClick={run}
          >
            {isPending ? "Looking at the frame…" : "Run chain"}
          </button>
        </div>
      </div>

      {results ? (
        <div className="run-log" style={{ marginTop: "24px" }}>
          {results.map((step, index) => (
            <article key={step.id} className="run-step-card">
              <div className="step-head">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="step-index">{index + 1}</span>
                  <strong>{step.name}</strong>
                </div>
                <span className="count-pill">
                  {step.modelName} · {step.latencyMs}ms
                </span>
              </div>
              <p className="template-hint">{step.prompt}</p>
              <p className="run-step-output">{step.output}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
