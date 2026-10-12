# LandAI Bilingual OCR

This workspace was empty when implementation started, so this is a self-contained FastAPI OCR module ready to mount under an existing LandAI application. It preserves uploads, processes PDF/image pages with real Tesseract OCR, stores page text and word boxes in SQLite, and provides an editable review screen.

## What is included

- Tamil, English, Tamil + English, and automatic language choices.
- PDF, JPG, JPEG, and PNG upload with drag-and-drop and 50 MB validation.
- Multi-page PDF rendering through PyMuPDF.
- Conservative grayscale and CLAHE contrast preprocessing through OpenCV.
- Tesseract `tam+eng` recognition, confidence values, word boxes, and low-confidence warnings.
- Original source storage, page-by-page editable text, correction persistence, and heuristic land fields.
- TXT, DOCX, reconstructed PDF, and searchable-original PDF exports.
- Static responsive review UI at `/`.

OCR is intentionally not faked: processing returns an actionable error when Tesseract or its language data is missing.

## Install

1. Install Python 3.11+ and the full UB Mannheim Tesseract OCR installer. In its language selection screen, select both `English` and `Tamil` (the small Microsoft Store Tesseract app does not include language data).
2. Install the Tesseract language data for English and Tamil. On Windows, select `English` and `Tamil` in the installer, or place `eng.traineddata` and `tam.traineddata` in Tesseract's `tessdata` directory.
3. Install Python dependencies:

```powershell
python -m pip install -r requirements.txt
```

If Tesseract is not on `PATH`, set it before starting the service:

```powershell
$env:TESSERACT_CMD = 'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

The OCR response includes the engine, model version, tessdata directory, and
page-segmentation mode used for processing. These can be selected without
changing code:

```powershell
$env:TESSDATA_DIR = 'C:\path\to\traineddata-directory'
$env:LANDAI_OCR_MODEL_VERSION = 'landai_tam_eng-2026-10-11'
$env:LANDAI_OCR_PSM = '6'
```

The separate [`training\README.md`](training/README.md) workflow validates
authorized image/transcription pairs, creates source-separated splits,
evaluates CER/WER, and documents the Tesseract `tesstrain` handoff. No model
is retrained during upload or processing.

The app also looks for language data in `data\tessdata` and uses it when present. This lets a non-administrator Windows installation keep `eng.traineddata` and `tam.traineddata` inside the project. To use another language-data directory, set:

```powershell
$env:TESSDATA_DIR = 'C:\path\to\tessdata'
```

For reconstructed Tamil PDFs, install a Unicode Tamil font such as Noto Sans Tamil and set:

```powershell
$env:LANDAI_TAMIL_FONT = 'C:\Windows\Fonts\NotoSansTamil-Regular.ttf'
```

Without that font, the DOCX/TXT exports remain Unicode-correct, but ReportLab will fall back to Helvetica and Tamil glyphs may not display in the reconstructed PDF.

### `tesseract --list-langs` does not show `tam`

The full executable may be installed while Tamil data is not. If the output lists only `eng` and `osd`, download `tam.traineddata` from the official Tesseract language repository and place it in:

```text
C:\Program Files\Tesseract-OCR\tessdata\tam.traineddata
```

Run PowerShell as Administrator for the copy, then verify:

```powershell
& 'C:\Program Files\Tesseract-OCR\tesseract.exe' --list-langs
```

The output must include both `eng` and `tam`. Restart the FastAPI server after adding the file. If `tam` is still absent, rerun the UB Mannheim installer and select Tamil under its additional language data options.

## Run

```powershell
python -m uvicorn app.main:app --reload
```

Open <http://127.0.0.1:8000>. API documentation is available at `/docs`.

Keep this Uvicorn process running while using the page. If the page is opened with
Live Server or directly as a file, it connects to the API at
`http://127.0.0.1:8000`; it cannot process uploads when the API process is stopped.

The main LandAI website now uses this same OCR service from its **Document AI**
page. Start both services from the project root:

```powershell
# Terminal 1: OCR model service
Set-Location .\OCR
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: LandAI website
Set-Location ..
npm run start
```

If the OCR service is hosted elsewhere, set the website build/runtime variable
`VITE_OCR_API_URL` to its base URL. The Document AI page sends the selected
language and document directly to the real Tesseract model, displays page text
and confidence, and saves any user corrections back to the OCR service.

## API

- `POST /api/ocr/upload` multipart form field `file`, optional `language` (`ta`, `en`, `ta-en`, `auto`)
- `POST /api/ocr/process` JSON `{ "document_id": "..." }`
- `GET /api/ocr/document/{document_id}`
- `GET /api/ocr/document/{document_id}/pages`
- `PUT /api/ocr/document/{document_id}/corrections` JSON `{ "pages": { "1": "corrected text" } }`
- `GET /api/ocr/document/{document_id}/export/pdf?kind=digital`
- `GET /api/ocr/document/{document_id}/export/pdf?kind=searchable`
- `GET /api/ocr/document/{document_id}/export/docx`
- `GET /api/ocr/document/{document_id}/export/txt`

## Testing with representative documents

Use one printed Tamil record, one English record, one mixed-language page, one low-resolution scan, one multi-page PDF, and one table-heavy record. Compare each page against manually verified reference text and report Tamil and English character/word accuracy separately. Verify that no page is missing, Tamil renders in the browser, corrections survive a reload, the searchable PDF selects/searches text, and DOCX opens with Tamil intact.

Known limitations: handwriting, seals, stamps, severe skew, damaged pages, dense tables, and low-resolution images can produce low confidence or incorrect reading order. The UI marks low-confidence and empty pages for human review; it does not certify a legal copy or infer missing values.

## Integration notes

The workspace did not contain an existing LandAI frontend/backend, authentication provider, or database. The included SQLite storage is therefore local and unauthenticated. When the real LandAI application is available, keep the OCR functions and routes but replace `db()` with the existing database/session layer, enforce the current user identity on every document query, and mount the static page in the existing router.
