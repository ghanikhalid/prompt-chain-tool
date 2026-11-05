export type LlmProvider = {
  id: string;
  name: string;
  slug: string;
  base_url: string | null;
  is_enabled: boolean;
};

export type LlmModel = {
  id: string;
  provider_id: string | null;
  name: string;
  model_key: string;
  is_enabled: boolean;
};

export type PromptChain = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PromptChainStep = {
  id: string;
  chain_id: string;
  step_order: number;
  name: string;
  prompt_template: string;
  model_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PromptChainMix = {
  id: string;
  name: string;
  notes: string | null;
  is_active: boolean;
  updated_at: string;
};

export type PromptChainMixEntry = {
  id: string;
  mix_id: string;
  chain_id: string;
  weight: number;
};

export type StudioImage = {
  id: string;
  image_url: string;
  alt_text: string;
};

export type GenerationRequest = {
  id: string;
  user_id: string | null;
  prompt: string;
  chain_id: string | null;
  model_id: string | null;
  status: string;
  created_at: string;
};

export type LlmResponse = {
  id: string;
  request_id: string | null;
  model_id: string | null;
  content: string;
  token_count: number | null;
  latency_ms: number | null;
  created_at: string;
};

export type CatalogList<T> = {
  rows: T[];
  missing: boolean;
  error?: string;
};

export type StudioProfile = {
  id: string;
  full_name: string;
  email: string | null;
  is_superadmin: boolean;
};

export type RunStepResult = {
  id: string;
  name: string;
  prompt: string;
  output: string;
  modelName: string;
  latencyMs: number;
};
