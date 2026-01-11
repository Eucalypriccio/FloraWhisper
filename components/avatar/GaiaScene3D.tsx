'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useAnimations, useFBX } from '@react-three/drei';
import { VRMExpressionPresetName, VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useChatStore } from '@/store/useChatStore';
import { remapMixamoAnimationToVrm } from '@/lib/avatar/remapMixamoAnimationToVrm';

// ------------------------------------------------------------------
// Internal Gaia Component (Mirrors App.tsx logic exactly)
// ------------------------------------------------------------------
type GaiaProps = {
  vrmUrl: string;
  isAwake: boolean;
  isThinking: boolean;
  speechUrl: string | null;
  wavingEnabled: boolean;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSpeechError?: () => void;
  onSpeechConsumed?: () => void;
  onReady?: () => void;
};

function Gaia({
  vrmUrl,
  isAwake,
  isThinking,
  speechUrl,
  wavingEnabled,
  onSpeechStart,
  onSpeechEnd,
  onSpeechError,
  onSpeechConsumed,
  onReady,
}: GaiaProps) {
  const gltf = useLoader(GLTFLoader, vrmUrl, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  }) as unknown as { scene: THREE.Group; userData: { vrm?: VRM } };

  const vrm = gltf.userData.vrm;
  const optimizedRef = useRef(false);
  const vrmRef = useRef<VRM | null>(null);
  const [ready, setReady] = useState(false);

  // Load Animations
  const happyIdle1Asset = useFBX('/models/animations/Happy_Idle_1.fbx');
  const happyIdle2Asset = useFBX('/models/animations/Happy_Idle_2.fbx');
  const standingIdle1Asset = useFBX('/models/animations/Standing_Idle_1.fbx');
  const thinking1Asset = useFBX('/models/animations/Thinking_1.fbx');
  const thinking2Asset = useFBX('/models/animations/Thinking_2.fbx');
  const waving1Asset = useFBX('/models/animations/Waving_1.fbx');

  const IDLE_POOL = useMemo(
    () => ['Happy_Idle_1', 'Happy_Idle_2', 'Standing_Idle_1'],
    []
  );
  const THINKING_POOL = useMemo(() => ['Thinking_1', 'Thinking_2'], []);
  const WAVING = 'Waving_1';

  const shuffleInPlace = (arr: string[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };

  const clips = useMemo(() => {
    if (!vrm) return [] as THREE.AnimationClip[];

    const makeClip = (
      name: string,
      asset: THREE.Object3D & { animations: THREE.AnimationClip[] }
    ) => {
      const clip = remapMixamoAnimationToVrm(vrm, asset);
      clip.name = name;
      return clip;
    };

    return [
      makeClip('Happy_Idle_1', happyIdle1Asset),
      makeClip('Happy_Idle_2', happyIdle2Asset),
      makeClip('Standing_Idle_1', standingIdle1Asset),
      makeClip('Thinking_1', thinking1Asset),
      makeClip('Thinking_2', thinking2Asset),
      makeClip('Waving_1', waving1Asset),
    ];
  }, [
    vrm,
    happyIdle1Asset,
    happyIdle2Asset,
    standingIdle1Asset,
    thinking1Asset,
    thinking2Asset,
    waving1Asset,
  ]);

  useEffect(() => {
    if (!vrm) return;

    vrmRef.current = vrm;

    if (!optimizedRef.current) {
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);
      VRMUtils.combineMorphs(vrm);
      optimizedRef.current = true;
    }

    vrmRef.current.scene.traverse((obj) => {
      obj.frustumCulled = false;
    });

    // Ensure reset rotation
    vrmRef.current.scene.rotation.y = 0;
  }, [gltf.scene, vrm]);

  const { actions, mixer } = useAnimations(clips, gltf.scene);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const currentNameRef = useRef<string | null>(null);
  const idleQueueRef = useRef<string[]>([]);
  const thinkingQueueRef = useRef<string[]>([]);
  const hasWavedRef = useRef(false);
  const isAwakeRef = useRef(isAwake);
  const isThinkingRef = useRef(isThinking);
  const wavingEnabledRef = useRef(wavingEnabled);
  const readyRef = useRef(false);

  useEffect(() => {
    isAwakeRef.current = isAwake;
  }, [isAwake]);

  useEffect(() => {
    isThinkingRef.current = isThinking;
  }, [isThinking]);

  useEffect(() => {
    wavingEnabledRef.current = wavingEnabled;
  }, [wavingEnabled]);

  const refillIdleQueue = () => {
    const q = [...IDLE_POOL];
    shuffleInPlace(q);
    idleQueueRef.current = q;
  };
  const refillThinkingQueue = () => {
    const q = [...THINKING_POOL];
    shuffleInPlace(q);
    thinkingQueueRef.current = q;
  };

  const pickNextIdle = () => {
    if (idleQueueRef.current.length === 0) refillIdleQueue();
    return idleQueueRef.current.shift() ?? IDLE_POOL[0];
  };

  const pickNextThinking = () => {
    if (thinkingQueueRef.current.length === 0) refillThinkingQueue();
    return thinkingQueueRef.current.shift() ?? THINKING_POOL[0];
  };

  const showAfterPoseApplied = () => {
    if (readyRef.current) return;

    // Delay visibility to next frame to allow pose update
    window.requestAnimationFrame(() => {
      if (readyRef.current) return;

      mixer?.update(1 / 60);
      vrmRef.current?.update(0);

      readyRef.current = true;
      setReady(true);
      onReady?.();
    });
  };

  const playAction = (
    name: string,
    opts: {
      loop: 'once' | 'repeat';
      fadeIn?: number;
      fadeOutPrev?: number;
    }
  ) => {
    const next = actions?.[name];
    if (!next) return;

    const prev = currentActionRef.current;
    if (prev && prev !== next) {
      prev.fadeOut(opts.fadeOutPrev ?? 0.25);
    }

    next.reset();
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);

    if (opts.loop === 'once') {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.clampWhenFinished = false;
    }

    next.fadeIn(opts.fadeIn ?? 0.25);
    next.play();

    currentActionRef.current = next;
    currentNameRef.current = name;

    showAfterPoseApplied();
  };

  const playWavingThenIdle = () => {
    playAction(WAVING, { loop: 'once', fadeIn: 0.2, fadeOutPrev: 0.2 });
  };

  const playWavingLoop = () => {
    // During speech playback we keep Gaia in a looping waving pose.
    // This intentionally overrides idle/thinking loops until speech ends.
    playAction(WAVING, { loop: 'repeat', fadeIn: 0.15, fadeOutPrev: 0.15 });
  };

  const playIdleLoop = () => {
    // For garden page: keep Gaia in idle while speaking.
    playAction(pickNextIdle(), { loop: 'repeat', fadeIn: 0.15, fadeOutPrev: 0.15 });
  };

  const playNextByMode = () => {
    if (!isAwakeRef.current) return;
    if (!hasWavedRef.current && wavingEnabledRef.current) {
      hasWavedRef.current = true;
      playWavingThenIdle();
      return;
    }

    if (!hasWavedRef.current && !wavingEnabledRef.current) {
      hasWavedRef.current = true;
    }

    if (isThinkingRef.current) {
      playAction(pickNextThinking(), { loop: 'once', fadeIn: 0.2 });
    } else {
      playAction(pickNextIdle(), { loop: 'once', fadeIn: 0.2 });
    }
  };

  useEffect(() => {
    if (!actions || !mixer) return;

    const onFinished = (e: THREE.AnimationMixerEventMap['finished']) => {
      if (!e.action || e.action !== currentActionRef.current) return;

      const currentName = currentNameRef.current;
      if (!currentName) return;

      if (currentName === WAVING) {
        playNextByMode();
        return;
      }

      playNextByMode();
    };

    mixer.addEventListener('finished', onFinished);
    return () => {
      mixer.removeEventListener('finished', onFinished);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, mixer]);

  useEffect(() => {
    if (!actions) return;

    if (!isAwake) {
      hasWavedRef.current = false;
      readyRef.current = false;
      setReady(false);
      idleQueueRef.current = [];
      thinkingQueueRef.current = [];
      currentNameRef.current = null;
      currentActionRef.current?.stop();
      currentActionRef.current = null;
      return;
    }

    // If speech is currently playing, keep pose while awake.
    if (isAwake && isSpeakingRef.current) {
      hasWavedRef.current = true;
      if (wavingEnabledRef.current) playWavingLoop();
      else playIdleLoop();
      return;
    }

    if (isAwake && !hasWavedRef.current) {
      playNextByMode();
      return;
    }

    // Mode switch
    playNextByMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAwake, isThinking, actions]);

  // ------------------------------------------------------------------
  // Lipsync (Matches example approach: fetch -> decodeAudioData ->
  // BufferSource + Analyser(FFT 1024) -> per-frame spectrum -> aa/ee/oh
  // ------------------------------------------------------------------
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const spectrumRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const indicesMaleRef = useRef<number[] | null>(null);
  const indicesFemaleRef = useRef<number[] | null>(null);
  const isSpeakingRef = useRef(false);

  const ensureAudioContext = () => {
    if (!audioContextRef.current) {
      const Ctx = window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      audioContextRef.current = new Ctx();
    }
    return audioContextRef.current;
  };

  const resetMouthExpressions = () => {
    const em = vrmRef.current?.expressionManager;
    if (!em) return;
    em.setValue(VRMExpressionPresetName.Oh, 0);
    em.setValue(VRMExpressionPresetName.Aa, 0);
    em.setValue(VRMExpressionPresetName.Ee, 0);
    em.setValue(VRMExpressionPresetName.Ou, 0);
    em.setValue(VRMExpressionPresetName.Ih, 0);
    em.update();
  };

  const stopSpeech = () => {
    isSpeakingRef.current = false;
    try {
      sourceRef.current?.stop();
    } catch {
      // ignore
    }
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    spectrumRef.current = null;
    indicesMaleRef.current = null;
    indicesFemaleRef.current = null;
    resetMouthExpressions();
  };

  const makeIndices = (boundaries: number[], sampleRate: number, fftSize: number) =>
    boundaries.map((f) => Math.round(((2 * fftSize) / sampleRate) * f));

  useEffect(() => {
    // Clearing URL should also stop any ongoing speech.
    if (!speechUrl) {
      stopSpeech();
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        stopSpeech();
        const ctx = ensureAudioContext();
        try {
          await ctx.resume();
        } catch {
          // ignore
        }

        const res = await fetch(speechUrl);
        const arr = await res.arrayBuffer();
        if (cancelled) return;

        const audioBuffer = await ctx.decodeAudioData(arr.slice(0));
        if (cancelled) return;

        const analyser = ctx.createAnalyser();
        analyser.smoothingTimeConstant = 0.5;
        analyser.fftSize = 1024;

        const src = ctx.createBufferSource();
        src.buffer = audioBuffer;
        src.connect(analyser);
        analyser.connect(ctx.destination);

        spectrumRef.current = new Float32Array(
          analyser.frequencyBinCount,
        ) as unknown as Float32Array<ArrayBuffer>;

        const sampleRate = ctx.sampleRate;
        const boundingMale = [0, 400, 560, 2400, 4800];
        const boundingFemale = [0, 500, 700, 3000, 6000];
        indicesMaleRef.current = makeIndices(boundingMale, sampleRate, analyser.fftSize);
        indicesFemaleRef.current = makeIndices(boundingFemale, sampleRate, analyser.fftSize);

        analyserRef.current = analyser;
        sourceRef.current = src;

        // Thinking can cover fetch+decode; stop thinking when audio starts.
        // During speech playback: home uses waving; garden stays idle.
        hasWavedRef.current = true;
        if (wavingEnabledRef.current) playWavingLoop();
        else playIdleLoop();
        onSpeechStart?.();
        isSpeakingRef.current = true;

        src.onended = () => {
          stopSpeech();
          onSpeechEnd?.();
          onSpeechConsumed?.();
          // Return to idle/thinking after speech completes.
          playNextByMode();
        };

        src.start();
      } catch (err) {
        stopSpeech();
        onSpeechError?.();
        onSpeechConsumed?.();
        // Return to idle/thinking after errors too.
        playNextByMode();
        console.error(err);
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechUrl]);

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  const updateLipSync = () => {
    if (!isSpeakingRef.current) return;
    const analyser = analyserRef.current;
    const spectrum = spectrumRef.current;
    const em = vrmRef.current?.expressionManager;
    const idxM = indicesMaleRef.current;
    const idxF = indicesFemaleRef.current;
    if (!analyser || !spectrum || !em || !idxM || !idxF) return;

    analyser.getFloatFrequencyData(spectrum);

    // Match the example math: thresholded PSD then band energies.
    const sensitivityThreshold = 0.5;

    const energyM = new Float32Array(5);
    const energyF = new Float32Array(5);

    for (let m = 0; m < 4; m++) {
      let sumM = 0;
      let countM = 0;
      for (let j = idxM[m]; j <= idxM[m + 1] && j < spectrum.length; j++) {
        const st = sensitivityThreshold + (spectrum[j] + 20) / 140;
        if (st > 0) sumM += st;
        countM++;
      }
      energyM[m] = countM > 0 ? sumM / countM : 0;

      let sumF = 0;
      let countF = 0;
      for (let j = idxF[m]; j <= idxF[m + 1] && j < spectrum.length; j++) {
        const st = sensitivityThreshold + (spectrum[j] + 20) / 140;
        if (st > 0) sumF += st;
        countF++;
      }
      energyF[m] = countF > 0 ? sumF / countF : 0;
    }

    const e1 = Math.max(energyF[1], energyM[1]);
    const e2 = Math.max(energyM[2], energyF[2]);
    const e3 = Math.max(energyM[3], energyF[3]);

    const oh =
      e1 > 0.2 ? 1 - 2 * e2 : (1 - 2 * e2) * 5 * e1;
    const aa = 3 * e3;
    const ee = 0.8 * (e1 - e3);

    em.setValue(VRMExpressionPresetName.Oh, clamp01(oh));
    em.setValue(VRMExpressionPresetName.Aa, clamp01(aa));
    em.setValue(VRMExpressionPresetName.Ee, clamp01(ee));
    em.update();
  };

  useFrame((_, delta) => {
    vrmRef.current?.update(delta);
    updateLipSync();
  });

  return (
    <group visible={ready}>
      <primitive object={gltf.scene} position={[0, -1.0, 0]} />
    </group>
  );
}

// ------------------------------------------------------------------
// Main Export (Canvas Container)
// ------------------------------------------------------------------
export default function GaiaScene3D() {
  const {
    isAwake,
    isProcessing,
    speechUrl,
    wavingEnabled,
    setSceneReady,
    setProcessing,
    setPlaying,
    setSpeechUrl,
    setBusy,
  } = useChatStore();
  
  return (
      <Canvas 
        camera={{ position: [0, 1.0, 3.5], fov: 30 }} 
        gl={{ alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight 
          position={[2, 2, 5]} 
          intensity={0.5} 
          color="#ffffff" 
        />
        
        <Suspense fallback={null}>
          <Gaia
            vrmUrl="/models/Gaia.vrm"
            isAwake={isAwake}
            isThinking={isProcessing} // Map store's isProcessing to Gaia's isThinking
            speechUrl={speechUrl}
            wavingEnabled={wavingEnabled}
            onReady={() => setSceneReady(true)}
            onSpeechStart={() => {
              setProcessing(false);
              setPlaying(true);
            }}
            onSpeechEnd={() => {
              setPlaying(false);
              setBusy(false); // 回答完成，解除锁定
            }}
            onSpeechError={() => {
              setProcessing(false);
              setPlaying(false);
              setBusy(false); // 错误时解除锁定
            }}
            onSpeechConsumed={() => {
              setSpeechUrl(null);
            }}
          />
        </Suspense>
      </Canvas>
  );
}
