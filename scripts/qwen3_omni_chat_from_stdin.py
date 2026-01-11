import json
import os
import sys

from openai import OpenAI

if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
DEFAULT_MODEL = "qwen3-omni-flash"


def read_stdin_json() -> dict:
    try:
        raw = sys.stdin.read()
        if not raw:
            return {}
        return json.loads(raw)
    except Exception:
        return {}


def main():
    payload = read_stdin_json()

    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        raise RuntimeError("Missing DASHSCOPE_API_KEY")

    base_url = str(payload.get("base_url") or os.getenv("DASHSCOPE_COMPAT_BASE_URL") or DEFAULT_BASE_URL)
    model = str(payload.get("model") or DEFAULT_MODEL)
    messages = payload.get("messages")

    if not isinstance(messages, list) or len(messages) == 0:
        print(json.dumps({"error": "Missing messages"}, ensure_ascii=False))
        return

    client = OpenAI(api_key=api_key, base_url=base_url)

    completion = client.chat.completions.create(
        model=model,
        messages=messages,
        modalities=["text"],
        stream=True,
        stream_options={"include_usage": True},
    )

    parts: list[str] = []
    usage = None

    for chunk in completion:
        try:
            choices = getattr(chunk, "choices", None)
            if choices:
                delta = choices[0].delta
                content = getattr(delta, "content", None)
                if content:
                    parts.append(content)
            else:
                usage = getattr(chunk, "usage", None)
        except Exception:
            continue

    text = "".join(parts).strip()
    out = {"text": text}
    if usage is not None:
        try:
            out["usage"] = usage.model_dump() if hasattr(usage, "model_dump") else usage
        except Exception:
            out["usage"] = None

    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
