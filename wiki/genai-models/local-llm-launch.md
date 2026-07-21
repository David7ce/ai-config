# Running local LLMs (llama.cpp)

Launch the GGUF models in this folder with the winget llama.cpp build (Vulkan backend, RTX 2060 SUPER 8 GB). `llama-server` = web UI + OpenAI API at `http://127.0.0.1:8080`. **One model at a time.**

## Launch commands

**Qwen3.5 9B Q8_0 — best quality, slow (~5 tok/s):**
```powershell
llama-server -m "D:\Software\AI\LLM\Qwen3.5-9B-Uncensored-HauhauCS-Aggressive-Q8_0.gguf" -ngl 28 --no-mmap -fa on -c 4096 -np 1 -fit off --port 8080
```

**Qwen3.6 35B-A3B IQ2_M — MoE:**
```powershell
llama-server -m "D:\Software\AI\LLM\Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive-IQ2_M.gguf" -ngl 99 --cpu-moe --no-mmap -fa on -c 4096 --port 8080
```

- 9B (8.9 GB) > 8 GB VRAM → partial offload (auto); add `-ngl 28` and tune for manual control.
- 35B-A3B is Mixture-of-Experts (only 3B active). `-ngl 99 --cpu-moe` keeps the bulky expert weights on CPU so it runs despite not fitting in VRAM.

## Notes

- **Empty reply?** Thinking mode ate the tokens — disable it: add `"chat_template_kwargs":{"enable_thinking":false}` (API), use the UI toggle, or `/no_think` in the message.
- **Out-of-memory on load?** Lower `-ngl` (e.g. 24, 20…) or shorten `-c`.
- **Why these are slow:** both Qwen models use a Gated-DeltaNet arch that Vulkan doesn't fully support — not a tuning issue. A [CUDA build](https://github.com/ggml-org/llama.cpp/releases) (unzip, no compiling) is the way to get real speed on this card.

Related: [genAI-model-list.md](genAI-model-list.md) · [ai-models-list.md](ai-models-list.md)
