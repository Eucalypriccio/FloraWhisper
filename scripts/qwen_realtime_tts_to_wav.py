import base64
import os
import random
import re
import sys
import threading
import time
import wave

import dashscope
from dashscope.audio.qwen_tts_realtime import AudioFormat, QwenTtsRealtime, QwenTtsRealtimeCallback

# 强制使用 UTF-8 编码（Windows 兼容）
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


FALLBACK_TEXT = [
    "对不起，我不是很理解你的意思呢",
    "试着重新提问一次吧~",
]


TTS_MODELS = [
    "qwen3-tts-flash-realtime",
    "qwen3-tts-flash-realtime-2025-11-27",
    "qwen3-tts-flash-realtime-2025-09-18",
]


def pick_tts_model() -> str:
    # Use SystemRandom to avoid predictable sequences.
    return random.SystemRandom().choice(TTS_MODELS)


def read_text_from_stdin() -> str:
    try:
        if sys.stdin is None:
            return ""
        # Node side writes utf-8 by default.
        data = sys.stdin.read()
        return (data or "").strip()
    except Exception:
        return ""


def read_text_from_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return (f.read() or "").strip()
    except Exception:
        return ""


def normalize_text(text: str) -> str:
    t = (text or "")
    t = re.sub(r"\s+", " ", t).strip()
    # Remove spaces between CJK characters if any.
    t = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", t)
    return t


def build_text_to_synthesize(argv_text_or_path: str | None) -> str:
    if argv_text_or_path:
        # Prefer reading from file path (route passes a temp txt file).
        if os.path.exists(argv_text_or_path):
            file_text = read_text_from_file(argv_text_or_path)
            if file_text:
                return normalize_text(file_text)

        t = argv_text_or_path.strip()
        if t:
            return normalize_text(t)

    stdin_text = read_text_from_stdin()
    if stdin_text:
        return normalize_text(stdin_text)

    return normalize_text("".join(FALLBACK_TEXT))


def split_sentences(text: str) -> list[str]:
    """Split into sentence-like chunks for realtime TTS."""
    t = normalize_text(text)
    if not t:
        return []

    # Keep punctuation with the sentence.
    parts = re.findall(r"[^。！？；!?;\n]+[。！？；!?;]?", t)
    chunks = [p.strip() for p in parts if p and p.strip()]
    # Fallback: if regex fails, send whole string.
    return chunks if chunks else [t]


def init_api_key():
    api_key = os.environ.get("DASHSCOPE_API_KEY")

    if (not api_key) and os.name == "nt":
        try:
            import winreg

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment") as key:
                api_key, _ = winreg.QueryValueEx(key, "DASHSCOPE_API_KEY")
        except Exception:
            api_key = None

    if api_key:
        dashscope.api_key = api_key
        return

    raise RuntimeError(
        "Missing DASHSCOPE_API_KEY. "
        "Set it in env (recommended) and restart the process if needed."
    )


class WavCallback(QwenTtsRealtimeCallback):
    def __init__(self):
        self.complete_event = threading.Event()
        self.pcm_bytes = bytearray()

    def on_open(self) -> None:
        return

    def on_close(self, close_status_code, close_msg) -> None:
        return

    def on_event(self, response: str) -> None:
        try:
            type_ = response["type"]

            if type_ == "response.audio.delta":
                recv_audio_b64 = response["delta"]
                self.pcm_bytes.extend(base64.b64decode(recv_audio_b64))

            if type_ == "session.finished":
                self.complete_event.set()

        except Exception:
            # Swallow to keep session alive; the route will fail by timeout if needed.
            return

    def wait_for_finished(self):
        self.complete_event.wait()


def write_wav(output_path: str, pcm_bytes: bytes):
    # PCM_24000HZ_MONO_16BIT
    with wave.open(output_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(pcm_bytes)


def main():
    if len(sys.argv) < 2:
        print(
            "Usage: python qwen_realtime_tts_to_wav.py <output_wav_path> [text_or_text_file]",
            file=sys.stderr,
        )
        sys.exit(2)

    output_wav_path = sys.argv[1]
    argv_text_or_path = sys.argv[2] if len(sys.argv) >= 3 else None
    text_to_synthesize = build_text_to_synthesize(argv_text_or_path)

    init_api_key()

    callback = WavCallback()
    model_name = pick_tts_model()
    qwen_tts_realtime = QwenTtsRealtime(
        model=model_name,
        callback=callback,
        url="wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
    )

    qwen_tts_realtime.connect()
    qwen_tts_realtime.update_session(
        voice="Cherry",
        response_format=AudioFormat.PCM_24000HZ_MONO_16BIT,
        mode="server_commit",
    )

    chunks = split_sentences(text_to_synthesize)
    if not chunks:
        chunks = FALLBACK_TEXT

    for text_chunk in chunks:
        qwen_tts_realtime.append_text(text_chunk)
        time.sleep(0.1)

    qwen_tts_realtime.finish()
    callback.wait_for_finished()

    write_wav(output_wav_path, bytes(callback.pcm_bytes))


if __name__ == "__main__":
    main()
