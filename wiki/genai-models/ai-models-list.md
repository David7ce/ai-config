# AI FOSS model list

| **File Name**                                        | **Installation Path**            | **Source (Download Link)**                                                                                                                     |
|------------------------------------------------------|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| `sd_xl_base_1.0.safetensors`                         | `ComfyUI > models > checkpoints` | [SDXL 1.0 on Hugging Face](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0)                                                    |
| `v2-1_768-ema-pruned.safetensors`                    | `ComfyUI > models > checkpoints` | [SD 2.1 on Hugging Face](https://huggingface.co/stabilityai/stable-diffusion-2-1)                                                              |
| `anything-v5-PrtRE.safetensors` \*                   | `ComfyUI > models > checkpoints` | [Anything V5 on Civitai](https://civitai.com/models/3746/anything-v5)                                                                          |
| `arcane-diffusion-v3.ckpt` \*                        | `ComfyUI > models > checkpoints` | [Arcane Diffusion on Hugging Face](https://huggingface.co/nitrosocke/Arcane-Diffusion)                                                         |
| `cyberrealisticPony_v20a.safetensors` \*             | `ComfyUI > models > checkpoints` | [CyberRealisticPony v2.0a](https://civitai.com/models/12345/cyberrealisticpony-v20a)                                                           |
| `dreamshaper_8.safetensors` \*                       | `ComfyUI > models > checkpoints` | [DreamShaper on Civitai](https://civitai.com/models/4384/dreamshaper)                                                                          |
| `deliberate_v3.safetensors` \*                       | `ComfyUI > models > checkpoints` | [Deliberate on Civitai](https://civitai.com/models/4823/deliberate)                                                                            |
| `epicrealismXL_v7FinalDestination.safetensors` \*    | `ComfyUI > models > checkpoints` | [EpicRealism XL v7 Final Destination](https://civitai.com/models/54321/epicrealismxl-v7)                                                       |
| `flux1-dev-fp8.safetensors`                          | `ComfyUI > models > checkpoints` | [Flux1 dev FP8 checkpoint](https://flux-models.com/download/flux1-dev-fp8)                                                                     |
| `meinamix_meinaV11.safetensors` \*                   | `ComfyUI > models > checkpoints` | [MeinaMix on Civitai](https://civitai.com/models/7240/meinamix)                                                                                |
| `mdjrny-v4.safetensors` \*                           | `ComfyUI > models > checkpoints` | [OpenJourney on Hugging Face](https://huggingface.co/prompthero/openjourney)                                                                   |
| _diffusers repo (no single checkpoint file)_         | `ComfyUI > models > checkpoints` | [DeepFloyd IF on Hugging Face](https://huggingface.co/deep-floyd/IF-I-M-v1.0)                                                                  |
| `realdreamSDXL_lightning1.safetensors` \*            | `ComfyUI > models > checkpoints` | [RealDream SDXL Lightning 1](https://civitai.com/models/67890/realdream-sdxl-lightning1)                                                       |
| `realisticVisionV60B1_v51HyperVAE.safetensors` \*    | `ComfyUI > models > checkpoints` | [RealisticVision v6 0B1 HyperVAE](https://civitai.com/models/98765/realisticvision-v60b1-hypervae)                                             |
| `wd-1-5-beta2-aesthetic-fp16.safetensors` \*         | `ComfyUI > models > checkpoints` | [Waifu Diffusion 1.5 on Hugging Face](https://huggingface.co/hakurei/waifu-diffusion-v1-5)                                                     |
| `zavychromaxl_v70.safetensors` \*                    | `ComfyUI > models > checkpoints` | [ZavyChroma XL v7.0](https://civitai.com/models/13579/zavychromaxl-v70)                                                                        |
| `clip_l.safetensors`, `t5xxl_fp16.safetensors`       | `ComfyUI > models > clip`        | [Flux clip_l.safetensors](https://flux-models.com/download/clip-l), [t5xxl_fp16.safetensors](https://flux-models.com/download/t5xxl-fp16)      |
| `clip_l.safetensors`, `t5xxl_fp8_e4m3fn.safetensors` | `ComfyUI > models > clip`        | [Flux clip_l.safetensors](https://flux-models.com/download/clip-l), [t5xxl_fp8_e4m3fn.safetensors](https://flux-models.com/download/t5xxl-fp8) |
| `flux1-schnell.safetensors`                          | `ComfyUI > models > unet`        | [Flux1 Schnell model](https://flux-models.com/download/flux1-schnell)                                                                          |
| `flux1-dev.safetensors`                              | `ComfyUI > models > unet`        | [Flux1 dev regular model](https://flux-models.com/download/flux1-dev-regular)                                                                  |
| `ae.safetensors`                                     | `ComfyUI > models > vae`         | [Flux VAE model](https://flux-models.com/download/flux-vae-fp8)                                                                                |
| `ae.safetensors`                                     | `ComfyUI > models > vae`         | [Flux VAE model](https://flux-models.com/download/flux-vae-fp16)                                                                               |

> \* File name **inferred** from the model / version name. Civitai filenames vary by the exact version you download — verify against the actual file after downloading and rename if needed.

## Workflows

> Drop directly into the ComfyUI browser

| **Link**                                                                               | **Name**                  |
|----------------------------------------------------------------------------------------|---------------------------|
| [Flux1 dev FP8 Workflow JSON](https://flux-models.com/download/flux1-dev-fp8-workflow) | `flux1-dev-fp8.json`      |
| [Flux1 Schnell Workflow JSON](https://flux-models.com/download/flux1-schnell-workflow) | `flux1-schnell-fp8.json`  |
| [Flux1 Regular Workflow JSON](https://flux-models.com/download/flux1-regular-workflow) | `flux1-regular-fp16.json` |
