"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { runWalkStepAction, startWalkAction } from "@/app/actions";
import type { PromptChain, RunStepResult, StudioImage } from "@/lib/types";
import { IconCamera } from "./Icons";
import WalkTheater from "./WalkTheater";

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
  const [chainId, setChainId] = useState(defaultChainId || chains[0]?.id || "");
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunStepResult[]>([]);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [walkImage, setWalkImage] = useState<string | null>(null);

  const options = useMemo(() => {
    const live = chains.filter((chain) => chain.is_active);
    return live.length > 0 ? live : chains;
  }, [chains]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setImageUrl("");
    setPreview(URL.createObjectURL(file));
    setResults([]);
    setPendingName(null);
  };

  const run = async () => {
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
    setRunning(true);
    setResults([]);
    setPendingName(null);

    try {
      const started = await startWalkAction(form);
      if (!started.success || !started.requestId || !started.steps) {
        setError(started.error || "Could not start the walk.");
        return;
      }
      setWalkImage(started.imageUrl || preview);
      let lastModelKey: string | null = null;
      const collected: RunStepResult[] = [];

      for (const step of started.steps) {
        setPendingName(step.name);
        const res = await runWalkStepAction({
          requestId: started.requestId,
          stepId: step.id,
          lastModelKey,
        });
        if (!res.success || !res.step) {
          setError(res.error || "The walk stopped mid-step.");
          setPendingName(null);
          return;
        }
        lastModelKey = res.modelKey || lastModelKey;
        collected.push(res.step);
        setResults([...collected]);
      }

      setPendingName(null);
      router.refresh();
    } finally {
      setRunning(false);
      setPendingName(null);
    }
  };

  return (
    <section className="upload-studio">
      <div className="panel-header-split">
        <div>
          <span className="kicker">Try it</span>
          <h2 className="upload-heading">Drop a photo. Walk the chain.</h2>
          <p className="card-copy">
            Each step is its own prompt. Later steps see the photo and the last
            output.
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
                    setResults([]);
                    setPendingName(null);
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
            disabled={running || options.length === 0}
            onClick={() => void run()}
          >
            {running ? "Walking the chain…" : "Walk chain"}
          </button>
        </div>
      </div>

      {results.length > 0 || pendingName ? (
        <div style={{ marginTop: "28px" }}>
          <WalkTheater
            imageUrl={walkImage || preview}
            steps={results}
            pendingName={pendingName}
            live
          />
        </div>
      ) : null}
    </section>
  );
}
