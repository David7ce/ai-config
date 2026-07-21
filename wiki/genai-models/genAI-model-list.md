# AI Model Index

A general index of notable AI models, grouped by area. Each area lists **Proprietary** (closed, API/product only) and **Open-source / open-weight** (downloadable weights, self-hostable) options.

> Snapshot as of **June 2026** — the field moves fast, so treat version numbers as a guide and verify the current release before relying on it.
>
> **Links:** open-source names link to their **Hugging Face / repo** (weights to download); proprietary names link to the **official product/access page** (these aren't downloadable — you use them via app or API).
>
> Related files: [ai-models-list.md](ai-models-list.md) (FOSS image-model download list for ComfyUI) · [ai-workflows.md](ai-workflows.md) (ComfyUI workflow index).

## Index

- [General & multimodal assistants](#general-and-multimodal-assistants)
- [Text & reasoning (LLMs)](#text-and-reasoning-llms)
- [Code](#code)
- [Image generation](#image-generation)
- [Video generation](#video-generation)
- [Audio — speech & music](#audio-speech-and-music)
- [Embeddings & retrieval](#embeddings-and-retrieval)
- [Appendix — image pipeline components](#appendix-image-pipeline-components)

---

## General and multimodal assistants

Frontier chat models that handle text plus images (and often audio/files). These are the household-name foundation models.

**Proprietary**

- [**Claude**](https://claude.ai) (Anthropic) — Opus 4.8, Sonnet 4.6, Haiku 4.5
- [**GPT**](https://chatgpt.com) (OpenAI) — GPT-5 family, GPT-4o
- [**Gemini**](https://gemini.google.com) (Google) — 2.x Pro / Flash
- [**Grok**](https://x.ai) (xAI)
- [**Nova**](https://aws.amazon.com/ai/generative-ai/nova/) (Amazon)
- [**Command**](https://cohere.com/command) (Cohere)

**Open-source / open-weight**

- [**Llama**](https://huggingface.co/meta-llama) (Meta) — 3.x / 4
- [**DeepSeek**](https://huggingface.co/deepseek-ai) — V3
- [**Qwen**](https://huggingface.co/Qwen) (Alibaba) — 2.5 / 3
- [**Mistral / Mixtral**](https://huggingface.co/mistralai) (Mistral AI)
- [**Gemma**](https://huggingface.co/google?search=gemma) (Google, open weights)
- [**Command R**](https://huggingface.co/CohereForAI) (Cohere, open weights)

---

## Text and reasoning (LLMs)

Language-first models, including dedicated "reasoning" models and smaller/efficient open models. (The general assistants above also handle text — these emphasize pure language, reasoning, or self-hosting.)

**Proprietary**

- [**OpenAI o-series**](https://platform.openai.com/docs/models) (reasoning)
- [**Claude**](https://claude.ai) w/ extended thinking (Anthropic)
- [**Gemini**](https://gemini.google.com) reasoning modes (Google)
- [**Jamba**](https://www.ai21.com/jamba) (AI21)
- [**Command**](https://cohere.com/command) (Cohere)
- [**Grok**](https://x.ai) (xAI)

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

> For a downloadable FOSS image-model catalog (SDXL, Flux, etc.) and where to install each, see [ai-models-list.md](ai-models-list.md).

**Proprietary**

- [**Midjourney**](https://www.midjourney.com)
- [**DALL·E 3**](https://openai.com/index/dall-e-3/) (OpenAI)
- [**Imagen**](https://deepmind.google/technologies/imagen-3/) / Gemini image (Google)
- [**Firefly**](https://www.adobe.com/products/firefly.html) (Adobe)
- [**Ideogram**](https://ideogram.ai)

**Open-source / open-weight**

- [**Stable Diffusion / SDXL**](https://huggingface.co/stabilityai) (Stability AI)
- [**FLUX.1**](https://huggingface.co/black-forest-labs) dev / schnell (Black Forest Labs)
- [**Stable Cascade**](https://huggingface.co/stabilityai/stable-cascade) (Stability AI)
- [**Playground v2.5**](https://huggingface.co/playgroundai/playground-v2.5-1024px-aesthetic)
- [**PixArt-Σ / α**](https://huggingface.co/PixArt-alpha)

---

## Video generation

Text/image-to-video models.

**Proprietary**

- [**Sora**](https://sora.com) (OpenAI)
- [**Runway**](https://runwayml.com) Gen-3 / Gen-4
- [**Veo**](https://deepmind.google/technologies/veo/) (Google)
- [**Kling**](https://klingai.com) (Kuaishou)
- [**Pika**](https://pika.art), [**Luma Dream Machine**](https://lumalabs.ai/dream-machine)

**Open-source / open-weight**

- [**Wan**](https://huggingface.co/Wan-AI) 2.x (Alibaba)
- [**HunyuanVideo**](https://huggingface.co/tencent/HunyuanVideo) (Tencent)
- [**Stable Video Diffusion**](https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt) (Stability AI)
- [**Mochi 1**](https://huggingface.co/genmo/mochi-1-preview) (Genmo)
- [**CogVideoX**](https://huggingface.co/THUDM) (THUDM), [**LTX-Video**](https://huggingface.co/Lightricks/LTX-Video) (Lightricks)

---

## Audio, speech and music

Speech-to-text (STT), text-to-speech (TTS), voice, and music generation.

**Proprietary**

- [**ElevenLabs**](https://elevenlabs.io) (TTS / voice cloning)
- [**OpenAI**](https://platform.openai.com/docs/guides/text-to-speech) TTS / Realtime voice
- [**Suno**](https://suno.com) (music)
- [**Udio**](https://www.udio.com) (music)
- [**Google**](https://cloud.google.com/text-to-speech) speech/music models

**Open-source / open-weight**

- [**Whisper**](https://github.com/openai/whisper) (OpenAI, open weights) — STT
- [**XTTS**](https://huggingface.co/coqui/XTTS-v2) (Coqui), [**F5-TTS**](https://huggingface.co/SWivid/F5-TTS), [**Kokoro**](https://huggingface.co/hexgrad/Kokoro-82M) — TTS
- [**Bark**](https://huggingface.co/suno/bark) (Suno, open)
- [**MusicGen / AudioGen**](https://huggingface.co/facebook/musicgen-large) (Meta)
- [**Stable Audio Open**](https://huggingface.co/stabilityai/stable-audio-open-1.0) (Stability), [**Moshi**](https://huggingface.co/kyutai) (Kyutai)

---

## Embeddings and retrieval

Vector embedding models for search, RAG, and clustering.

**Proprietary**

- [**text-embedding-3**](https://platform.openai.com/docs/guides/embeddings) (OpenAI)
- [**Embed**](https://cohere.com/embed) (Cohere)
- [**Voyage AI**](https://www.voyageai.com) (Anthropic-recommended)
- [**Gemini / Gecko embeddings**](https://ai.google.dev/gemini-api/docs/embeddings) (Google)

**Open-source / open-weight**

- [**BGE**](https://huggingface.co/BAAI) (BAAI)
- [**E5**](https://huggingface.co/intfloat) (Microsoft)
- [**Nomic Embed**](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5)
- [**GTE**](https://huggingface.co/Alibaba-NLP) (Alibaba), [**Jina Embeddings**](https://huggingface.co/jinaai)
- [**Sentence-Transformers**](https://huggingface.co/sentence-transformers) (e.g. all-MiniLM)

---

## Appendix — image pipeline components

Not standalone models, but the building blocks of the Stable Diffusion / ComfyUI image pipeline (the original contents of this file, tidied up). Many appear by filename in [ai-models-list.md](ai-models-list.md) and inside the workflows in [ai-workflows.md](ai-workflows.md).

| Component                                                        | Role                                                                                 |
|------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| **Stable Diffusion**                                             | Core latent text-to-image diffusion model.                                           |
| **U-Net**                                                        | Denoising backbone of the diffusion model.                                           |
| **VAE** / **ApproxVAE**                                          | Encodes/decodes between pixel and latent space; ApproxVAE is a fast preview decoder. |
| **CLIP**                                                         | Text/image encoder that conditions generation on the prompt.                         |
| **CLIP Vision**                                                  | Image encoder used by IP-Adapter and image-prompt nodes.                             |
| **ControlNet**                                                   | Conditions generation on pose, depth, edges, etc.                                    |
| **T2I-Adapter**                                                  | Lightweight alternative to ControlNet for structural guidance.                       |
| **GLIGEN**                                                       | Grounded generation — place objects via bounding boxes.                              |
| **LoRA**                                                         | Low-rank fine-tune adapters for style/subject.                                       |
| **LyCORIS**                                                      | Extended family of low-rank adapters (LoCon, LoHa, etc.).                            |
| **Hypernetwork**                                                 | Older style-steering network applied to the U-Net.                                   |
| **Textual Inversion**                                            | Learns a new prompt token (embedding) for a concept.                                 |
| **Prompt Expansion**                                             | Auto-enriches short prompts with extra detail.                                       |
| **DeepDanbooru**                                                 | Tagger for anime-style images.                                                       |
| **AfterDetailer (ADetailer)**                                    | Auto-detects and refines faces/hands.                                                |
| **CodeFormer** / **GFPGAN**                                      | Face restoration / enhancement.                                                      |
| **ESRGAN** / **RealESRGAN** / **BSRGAN** / **SwinIR** / **LDSR** | Upscalers / super-resolution.                                                        |
| **Ultralytics (YOLO)**                                           | Object/face detection (used by ADetailer, segmentation).                             |
| **Diffusers**                                                    | Hugging Face library/format for running diffusion models.                            |

### References

- <https://stable-diffusion-art.com/models/>
- <https://huggingface.co/models?search=stable-diffusion>
- <https://civitai.com/models>
- <https://openaijourney.com/stable-diffusion-illustration-prompts/>
