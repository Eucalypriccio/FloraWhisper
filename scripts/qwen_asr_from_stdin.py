import argparse
import base64
import os
import sys
import threading
import time

import dashscope
from dashscope.audio.qwen_omni import MultiModality, OmniRealtimeCallback, OmniRealtimeConversation
from dashscope.audio.qwen_omni.omni_realtime import TranscriptionParams

if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


def init_api_key():
    """初始化 API Key"""
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
        "DASHSCOPE_API_KEY MISSING"
    )


class MyCallback(OmniRealtimeCallback):
    def __init__(self, conversation=None):
        self.conversation = conversation
        self._segments: list[str] = []
        self._lock = threading.Lock()
        self.handlers = {
            "session.created": self._handle_session_created,
            "conversation.item.input_audio_transcription.completed": self._handle_final_text,
        }

    def on_open(self):
        return

    def on_close(self, code, msg):
        return

    def on_event(self, response):
        try:
            handler = self.handlers.get(response.get("type"))
            if handler:
                handler(response)
        except Exception:
            return

    def _handle_session_created(self, response):
        return

    def _handle_final_text(self, response):
        transcript = (response.get("transcript") or "").strip()
        if not transcript:
            return
        with self._lock:
            self._segments.append(transcript)

    def get_full_text(self) -> str:
        with self._lock:
            return " ".join(self._segments).strip()


def send_silence_data(conversation, sample_rate: int, channels: int, chunk_ms: int, cycles: int = 3):
    bytes_per_sample = 2
    bytes_per_cycle = max(1, int(sample_rate * (chunk_ms / 1000) * channels * bytes_per_sample))
    silence_data = bytes(bytes_per_cycle)
    sleep_s = max(0.02, chunk_ms / 1000)

    for _ in range(max(1, cycles)):
        conversation.append_audio(base64.b64encode(silence_data).decode("ascii"))
        time.sleep(sleep_s)


def read_base64_from_stdin() -> str:
    try:
        if sys.stdin is None:
            return ""
        data = sys.stdin.read()
        return (data or "").strip()
    except Exception:
        return ""


def iter_chunks(data: bytes, chunk_bytes: int):
    if chunk_bytes <= 0:
        yield data
        return
    for i in range(0, len(data), chunk_bytes):
        yield data[i : i + chunk_bytes]


def sanitize_output(text: str) -> str:
    t = (text or "").strip()

    if (t.startswith('"') and t.endswith('"')) or (t.startswith("“") and t.endswith("”")):
        t = t[1:-1].strip()

    if t in {"录音结束", "结束录音", "停止录音"}:
        return ""

    return t


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Qwen ASR: transcribe PCM16(base64) from stdin")
    parser.add_argument("--sample-rate", type=int, default=16000)
    parser.add_argument("--channels", type=int, default=1)
    parser.add_argument("--chunk-ms", type=int, default=100)
    parser.add_argument("--language", type=str, default="zh")
    return parser


def main():
    args = build_arg_parser().parse_args()

    init_api_key()

    b64 = read_base64_from_stdin()
    if not b64:
        print("")
        return

    try:
        pcm_bytes = base64.b64decode(b64)
    except Exception:
        print("")
        return

    if not pcm_bytes:
        print("")
        return

    conversation = OmniRealtimeConversation(
        model="qwen3-asr-flash-realtime",
        url="wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
        callback=MyCallback(conversation=None),
    )
    conversation.callback.conversation = conversation

    conversation.connect()

    transcription_params = TranscriptionParams(
        language=str(args.language),
        sample_rate=int(args.sample_rate),
        input_audio_format="pcm",
    )

    conversation.update_session(
        output_modalities=[MultiModality.TEXT],
        enable_input_audio_transcription=True,
        transcription_params=transcription_params,
    )

    try:
        bytes_per_sample = 2
        chunk_bytes = max(
            1,
            int(int(args.sample_rate) * (int(args.chunk_ms) / 1000) * int(args.channels) * bytes_per_sample),
        )

        for chunk in iter_chunks(pcm_bytes, chunk_bytes):
            conversation.append_audio(base64.b64encode(chunk).decode("ascii"))

        send_silence_data(
            conversation,
            sample_rate=int(args.sample_rate),
            channels=int(args.channels),
            chunk_ms=int(args.chunk_ms),
            cycles=3,
        )

        time.sleep(1.5)

        full_text = sanitize_output(conversation.callback.get_full_text())
        print(full_text or "")

    except Exception:
        print("")
    finally:
        try:
            conversation.close()
        except Exception:
            return


if __name__ == "__main__":
    main()
