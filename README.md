# FloraWhisper

![Overview](docs/screenshots/overview.png)

## Overview

FloraWhisper is a digital eco-garden where 3D avatar assistant Gaia (Green Artificial Intelligence Assistant) helps you build a calm, sustainable plant-care routine.
It combines a virtual garden dashboard, weather-aware insights, multi-turn chat, voice I/O, and a multimodal chat mode.

## Key Features

- **Gaia 3D Avatar**: VRM-based character rendering with Three.js.
- **Multi-turn Chat**: Keep asking to get more accurate answers.
- **Voice Chat**: speak to Gaia, get spoken responses.
- **Multimodal Chat**: send an image + text prompt and get tailored guidance.
- **Weather Station**: 7-day trend + humidity signal via Open-Meteo.
- **Care Guide Generator**: generate a structured long-term care guide.

## Tech Stack

- **Framework**: Next.js (APP Router), React, TypeScript
- **State**: Zustand
- **UI**: Tailwind CSS, clsx, lucide-react
- **3D**: three, @react-three/fiber, @react-three/drei, @pixiv/three-vrm
- **Weather**: Open-Meteo
- **Language models / Voice models (ASR & TTS) / Multimodal models**: Qwen (the large language model family built by Alibaba Cloud)
  - For more information, see [大模型服务平台百炼控制台](https://bailian.console.aliyun.com)
- **Python runtime**: Pixi for package management, Python

## Project Structure

```text
app/
  api/
    asr/route.ts           # speech-to-text
    tts/route.ts           # user->LLM->TTS
    tts/direct/route.ts    # text->TTS
    chat/omni/route.ts     # multimodal chat
    guide/route.ts         # care guide
    weather/route.ts       # Open-Meteo proxy
components/
  avatar/                  # Gaia widget + 3D scene
  garden/                  # garden dashboard widgets
lib/
  llm/                     # prompts + qwen client
  garden.*                 # domain types/helpers
scripts/                   # python runners (dashscope/openai)
public/
  models/                  # VRM model assets
  tts/                     # generated wav files
```

## Environment Setup

### 1) Prerequisites

- Node.js
- npm
- Python

Optional:

- [Pixi](https://pixi.sh/) installed and available in `PATH`

### 2) Configure Environment Variables

Make sure to set `DASHSCOPE_API_KEY` as an envrionment variable for safety concerns.

e.g. On Windows

```pwsh
setx DASHSCOPE_API_KEY "sk-xxxxxx"
# or
[Environment]::SetEnvironmentVariable("DASHSCOPE_API_KEY", "YOUR_DASHSCOPE_API_KEY", [EnvironmentVariableTarget]::User)
```

To apply for your own API keys, see [创建API KEY](https://bailian.console.aliyun.com/?tab=model#/api-key)

### 3) Install Frontend Dependencies

```bash
npm install
```

### 4) Install Python Dependencies

```bash
cd scripts
pixi install
```

### 5) Run Locally

```bash
npm run dev
```

## API Endpoints

- `GET /api/weather?lat=...&lon=...&force=1`
- `POST /api/guide` — generate a JSON care guide via Qwen
- `POST /api/asr` — base64 PCM16 -> text
- `POST /api/tts` — user text (+ history) -> assistant text -> wav
- `POST /api/tts/direct` — text -> wav
- `POST /api/chat/omni` — image & text multimodal chat

## Build

```bash
npm run build
npm run start
```

## Notes & Troubleshooting

- If ASR/TTS/Omni fails with “missing dashscope/openai”, run `cd scripts && pixi install`.
- On Windows, after setting `DASHSCOPE_API_KEY`, restart your terminal and dev server so the env var is picked up.
- If you have any questions about chatting with Qwen models, refer to official documents [开始使用](https://bailian.console.aliyun.com/?tab=doc#/doc).
