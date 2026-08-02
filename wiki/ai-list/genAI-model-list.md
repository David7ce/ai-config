# AI Model Index

A general index of notable AI models, grouped by area. Each area lists **Proprietary** (closed, API/product only) and **Open-source / open-weight** (downloadable weights, self-hostable) options.

> Snapshot as of **August 2, 2026** — the field moves fast, so treat version numbers as a guide and verify the current release before relying on it.
>
> **Links:** open-source names link to their **Hugging Face / repo** (weights to download); proprietary names link to the **official product/access page** (these aren't downloadable — you use them via app or API).
>
> Related file: [ai-workflows.md](ai-workflows.md) (ComfyUI workflow index). The former
> standalone `ai-models-list.md` catalog is not present in the current `wiki/ai-list/` layout.

## Index

- [General & multimodal assistants](#general-and-multimodal-assistants)
- [Text & reasoning (LLMs)](#text-and-reasoning-llms)
- [Code](#code)
- [Image generation](#image-generation)
- [Video generation](#video-generation)
- [Audio — speech & music](#audio-speech-and-music)
- [Embeddings & retrieval](#embeddings-and-retrieval)
- [Agents and tool-use models](#agents-and-tool-use-models)
- [Appendix — image pipeline components](#appendix-image-pipeline-components)

---

## General and multimodal assistants

Frontier chat models that handle text plus images (and often audio/files). These are the household-name foundation models.

**Proprietary**

- [**Claude**](https://claude.ai) (Anthropic) — Opus 4.8, Sonnet 4.6, Haiku 4.5
- [**Command**](https://cohere.com/command) (Cohere)
- [**Gemini**](https://gemini.google.com) (Google) — Gemini 3.6 Flash, Gemini 3.5 Flash, Gemini 3.1 Pro
- [**GPT**](https://chatgpt.com) (OpenAI) — GPT-5 family, GPT-4o
- [**Grok**](https://x.ai) (xAI)
- [**Nova**](https://aws.amazon.com/ai/generative-ai/nova/) (Amazon)

**Open-source / open-weight**

- [**Command R**](https://huggingface.co/CohereForAI) (Cohere, open weights)
- [**DeepSeek**](https://huggingface.co/deepseek-ai) — V3
- [**Gemma**](https://huggingface.co/google?search=gemma) (Google, open weights)
- [**Llama**](https://huggingface.co/meta-llama) (Meta) — 3.x / 4
- [**Mistral / Mixtral**](https://huggingface.co/mistralai) (Mistral AI)
- [**Qwen**](https://huggingface.co/Qwen) (Alibaba) — 2.5 / 3

---

## Text and reasoning (LLMs)

Language-first models, including dedicated "reasoning" models and smaller/efficient open models. (The general assistants above also handle text — these emphasize pure language, reasoning, or self-hosting.)

**Proprietary**

- [**Claude**](https://claude.ai) w/ extended thinking (Anthropic)
- [**Command**](https://cohere.com/command) (Cohere)
- [**Gemini**](https://gemini.google.com) reasoning modes (Google)
- [**Grok**](https://x.ai) (xAI)
- [**Jamba**](https://www.ai21.com/jamba) (AI21)
- [**OpenAI o-series**](https://platform.openai.com/docs/models) (reasoning)

**Open-source / open-weight**

- [**DeepSeek-R1**](https://huggingface.co/deepseek-ai/DeepSeek-R1) (reasoning)
- [**Qwen**](https://huggingface.co/Qwen) / **QwQ** (Alibaba)
- [**Llama**](https://huggingface.co/meta-llama) (Meta)
- [**Phi**](https://huggingface.co/microsoft) (Microsoft)
- [**Mistral / Mixtral**](https://huggingface.co/mistralai) (Mistral AI)
- [**Falcon**](https://huggingface.co/tiiuae) (TII), [**OLMo**](https://huggingface.co/allenai) (AI2)

---

## Code

Models tuned for code generation, completion, and agentic coding.

**Proprietary**

- [**Claude**](https://www.anthropic.com/claude-code) (Anthropic) — strong agentic coding (Claude Code)
- [**GPT / Codex**](https://platform.openai.com/docs/models) (OpenAI)
- [**Gemini**](https://gemini.google.com) (Google)
- [**GitHub Copilot**](https://github.com/features/copilot) (product)
- [**Cursor**](https://cursor.com) / [**Windsurf**](https://windsurf.com) (products)

**Open-source / open-weight**

- [**Qwen2.5-Coder**](https://huggingface.co/collections/Qwen/qwen25-coder-66eaa22e6f99801bf65b0c2f) (Alibaba)
- [**DeepSeek-Coder**](https://huggingface.co/deepseek-ai) / DeepSeek-V3
- [**Code Llama**](https://huggingface.co/codellama) (Meta)
- [**StarCoder2**](https://huggingface.co/bigcode) (BigCode)
- [**Codestral**](https://huggingface.co/mistralai) (Mistral, open weights)

---

## Image generation

Text-to-image (and image editing) models.

> For downloadable FOSS image-model workflows and installation references, see [ai-workflows.md](ai-workflows.md).

**Proprietary**

- [**Midjourney**](https://www.midjourney.com)
- [**DALL·E 3**](https://openai.com/index/dall-e-3/) (OpenAI)
- [**Imagen**](https://deepmind.google/technologies/imagen-3/) / Gemini image (Google)
- [**Firefly**](https://www.adobe.com/products/firefly.html) (Adobe)
- [**Ideogram**](https://ideogram.ai)

**Open-source / open-weight**

- [**FLUX.1**](https://huggingface.co/black-forest-labs) dev / schnell (Black Forest Labs)
- [**Playground v2.5**](https://huggingface.co/playgroundai/playground-v2.5-1024px-aesthetic)
- [**PixArt-Σ / α**](https://huggingface.co/PixArt-alpha)
- [**Stable Cascade**](https://huggingface.co/stabilityai/stable-cascade) (Stability AI)
- [**Stable Diffusion / SDXL**](https://huggingface.co/stabilityai) (Stability AI)

---

## Video generation

Text/image-to-video models.

**Proprietary**

- [**Kling**](https://klingai.com) (Kuaishou)
- [**Pika**](https://pika.art), [**Luma Dream Machine**](https://lumalabs.ai/dream-machine)
- [**Runway**](https://runwayml.com) Gen-3 / Gen-4
- [**Sora**](https://sora.com) (OpenAI)
- [**Veo**](https://deepmind.google/technologies/veo/) (Google)

**Open-source / open-weight**

- [**CogVideoX**](https://huggingface.co/THUDM) (THUDM), [**LTX-Video**](https://huggingface.co/Lightricks/LTX-Video) (Lightricks)
- [**HunyuanVideo**](https://huggingface.co/tencent/HunyuanVideo) (Tencent)
- [**Mochi 1**](https://huggingface.co/genmo/mochi-1-preview) (Genmo)
- [**Stable Video Diffusion**](https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt) (Stability AI)
- [**Wan**](https://huggingface.co/Wan-AI) 2.x (Alibaba)

---

## Audio, speech and music

Speech-to-text (STT), text-to-speech (TTS), voice, and music generation.

**Proprietary**

- [**ElevenLabs**](https://elevenlabs.io) (TTS / voice cloning)
- [**Google**](https://cloud.google.com/text-to-speech) speech/music models
- [**OpenAI**](https://platform.openai.com/docs/guides/text-to-speech) TTS / Realtime voice
- [**Suno**](https://suno.com) (music)
- [**Udio**](https://www.udio.com) (music)

**Open-source / open-weight**

- [**Bark**](https://huggingface.co/suno/bark) (Suno, open)
- [**MusicGen / AudioGen**](https://huggingface.co/facebook/musicgen-large) (Meta)
- [**Stable Audio Open**](https://huggingface.co/stabilityai/stable-audio-open-1.0) (Stability), [**Moshi**](https://huggingface.co/kyutai) (Kyutai)
- [**Whisper**](https://github.com/openai/whisper) (OpenAI, open weights) — STT
- [**XTTS**](https://huggingface.co/coqui/XTTS-v2) (Coqui), [**F5-TTS**](https://huggingface.co/SWivid/F5-TTS), [**Kokoro**](https://huggingface.co/hexgrad/Kokoro-82M) — TTS

---

## Embeddings and retrieval

Vector embedding models for search, RAG, and clustering.

**Proprietary**

- [**Gemini / Gecko embeddings**](https://ai.google.dev/gemini-api/docs/embeddings) (Google)
- [**Embed**](https://cohere.com/embed) (Cohere)
- [**text-embedding-3**](https://platform.openai.com/docs/guides/embeddings) (OpenAI)
- [**Voyage AI**](https://www.voyageai.com) (Anthropic-recommended)

**Open-source / open-weight**

- [**BGE**](https://huggingface.co/BAAI) (BAAI)
- [**E5**](https://huggingface.co/intfloat) (Microsoft)
- [**GTE**](https://huggingface.co/Alibaba-NLP) (Alibaba), [**Jina Embeddings**](https://huggingface.co/jinaai)
- [**Nomic Embed**](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5)
- [**Sentence-Transformers**](https://huggingface.co/sentence-transformers) (e.g. all-MiniLM)

---

## Agents and tool-use models

Models and managed agent services designed for planning, tool execution, coding, browsing,
computer use, or long-running research. In this repository, **Antigravity CLI** is an
integration target; **Gemini** remains the Google model and product family.

**Proprietary**

- [**Antigravity Agent**](https://ai.google.dev/gemini-api/docs/antigravity-agent) (Google) — managed agent in a sandboxed environment
- [**Gemini Deep Research**](https://ai.google.dev/gemini-api/docs/deep-research) (Google) — multi-step research agent
- [**Computer Use**](https://ai.google.dev/gemini-api/docs/computer-use) (Google) — screen-understanding and UI-action model
- [**Claude computer use**](https://docs.anthropic.com/en/docs/agents-and-tools/computer-use) (Anthropic)
- [**OpenAI computer use**](https://platform.openai.com/docs/guides/tools-computer-use) (OpenAI)

**Open-source / open-weight**

- [**OSWorld**](https://github.com/xlang-ai/OSWorld) — benchmark and environment for computer-use agents
- [**BrowserGym**](https://github.com/ServiceNow/BrowserGym) — benchmark and environments for web agents
- [**SWE-bench**](https://www.swebench.com/) — benchmark for software-engineering agents

---

## Appendix — image pipeline components

Not standalone models, but the building blocks of the Stable Diffusion / ComfyUI image pipeline. Many appear inside the workflows in [ai-workflows.md](ai-workflows.md).

| Component                                                        | Role                                                                                 |
|------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| **AfterDetailer (ADetailer)**                                    | Auto-detects and refines faces/hands.                                                |
| **CodeFormer** / **GFPGAN**                                      | Face restoration / enhancement.                                                      |
| **CLIP**                                                         | Text/image encoder that conditions generation on the prompt.                         |
| **CLIP Vision**                                                  | Image encoder used by IP-Adapter and image-prompt nodes.                             |
| **ControlNet**                                                   | Conditions generation on pose, depth, edges, etc.                                    |
| **DeepDanbooru**                                                 | Tagger for anime-style images.                                                       |
| **Diffusers**                                                    | Hugging Face library/format for running diffusion models.                            |
| **ESRGAN** / **RealESRGAN** / **BSRGAN** / **SwinIR** / **LDSR** | Upscalers / super-resolution.                                                        |
| **GLIGEN**                                                       | Grounded generation — place objects via bounding boxes.                              |
| **Hypernetwork**                                                 | Older style-steering network applied to the U-Net.                                   |
| **LoRA**                                                         | Low-rank fine-tune adapters for style/subject.                                       |
| **LyCORIS**                                                      | Extended family of low-rank adapters (LoCon, LoHa, etc.).                            |
| **Textual Inversion**                                            | Learns a new prompt token (embedding) for a concept.                                 |
| **Prompt Expansion**                                             | Auto-enriches short prompts with extra detail.                                       |
| **Stable Diffusion**                                             | Core latent text-to-image diffusion model.                                           |
| **T2I-Adapter**                                                  | Lightweight alternative to ControlNet for structural guidance.                       |
| **U-Net**                                                        | Denoising backbone of the diffusion model.                                           |
| **Ultralytics (YOLO)**                                           | Object/face detection (used by ADetailer, segmentation).                             |
| **VAE** / **ApproxVAE**                                          | Encodes/decodes between pixel and latent space; ApproxVAE is a fast preview decoder. |

### References

- <https://stable-diffusion-art.com/models/>
- <https://huggingface.co/models?search=stable-diffusion>
- <https://civitai.com/models>
- <https://openaijourney.com/stable-diffusion-illustration-prompts/>
