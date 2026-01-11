import argparse
import base64
import os
import signal
import sys
import threading
import time
import pyaudio
import dashscope
from dashscope.audio.qwen_omni import *
from dashscope.audio.qwen_omni.omni_realtime import TranscriptionParams

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def init_api_key():
    api_key = os.environ.get('DASHSCOPE_API_KEY')

    if (not api_key) and os.name == 'nt':
        try:
            import winreg

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Environment') as key:
                api_key, _ = winreg.QueryValueEx(key, 'DASHSCOPE_API_KEY')
        except Exception:
            api_key = None

    if api_key:
        dashscope.api_key = api_key
        return

    raise RuntimeError(
        "DASHSCOPE_API_KEY MISSING"
    )


class MyCallback(OmniRealtimeCallback):
    def __init__(self, conversation):
        self.conversation = conversation
        self._segments: list[str] = []
        self._lock = threading.Lock()
        self.handlers = {
            'session.created': self._handle_session_created,
            'conversation.item.input_audio_transcription.completed': self._handle_final_text,
            'input_audio_buffer.speech_started': lambda r: None,
            'input_audio_buffer.speech_stopped': lambda r: None
        }

    def on_open(self):
        pass

    def on_close(self, code, msg):
        pass

    def on_event(self, response):
        try:
            handler = self.handlers.get(response['type'])
            if handler:
                handler(response)
        except Exception:
            pass

    def _handle_session_created(self, response):
        pass

    def _handle_final_text(self, response):
        transcript = (response.get('transcript') or '').strip()
        if not transcript:
            return
        with self._lock:
            self._segments.append(transcript)

    def get_full_text(self) -> str:
        with self._lock:
            return ' '.join(self._segments).strip()

def send_silence_data(
    conversation,
    sample_rate: int = 16000,
    channels: int = 1,
    chunk_ms: int = 100,
    cycles: int = 3,
):
    bytes_per_sample = 2  # int16
    bytes_per_cycle = max(1, int(sample_rate * (chunk_ms / 1000) * channels * bytes_per_sample))
    silence_data = bytes(bytes_per_cycle)
    sleep_s = max(0.02, chunk_ms / 1000)

    for _ in range(max(1, cycles)):
        conversation.append_audio(base64.b64encode(silence_data).decode('ascii'))
        time.sleep(sleep_s)


def stream_microphone(
    conversation,
    stop_event: threading.Event,
    sample_rate: int = 16000,
    channels: int = 1,
    chunk_ms: int = 100,
    duration_seconds: float = 0,
):

    frames_per_buffer = max(1, int(sample_rate * (chunk_ms / 1000)))
    audio = pyaudio.PyAudio()
    stream = None
    try:
        stream = audio.open(
            format=pyaudio.paInt16,
            channels=channels,
            rate=sample_rate,
            input=True,
            frames_per_buffer=frames_per_buffer,
        )

        if duration_seconds > 0:
            start_time = time.time()
            while not stop_event.is_set():
                if time.time() - start_time >= duration_seconds:
                    break
                data = stream.read(frames_per_buffer, exception_on_overflow=False)
                audio_b64 = base64.b64encode(data).decode('ascii')
                conversation.append_audio(audio_b64)
        else:
            while not stop_event.is_set():
                data = stream.read(frames_per_buffer, exception_on_overflow=False)
                audio_b64 = base64.b64encode(data).decode('ascii')
                conversation.append_audio(audio_b64)
    finally:
        try:
            if stream is not None:
                stream.stop_stream()
                stream.close()
        finally:
            audio.terminate()


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Qwen ASR realtime demo (microphone only)")
    parser.add_argument('--sample-rate', type=int, default=16000, help='采样率（建议 16000）')
    parser.add_argument('--chunk-ms', type=int, default=200, help='每次读取的音频时长（毫秒）')
    parser.add_argument('--duration', type=float, default=0, help='录音时长（秒），0 表示持续录音直到 Ctrl+C')
    return parser

def main():
    args = build_arg_parser().parse_args()

    init_api_key()

    stop_event = threading.Event()
    conversation = OmniRealtimeConversation(
        model='qwen3-asr-flash-realtime',
        url='wss://dashscope.aliyuncs.com/api-ws/v1/realtime',
        callback=MyCallback(conversation=None)
    )

    conversation.callback.conversation = conversation

    def handle_exit(sig, frame):
        stop_event.set()

    signal.signal(signal.SIGINT, handle_exit)

    conversation.connect()

    transcription_params = TranscriptionParams(
        language='zh',
        sample_rate=int(args.sample_rate),
        input_audio_format="pcm"
    )

    conversation.update_session(
        output_modalities=[MultiModality.TEXT],
        enable_input_audio_transcription=True,
        transcription_params=transcription_params
    )

    try:
        stream_microphone(
            conversation,
            stop_event=stop_event,
            sample_rate=int(args.sample_rate),
            channels=1,
            chunk_ms=int(args.chunk_ms),
            duration_seconds=float(args.duration),
        )

        send_silence_data(
            conversation,
            sample_rate=int(args.sample_rate),
            channels=1,
            chunk_ms=int(args.chunk_ms),
            cycles=3,
        )
        time.sleep(2)

        full_text = conversation.callback.get_full_text()
        if full_text:
            print(full_text)
        else:
            print("")
    except Exception as e:
        print("")
    finally:
        conversation.close()


if __name__ == '__main__':
    main()