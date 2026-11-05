import type { GenerationRequest, LlmResponse, RunStepResult } from "@/lib/types";

const MEDIA_PREFIX = /^\[\[media:(.*?)\]\]\n?/;
const WALK_BLOCK = /\[\[walk\]\]([\s\S]*?)\[\[\/walk\]\]/;

export type ChainWalk = {
  steps: RunStepResult[];
};

export type ParsedRun = {
  imageUrl: string | null;
  note: string;
  walk: ChainWalk | null;
};

export type ChainMediaItem = {
  requestId: string;
  imageUrl: string | null;
  note: string;
  caption: string;
  status: string;
  createdAt: string;
  walk: ChainWalk | null;
};

export type WalkListItem = {
  requestId: string;
  chainId: string | null;
  imageUrl: string | null;
  note: string;
  status: string;
  createdAt: string;
  walk: ChainWalk | null;
  fallbackOutputs: string[];
};

export function encodeRunRecord(
  imageUrl: string,
  note: string,
  walk?: ChainWalk | null
) {
  const parts = [`[[media:${imageUrl}]]`];
  if (walk && walk.steps.length > 0) {
    parts.push(`[[walk]]${JSON.stringify(walk)}[[/walk]]`);
  }
  if (note) parts.push(note);
  return parts.join("\n");
}

export function parseRunRecord(prompt: string): ParsedRun {
  const media = prompt.match(MEDIA_PREFIX);
  const rest = media ? prompt.slice(media[0].length) : prompt;
  const walkMatch = rest.match(WALK_BLOCK);
  let walk: ChainWalk | null = null;
  if (walkMatch) {
    try {
      const parsed = JSON.parse(walkMatch[1]) as ChainWalk;
      if (Array.isArray(parsed?.steps)) walk = parsed;
    } catch {
      walk = null;
    }
  }
  const note = (walkMatch ? rest.replace(WALK_BLOCK, "") : rest).trim();
  return {
    imageUrl: media?.[1] || null,
    note,
    walk,
  };
}

export function parseRunPrompt(prompt: string) {
  const parsed = parseRunRecord(prompt);
  return { imageUrl: parsed.imageUrl, note: parsed.note };
}

export function buildChainMedia(
  requests: GenerationRequest[],
  responses: LlmResponse[]
): ChainMediaItem[] {
  return buildWalkList(requests, responses).map((item) => ({
    requestId: item.requestId,
    imageUrl: item.imageUrl,
    note: item.note,
    caption:
      item.walk?.steps[item.walk.steps.length - 1]?.output ||
      item.fallbackOutputs[item.fallbackOutputs.length - 1] ||
      "",
    status: item.status,
    createdAt: item.createdAt,
    walk: item.walk,
  }));
}

export function buildWalkList(
  requests: GenerationRequest[],
  responses: LlmResponse[]
): WalkListItem[] {
  const repliesByRequest = new Map<string, LlmResponse[]>();
  for (const reply of responses) {
    if (!reply.request_id) continue;
    const list = repliesByRequest.get(reply.request_id) ?? [];
    list.push(reply);
    repliesByRequest.set(reply.request_id, list);
  }

  return [...requests]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((request) => {
      const parsed = parseRunRecord(request.prompt);
      const replies = (repliesByRequest.get(request.id) ?? []).sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return {
        requestId: request.id,
        chainId: request.chain_id,
        imageUrl: parsed.imageUrl,
        note: parsed.note,
        status: request.status,
        createdAt: request.created_at,
        walk: parsed.walk,
        fallbackOutputs: replies.map((reply) => reply.content),
      };
    });
}
