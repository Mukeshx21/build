from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import pytesseract
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from app.main import ocr_page


def edit_distance(left: str, right: str) -> int:
    previous = list(range(len(right) + 1))
    for row, left_char in enumerate(left, start=1):
        current = [row]
        for column, right_char in enumerate(right, start=1):
            current.append(min(
                current[-1] + 1,
                previous[column] + 1,
                previous[column - 1] + (left_char != right_char),
            ))
        previous = current
    return previous[-1]


def score(reference: str, hypothesis: str) -> tuple[int, int, int, int]:
    reference_words = reference.split()
    hypothesis_words = hypothesis.split()
    return (
        edit_distance(reference, hypothesis), len(reference),
        edit_distance(reference_words, hypothesis_words),
        len(reference_words),
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate Tesseract on verified OCR records.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--data-dir", type=Path)
    parser.add_argument("--split", default="test")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--tessdata-dir", type=Path)
    parser.add_argument("--tesseract-cmd", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = str(args.tesseract_cmd)
    if args.tessdata_dir:
        os.environ["TESSDATA_PREFIX"] = str(args.tessdata_dir.resolve())
    records = [
        json.loads(line) for line in args.manifest.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    records = [record for record in records if record.get("split") == args.split]
    if not records:
        raise ValueError(f"No records found for split {args.split!r}")
    totals = [0, 0, 0, 0]
    groups: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0, 0, 0])
    durations: list[float] = []
    for record in records:
        image_path = (args.data_dir or args.manifest.parent) / record["image"]
        with Image.open(image_path) as image:
            started = time.perf_counter()
            text, _, _, _ = ocr_page(image.convert("RGB"), {"ta": "ta", "en": "en", "mixed": "ta-en"}[record["language"]])
            durations.append(time.perf_counter() - started)
        values = score(record["text"], text)
        totals = [a + b for a, b in zip(totals, values)]
        for group in (("language", record["language"]), ("document_type", record["document_type"])):
            groups[group] = [a + b for a, b in zip(groups[group], values)]

    def metrics(values: list[int]) -> dict[str, float | int]:
        return {
            "characters": values[1], "words": values[3],
            "cer": values[0] / values[1] if values[1] else 0.0,
            "wer": values[2] / values[3] if values[3] else 0.0,
        }

    report: dict[str, Any] = {
        "engine": "tesseract",
        "split": args.split,
        "records": len(records),
        "overall": metrics(totals),
        "groups": {f"{key}={value}": metrics(scores) for (key, value), scores in groups.items()},
        "inference_seconds_per_page": sum(durations) / len(durations),
        "warning": "Text similarity metrics do not establish legal correctness.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
