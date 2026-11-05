import { requireStudioAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";

export const LIVE_CHAIN_ID = "a11c0000-0000-4000-8000-000000000021";
export const LIVE_STEP_ID = "a11c0000-0000-4000-8000-000000000031";
const FALLBACK_MODEL_ID = "a11c0000-0000-4000-8000-000000000011";

const STUB_PROMPT =
  "Look at this photograph. Write one short caption that only works because of what is actually in the frame.";

export const LIVE_CLUB_PROMPT = `Look at this exact photograph. Write one fresh caption that only works because of what is actually in the frame — a specific object, face, pose, setting, or accident of timing.

Pick one comedic direction:
- Unspoken inner monologue of the main subject or object in the frame
- Absurdly specific "POV:" or "Me when..." moment anchored to a detail in the photo
- A subtle background detail, posture, or lighting quirk is the entire joke
- Deadpan nature-documentary or museum-placard observation about what is happening
- Contrast the vibe of the photo with a relatable everyday delusion (e.g. "I have my life together")
- Treat the scene like a high-stakes movie screenshot for a completely mundane real-life problem

If a nudge is provided, treat it as extra direction:
{{input}}

It must land as a sharp joke or painfully relatable humor. No generic lines that could sit on any photo. No hashtags, no quotation marks, no emojis, no speaker labels.

Respond with JSON only:
{ "caption": "short caption, 12 words or fewer" }`;

type StarterStep = {
  id: string;
  name: string;
  prompt_template: string;
};

type StarterChain = {
  id: string;
  name: string;
  description: string;
  weight: number;
  steps: StarterStep[];
};

export const STARTER_CHAINS: StarterChain[] = [
  {
    id: LIVE_CHAIN_ID,
    name: "Live club caption",
    description:
      "The prompt the club app uses today: one short, specific joke. Runtime still adds a random angle pick, a variation seed, and 'don't repeat the last 12 captions.'",
    weight: 4,
    steps: [
      {
        id: LIVE_STEP_ID,
        name: "Write caption",
        prompt_template: LIVE_CLUB_PROMPT,
      },
    ],
  },
  {
    id: "a11c0000-0000-4000-8000-000000000022",
    name: "Describe, joke, five captions",
    description:
      "Multi-step draft: see the frame, find the joke, write five lines, then pick the overlay.",
    weight: 1,
    steps: [
      {
        id: "a11c0000-0000-4000-8000-000000000032",
        name: "Describe the photo",
        prompt_template:
          "Look at this photograph. Describe what is actually in the frame in a few sentences — objects, faces, pose, setting, and timing. No caption yet. No jokes yet.",
      },
      {
        id: "a11c0000-0000-4000-8000-000000000033",
        name: "Find the joke",
        prompt_template:
          "Here is a description of a photo:\n{{previous}}\n\nSay something funny about it. Dry, specific, not generic. One or two sentences. The joke must depend on a detail from the description.",
      },
      {
        id: "a11c0000-0000-4000-8000-000000000034",
        name: "Five captions",
        prompt_template:
          "Here is a funny take on a photo:\n{{previous}}\n\nWrite five short, funny captions. Each on its own line. No numbers, no quotes, no hashtags. Each caption should only work because of what is in the frame.",
      },
      {
        id: "a11c0000-0000-4000-8000-000000000035",
        name: "Pick the overlay",
        prompt_template:
          "Here are five caption options:\n{{previous}}\n\nPick the strongest one for a photo overlay. Return that single caption only. 12 words or fewer. No quotes, no hashtags, no explanation.",
      },
    ],
  },
  {
    id: "a11c0000-0000-4000-8000-000000000023",
    name: "Meaner and shorter",
    description: "One line, fewer words, a little meaner. Still has to be about this frame.",
    weight: 2,
    steps: [
      {
        id: "a11c0000-0000-4000-8000-000000000036",
        name: "Write caption",
        prompt_template: `Look at this photograph. Write one caption, 8 words or fewer, that is drier and meaner than a typical meme.

It must name or clearly point at a specific thing in the frame. No generic "mood" lines. No hashtags, quotes, emojis, or speaker labels.

If a nudge is provided, follow it:
{{input}}

JSON only:
{ "caption": "short caption" }`,
      },
    ],
  },
  {
    id: "a11c0000-0000-4000-8000-000000000024",
    name: "Background detail",
    description: "The joke is never the obvious subject. Zoom in on whatever is behind them.",
    weight: 1,
    steps: [
      {
        id: "a11c0000-0000-4000-8000-000000000037",
        name: "Write caption",
        prompt_template: `Look at this photograph. Ignore the most obvious subject. Write one caption, 12 words or fewer, whose entire joke is a background object, a hand, a shoe, a sign, lighting, or some other peripheral detail.

If nothing in the background is funny, pick the smallest odd detail you can see. No hashtags, quotes, or emojis.

JSON only:
{ "caption": "short caption" }`,
      },
    ],
  },
  {
    id: "a11c0000-0000-4000-8000-000000000025",
    name: "Nature documentary",
    description: "Museum placard / Attenborough voice. Deadpan about a mundane scene.",
    weight: 1,
    steps: [
      {
        id: "a11c0000-0000-4000-8000-000000000038",
        name: "Write caption",
        prompt_template: `Look at this photograph. Write one caption, 12 words or fewer, as a deadpan nature-documentary line or museum placard about the creature or object in the frame.

Name something actually visible. No hashtags, quotes, or emojis.

JSON only:
{ "caption": "short caption" }`,
      },
    ],
  },
  {
    id: "a11c0000-0000-4000-8000-000000000026",
    name: "Punch-up",
    description: "Write a decent caption, then rewrite it so it only works on this photo.",
    weight: 2,
    steps: [
      {
        id: "a11c0000-0000-4000-8000-000000000039",
        name: "First pass",
        prompt_template:
          "Look at this photograph. Write one short funny caption about it. 12 words or fewer. Be specific.",
      },
      {
        id: "a11c0000-0000-4000-8000-00000000003a",
        name: "Punch it up",
        prompt_template: `Here is a first-pass caption:\n{{previous}}\n\nRewrite it so it only works because of a specific detail in the photograph. Drier. Meaner. 12 words or fewer. No quotes, hashtags, or explanation. Return the new caption only.`,
      },
    ],
  },
  {
    id: "a11c0000-0000-4000-8000-000000000027",
    name: "POV / me when",
    description: "Forces the 'POV:' or 'Me when...' shape the live app sometimes rolls.",
    weight: 1,
    steps: [
      {
        id: "a11c0000-0000-4000-8000-00000000003b",
        name: "Write caption",
        prompt_template: `Look at this photograph. Write one caption that starts with "POV:" or "Me when" and is anchored to a specific detail in the frame.

12 words or fewer after that opener. No hashtags, extra quotes, or emojis.

JSON only:
{ "caption": "short caption" }`,
      },
    ],
  },
];

function isStubChain(
  chain: { name?: string | null; description?: string | null } | null,
  step: { prompt_template?: string | null } | null
) {
  const name = (chain?.name || "").toLowerCase();
  const description = chain?.description || "";
  const prompt = step?.prompt_template || "";
  return (
    prompt.trim() === STUB_PROMPT ||
    name === "caption studio" ||
    description.includes("Single-step caption generation")
  );
}

export async function ensureStarterChains() {
  const gate = await requireStudioAdmin();
  if (!gate.ok) return;

  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: mix }, { data: models }, { data: existingChains }, { data: existingSteps }] =
    await Promise.all([
      supabase.from("prompt_chain_mix").select("id").limit(1).maybeSingle(),
      supabase.from("llm_models").select("id").eq("is_enabled", true).limit(1),
      supabase.from("prompt_chains").select("id, name, description"),
      supabase
        .from("prompt_chain_steps")
        .select("id, chain_id, prompt_template")
        .eq("chain_id", LIVE_CHAIN_ID),
    ]);

  const modelId = models?.[0]?.id ?? FALLBACK_MODEL_ID;
  const chainsById = new Map(
    (existingChains ?? []).map((row) => [row.id as string, row])
  );
  const liveStep = (existingSteps ?? [])[0] ?? null;
  const liveChain = chainsById.get(LIVE_CHAIN_ID) ?? null;

  let mixId = mix?.id as string | undefined;
  if (!mixId) {
    const { data: createdMix } = await supabase
      .from("prompt_chain_mix")
      .insert({
        name: "Default mix",
        notes: "Traffic mix across prompt chains",
        is_active: true,
      })
      .select("id")
      .single();
    mixId = createdMix?.id;
  }
  if (!mixId) return;

  for (const chain of STARTER_CHAINS) {
    const already = chainsById.get(chain.id);
    const shouldWrite =
      !already ||
      (chain.id === LIVE_CHAIN_ID && isStubChain(liveChain, liveStep));

    if (shouldWrite) {
      await supabase.from("prompt_chains").upsert({
        id: chain.id,
        name: chain.name,
        description: chain.description,
        is_active: true,
        updated_at: now,
      });
      if (chain.id === LIVE_CHAIN_ID) {
        await supabase
          .from("prompt_chain_mix_entries")
          .update({ weight: chain.weight })
          .eq("chain_id", LIVE_CHAIN_ID)
          .eq("mix_id", mixId);
      }
    }

    if (!already || shouldWrite) {
      for (const [index, step] of chain.steps.entries()) {
        await supabase.from("prompt_chain_steps").upsert({
          id: step.id,
          chain_id: chain.id,
          step_order: index + 1,
          name: step.name,
          prompt_template: step.prompt_template,
          model_id: modelId,
          updated_at: now,
        });
      }
    }
  }

  const { data: mixRows } = await supabase
    .from("prompt_chain_mix_entries")
    .select("chain_id")
    .eq("mix_id", mixId);

  const inMix = new Set((mixRows ?? []).map((row) => row.chain_id as string));
  const missing = STARTER_CHAINS.filter((chain) => !inMix.has(chain.id)).map(
    (chain) => ({
      mix_id: mixId,
      chain_id: chain.id,
      weight: chain.weight,
    })
  );

  if (missing.length > 0) {
    await supabase.from("prompt_chain_mix_entries").insert(missing);
  }
}
