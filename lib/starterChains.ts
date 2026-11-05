import { requireStudioAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabaseServer";

export const LIVE_CHAIN_ID = "a11c0000-0000-4000-8000-000000000021";
const FALLBACK_MODEL_ID = "a11c0000-0000-4000-8000-000000000011";

const RETIRED_CHAIN_IDS = [
  "a11c0000-0000-4000-8000-000000000023",
  "a11c0000-0000-4000-8000-000000000024",
  "a11c0000-0000-4000-8000-000000000025",
  "a11c0000-0000-4000-8000-000000000027",
];

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
    name: "Club line",
    description:
      "How the club app thinks, split into a chain: see the frame, find the joke, write the line.",
    weight: 3,
    steps: [
      {
        id: "a11c0000-0000-4000-8000-000000000031",
        name: "See the frame",
        prompt_template:
          "Look at this photograph. Describe what is actually in the frame in a few sentences — objects, faces, pose, setting, clothes, and timing. No joke yet. No caption yet.",
      },
      {
        id: "a11c0000-0000-4000-8000-00000000003c",
        name: "Find the joke",
        prompt_template: `Here is a description of a photo:
{{previous}}

Pick one comedic direction and write the joke in one or two sentences:
- Unspoken inner monologue of the main subject or object
- Absurdly specific "POV:" or "Me when..." anchored to a detail
- A background detail, posture, or lighting quirk is the entire joke
- Deadpan nature-documentary or museum-placard observation
- Contrast the vibe with a relatable everyday delusion
- High-stakes movie screenshot for a completely mundane problem

The joke must depend on something in the description. Not a generic mood line.`,
      },
      {
        id: "a11c0000-0000-4000-8000-00000000003d",
        name: "Write the line",
        prompt_template: `Here is the joke:
{{previous}}

Turn it into one overlay caption. 12 words or fewer. No hashtags, quotation marks, emojis, or speaker labels. It must still only work because of what is in the photograph.

JSON only:
{ "caption": "short caption" }`,
      },
    ],
  },
  {
    id: "a11c0000-0000-4000-8000-000000000022",
    name: "Five takes",
    description:
      "Describe, find the joke, write five captions, then pick the strongest line.",
    weight: 2,
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
        name: "Pick the line",
        prompt_template:
          "Here are five caption options:\n{{previous}}\n\nPick the strongest one. Return that single caption only. 12 words or fewer. No quotes, no hashtags, no explanation.",
      },
    ],
  },
  {
    id: "a11c0000-0000-4000-8000-000000000026",
    name: "Punch-up",
    description:
      "See the frame, draft a caption, then rewrite it so it only works on this photo.",
    weight: 2,
    steps: [
      {
        id: "a11c0000-0000-4000-8000-000000000039",
        name: "See the frame",
        prompt_template:
          "Look at this photograph. Name the specific details a caption could hang on — objects, clothes, posture, setting, timing. A short inventory. No caption yet.",
      },
      {
        id: "a11c0000-0000-4000-8000-00000000003a",
        name: "Draft",
        prompt_template:
          "Here is what is in the photo:\n{{previous}}\n\nWrite one short funny caption about it. 12 words or fewer. Be specific.",
      },
      {
        id: "a11c0000-0000-4000-8000-00000000003e",
        name: "Punch it up",
        prompt_template:
          "Here is a first-pass caption:\n{{previous}}\n\nLook at the photograph again. Rewrite the caption drier and meaner so it only works because of a specific detail in the frame. 12 words or fewer. Return the new caption only.",
      },
    ],
  },
];

export async function ensureStarterChains() {
  const gate = await requireStudioAdmin();
  if (!gate.ok) return;

  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: mix }, { data: models }] = await Promise.all([
    supabase.from("prompt_chain_mix").select("id").limit(1).maybeSingle(),
    supabase.from("llm_models").select("id").eq("is_enabled", true).limit(1),
  ]);

  const modelId = models?.[0]?.id ?? FALLBACK_MODEL_ID;

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

  if (RETIRED_CHAIN_IDS.length > 0) {
    await supabase.from("prompt_chains").delete().in("id", RETIRED_CHAIN_IDS);
  }

  const keeperIds = STARTER_CHAINS.map((chain) => chain.id);

  for (const chain of STARTER_CHAINS) {
    await supabase.from("prompt_chains").upsert({
      id: chain.id,
      name: chain.name,
      description: chain.description,
      is_active: true,
      updated_at: now,
    });

    const keepStepIds = chain.steps.map((step) => step.id);
    const { data: existingSteps } = await supabase
      .from("prompt_chain_steps")
      .select("id")
      .eq("chain_id", chain.id);
    const extra = (existingSteps ?? [])
      .map((row) => row.id as string)
      .filter((id) => !keepStepIds.includes(id));
    if (extra.length > 0) {
      await supabase.from("prompt_chain_steps").delete().in("id", extra);
    }

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

  const { data: mixRows } = await supabase
    .from("prompt_chain_mix_entries")
    .select("id, chain_id")
    .eq("mix_id", mixId);

  const stale = (mixRows ?? []).filter(
    (row) => !keeperIds.includes(row.chain_id as string)
  );
  if (stale.length > 0) {
    await supabase
      .from("prompt_chain_mix_entries")
      .delete()
      .in(
        "id",
        stale.map((row) => row.id)
      );
  }

  const mixByChain = new Map(
    (mixRows ?? []).map((row) => [row.chain_id as string, row.id as string])
  );
  for (const chain of STARTER_CHAINS) {
    const entryId = mixByChain.get(chain.id);
    if (entryId) {
      await supabase
        .from("prompt_chain_mix_entries")
        .update({ weight: chain.weight })
        .eq("id", entryId);
    } else {
      await supabase.from("prompt_chain_mix_entries").insert({
        mix_id: mixId,
        chain_id: chain.id,
        weight: chain.weight,
      });
    }
  }
}
