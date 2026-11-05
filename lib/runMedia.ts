import type { GenerationRequest, LlmResponse } from "@/lib/types";

const MEDIA_PREFIX = /^\[\[media:(.*?)\]\]\n?/;

export type ChainMediaItem = {
  requestId: string;
  imageUrl: string | null;
  note: string;
  caption: string;
  status: string;
  createdAt: string;
};

export function encodeRunPrompt(imageUrl: string, note: string) {
  return `[[media:${imageUrl}]]\n${note}`;
}

export function parseRunPrompt(prompt: string) {
  const match = prompt.match(MEDIA_PREFIX);
  if (!match) return { imageUrl: null, note: prompt };
  return {
    imageUrl: match[1] || null,
    note: prompt.slice(match[0].length),
  };
}

export function buildChainMedia(
  requests: GenerationRequest[],
  responses: LlmResponse[]
): ChainMediaItem[] {
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
      const parsed = parseRunPrompt(request.prompt);
      const replies = repliesByRequest.get(request.id) ?? [];
      const last = replies[replies.length - 1];
      return {
        requestId: request.id,
        imageUrl: parsed.imageUrl,
        note: parsed.note,
        caption: last?.content ?? "",
        status: request.status,
        createdAt: request.created_at,
      };
    });
}
