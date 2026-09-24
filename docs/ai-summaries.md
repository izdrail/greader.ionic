# AI article summaries (on-device)

"Summarise with AI" on the article page writes a short TL;DR of the article using a small language model
that runs **on the device**. There is no server, no API key, and no article text leaves the device. The only
network request is the one-time model download from Hugging Face.

## Why not llm.js

The feature brief pointed at [llm.js](https://rahuldshetty.github.io/llm.js/#/api_guide). We checked it and
did not use it:

- The last commit is from July 2024. The v2 API in the docs is not on npm (npm only has
  `@rahuldshetty/llm.js` 1.0.2 from Nov 2023). Using v2 would mean compiling llama.cpp with emscripten ourselves.
- It is CPU only and single threaded, and each `run()` calls llama.cpp's command-line `main()` again, so the
  model is re-read for every prompt.
- There is no cancellation (apart from killing the worker), no download progress and no error callback (a
  failed download hangs). Output arrives as whole stdout lines, not tokens.

Instead we use **[wllama](https://github.com/ngxson/wllama)** (`@wllama/wllama`, MIT). It's the maintained
WebAssembly build of the same llama.cpp and runs the same GGUF model files, with download progress,
`AbortSignal` cancellation, token streaming, `exit()` to free memory, OPFS model caching and optional WebGPU.
It sits behind `LocalLLMService`, so the provider can be swapped without touching the UI.

## Model

| | |
|---|---|
| Model | Qwen3 0.6B, Q4_K_M GGUF ([unsloth/Qwen3-0.6B-GGUF](https://huggingface.co/unsloth/Qwen3-0.6B-GGUF), pinned revision) |
| Licence | Apache-2.0 |
| Download | 378 MB (396,705,472 bytes), once; stored in the browser's private file storage (OPFS) |
| Context used | 4096 tokens |
| Memory while generating | about 1 GB |
| Runtime | WebAssembly SIMD in a Web Worker; WebGPU when available, CPU otherwise (it falls back to CPU automatically) |

The model id is part of the summary cache key, so switching models regenerates summaries.

## Runtime requirements

- WebAssembly SIMD, Web Workers and OPFS (`navigator.storage.getDirectory`). Chrome/Edge 102+, Android System
  WebView 102+, Safari 16.4+ (iOS not tested).
- At least 2 GB of device memory (checked via `navigator.deviceMemory` where the browser reports it).
- If any of these are missing, the Summarise button is not shown.
- Runs single threaded. Multi-threading would be 4-8x faster but needs cross-origin isolation (COOP/COEP
  headers), and that would break YouTube embeds and some cross-origin images in the article view, so V1 does
  not turn it on.

## Measured (headless Chrome, 2 vCPU Xeon, 2 GB RAM, single thread)

| | |
|---|---|
| First download + load | 9.7 s (fast network) |
| Load from cache (offline) | 3.4 s |
| 450-word article: first token | ~72 s |
| 450-word article: complete | ~135 s |

Phones with recent ARM cores should be faster than this sandbox but it is not instant. On-device timing,
battery and memory numbers still need measuring on real Android hardware.

## How it works

```
ArticlePage -> ArticleSummaryComponent -> ArticleSummarisationService
                                            |- articleTextForSummary (sanitise -> strip noise -> text -> whitespace)
                                            |- planSummary (too short / one pass / chunked / too large)
                                            |- SummaryCache (IndexedDB "greader-ai": article id + content hash + model)
                                            '- LocalLLMService -> WllamaLlmService -> wllama / Qwen3 0.6B
```

- Articles up to about 5,000 characters go in one pass. Longer ones are split at paragraph boundaries,
  each part is summarised, then the parts are combined. Articles above 4 parts show "too large to
  summarise on this device" instead of being cut off.
- The prompt and summary options (TL;DR / key points / headline / teaser, short/medium/long, Markdown/plain)
  live in `src/app/core/ai/summary-config.ts`. V1 uses TL;DR, short, Markdown.
- Model output is untrusted. It is escaped and only a small Markdown subset is rendered.
- The model is freed 2 minutes after its last use, when the app goes to the background, and when you leave
  the article.
- Settings > AI summarisation: turn it on or off, see the model status, clear generated summaries, or remove
  the downloaded model.
