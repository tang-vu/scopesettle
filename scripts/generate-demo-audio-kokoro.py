# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = [
#   "faster-whisper>=1.1,<2",
#   "jiwer>=4,<5",
#   "kokoro-onnx>=0.4,<0.5",
#   "soundfile>=0.13,<0.14",
# ]
# ///

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

import soundfile as sf
from faster_whisper import WhisperModel
from jiwer import wer
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
SEGMENTS_PATH = ROOT / "video" / "voice-segments.json"
OUTPUT_ROOT = ROOT / "video" / "audio-v3"
MODEL_ROOT = ROOT / ".video-models"
KOKORO_MODEL = MODEL_ROOT / "kokoro-v1.0.onnx"
KOKORO_VOICES = MODEL_ROOT / "voices-v1.0.bin"
MODEL_BASE_URL = (
    "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
)
VOICE = "am_michael"
MAX_WER = 0.18


def download_if_missing(path: Path) -> None:
    if path.exists() and path.stat().st_size > 0:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".download")
    print(f"Downloading {path.name}...", flush=True)
    urllib.request.urlretrieve(f"{MODEL_BASE_URL}/{path.name}", temporary)
    temporary.replace(path)


def spoken_text(text: str) -> str:
    replacements = (
        (r"\bAI\b", "artificial intelligence"),
        (r"\bScopeSettle\b", "Scope Settle"),
        (r"\bERC-8183\b", "E R C eighty-one eighty-three"),
        (r"\bSDK\b", "S D K"),
        (r"\bCLI\b", "C L I"),
        (r"\bRPC\b", "R P C"),
        (r"\bCI\b", "C I"),
    )
    result = text
    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result)
    return result


def normalize(text: str) -> str:
    text = text.lower()
    substitutions = (
        (r"scope[ -]?settle", "scopesettle"),
        (r"\ba\s+i\b", "ai"),
        (r"\be\s+r\s+c\b", "erc"),
        (r"\bs\s+d\s+k\b", "sdk"),
        (r"\bc\s+l\s+i\b", "cli"),
        (r"\br\s+p\s+c\b", "rpc"),
        (r"\bc\s+i\b", "ci"),
        (r"eighty[ -]?one eighty[ -]?three", "8183"),
        (r"\boff[ -]?chain\b", "offchain"),
        (r"\bthree\b", "3"),
        (r"\bten\b", "10"),
    )
    for pattern, replacement in substitutions:
        text = re.sub(pattern, replacement, text)
    return " ".join(re.findall(r"[a-z0-9]+", text))


def duration_ms(samples: object, sample_rate: int) -> int:
    return round(len(samples) / sample_rate * 1000)  # type: ignore[arg-type]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--qa-final", action="store_true")
    args = parser.parse_args()
    segments = json.loads(SEGMENTS_PATH.read_text(encoding="utf-8"))

    if args.qa_final:
        final_video = ROOT / "docs" / "assets" / "scopesettle-demo.mp4"
        if not final_video.exists():
            raise FileNotFoundError(f"Render the final video first: {final_video}")
        print("Loading faster-whisper small.en for final-mix ASR QA...", flush=True)
        whisper = WhisperModel("small.en", device="cpu", compute_type="int8")
        transcription, _ = whisper.transcribe(
            str(final_video),
            beam_size=5,
            language="en",
            initial_prompt="ScopeSettle. ERC-8183. X Layer. RPC. SDK. CLI. CI.",
            condition_on_previous_text=False,
        )
        transcript = " ".join(part.text.strip() for part in transcription).strip()
        expected = " ".join(spoken_text(segment["text"]) for segment in segments)
        error_rate = wer(normalize(expected), normalize(transcript))
        passed = error_rate <= MAX_WER
        OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
        report_path = OUTPUT_ROOT / "final-asr-report.json"
        report_path.write_text(
            json.dumps(
                {
                    "expected": expected,
                    "transcript": transcript,
                    "wer": round(error_rate, 4),
                    "maximumWer": MAX_WER,
                    "passed": passed,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"Final mix WER {error_rate:.1%} — {transcript}", flush=True)
        if not passed:
            print(f"Final-mix ASR QA failed; see {report_path}", file=sys.stderr)
            return 1
        print(f"Final-mix ASR QA passed; see {report_path}")
        return 0

    download_if_missing(KOKORO_MODEL)
    download_if_missing(KOKORO_VOICES)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    kokoro = Kokoro(str(KOKORO_MODEL), str(KOKORO_VOICES))

    generated: list[dict[str, object]] = []
    for segment in segments:
        speech = spoken_text(segment["text"])
        speed = 1.0
        while True:
            samples, sample_rate = kokoro.create(
                speech, voice=VOICE, speed=speed, lang="en-us"
            )
            length_ms = duration_ms(samples, sample_rate)
            if length_ms <= segment["durationMs"] or speed >= 1.30:
                break
            speed = round(speed + 0.03, 2)
        if length_ms > segment["durationMs"]:
            raise RuntimeError(
                f"Narration {segment['id']} is {length_ms}ms, over its "
                f"{segment['durationMs']}ms slot at speed {speed}."
            )
        output_path = OUTPUT_ROOT / f"{segment['id']}.wav"
        sf.write(output_path, samples, sample_rate)
        generated.append(
            {
                "id": segment["id"],
                "expected": segment["text"],
                "spoken": speech,
                "durationMs": length_ms,
                "slotMs": segment["durationMs"],
                "speed": speed,
                "path": output_path,
            }
        )
        print(
            f"{segment['id']}: {length_ms}ms / {segment['durationMs']}ms "
            f"at {speed:.2f}x",
            flush=True,
        )

    print("Loading faster-whisper small.en for ASR QA...", flush=True)
    whisper = WhisperModel("small.en", device="cpu", compute_type="int8")
    report: list[dict[str, object]] = []
    failed = False
    prompt = "ScopeSettle. ERC-8183. X Layer. RPC. SDK. CLI. CI."
    for item in generated:
        transcription, _ = whisper.transcribe(
            str(item["path"]),
            beam_size=5,
            language="en",
            initial_prompt=prompt,
            condition_on_previous_text=False,
        )
        transcript = " ".join(part.text.strip() for part in transcription).strip()
        error_rate = wer(normalize(str(item["spoken"])), normalize(transcript))
        passed = error_rate <= MAX_WER
        failed = failed or not passed
        result = {key: value for key, value in item.items() if key != "path"} | {
            "transcript": transcript,
            "wer": round(error_rate, 4),
            "passed": passed,
        }
        report.append(result)
        print(
            f"{item['id']}: WER {error_rate:.1%} — {transcript}",
            flush=True,
        )

    report_path = OUTPUT_ROOT / "asr-report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if failed:
        print(f"ASR QA failed; see {report_path}", file=sys.stderr)
        return 1
    print(f"ASR QA passed; see {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
