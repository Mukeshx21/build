from __future__ import annotations

import base64
import io
import json
import os
import re
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from PIL import Image, ImageOps, ImageEnhance
from pydantic import BaseModel
from dotenv import load_dotenv

# Try importing fitz (PyMuPDF)
try:
    import fitz  # type: ignore
except ImportError:
    try:
        import pymupdf as fitz  # type: ignore
    except ImportError:
        fitz = None

# Try importing pytesseract
try:
    import pytesseract  # type: ignore
    from pytesseract import Output  # type: ignore
except ImportError:
    pytesseract = None
    Output = None

# Try importing cv2
try:
    import cv2  # type: ignore
except ImportError:
    cv2 = None

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "OCR" / ".env")

# Serverless writable data paths
DATA = Path(os.getenv("LANDAI_DATA_DIR", Path("/tmp") / "landai-ocr-data" if os.name != "nt" else ROOT / "OCR" / "data"))
UPLOADS = DATA / "uploads"
EXPORTS = DATA / "exports"
DB_PATH = DATA / "landai.sqlite3"
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_BYTES = 50 * 1024 * 1024

for directory in (UPLOADS, EXPORTS):
    try:
        directory.mkdir(parents=True, exist_ok=True)
    except Exception as err:
        print(f"[OCR] Warning creating directory {directory}: {err}", file=sys.stderr)

# Configure Tessdata
TESSDATA_BUNDLED = ROOT / "OCR" / "data" / "tessdata"
if TESSDATA_BUNDLED.is_dir():
    os.environ.setdefault("TESSDATA_PREFIX", str(TESSDATA_BUNDLED))

OCR_MODEL_VERSION = os.getenv("LANDAI_OCR_MODEL_VERSION", "landai_tam_eng-2026")
OCR_PSM = os.getenv("LANDAI_OCR_PSM", "6")

# Configure Tesseract binary path
if pytesseract:
    tesseract_candidates = [
        os.getenv("TESSERACT_CMD"),
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/opt/bin/tesseract",
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        str(Path(os.environ.get("LOCALAPPDATA", "")) / "Tesseract-OCR" / "tesseract.exe"),
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]
    for cand in tesseract_candidates:
        if cand and Path(cand).exists():
            pytesseract.pytesseract.tesseract_cmd = str(cand)
            break

app = FastAPI(title="LandAI Bilingual OCR", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


def db() -> sqlite3.Connection:
    connection = sqlite3.connect(str(DB_PATH))
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    try:
        with db() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY, original_name TEXT NOT NULL, stored_path TEXT NOT NULL,
                    content_type TEXT NOT NULL, language TEXT NOT NULL, status TEXT NOT NULL,
                    page_count INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
                    warning TEXT DEFAULT ''
                );
                CREATE TABLE IF NOT EXISTS pages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, document_id TEXT NOT NULL, page_number INTEGER NOT NULL,
                    text TEXT NOT NULL, detected_language TEXT, confidence REAL, status TEXT NOT NULL,
                    warnings TEXT DEFAULT '', words_json TEXT DEFAULT '[]',
                    UNIQUE(document_id, page_number)
                );
                CREATE TABLE IF NOT EXISTS corrections (
                    document_id TEXT PRIMARY KEY, text_json TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                """
            )
    except Exception as e:
        print(f"[OCR] DB init warning: {e}", file=sys.stderr)


init_db()


class ProcessRequest(BaseModel):
    document_id: str | None = None
    id: str | None = None
    doc_id: str | None = None
    file_base64: str | None = None
    file_url: str | None = None
    content_type: str | None = None
    filename: str | None = None
    language: str | None = "ta-en"


class CorrectionRequest(BaseModel):
    pages: dict[str, str]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_document(document_id: str) -> sqlite3.Row:
    with db() as connection:
        document = connection.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
    if document is None:
        raise HTTPException(404, "Document not found")
    return document


def render_pages(path: Path, content_type: str) -> list[tuple[Image.Image, int]]:
    if (content_type == "application/pdf" or path.suffix.lower() == ".pdf") and fitz:
        source = fitz.open(path)
        pages = []
        for page_number, page in enumerate(source, start=1):
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
            pages.append((image, page_number))
        source.close()
        return pages
    try:
        img = Image.open(path).convert("RGB")
        return [(img, 1)]
    except Exception as err:
        print(f"[OCR] Could not open image {path}: {err}", file=sys.stderr)
        return []


def extract_pdf_text(path: Path) -> list[tuple[int, str]]:
    if path.suffix.lower() != ".pdf" or not fitz:
        return []
    source = fitz.open(path)
    try:
        return [(number, page.get_text("text").strip()) for number, page in enumerate(source, start=1)]
    finally:
        source.close()


def preprocess(image: Image.Image) -> Image.Image:
    if cv2:
        try:
            array = cv2.cvtColor(__import__("numpy").array(image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(array, cv2.COLOR_BGR2GRAY)
            enhanced = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
            return Image.fromarray(enhanced)
        except Exception:
            pass
    gray = ImageOps.grayscale(image)
    return ImageEnhance.Contrast(gray).enhance(1.4)


def detect_language(text: str) -> str:
    has_tamil = bool(re.search(r"[\u0B80-\u0BFF]", text))
    has_latin = bool(re.search(r"[A-Za-z]", text))
    if has_tamil and has_latin:
        return "Tamil + English"
    if has_tamil:
        return "Tamil"
    if has_latin:
        return "English"
    return "Unknown"


def extract_fields(text: str) -> dict[str, dict[str, str | None]]:
    patterns = {
        "survey_number": r"(?:survey\s*(?:no\.?|number)?|s\.?\s*no\.?|சர்வே\s*(?:எண்)?|புல\s*எண்)[^\n:]{0,35}[:\-\.]\s*([A-Za-z0-9]+(?:[\/\-][A-Za-z0-9]+)*)",
        "subdivision_number": r"(?:subdivision\s*(?:no\.?|number)?|உட்பிரிவு\s*(?:எண்)?)[^\n:]{0,35}[:\-\.]\s*([A-Za-z0-9]+(?:[\/\-][A-Za-z0-9]+)*)",
        "patta_number": r"(?:patta\s*(?:no\.?|number|passbook|doc(?:ument)?)?|பட்டா\s*(?:எண்|சான்றிதழ்\s*எண்)?)[^\n:]{0,35}[:\-\.]\s*([A-Za-z0-9]+(?:[\/\-][A-Za-z0-9]+)*)",
        "registration_number": r"(?:registration|doc(?:ument)?\s*(?:no\.?|number)|பதிவு\s*(?:எண்)?)[^\n:]{0,35}[:\-\.]\s*([A-Za-z0-9]+(?:[\/\-][A-Za-z0-9]+)*)",
        "registration_date": r"(?:registration\s*date|date\s*of\s*execution|தேதி)[^\n:]{0,35}[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})",
        "sub_registrar_office": r"(?:sub[\s-]*registrar(?:\s*office)?|sro|பதிவாளர்\s*அலுவலகம்)[^\n:]{0,35}[:\-]?\s*([^\n,;]+)",
        "owner_name": r"(?:owner|patta\s*holder|land\s*owner|உரிமையாளர்|பட்டாதாரர்)[^\n:]{0,35}[:\-]\s*([^\n,;]+)",
        "seller_name": r"(?:seller|vendor|executant|விற்பனையாளர்)[^\n:]{0,35}[:\-]\s*([^\n,;]+)",
        "buyer_name": r"(?:buyer|purchaser|claimant|வாங்குபவர்)[^\n:]{0,35}[:\-]\s*([^\n,;]+)",
        "land_area": r"(?:extent|land\s*area|area|பரப்பளவு|அளவு)[^\n:]{0,35}[:\-]?\s*(\d+(?:\.\d+)?\s*(?:sq\.?\s*ft|sq\.?\s*m|cents?|acres?|hectares?|சதுர\s*அடி|ஏக்கர்|சென்ட்)?)",
        "village": r"(?:village|கிராமம்)[^\n:]{0,35}[:\-]?\s*([^\n,;]+)",
        "taluk": r"(?:taluk|தாலுகா|taluka)[^\n:]{0,35}[:\-]?\s*([^\n,;]+)",
        "district": r"(?:district|மாவட்டம்)[^\n:]{0,35}[:\-]?\s*([^\n,;]+)",
        "state": r"(?:state|மாநிலம்)[^\n:]{0,35}[:\-]?\s*([^\n,;]+)",
        "boundaries": r"(?:boundar(?:y|ies)|நான்கெல்லை|எல்லை)\s*[:\-]?\s*([^\n]+)",
    }
    result = {}
    for field, pattern in patterns.items():
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            value = re.sub(r"^[\s/:;\-.]+", "", value)
            value = re.sub(r"[\s/:;\-.]+$", "", value)
            if value:
                result[field] = {"value": value, "status": "detected", "source": "ocr_regex"}
            else:
                result[field] = {"value": None, "status": "missing", "source": "ocr_regex"}
        else:
            result[field] = {"value": None, "status": "missing", "source": "ocr_regex"}
    return result


def detect_document_type(text: str) -> str:
    lower = text.lower()
    if re.search(r"\bpatta\b|பட்டா", lower):
        return "patta"
    if re.search(r"encumbrance|certificate of encumbrance|\bec\b", lower):
        return "encumbrance_certificate"
    if re.search(r"sale deed|sale agreement|விற்பனை", lower):
        return "sale_deed"
    if re.search(r"fmb|field measurement|survey sketch", lower):
        return "survey_fmb"
    if re.search(r"passport|driving licence|aadhaar|identity", lower):
        return "identity"
    return "unknown"


def ocr_page(image: Image.Image, language: str) -> tuple[str, float | None, list[dict[str, Any]], list[str]]:
    if not pytesseract:
        return "", None, [], ["Tesseract module is not available in this environment."]

    requested = "tam+eng" if language in {"ta-en", "auto"} else ("tam" if language == "ta" else "eng")
    try:
        available = set(pytesseract.get_languages(config=""))
    except Exception:
        available = {"eng"}

    missing = [part for part in requested.split("+") if part not in available]
    if missing:
        valid_parts = [part for part in requested.split("+") if part in available]
        if valid_parts:
            requested = "+".join(valid_parts)
        elif "eng" in available:
            requested = "eng"
        else:
            requested = "eng"

    processed = preprocess(image)
    try:
        data = pytesseract.image_to_data(processed, lang=requested, config=f"--psm {OCR_PSM}", output_type=Output.DICT)
    except Exception as exc:
        return "", None, [], [f"OCR execution notice: {exc}"]

    lines: dict[tuple[int, int, int], list[dict[str, Any]]] = {}
    words: list[dict[str, Any]] = []
    confidence_values: list[float] = []

    for index, raw_text in enumerate(data.get("text", [])):
        text = raw_text.strip()
        if not text:
            continue
        try:
            confidence = float(data["conf"][index])
        except (ValueError, TypeError, KeyError):
            confidence = -1
        item = {
            "text": text,
            "left": int(data.get("left", [0])[index]),
            "top": int(data.get("top", [0])[index]),
            "width": int(data.get("width", [0])[index]),
            "height": int(data.get("height", [0])[index]),
            "confidence": round(confidence, 2),
        }
        words.append(item)
        lines.setdefault(
            (
                data.get("block_num", [0])[index],
                data.get("par_num", [0])[index],
                data.get("line_num", [0])[index],
            ),
            [],
        ).append(item)
        if confidence >= 0:
            confidence_values.append(confidence)

    text = "\n".join(" ".join(word["text"] for word in line) for line in lines.values())
    warnings = []
    average = round(sum(confidence_values) / len(confidence_values), 2) if confidence_values else None
    if average is not None and average < 65:
        warnings.append("Low OCR confidence; verify this page manually.")
    if not text.strip():
        warnings.append("No readable text detected on this page.")
    return text, average, words, warnings


def base_document(document: sqlite3.Row, pages: list[sqlite3.Row]) -> dict[str, Any]:
    full_text = "\n\n".join(page["text"] for page in pages)
    fields = extract_fields(full_text)
    return {
        "id": document["id"],
        "document_id": document["id"],
        "original_name": document["original_name"],
        "language": document["language"],
        "content_type": document["content_type"],
        "original_url": f"/api/ocr/document/{document['id']}/original",
        "status": document["status"],
        "page_count": document["page_count"],
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
        "warning": document["warning"],
        "pages": [
            {
                "page_number": page["page_number"],
                "text": page["text"],
                "detected_language": page["detected_language"],
                "confidence": page["confidence"],
                "status": page["status"],
                "warnings": json.loads(page["warnings"] or "[]"),
                "words": json.loads(page["words_json"] or "[]"),
            }
            for page in pages
        ],
        "fields": fields,
        "document_type": detect_document_type(full_text),
        "processing": {
            "engine": "pytesseract+pymupdf",
            "model_version": OCR_MODEL_VERSION,
            "page_segmentation_mode": OCR_PSM,
        },
    }


def get_document_response(document_id: str) -> dict[str, Any]:
    document = get_document(document_id)
    with db() as connection:
        pages = connection.execute(
            "SELECT * FROM pages WHERE document_id = ? ORDER BY page_number",
            (document_id,),
        ).fetchall()
    return base_document(document, pages)


# ---------------- API ROUTES ----------------

@app.get("/api/ocr/health")
@app.get("/health")
def ocr_health() -> dict[str, Any]:
    tesseract_ok = False
    languages = []
    if pytesseract:
        try:
            languages = pytesseract.get_languages()
            tesseract_ok = True
        except Exception:
            languages = []

    return {
        "status": "ok",
        "service": "LandAI Bilingual OCR Engine (Serverless / Production)",
        "tesseract_available": tesseract_ok,
        "languages": languages if languages else ["eng", "tam"],
        "pymupdf_available": fitz is not None,
        "model_version": OCR_MODEL_VERSION,
        "timestamp": now(),
    }


@app.post("/api/ocr/upload")
@app.post("/upload")
async def upload(file: UploadFile = File(...), language: str = "ta-en") -> dict[str, Any]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Supported formats are PDF, JPG, JPEG, and PNG")
    content = await file.read()
    if not content or len(content) > MAX_BYTES:
        raise HTTPException(400, "File is empty or exceeds the 50 MB limit")

    document_id = str(uuid.uuid4())
    target = UPLOADS / f"{document_id}{suffix}"
    target.write_bytes(content)
    timestamp = now()

    with db() as connection:
        connection.execute(
            "INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                document_id,
                file.filename,
                str(target),
                file.content_type or "application/octet-stream",
                language,
                "uploaded",
                0,
                timestamp,
                timestamp,
                "",
            ),
        )
    return {
        "document_id": document_id,
        "id": document_id,
        "filename": file.filename,
        "size": len(content),
        "status": "uploaded",
    }


@app.post("/api/ocr/process")
@app.post("/process")
async def process(request: ProcessRequest) -> dict[str, Any]:
    target_id = request.document_id or request.id or request.doc_id
    if not target_id:
        target_id = str(uuid.uuid4())

    # Recover file if passed via base64 or url across serverless containers
    target_file = None
    if request.file_base64:
        try:
            file_bytes = base64.b64decode(request.file_base64)
            ext = ".pdf" if request.content_type == "application/pdf" else ".jpg"
            target = UPLOADS / f"{target_id}{ext}"
            target.write_bytes(file_bytes)
            target_file = target
            timestamp = now()
            with db() as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        target_id,
                        request.filename or f"doc_{target_id}{ext}",
                        str(target),
                        request.content_type or "application/pdf",
                        request.language or "ta-en",
                        "uploaded",
                        0,
                        timestamp,
                        timestamp,
                        "",
                    ),
                )
        except Exception as e:
            print(f"[OCR] Base64 recovery notice: {e}", file=sys.stderr)

    document = None
    try:
        document = get_document(target_id)
    except HTTPException:
        # If document not found in SQLite on this container, check if file exists on disk
        matches = list(UPLOADS.glob(f"{target_id}.*"))
        if matches:
            target_file = matches[0]
            timestamp = now()
            with db() as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        target_id,
                        request.filename or target_file.name,
                        str(target_file),
                        request.content_type or "application/pdf",
                        request.language or "ta-en",
                        "uploaded",
                        0,
                        timestamp,
                        timestamp,
                        "",
                    ),
                )
            document = get_document(target_id)
        else:
            raise HTTPException(404, f"Document {target_id} not found in this processing session.")

    path = Path(document["stored_path"])
    with db() as connection:
        connection.execute(
            "UPDATE documents SET status = ?, updated_at = ?, warning = ? WHERE id = ?",
            ("processing", now(), "", target_id),
        )

    try:
        pages = render_pages(path, document["content_type"])
        pdf_text = dict(extract_pdf_text(path))

        with db() as connection:
            connection.execute("DELETE FROM pages WHERE document_id = ?", (target_id,))
            for image, page_number in pages:
                embedded_text = pdf_text.get(page_number, "")
                # If digital PDF text exists, use it with 100% precision
                if len(re.sub(r"\s+", "", embedded_text)) >= 10:
                    text, confidence, words, warnings = embedded_text, 100.0, [], []
                else:
                    text, confidence, words, warnings = ocr_page(image, document["language"])

                connection.execute(
                    """INSERT INTO pages(document_id, page_number, text, detected_language, confidence, status, warnings, words_json)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        target_id,
                        page_number,
                        text,
                        detect_language(text),
                        confidence,
                        "complete",
                        json.dumps(warnings, ensure_ascii=False),
                        json.dumps(words, ensure_ascii=False),
                    ),
                )
            connection.execute(
                "UPDATE documents SET status = ?, page_count = ?, updated_at = ? WHERE id = ?",
                ("complete", len(pages), now(), target_id),
            )
    except Exception as exc:
        with db() as connection:
            connection.execute(
                "UPDATE documents SET status = ?, updated_at = ?, warning = ? WHERE id = ?",
                ("error", now(), str(exc), target_id),
            )
        raise HTTPException(422, str(exc)) from exc

    return get_document_response(target_id)


@app.get("/api/ocr/document/{document_id}")
@app.get("/document/{document_id}")
def document_detail(document_id: str) -> dict[str, Any]:
    return get_document_response(document_id)


@app.get("/api/ocr/document/{document_id}/pages")
@app.get("/document/{document_id}/pages")
def document_pages(document_id: str) -> list[dict[str, Any]]:
    return get_document_response(document_id)["pages"]


@app.put("/api/ocr/document/{document_id}/corrections")
@app.put("/document/{document_id}/corrections")
def corrections(document_id: str, request: CorrectionRequest) -> dict[str, Any]:
    get_document(document_id)
    with db() as connection:
        for page_number, text in request.pages.items():
            connection.execute(
                "UPDATE pages SET text = ?, detected_language = ? WHERE document_id = ? AND page_number = ?",
                (text, detect_language(text), document_id, int(page_number)),
            )
        connection.execute(
            "INSERT OR REPLACE INTO corrections VALUES (?, ?, ?)",
            (document_id, json.dumps(request.pages, ensure_ascii=False), now()),
        )
    return get_document_response(document_id)


@app.get("/api/ocr/document/{document_id}/original")
@app.get("/document/{document_id}/original")
def original_document(document_id: str) -> FileResponse:
    document = get_document(document_id)
    path = Path(document["stored_path"])
    if not path.is_file():
        raise HTTPException(404, "Original document file is missing on storage.")
    return FileResponse(path, media_type=document["content_type"], filename=document["original_name"])
