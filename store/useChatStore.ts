import { create } from 'zustand';

export const CHAT_HISTORY_LIMIT = 24; // 最多保留最近 24 条（约 12 轮）
export const CHAT_MESSAGE_MAX_CHARS = 1200; // 单条消息最大长度，避免请求体过大

export const OMNI_CHAT_HISTORY_LIMIT = 12; // Omni(含图片)更容易超限，默认更保守
export const OMNI_TEXT_PART_MAX_CHARS = 1200; // Omni 的 text part 最大长度

export type ChatMode = 'max' | 'omni';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mood?: 'happy' | 'sad' | 'neutral'; // 预留给未来控制表情
};

export type OmniContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type OmniMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: OmniContentPart[];
};

interface ChatState {
  messages: Message[];
  omniMessages: OmniMessage[];
  chatMode: ChatMode;
  isRecording: boolean;
  isProcessing: boolean; // AI 思考中
  isPlaying: boolean;    // AI 说话中
  speechUrl: string | null; // TTS wav URL (for playback + lipsync)
  isBusy: boolean;       // 正在处理对话（思考中或说话中），禁止新对话
  wavingEnabled: boolean; // 是否启用 waving 动画（garden 页禁用）
  
  // Gaia Avatar States
  isAwake: boolean;      // 唤醒状态 (Widget 打开)
  sceneReady: boolean;   // 3D 场景加载完毕
  currentAnimation: string; // 当前播放动画
  
  addMessage: (msg: Message) => void;
  addOmniMessage: (msg: OmniMessage) => void;
  setChatMode: (mode: ChatMode) => void;
  setRecording: (status: boolean) => void;
  setProcessing: (status: boolean) => void;
  setPlaying: (status: boolean) => void;
  setSpeechUrl: (url: string | null) => void;
  setBusy: (status: boolean) => void;
  setWavingEnabled: (enabled: boolean) => void;
  
  setAwake: (status: boolean) => void;
  setSceneReady: (status: boolean) => void;
  setAnimation: (anim: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  omniMessages: [],
  chatMode: 'max',
  isRecording: false,
  isProcessing: false,
  isPlaying: false,
  speechUrl: null,
  isBusy: false,
  wavingEnabled: true,
  
  isAwake: false,
  sceneReady: false,
  currentAnimation: 'idle',

  addMessage: (msg) =>
    set((state) => {
      const text = (msg.text ?? '').toString();
      const trimmedText =
        text.length > CHAT_MESSAGE_MAX_CHARS
          ? `${text.slice(0, CHAT_MESSAGE_MAX_CHARS)}…`
          : text;

      const next = [...state.messages, { ...msg, text: trimmedText }];
      return { messages: next.length > CHAT_HISTORY_LIMIT ? next.slice(-CHAT_HISTORY_LIMIT) : next };
    }),

  addOmniMessage: (msg) =>
    set((state) => {
      const safeParts: OmniContentPart[] = (Array.isArray(msg.content) ? msg.content : [])
        .filter((p): p is OmniContentPart => {
          if (!p || typeof p !== 'object') return false;
          if ((p as { type?: unknown }).type === 'text') {
            return typeof (p as { text?: unknown }).text === 'string';
          }
          if ((p as { type?: unknown }).type === 'image_url') {
            const url = (p as { image_url?: { url?: unknown } }).image_url?.url;
            return typeof url === 'string' && url.length > 0;
          }
          return false;
        })
        .map((p) => {
          if (p.type === 'text') {
            const t = (p.text ?? '').toString();
            return {
              type: 'text',
              text: t.length > OMNI_TEXT_PART_MAX_CHARS ? `${t.slice(0, OMNI_TEXT_PART_MAX_CHARS)}…` : t,
            };
          }
          return p;
        });

      const next: OmniMessage[] = [...state.omniMessages, { ...msg, content: safeParts }];
      return {
        omniMessages:
          next.length > OMNI_CHAT_HISTORY_LIMIT ? next.slice(-OMNI_CHAT_HISTORY_LIMIT) : next,
      };
    }),

  setChatMode: (mode) => set({ chatMode: mode }),
  setRecording: (status) => set({ isRecording: status }),
  setProcessing: (status) => set({ isProcessing: status }),
  setPlaying: (status) => set({ isPlaying: status }),
  setSpeechUrl: (url) => set({ speechUrl: url }),
  setBusy: (status) => set({ isBusy: status }),
  setWavingEnabled: (enabled) => set({ wavingEnabled: enabled }),
  
  setAwake: (status) => set({ isAwake: status }),
  setSceneReady: (status) => set({ sceneReady: status }),
  setAnimation: (anim) => set({ currentAnimation: anim }),
}));