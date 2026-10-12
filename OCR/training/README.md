# Land-document OCR training workflow

The production OCR engine in this project is Tesseract 5.4.0 through
`pytesseract`; it is not a transformer or a PyTorch model. Tesseract supports
language-model adaptation, but it requires manually verified training pairs and
the separate `tesstrain`/Tesseract training toolchain. The current workspace
contains uploaded images but no verified transcriptions, so no fine-tuning or
accuracy claim has been made.

## 1. Prepare authorized data

Use only legally obtained documents. Remove or anonymize personal information
where possible. Do not use the application's OCR output as ground truth.

Create a JSONL manifest using the schema in `manifest.schema.json`. Each record
must contain:

```json
{"image":"images/doc-001/page-001.png","text":"manually verified text","language":"ta","document_type":"patta","source_id":"doc-001","split":"train"}
```

`text` must be manually verified and must preserve Tamil Unicode and English
characters. `source_id` identifies the source document, not a page. The
validation script assigns deterministic splits by source when `split` is
omitted; pages from one source cannot cross train/validation/test.

The supported document types are `patta`, `chitta`, `sale_deed`,
`registration`, `survey`, `ownership`, `boundary`, `measurement`, and
`government_extract`. Use `mixed` for a Tamil-English page and `en`/`ta` for
single-language pages.

Validate and create a source-separated manifest:

```powershell
python training\prepare_dataset.py --input-dir training\data --output training\manifest.jsonl
```

This command never generates labels from OCR and fails on missing text,
duplicate sources, missing images, unsupported language values, or empty
transcriptions.

## 2. Measure the current model

After a manually verified `test` split exists:

```powershell
python training\evaluate_tesseract.py `
  --manifest training\manifest.jsonl `
  --data-dir training\data `
  --split test `
  --output training\results\baseline.json `
  --tessdata-dir data\tessdata `
  --tesseract-cmd "C:\Program Files\Tesseract-OCR\tesseract.exe"
```

The report contains CER and whitespace-token WER overall and by language,
document type, and selected land-field categories. It also records inference
time per page. These metrics measure text similarity; they do not establish
legal correctness.

## 3. Fine-tune Tesseract separately

Fine-tuning is deliberately not run automatically by the web application.
Install the official Tesseract training tools and the `tesstrain` repository
on a compatible training machine. Generate `.lstmf` files from the authorized
manifest, then train a new model name (for example `landai_tam_eng`) with the
Tamil and English base models. Keep the resulting traineddata in a new
directory; never overwrite `data\tessdata\tam.traineddata` or
`data\tessdata\eng.traineddata`.

The exact `tesstrain` command depends on its checkout and installed
dependencies. The helper below validates the manifest and prints the required
training inputs; it refuses to invoke training unless an explicit
`--tesstrain-dir` is supplied:

```powershell
python training\train_tesseract.py `
  --manifest training\manifest.jsonl `
  --data-dir training\data `
  --tesstrain-dir C:\path\to\tesstrain `
  --output-dir models\landai_tam_eng `
  --model-name landai_tam_eng
```

When the new model is available, evaluate it on the same held-out test
documents and compare the two JSON reports. Enable it in the backend only by
setting:

```powershell
$env:TESSDATA_DIR = 'C:\path\to\models\landai_tam_eng'
$env:LANDAI_OCR_MODEL_VERSION = 'landai_tam_eng-<checkpoint-or-date>'
python -m uvicorn app.main:app --reload
```

The original project-local model remains the rollback configuration. Missing
language data or invalid model directories fail during OCR processing rather
than silently returning a success-shaped result.
