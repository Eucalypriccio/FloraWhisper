'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, Send, ImagePlus } from 'lucide-react';
import {
  CHAT_HISTORY_LIMIT,
  OMNI_CHAT_HISTORY_LIMIT,
  useChatStore,
} from '@/store/useChatStore';
import GaiaScene3D from './GaiaScene3D';
import { usePathname } from 'next/navigation';
import { useGardenStore } from '@/store/useGardenStore';
import { useWeatherStore } from '@/store/useWeatherStore';
import { buildGardenWarnings } from '@/lib/garden.advice';

// ------------------------------------------------------------------
// GaiaWidget: Exact UI replica of gaia-demo/App.tsx / App.css
// ------------------------------------------------------------------
export default function GaiaWidget() {
  const pathname = usePathname();

  const refreshWeather = useWeatherStore((s) => s.refresh);

  const {
    messages,
    omniMessages,
    chatMode,
    isAwake,
    sceneReady,
    isRecording,
    isProcessing,
    isPlaying,
    isBusy,
    addMessage,
    addOmniMessage,
    setChatMode,
    setPlaying,
    setSpeechUrl,
    setAwake,
    setSceneReady,
    setRecording,
    setProcessing,
    setBusy,
    setWavingEnabled,
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
  const [showDialogue, setShowDialogue] = useState(true);
  const [uiVisible, setUiVisible] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [omniImageDataUrl, setOmniImageDataUrl] = useState<string | null>(null);
  const [omniImageName, setOmniImageName] = useState<string | null>(null);
  const [isOmniImageLoading, setIsOmniImageLoading] = useState(false);
  const omniImageReadSeqRef = useRef(0);

  const pendingOmniAssistantRef = useRef<null | { id: string; text: string }>(null);

  const OMNI_IMAGE_MAX_BYTES = 1_500_000; // ~1.5MB，避免 base64 后请求体过大

  const didWelcomeHomeRef = useRef(false);
  const didWelcomeGardenRef = useRef(false);
  const welcomeInFlightRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);

  const WELCOME_TEXT =
    '你好，我是 Gaia，你的植物养护助手。很高兴能与你一起守护这片宁静花园。如果你有任何关于植物养护的问题，我随时在这里为你提供帮助~';

  useEffect(() => {
    if (lastPathRef.current === pathname) return;

    // Garden 页：不使用 waving，直接 idle。
    setWavingEnabled(pathname !== '/garden');

    // 每次进入 garden 页，都允许“首次点击唤醒”播报一次（刷新后也会天然重置）。
    if (pathname === '/garden') {
      didWelcomeGardenRef.current = false;
    }
    lastPathRef.current = pathname;
  }, [pathname, setWavingEnabled]);

  useEffect(() => {
    // First-home-wake: reveal the whole UI only after speech actually starts.
    if (!welcomeInFlightRef.current) return;
    if (isPlaying) {
      setUiVisible(true);
      setShowDialogue(true);
      setIsWaking(false);
    }
  }, [isPlaying]);

  useEffect(() => {
    // Omni: keep subtitle and audio in sync (show subtitle only when speech starts).
    if (chatMode !== 'omni') return;
    if (!isPlaying) return;
    const pending = pendingOmniAssistantRef.current;
    if (!pending) return;

    setSubtitleText(pending.text);
    addOmniMessage({
      id: pending.id,
      role: 'assistant',
      content: [{ type: 'text', text: pending.text }],
    });
    pendingOmniAssistantRef.current = null;
  }, [addOmniMessage, chatMode, isPlaying]);

  useEffect(() => {
    // Once the welcome speech has started and then ended, allow normal interaction.
    // GaiaScene3D will clear busy on speech end, but we also clear the in-flight flag.
    if (!welcomeInFlightRef.current) return;
    if (!isPlaying && showDialogue) {
      welcomeInFlightRef.current = false;
    }
  }, [isPlaying, showDialogue]);

  // Browser-side mic capture (PCM16 @ 16k) so ASR uses user's real microphone.
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Int16Array[]>([]);

  const TARGET_SAMPLE_RATE = 16000;

  const downsampleTo16k = (input: Float32Array, inputSampleRate: number) => {
    if (inputSampleRate === TARGET_SAMPLE_RATE) {
      return input;
    }
    const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
    const newLength = Math.round(input.length / ratio);
    const output = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < output.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let sum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i++) {
        sum += input[i];
        count++;
      }
      output[offsetResult] = count > 0 ? sum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return output;
  };

  const floatTo16BitPCM = (input: Float32Array) => {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  };

  const concatInt16 = (chunks: Int16Array[]) => {
    const total = chunks.reduce((acc, c) => acc + c.length, 0);
    const out = new Int16Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...sub);
    }
    return btoa(binary);
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('File read failed'));
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') return reject(new Error('Invalid file result'));
        resolve(result);
      };
      reader.readAsDataURL(file);
    });

  const clearOmniImage = () => {
    // Invalidate any in-flight read.
    omniImageReadSeqRef.current += 1;
    setIsOmniImageLoading(false);
    setOmniImageDataUrl(null);
    setOmniImageName(null);
  };

  const pickOmniImage = () => {
    if (isBusy) return;
    fileInputRef.current?.click();
  };

  const onOmniFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    // allow re-select same file
    e.target.value = '';
    if (!file) return;

    // Start a new read cycle (cancellable).
    const seq = omniImageReadSeqRef.current + 1;
    omniImageReadSeqRef.current = seq;

    setIsOmniImageLoading(true);
    setOmniImageDataUrl(null);
    setOmniImageName(file.name);

    if (file.size > OMNI_IMAGE_MAX_BYTES) {
      setSubtitleText('图片太大啦，请选择更小的图片（建议 1.5MB 以内）。');
      setIsOmniImageLoading(false);
      setOmniImageDataUrl(null);
      setOmniImageName(null);
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      // If user cleared/changed image while reading, ignore.
      if (omniImageReadSeqRef.current !== seq) return;
      setOmniImageDataUrl(dataUrl);
      setIsOmniImageLoading(false);
    } catch (err) {
      console.error(err);
      setSubtitleText('图片读取失败，请重试。');
      if (omniImageReadSeqRef.current !== seq) return;
      setIsOmniImageLoading(false);
      setOmniImageDataUrl(null);
      setOmniImageName(null);
    }
  };

  const startBrowserRecording = async () => {
    // Ask permission and start capturing.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);

    pcmChunksRef.current = [];
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const down = downsampleTo16k(input, ctx.sampleRate);
      const pcm16 = floatTo16BitPCM(down);
      pcmChunksRef.current.push(pcm16);
    };

    source.connect(processor);
    processor.connect(ctx.destination);

    mediaStreamRef.current = stream;
    audioContextRef.current = ctx;
    sourceNodeRef.current = source;
    processorRef.current = processor;
  };

  const stopBrowserRecording = async () => {
    try {
      processorRef.current?.disconnect();
      sourceNodeRef.current?.disconnect();
    } catch {
      // ignore
    }

    const stream = mediaStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
    }

    mediaStreamRef.current = null;
    sourceNodeRef.current = null;
    processorRef.current = null;

    const ctx = audioContextRef.current;
    audioContextRef.current = null;
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        // ignore
      }
    }

    const pcm = concatInt16(pcmChunksRef.current);
    pcmChunksRef.current = [];

    return pcm;
  };

  // 录音计时器
  React.useEffect(() => {
    if (!isRecording || recordingStartTime === null) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - recordingStartTime) / 1000;
      setRecordingDuration(elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);

  const startWelcomeFlow = async () => {
    welcomeInFlightRef.current = true;

    setBusy(true);
    setProcessing(false);
    setPlaying(false);
    setSpeechUrl(null);
    setSubtitleText(WELCOME_TEXT);

    try {
      const res = await fetch('/api/tts/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: WELCOME_TEXT }),
      });

      const data = (await res.json()) as { url?: string; text?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Direct TTS failed');
      }

      // Hand off to GaiaScene3D for fetch+decode+play+lipsync.
      setSpeechUrl(data.url);

      // Mark as completed for this page session only.
      didWelcomeHomeRef.current = true;
    } catch (err) {
      console.error(err);
      // Let user retry by waking up again.
      welcomeInFlightRef.current = false;
      setBusy(false);
      setPlaying(false);
      setSpeechUrl(null);
      setIsWaking(false);
      setUiVisible(true);
      setShowDialogue(true);
      setSubtitleText('欢迎语播放失败，请稍后再试。');
    }
  };

  const buildGardenWakeText = () => {
    const plants = useGardenStore.getState().plants;
    if (plants.length === 0) {
      return '你的花园里还没有植物呢，试着添加一些吧~';
    }

    const weatherState = useWeatherStore.getState();
    const weatherSnapshot = {
      temp: weatherState.currentTemp ?? 0,
      humidity: weatherState.currentHumidity ?? 0,
      condition: weatherState.condition,
      loading: weatherState.loading,
      error: weatherState.error,
    };

    const { plantWarnings, envWarnings } = buildGardenWarnings(plants, weatherSnapshot);

    const plantPart =
      plantWarnings.length === 0
        ? '植物都在茁壮成长呢！请继续细心呵护呦~'
        : plantWarnings[0];

    // 无天气问题：不追加；有天气问题：追加第一条（在植物状态建议之后）
    const envPart = envWarnings.length > 0 ? envWarnings[0] : '';

    return envPart ? `${plantPart} 另外，${envPart}` : plantPart;
  };

  const startGardenWelcomeFlow = async () => {
    welcomeInFlightRef.current = true;

    setBusy(true);
    setProcessing(false);
    setPlaying(false);
    setSpeechUrl(null);

    try {
      // 掩盖所有加载时间：先确保天气尽量刷新完成，再生成 advice，再请求 TTS。
      await refreshWeather({ force: true });

      const text = buildGardenWakeText();
      setSubtitleText(text);

      const res = await fetch('/api/tts/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = (await res.json()) as { url?: string; text?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Direct TTS failed');
      }

      setSpeechUrl(data.url);
      didWelcomeGardenRef.current = true;
    } catch (err) {
      console.error(err);
      welcomeInFlightRef.current = false;
      setBusy(false);
      setPlaying(false);
      setSpeechUrl(null);
      setIsWaking(false);
      setUiVisible(true);
      setShowDialogue(true);
      setSubtitleText('花园播报失败，请稍后再试。');
    }
  };

  const handleWakeUp = () => {
    setSceneReady(false);
    setAwake(true);

    const isHome = pathname === '/';
    const isGarden = pathname === '/garden';
    if (isHome && !didWelcomeHomeRef.current && !welcomeInFlightRef.current) {
      // Show the drawer immediately, but keep Gaia/dialogue/input hidden while TTS is prepared.
      setIsWaking(true);
      setUiVisible(true);
      setShowDialogue(false);
      void startWelcomeFlow();
      return;
    }

    if (isGarden && !didWelcomeGardenRef.current && !welcomeInFlightRef.current) {
      setIsWaking(true);
      setUiVisible(true);
      setShowDialogue(false);
      void startGardenWelcomeFlow();
      return;
    }

    setIsWaking(false);
    setUiVisible(true);
    setShowDialogue(true);
  };

  const handleClose = () => {
    // 只关闭界面，不重置处理状态
    // 如果正在处理中，保持状态，再次打开时继续显示
    setAwake(false);
    setIsWaking(false);
    setUiVisible(false);
    setShowDialogue(true);
  };

  const startTtsFlow = async (userText: string) => {
    setBusy(true);
    setProcessing(true);
    setPlaying(false);
    setSpeechUrl(null);

    try {
      // 传递完整的消息历史（不包括当前用户消息，它会在 API 中添加）
      const historyForLlm = messages.length > CHAT_HISTORY_LIMIT ? messages.slice(-CHAT_HISTORY_LIMIT) : messages;
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: userText,
          messages: historyForLlm, // 仅传递裁剪后的对话历史，避免请求体过大
        }),
      });
      const data = (await res.json()) as { url?: string; text?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'TTS failed');
      }

      if (data.text) {
        setSubtitleText(data.text);
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          text: data.text,
        });
      }

      // 交给 GaiaScene3D：fetch+decode+播放+FFT lipsync
      setSpeechUrl(data.url);
    } catch (err) {
      console.error(err);
      setProcessing(false);
      setPlaying(false);
      setSpeechUrl(null);
      setBusy(false); // 错误时解除锁定
    }
  };

  const startOmniFlow = async (args: { text?: string; imageDataUrl?: string | null }) => {
    const text = (args.text ?? '').trim();
    const imageDataUrl = args.imageDataUrl ?? null;
    if (!text && !imageDataUrl) return;

    setBusy(true);
    setProcessing(true);
    setPlaying(false);
    setSpeechUrl(null);

    try {
      const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
      if (imageDataUrl) {
        content.push({ type: 'image_url', image_url: { url: imageDataUrl } });
      }
      if (text) {
        content.push({ type: 'text', text });
      }

      const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content };
      addOmniMessage(userMsg);

      // Request uses clipped history (including this user message).
      const history = omniMessages.length > OMNI_CHAT_HISTORY_LIMIT ? omniMessages.slice(-OMNI_CHAT_HISTORY_LIMIT) : omniMessages;
      const payloadMessages = [...history, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const chatRes = await fetch('/api/chat/omni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const chatData = (await chatRes.json().catch(() => null)) as { text?: string; error?: string } | null;
      if (!chatRes.ok || !chatData?.text) {
        throw new Error(chatData?.error || 'Omni chat failed');
      }

      const assistantText = chatData.text.trim();

      // Defer showing subtitle until speech actually starts (keep text+audio synced).
      pendingOmniAssistantRef.current = { id: crypto.randomUUID(), text: assistantText };

      // Keep existing speech pipeline: use direct TTS to speak Omni answer.
      const ttsRes = await fetch('/api/tts/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: assistantText }),
      });

      const ttsData = (await ttsRes.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!ttsRes.ok || !ttsData?.url) {
        throw new Error(ttsData?.error || 'Direct TTS failed');
      }

      setSpeechUrl(ttsData.url);
    } catch (err) {
      console.error(err);

      // Clear any pending subtitle on failure.
      pendingOmniAssistantRef.current = null;

      setProcessing(false);
      setPlaying(false);
      setSpeechUrl(null);
      setBusy(false);
      setSubtitleText('Omni 模式请求失败，请稍后再试。');
    } finally {
      // Consume image selection after send
      clearOmniImage();
    }
  };

  const toggleListening = async () => {
    // 如果正在处理中，不允许新的录音
    if (isBusy) return;
    
    const next = !isRecording;
    setRecording(next);

    // 点击开始录音
    if (next) {
      try {
        await startBrowserRecording();
      } catch (err) {
        console.error('Mic permission / start recording failed:', err);
        setRecording(false);
        setSubtitleText('无法访问麦克风，请检查浏览器权限设置。');
        return;
      }
      setRecordingStartTime(Date.now());
      setRecordingDuration(0);
      return;
    }

    // 再次点击（结束录音）：发送音频到 ASR API
    const duration = recordingDuration;
    setRecordingStartTime(null);
    setRecordingDuration(0);

    if (duration < 0.5) {
      // 录音太短，忽略
      return;
    }

    // 显示处理中状态
    setBusy(true);
    setProcessing(true);

    try {
      const pcm16 = await stopBrowserRecording();
      if (pcm16.length < TARGET_SAMPLE_RATE * 0.3) {
        // < 0.3s
        setProcessing(false);
        setBusy(false);
        return;
      }

      const pcm16Base64 = arrayBufferToBase64(pcm16.buffer);

      // 调用 ASR API 获取识别文本
      const asrRes = await fetch('/api/asr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration,
          pcm16Base64,
          sampleRate: TARGET_SAMPLE_RATE,
          chunkMs: 100,
        }),
      });

      const asrData = (await asrRes.json()) as { text?: string; error?: string };
      if (!asrRes.ok) {
        throw new Error(asrData.error || 'ASR failed');
      }

      const recognizedText = (asrData.text || '').trim();
      if (!recognizedText) {
        // 未识别到文本
        setProcessing(false);
        setBusy(false);
        setSubtitleText('未识别到语音，请再试一次。');
        return;
      }

      // 使用识别文本触发对话流程
      if (chatMode === 'omni') {
        await startOmniFlow({ text: recognizedText, imageDataUrl: null });
      } else {
        addMessage({ id: crypto.randomUUID(), role: 'user', text: recognizedText });
        await startTtsFlow(recognizedText);
      }
    } catch (err) {
      console.error('ASR error:', err);
      setProcessing(false);
      setBusy(false);
      setSubtitleText('语音识别失败，请再试一次。');
    }
  };

  const sendMessage = () => {
    const text = inputText.trim();
    // 如果正在处理中或没有文本，不发送
    if (isBusy) return;

    if (chatMode === 'omni') {
      if (!text && !omniImageDataUrl) return;
      setInputText('');
      void startOmniFlow({ text, imageDataUrl: omniImageDataUrl });
      return;
    }

    if (!text) return;
    addMessage({ id: crypto.randomUUID(), role: 'user', text });
    setInputText('');
    void startTtsFlow(text);
  };

  const switchMode = (mode: 'max' | 'omni') => {
    if (isBusy) return;
    setChatMode(mode);
    clearOmniImage();
  };

  return (
    <>
      {/* Background Blur Overlay */}
      <div
        className={`blur-overlay ${isAwake && uiVisible ? 'active' : ''}`}
        onClick={handleClose}
      />

      {/* Floating Entry Button */}
      <div
        className={`entry-container ${isAwake || isWaking ? 'hidden' : ''}`}
        style={{
          pointerEvents: isAwake || isWaking ? 'none' : 'auto',
          opacity: isAwake || isWaking ? 0 : 1,
          transition: 'opacity 0.3s',
        }}
      >
        <div className="entry-btn-wrapper" onClick={handleWakeUp}>
          <div className="entry-label">Ask Gaia</div>
          <button className="entry-btn">
            <div className="entry-ring" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pics/gaia_avatar.svg"
              alt="Gaia"
              className="entry-avatar"
            />
          </button>
        </div>
      </div>

      {/* Floating Drawer Panel (kept mounted so speech can continue in background) */}
      <div className={`floating-drawer ${isAwake && uiVisible ? 'open' : 'closed'}`}>
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="drawer-title">Gaia - Garden Keeper</div>
            <div className="mode-toggle" role="tablist" aria-label="Chat mode">
              <button
                type="button"
                className={`mode-btn ${chatMode === 'max' ? 'active' : ''}`}
                onClick={() => switchMode('max')}
                disabled={isBusy}
              >
                Max
              </button>
              <button
                type="button"
                className={`mode-btn ${chatMode === 'omni' ? 'active' : ''}`}
                onClick={() => switchMode('omni')}
                disabled={isBusy}
              >
                Omni
              </button>
            </div>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* 3D Scene Area - Gaia floating inside */}
        <div className="scene-container">
          <div
            className="scene-canvas-layer"
            style={{
              opacity: !isWaking && sceneReady ? 1 : 0,
              transition: 'opacity 1s ease 0.2s',
            }}
          >
            <GaiaScene3D />
          </div>

          {/* In-panel loading (cover TTS latency on first wake) */}
          {isWaking && (
            <div className="dialogue-layer">
              <div className="gaia-card">
                <div className="gaia-text">正在唤醒 Gaia......</div>
                <div className="thinking-indicator">
                  <span style={{ animation: 'spin 1.2s linear infinite' }}>✦</span>{' '}
                  Loading...
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Subtitle Card */}
          {showDialogue && !isWaking && (
            <div className="dialogue-layer">
              <div className="gaia-card">
                <div className="gaia-text">{subtitleText}</div>
                {isRecording && (
                  <div className="thinking-indicator">
                    <span style={{ animation: 'spin 2s linear infinite' }}>✦</span>{' '}
                    Recording... {recordingDuration.toFixed(1)}s
                  </div>
                )}
                {isProcessing && (
                  <div className="thinking-indicator">
                    <span style={{ animation: 'spin 2s linear infinite' }}>✦</span>{' '}
                    Thinking...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        {showDialogue && !isWaking && (
          <div className="input-area">
            {chatMode === 'omni' && (isOmniImageLoading || !!omniImageDataUrl) && (
              <div className="omni-preview-row">
                <div className="omni-preview-left">
                  {omniImageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="omni-thumb" src={omniImageDataUrl} alt={omniImageName ?? 'Selected image'} />
                  ) : (
                    <div className="omni-thumb omni-thumb-skeleton" aria-label="Loading image" />
                  )}
                  <div className="omni-preview-meta">
                    <div className="omni-preview-title">Image</div>
                    <div className="omni-preview-name">{omniImageName ?? (isOmniImageLoading ? 'Loading…' : '')}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="omni-clear-btn"
                  onClick={clearOmniImage}
                  disabled={isBusy}
                  title="Clear image"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="input-row">
            {/* Omni local image upload */}
            {chatMode === 'omni' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onOmniFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className={`upload-btn ${omniImageDataUrl ? 'active' : ''}`}
                  onClick={pickOmniImage}
                  disabled={isBusy}
                  title={isOmniImageLoading ? 'Loading image...' : omniImageName ? `Selected: ${omniImageName}` : 'Upload an image'}
                >
                  {isOmniImageLoading ? <span className="mini-spinner" /> : <ImagePlus size={18} />}
                </button>
              </>
            )}
            <input
              className="text-input"
              placeholder={chatMode === 'omni' ? 'Ask with image + text...' : 'Ask about your plants...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isBusy}
            />
            <button
              className={`mic-btn ${isRecording ? 'listening' : ''}`}
              onClick={toggleListening}
              disabled={isBusy && !isRecording}
            >
              {isRecording ? (
                <div className="wave-container">
                  <div className="wave-bar" style={{ background: '#d9534f' }} />
                  <div
                    className="wave-bar"
                    style={{ background: '#d9534f', animationDelay: '0.1s' }}
                  />
                  <div
                    className="wave-bar"
                    style={{ background: '#d9534f', animationDelay: '0.2s' }}
                  />
                </div>
              ) : (
                <Mic className="mic-icon" />
              )}
            </button>
            {inputText && (
              <button
                className="close-btn"
                onClick={sendMessage}
                style={{ marginLeft: 8 }}
                disabled={isBusy}
              >
                <Send size={20} color="var(--primary)" />
              </button>
            )}
          </div>
          </div>
        )}
      </div>
    </>
  );
}

