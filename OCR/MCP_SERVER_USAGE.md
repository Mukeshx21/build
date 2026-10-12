# MCP Server Usage in the LandAI OCR Project

## Overview

The Model Context Protocol (MCP) tools were used as development and
verification tools while inspecting and extending this project. They helped
read files, inspect the Python environment, run controlled Python checks,
validate source syntax, inspect the dataset, and apply code changes.

MCP was **not** used as an OCR model, training dataset, or replacement for
Tesseract. The production OCR engine remains Tesseract OCR through
`pytesseract`.

## MCP tools used

### File and project inspection

- `view`
  - Read `README.md`, `requirements.txt`, `app/main.py`, and this project's
    inventory files.
  - Used to understand the existing backend, preprocessing, API routes, and
    dependencies.
- `glob`
  - Listed project files, uploaded documents, dataset images, and training
    files.
- `rg`
  - Available for focused text searches when locating symbols or settings.
- `problems`
  - Available for compile and lint diagnostics.

### Python and environment verification

- `configurePythonEnvironment`
  - Selected the project Python environment.
  - Confirmed that the project uses system Python 3.13.
- `getPythonEnvironmentInfo`
  - Inspected the configured Python environment and installed packages.
- `pylance-mcp-server-pylanceImports`
  - Checked that project imports such as `cv2`, `fitz`, `pytesseract`,
    `docx`, `fastapi`, `PIL`, `pydantic`, and `reportlab` resolve.
- `pylance-mcp-server-pylanceInstalledTopLevelModules`
  - Compared importable modules and installed package versions.
- `pylance-mcp-server-pylanceRunCodeSnippet`
  - Ran focused Python checks without creating temporary scripts.
  - Used to verify Tesseract language loading, database counts, image
    dimensions, OCR inference, confidence values, and processing time.
- `pylance-mcp-server-pylanceFileSyntaxErrors`
  - Checked the syntax of the modified Python files.
- `pylance-mcp-server-pylanceLSP`
  - Retrieved workspace diagnostics after changes.

### Command execution

- `powershell`
  - Checked installed software and package versions.
  - Verified the Tesseract executable and its version.
  - Inspected directories and copied the six dataset images into the training
    staging directory.
  - Ran the dataset-preparation command and training command interfaces.

### Code modification

- `apply_patch`
  - Added the dataset preparation, evaluation, and Tesseract training
    workflow.
  - Added model configuration metadata to the OCR backend.
  - Added documentation and configuration files.

## What was verified with MCP

### Existing OCR implementation

The inspection established that the application uses:

- Tesseract OCR version `5.4.0.20240606`
- Python package `pytesseract==0.3.13`
- OpenCV and Pillow preprocessing
- CLAHE contrast enhancement
- Tesseract page segmentation mode `6`
- Tamil and English language data
- FastAPI routes for upload, processing, corrections, and exports

### Tesseract language data

The application uses the project-local directory:

```text
C:\Users\mukes\OneDrive\Desktop\OCR\data\tessdata
```

The verified languages are:

```text
eng
tam
```

The global Tesseract installation reported only `eng` and `osd` when checked
without the project-local `TESSDATA_PREFIX`. The backend therefore uses the
project-local language-data directory by default.

### Existing project data

The project database was inspected using a focused Python snippet:

- Documents: 30
- OCR pages: 15
- Corrections: 0

No manually verified transcription dataset or model checkpoint was found.

### Dataset images

The six images in `dataset` were inspected and copied to:

```text
training\data\images
```

They were processed using the existing OCR pipeline. The resulting predictions
were saved to:

```text
training\draft_predictions.jsonl
```

The predictions are marked `prediction_only: true` and are not valid training
labels until a person manually verifies and corrects every transcription.

## What MCP did not do

MCP did not:

- Invent or fabricate transcriptions.
- Treat OCR predictions as ground truth.
- Claim a CER or WER improvement without verified references.
- Fine-tune a model without labeled training data.
- Replace the production Tesseract language data.
- Upload project images, documents, credentials, or source code to an external
  service.
- Retrain the model when a user uploads a document.

The training preparation command correctly stopped when no verified annotations
were present:

```text
ValueError: No JSONL annotations found under training\data
```

## Training workflow supported by this project

Once authorized images have manually verified transcriptions, place the data
under `training\data` and create JSONL records with fields such as:

```json
{
  "image": "images/doc-001-page-001.png",
  "text": "Manually verified Tamil and English text",
  "language": "mixed",
  "document_type": "patta",
  "source_id": "doc-001"
}
```

Then run:

```powershell
python training\prepare_dataset.py `
  --input-dir training\data `
  --output training\manifest.jsonl
```

The preparation script validates:

- Image existence and supported image formats
- Non-empty transcription text
- Tamil, English, or mixed language values
- Supported land-document categories
- Duplicate images
- Source-document-level train/validation/test separation

After a valid manifest exists, evaluate the current model:

```powershell
python training\evaluate_tesseract.py `
  --manifest training\manifest.jsonl `
  --data-dir training\data `
  --split test `
  --output training\results\baseline.json `
  --tessdata-dir data\tessdata `
  --tesseract-cmd "C:\Program Files\Tesseract-OCR\tesseract.exe"
```

The evaluation script reports character error rate, word error rate,
grouped-language metrics, grouped-document-type metrics, and average inference
time. Metrics are text-similarity measurements and do not prove legal
correctness.

## Backend model configuration

The backend exposes model metadata in OCR responses. The selected model and
Tesseract configuration can be changed through environment variables:

```powershell
$env:TESSDATA_DIR = 'C:\path\to\traineddata-directory'
$env:LANDAI_OCR_MODEL_VERSION = 'landai_tam_eng-2026-10-11'
$env:LANDAI_OCR_PSM = '6'
```

The original project-local configuration remains available as the rollback
option. Fine-tuning is a separate workflow and is never triggered by document
upload or processing.

## Reproducibility and safety

For reproducible results:

1. Use the same held-out source documents for baseline and fine-tuned-model
   evaluation.
2. Keep all training and evaluation manifests under version control or another
   controlled storage system.
3. Record the Tesseract version, tessdata directory, model version, page
   segmentation mode, preprocessing settings, and Python package versions.
4. Keep personal information protected and use only legally obtained documents.
5. Keep the original Tesseract model available until a measured comparison
   supports a replacement.

MCP provided the inspection and verification mechanism. The OCR results and
training decisions still depend on the project code, Tesseract, authorized
data, and human-verified transcriptions.
