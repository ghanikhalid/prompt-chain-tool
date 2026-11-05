import { parseRunPrompt } from "@/lib/runMedia";
import type {
  GenerationRequest,
  LlmModel,
  LlmResponse,
  PromptChain,
} from "@/lib/types";

function shortDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function RunsBoard({
  requests,
  responses,
  chains,
  models,
  missing,
  error,
}: {
  requests: GenerationRequest[];
  responses: LlmResponse[];
  chains: PromptChain[];
  models: LlmModel[];
  missing: boolean;
  error?: string;
}) {
  const chainName = Object.fromEntries(chains.map((chain) => [chain.id, chain.name]));
  const modelName = Object.fromEntries(models.map((model) => [model.id, model.name]));
  const repliesByRequest = new Map<string, LlmResponse[]>();
  for (const reply of responses) {
    if (!reply.request_id) continue;
    const list = repliesByRequest.get(reply.request_id) ?? [];
    list.push(reply);
    repliesByRequest.set(reply.request_id, list);
  }

  return (
    <div className="telemetry-suite">
      <div className="page-header-row">
        <div>
          <span className="kicker">Runs</span>
          <h1 className="page-title">
            What the studio <span className="text-gradient">just said</span>
          </h1>
        </div>
        <p className="page-sub">
          Recent tries from this room. The club&apos;s live captions live on the
          members app.
        </p>
      </div>

      {missing ? (
        <div className="schema-banner">Run history is not in this database yet.</div>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}

      {requests.length === 0 && !missing ? (
        <section className="empty-card">
          <span className="kicker">Quiet</span>
          <h2 className="gate-title">No runs yet</h2>
          <p className="empty-sub">Drop a photo on Studio and walk a chain.</p>
        </section>
      ) : (
        <div className="run-log">
          {requests.map((request) => {
            const replies = repliesByRequest.get(request.id) ?? [];
            const last = replies[replies.length - 1];
            const parsed = parseRunPrompt(request.prompt);
            return (
              <article key={request.id} className="run-step-card">
                <div className="step-head">
                  <div>
                    <span className="kicker">{request.status}</span>
                    <h2 className="card-heading" style={{ marginTop: "6px" }}>
                      {chainName[request.chain_id ?? ""] || "Loose run"}
                    </h2>
                  </div>
                  <span className="count-pill">{shortDate(request.created_at)}</span>
                </div>
                {parsed.imageUrl ? (
                  <div className="generated-media-stage" style={{ marginTop: "12px", borderRadius: "16px", overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={parsed.imageUrl} alt="" />
                  </div>
                ) : null}
                {parsed.note ? <p className="card-copy">{parsed.note}</p> : null}
                {last ? (
                  <p className="run-step-output">{last.content}</p>
                ) : null}
                <div className="rating-summary-pills" style={{ marginTop: "10px" }}>
                  <span className="count-pill">
                    {request.model_id
                      ? modelName[request.model_id] || "Model"
                      : "No model"}
                  </span>
                  <span className="count-pill">{replies.length} replies</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
