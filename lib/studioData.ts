import { listCatalog } from "@/lib/catalog";
import type {
  GenerationRequest,
  LlmModel,
  LlmResponse,
  PromptChain,
  PromptChainMix,
  PromptChainMixEntry,
  PromptChainStep,
  StudioImage,
} from "@/lib/types";

export async function loadStudioCatalog() {
  const [chains, steps, mixes, entries, models, images, requests, responses] =
    await Promise.all([
      listCatalog<PromptChain>("prompt_chains", "updated_at"),
      listCatalog<PromptChainStep>("prompt_chain_steps", "step_order", true),
      listCatalog<PromptChainMix>("prompt_chain_mix", "updated_at"),
      listCatalog<PromptChainMixEntry>("prompt_chain_mix_entries"),
      listCatalog<LlmModel>("llm_models", "name", true),
      listCatalog<StudioImage>("images", "created_at"),
      listCatalog<GenerationRequest>("generation_requests", "created_at"),
      listCatalog<LlmResponse>("llm_responses", "created_at"),
    ]);

  return { chains, steps, mixes, entries, models, images, requests, responses };
}
