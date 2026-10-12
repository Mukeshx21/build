from __future__ import annotations

import argparse
import json
from pathlib import Path

from prepare_dataset import validate


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate inputs before Tesseract tesstrain.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--data-dir", type=Path)
    parser.add_argument("--tesstrain-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--model-name", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.tesstrain_dir.is_dir():
        raise FileNotFoundError(f"tesstrain directory does not exist: {args.tesstrain_dir}")
    records = [
        json.loads(line) for line in args.manifest.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    data_dir = args.data_dir or args.manifest.parent
    validated = validate(records, data_dir, seed=20261011)
    train_records = [record for record in validated if record["split"] == "train"]
    if not train_records:
        raise ValueError("No training records found")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    input_manifest = args.output_dir / "validated_train_manifest.jsonl"
    input_manifest.write_text(
        "\n".join(json.dumps(record, ensure_ascii=False) for record in train_records) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "status": "validated_only",
        "records": len(train_records),
        "model_name": args.model_name,
        "manifest": str(input_manifest),
        "next_step": "Use the official tesstrain/lstmtraining workflow to create a new traineddata file.",
        "production_model_overwritten": False,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
