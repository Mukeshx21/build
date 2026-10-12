from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path
from typing import Any

LANGUAGES = {"ta", "en", "mixed"}
DOCUMENT_TYPES = {
    "patta", "chitta", "sale_deed", "registration", "survey",
    "ownership", "boundary", "measurement", "government_extract",
}
SPLITS = ("train", "validation", "test")
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate a verified OCR JSONL manifest.")
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=20261011)
    return parser.parse_args()


def split_for_source(source_id: str, seed: int) -> str:
    digest = hashlib.sha256(f"{seed}:{source_id}".encode()).hexdigest()
    value = int(digest[:8], 16) / 0xFFFFFFFF
    if value < 0.8:
        return "train"
    if value < 0.9:
        return "validation"
    return "test"


def load_records(input_dir: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in sorted(input_dir.rglob("*.jsonl")):
        with path.open(encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, start=1):
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"{path}:{line_number}: invalid JSON") from exc
                records.append(record)
    if not records:
        raise ValueError(f"No JSONL annotations found under {input_dir}")
    return records


def validate(records: list[dict[str, Any]], input_dir: Path, seed: int) -> list[dict[str, Any]]:
    seen_images: set[str] = set()
    source_splits: dict[str, str] = {}
    output: list[dict[str, Any]] = []
    for index, record in enumerate(records, start=1):
        required = {"image", "text", "language", "document_type", "source_id"}
        missing = required - record.keys()
        if missing:
            raise ValueError(f"record {index}: missing {', '.join(sorted(missing))}")
        image = Path(str(record["image"]))
        image_path = image if image.is_absolute() else input_dir / image
        if image_path.suffix.lower() not in IMAGE_SUFFIXES or not image_path.is_file():
            raise ValueError(f"record {index}: image does not exist or is unsupported: {image_path}")
        text = record["text"]
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"record {index}: text must be non-empty verified transcription")
        language = record["language"]
        document_type = record["document_type"]
        source_id = str(record["source_id"]).strip()
        if language not in LANGUAGES:
            raise ValueError(f"record {index}: unsupported language {language!r}")
        if document_type not in DOCUMENT_TYPES:
            raise ValueError(f"record {index}: unsupported document_type {document_type!r}")
        if not source_id:
            raise ValueError(f"record {index}: source_id must be non-empty")
        relative_image = image_path.resolve().relative_to(input_dir.resolve()).as_posix()
        if relative_image in seen_images:
            raise ValueError(f"record {index}: duplicate image {relative_image}")
        seen_images.add(relative_image)
        split = record.get("split") or split_for_source(source_id, seed)
        if split not in SPLITS:
            raise ValueError(f"record {index}: unsupported split {split!r}")
        prior = source_splits.setdefault(source_id, split)
        if prior != split:
            raise ValueError(f"source {source_id!r} crosses splits: {prior} and {split}")
        output.append({
            "image": relative_image, "text": text, "language": language,
            "document_type": document_type, "source_id": source_id, "split": split,
        })
    return output


def main() -> None:
    args = parse_args()
    records = validate(load_records(args.input_dir), args.input_dir, args.seed)
    random.Random(args.seed).shuffle(records)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="\n") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    counts = {split: sum(record["split"] == split for record in records) for split in SPLITS}
    print(json.dumps({"records": len(records), "records_by_split": counts}, ensure_ascii=False))


if __name__ == "__main__":
    main()
