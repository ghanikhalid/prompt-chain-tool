"use server";

import {
  createPartFromBase64,
  createUserContent,
  GoogleGenAI,
} from "@google/genai";
import { revalidatePath } from "next/cache";
import { requireStudioAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";
import type {
  LlmModel,
  PromptChainStep,
  RunStepResult,
} from "@/lib/types";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 4.5 * 1024 * 1024;
const DEFAULT_CAPTION_PROMPT =
  "Look at this photograph. Write one short caption that only works because of what is actually in the frame.";
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

function revalidateStudio(chainId?: string) {
  revalidatePath("/");
  revalidatePath("/chains");
  revalidatePath("/mix");
  revalidatePath("/runs");
  if (chainId) revalidatePath(`/chains/${chainId}`);
}

function getAi() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function interpolate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

function parseOutput(raw: string) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { caption?: string; text?: string };
    if (parsed.caption?.trim()) return parsed.caption.trim();
    if (parsed.text?.trim()) return parsed.text.trim();
  } catch {
    // keep raw
  }
  return cleaned.replace(/^["']|["']$/g, "").trim();
}

async function bytesFromForm(formData: FormData) {
  const file = formData.get("image") as File | null;
  const remoteUrl = String(formData.get("image_url") || "").trim();

  if (file && file.size > 0) {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error("Use a JPG, PNG, WebP, or GIF.");
    }
    if (file.size > MAX_BYTES) {
      throw new Error("Keep the photo under 4.5 MB.");
    }
    return {
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "image/jpeg",
    };
  }

  if (remoteUrl) {
    const res = await fetch(remoteUrl);
    if (!res.ok) throw new Error("Could not fetch that image URL.");
    const mime = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      throw new Error("Keep the photo under 4.5 MB.");
    }
    return { bytes: buf, mimeType: mime.split(";")[0] };
  }

  throw new Error("Drop a photo or paste an image URL.");
}

async function generateStepText(
  bytes: Buffer,
  mimeType: string,
  prompt: string,
  preferredKey?: string | null
): Promise<{ text: string; modelKey: string }> {
  const ai = getAi();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const keys = [
    preferredKey,
    ...CANDIDATE_MODELS.filter((key) => key !== preferredKey),
  ].filter((key): key is string => Boolean(key));

  let lastError: unknown = null;
  for (const model of keys) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: createUserContent([
          createPartFromBase64(bytes.toString("base64"), mimeType),
          prompt,
        ]),
      });
      if (res?.text) {
        return { text: parseOutput(res.text), modelKey: model };
      }
    } catch (err) {
      lastError = err;
    }
  }

  const msg =
    lastError instanceof Error
      ? lastError.message
      : "Gemini could not look at the photo.";
  throw new Error(msg);
}

export async function createChainAction(): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  const gate = await requireStudioAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: chain, error } = await supabase
    .from("prompt_chains")
    .insert({
      name: "Untitled chain",
      description: "A short sequence that writes a caption from the photo.",
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !chain) {
    return { success: false, error: error?.message || "Could not create a chain." };
  }

  const { data: models } = await supabase
    .from("llm_models")
    .select("id")
    .eq("is_enabled", true)
    .limit(1);

  await supabase.from("prompt_chain_steps").insert({
    chain_id: chain.id,
    step_order: 1,
    name: "Write caption",
    prompt_template: DEFAULT_CAPTION_PROMPT,
    model_id: models?.[0]?.id ?? null,
  });

  revalidateStudio(chain.id);
  return { success: true, id: chain.id };
}

export async function saveChainAction(input: {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  steps: Array<{
    id?: string;
    name: string;
    prompt_template: string;
    model_id: string | null;
  }>;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireStudioAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const name = input.name.trim();
  if (!name) return { success: false, error: "Give the chain a name." };
  if (input.steps.length === 0) {
    return { success: false, error: "A chain needs at least one step." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error: chainError } = await supabase
    .from("prompt_chains")
    .update({
      name,
      description: input.description.trim() || null,
      is_active: input.is_active,
      updated_at: now,
    })
    .eq("id", input.id);

  if (chainError) return { success: false, error: chainError.message };

  const { data: existingSteps, error: existingError } = await supabase
    .from("prompt_chain_steps")
    .select("id")
    .eq("chain_id", input.id);
  if (existingError) return { success: false, error: existingError.message };

  const keepIds = new Set(
    input.steps.map((step) => step.id).filter((id): id is string => Boolean(id))
  );
  const toDelete = (existingSteps ?? [])
    .map((step) => step.id as string)
    .filter((id) => !keepIds.has(id));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("prompt_chain_steps")
      .delete()
      .in("id", toDelete);
    if (deleteError) return { success: false, error: deleteError.message };
  }

  for (const [index, step] of input.steps.entries()) {
    const payload = {
      chain_id: input.id,
      step_order: index + 1,
      name: step.name.trim() || `Step ${index + 1}`,
      prompt_template: step.prompt_template.trim() || DEFAULT_CAPTION_PROMPT,
      model_id: step.model_id || null,
      updated_at: now,
    };
    if (step.id) {
      const { error } = await supabase
        .from("prompt_chain_steps")
        .update(payload)
        .eq("id", step.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("prompt_chain_steps").insert(payload);
      if (error) return { success: false, error: error.message };
    }
  }

  revalidateStudio(input.id);
  return { success: true };
}

export async function deleteChainAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireStudioAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { error } = await supabase.from("prompt_chains").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidateStudio();
  return { success: true };
}

export async function saveMixAction(input: {
  mixId: string;
  name: string;
  notes: string;
  is_active: boolean;
  entries: Array<{ chain_id: string; weight: number }>;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireStudioAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { error: mixError } = await supabase
    .from("prompt_chain_mix")
    .update({
      name: input.name.trim() || "Default mix",
      notes: input.notes.trim() || null,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.mixId);
  if (mixError) return { success: false, error: mixError.message };

  const { error: clearError } = await supabase
    .from("prompt_chain_mix_entries")
    .delete()
    .eq("mix_id", input.mixId);
  if (clearError) return { success: false, error: clearError.message };

  const rows = input.entries
    .filter((entry) => entry.chain_id)
    .map((entry) => ({
      mix_id: input.mixId,
      chain_id: entry.chain_id,
      weight: Number.isFinite(entry.weight) ? Math.max(0, entry.weight) : 1,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("prompt_chain_mix_entries")
      .insert(rows);
    if (insertError) return { success: false, error: insertError.message };
  }

  revalidateStudio();
  return { success: true };
}

export async function runChainAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  caption?: string;
  steps?: RunStepResult[];
}> {
  const gate = await requireStudioAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const chainId = String(formData.get("chain_id") || "").trim();
  const note = String(formData.get("note") || "").trim();
  if (!chainId) return { success: false, error: "Pick a chain to run." };

  let image: { bytes: Buffer; mimeType: string };
  try {
    image = await bytesFromForm(formData);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not read that photo.",
    };
  }

  const supabase = await createClient();
  const [{ data: chain }, { data: stepRows }, { data: modelRows }] =
    await Promise.all([
      supabase.from("prompt_chains").select("*").eq("id", chainId).maybeSingle(),
      supabase
        .from("prompt_chain_steps")
        .select("*")
        .eq("chain_id", chainId)
        .order("step_order", { ascending: true }),
      supabase.from("llm_models").select("*"),
    ]);

  if (!chain) return { success: false, error: "That chain is gone." };
  const steps = (stepRows ?? []) as PromptChainStep[];
  if (steps.length === 0) {
    return { success: false, error: "This chain has no steps yet." };
  }

  const models = (modelRows ?? []) as LlmModel[];
  const modelById = new Map(models.map((model) => [model.id, model]));

  const { data: request, error: requestError } = await supabase
    .from("generation_requests")
    .insert({
      user_id: gate.userId,
      prompt: note || steps[0]?.prompt_template || DEFAULT_CAPTION_PROMPT,
      chain_id: chainId,
      model_id: steps[0]?.model_id ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (requestError || !request) {
    return {
      success: false,
      error: requestError?.message || "Could not start the run.",
    };
  }

  const results: RunStepResult[] = [];
  let previous = "";
  let lastModelId: string | null = steps[0]?.model_id ?? null;

  try {
    for (const step of steps) {
      const model = step.model_id ? modelById.get(step.model_id) : undefined;
      const prompt = interpolate(step.prompt_template || DEFAULT_CAPTION_PROMPT, {
        previous,
        input: note,
        step: step.name,
        chain: String(chain.name ?? ""),
      });
      const started = Date.now();
      const generated = await generateStepText(
        image.bytes,
        image.mimeType,
        prompt,
        model?.model_key
      );
      const latencyMs = Date.now() - started;
      const usedModel =
        models.find((item) => item.model_key === generated.modelKey) ?? model ?? null;
      lastModelId = usedModel?.id ?? lastModelId;

      await supabase.from("llm_responses").insert({
        request_id: request.id,
        model_id: usedModel?.id ?? null,
        content: generated.text,
        latency_ms: latencyMs,
      });

      results.push({
        id: step.id,
        name: step.name,
        prompt,
        output: generated.text,
        modelName: usedModel?.name || generated.modelKey,
        latencyMs,
      });
      previous = generated.text;
    }

    await supabase
      .from("generation_requests")
      .update({
        status: "completed",
        model_id: lastModelId,
      })
      .eq("id", request.id);
  } catch (err) {
    await supabase
      .from("generation_requests")
      .update({ status: "failed" })
      .eq("id", request.id);
    return {
      success: false,
      error: err instanceof Error ? err.message : "The chain stopped mid-run.",
    };
  }

  revalidateStudio(chainId);
  return {
    success: true,
    caption: previous,
    steps: results,
  };
}
