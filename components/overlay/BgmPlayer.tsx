'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/useChatStore';

type Props = {
  src: string;
  volume?: number;
};

export default function BgmPlayer({ src, volume = 0.25 }: Props) {
  const startedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  const isSpeechPlaying = useChatStore((s) => s.isPlaying);
  const isRecording = useChatStore((s) => s.isRecording);

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = clamp01(volume);
    audioRef.current = audio;

    let removeListeners: Array<() => void> = [];

    const cleanupListeners = () => {
      for (const remove of removeListeners) remove();
      removeListeners = [];
    };

    const tryPlay = async () => {
      if (startedRef.current) return;
      try {
        await audio.play();
        startedRef.current = true;
        cleanupListeners();
      } catch {
        // Autoplay is likely blocked until the user interacts with the page.
      }
    };

    const addWindowOnce = (type: keyof WindowEventMap) => {
      const handler = () => {
        void tryPlay();
      };
      window.addEventListener(type, handler, { once: true, passive: true } as AddEventListenerOptions);
      removeListeners.push(() => window.removeEventListener(type, handler));
    };

    // Attempt immediately (may be blocked), then fall back to the first user interaction.
    void tryPlay();
    addWindowOnce('pointerdown');
    addWindowOnce('keydown');
    addWindowOnce('touchstart');

    return () => {
      cleanupListeners();
      audio.pause();
      audio.src = '';
      audio.load();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const base = clamp01(volume);
    const DUCK_SPEECH = 0.25;
    const DUCK_RECORDING = 0.12;

    const factor = Math.min(
      1,
      isSpeechPlaying ? DUCK_SPEECH : 1,
      isRecording ? DUCK_RECORDING : 1,
    );
    const target = clamp01(base * factor);

    if (fadeRafRef.current != null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }

    const start = audio.volume;
    const delta = target - start;
    if (Math.abs(delta) < 0.001) {
      audio.volume = target;
      return;
    }

    const durationMs = 180;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      audio.volume = clamp01(start + delta * t);
      if (t < 1) {
        fadeRafRef.current = requestAnimationFrame(tick);
      } else {
        fadeRafRef.current = null;
      }
    };

    fadeRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (fadeRafRef.current != null) {
        cancelAnimationFrame(fadeRafRef.current);
        fadeRafRef.current = null;
      }
    };
  }, [isSpeechPlaying, isRecording, volume]);

  return null;
}
