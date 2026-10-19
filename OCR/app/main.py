from __future__ import annotations

import io
import json
import os
import re
import shutil
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cv2
import fitz
import pytesseract
from docx import Document as WordDocument
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel
from pytesseract import Output
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
UPLOADS = DATA / "uploads"
EXPORTS = DATA / "exports"
DB_PATH = DATA / "landai.sqlite3"
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_BYTES = 50 * 1024 * 1024
TAMIL_FONT_PATH = os.getenv("LANDAI_TAMIL_FONT", r"C:\Windows\Fonts\NotoSansTamil-Regular.ttf")
TESSDATA_DIR = Path(os.getenv("TESSDATA_DIR", str(DATA / "tessdata")))
OCR_MODEL_VERSION = os.getenv("LANDAI_OCR_MODEL_VERSION", "tesseract-default")
OCR_PSM = os.getenv("LANDAI_OCR_PSM", "6")
if os.getenv("TESSERACT_CMD"):
    pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]
else:
    tesseract_candidates = [
        Path(os.environ.get("LOCALAPPDATA", "")) / "Tesseract-OCR" / "tesseract.exe",
        Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe"),
        Path(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"),
    ]
    for tesseract_path in tesseract_candidates:
        if tesseract_path.exists():
            pytesseract.pytesseract.tesseract_cmd = str(tesseract_path)
            break
if TESSDATA_DIR.is_dir():
    os.environ["TESSDATA_PREFIX"] = str(TESSDATA_DIR)
REPORT_FONT = "Helvetica"
if Path(TAMIL_FONT_PATH).exists():
    pdfmetrics.registerFont(TTFont("LandAITamil", TAMIL_FONT_PATH))
    REPORT_FONT = "LandAITamil"

for directory in (UPLOADS, EXPORTS):
    directory.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="LandAI Bilingual OCR", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)
app.mount("/static", StaticFiles(directory=ROOT / "app" / "static"), name="static")

@app.get("/api/ocr/health")
def ocr_health() -> dict[str, Any]:
    try:
        languages = pytesseract.get_languages()
        tesseract_ok = True
    except Exception as e:
        languages = []
        tesseract_ok = False
    return {
        "status": "ok" if tesseract_ok else "degraded",
        "service": "LandAI Bilingual OCR Engine",
        "tesseract_cmd": getattr(pytesseract.pytesseract, "tesseract_cmd", "tesseract"),
        "languages": languages,
        "model_version": OCR_MODEL_VERSION,
        "timestamp": now(),
    }



def db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
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


init_db()


class ProcessRequest(BaseModel):
    document_id: str


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
    if content_type == "application/pdf" or path.suffix.lower() == ".pdf":
        source = fitz.open(path)
        pages = []
        for page_number, page in enumerate(source, start=1):
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)
            pages.append((image, page_number))
        source.close()
        return pages
    return [(Image.open(path).convert("RGB"), 1)]


def preprocess(image: Image.Image) -> Image.Image:
    array = cv2.cvtColor(__import__("numpy").array(image), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(array, cv2.COLOR_BGR2GRAY)
    # Keep grayscale and contrast enhancement gentle so Tamil glyphs and punctuation survive.
    enhanced = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    return Image.fromarray(enhanced)


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


def ocr_page(image: Image.Image, language: str) -> tuple[str, float | None, list[dict[str, Any]], list[str]]:
    requested = "tam+eng" if language in {"ta-en", "auto"} else ("tam" if language == "ta" else "eng")
    try:
        available = set(pytesseract.get_languages(config=""))
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError("Tesseract is not installed or is not on PATH") from exc
    missing = [part for part in requested.split("+") if part not in available]
    if missing:
        raise RuntimeError(f"Tesseract language data missing: {', '.join(missing)}")
    processed = preprocess(image)
    data = pytesseract.image_to_data(processed, lang=requested, config=f"--psm {OCR_PSM}", output_type=Output.DICT)
    lines: dict[tuple[int, int, int], list[dict[str, Any]]] = {}
    words: list[dict[str, Any]] = []
    confidence_values: list[float] = []
    for index, raw_text in enumerate(data["text"]):
        text = raw_text.strip()
        if not text:
            continue
        try:
            confidence = float(data["conf"][index])
        except (ValueError, TypeError):
            confidence = -1
        item = {
            "text": text,
            "left": int(data["left"][index]), "top": int(data["top"][index]),
            "width": int(data["width"][index]), "height": int(data["height"][index]),
            "confidence": round(confidence, 2),
        }
        words.append(item)
        lines.setdefault((data["block_num"][index], data["par_num"][index], data["line_num"][index]), []).append(item)
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
        "id": document["id"], "original_name": document["original_name"], "language": document["language"],
        "content_type": document["content_type"], "original_url": f"/api/ocr/document/{document['id']}/original",
        "status": document["status"], "page_count": document["page_count"], "created_at": document["created_at"],
        "updated_at": document["updated_at"], "warning": document["warning"], "pages": [
            {"page_number": page["page_number"], "text": page["text"], "detected_language": page["detected_language"],
             "confidence": page["confidence"], "status": page["status"], "warnings": json.loads(page["warnings"] or "[]"),
             "words": json.loads(page["words_json"] or "[]")} for page in pages
        ], "fields": fields, "processing": {
            "engine": "tesseract",
            "model_version": OCR_MODEL_VERSION,
            "tessdata_dir": str(TESSDATA_DIR),
            "page_segmentation_mode": OCR_PSM,
        },
    }


def extract_fields(text: str) -> dict[str, dict[str, str | None]]:
    patterns = {
        "survey_number": r"(?:survey|s\.?\s*no|சர்வே|புல எண்|subdivision|உட்பிரிவு)\s*(?:no\.?|number|எண்)?\s*[:\-]?\s*([^\n,;]+)",
        "patta_number": r"(?:patta|பட்டா)\s*(?:no\.?|number|எண்)?\s*[:\-]?\s*([^\n,;]+)",
        "registration_number": r"(?:registration|பதிவு)\s*(?:no\.?|number|எண்)?\s*[:\-]?\s*([^\n,;]+)",
        "registration_date": r"(?:date|தேதி)\s*[:\-]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})",
        "land_area": r"(?:extent|area|பரப்பளவு|hectare|acre|சென்ட்)\s*[:\-]?\s*([^\n,;]+)",
        "village": r"(?:village|கிராமம்)\s*[:\-]?\s*([^\n,;]+)",
        "taluk": r"(?:taluk|தாலுகா|taluka)\s*[:\-]?\s*([^\n,;]+)",
        "district": r"(?:district|மாவட்டம்)\s*[:\-]?\s*([^\n,;]+)",
        "state": r"(?:state|மாநிலம்)\s*[:\-]?\s*([^\n,;]+)",
        "owner_name": r"(?:owner|patta\s*holder|பெயர்|உரிமையாளர்|பட்டாதாரர்)\s*(?:name|பெயர்)?\s*[:\-]?\s*([^\n,;]+)",
        "boundaries": r"(?:boundar(?:y|ies)|எல்லை)\s*[:\-]?\s*([^\n]+)",
    }
    result = {}
    for field, pattern in patterns.items():
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            # Never invent values — only keep what matched in source text
            result[field] = {"value": value, "status": "detected", "source": "ocr_regex"}
        else:
            result[field] = {"value": None, "status": "missing", "source": "ocr_regex"}
    return result


@app.get("/", include_in_schema=False)
def home() -> FileResponse:
    return FileResponse(ROOT / "app" / "static" / "index.html")


@app.post("/api/ocr/upload")
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
            (document_id, file.filename, str(target), file.content_type or "application/octet-stream", language,
             "uploaded", 0, timestamp, timestamp, ""),
        )
    return {"document_id": document_id, "filename": file.filename, "size": len(content), "status": "uploaded"}


@app.post("/api/ocr/process")
def process(request: ProcessRequest) -> dict[str, Any]:
    document = get_document(request.document_id)
    if document["status"] == "processing":
        raise HTTPException(409, "Document is already processing")
    path = Path(document["stored_path"])
    with db() as connection:
        connection.execute("UPDATE documents SET status = ?, updated_at = ?, warning = ? WHERE id = ?", ("processing", now(), "", request.document_id))
    try:
        pages = render_pages(path, document["content_type"])
        with db() as connection:
            connection.execute("DELETE FROM pages WHERE document_id = ?", (request.document_id,))
            for image, page_number in pages:
                text, confidence, words, warnings = ocr_page(image, document["language"])
                connection.execute(
                    "INSERT INTO pages(document_id, page_number, text, detected_language, confidence, status, warnings, words_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (request.document_id, page_number, text, detect_language(text), confidence, "complete", json.dumps(warnings, ensure_ascii=False), json.dumps(words, ensure_ascii=False)),
                )
            connection.execute("UPDATE documents SET status = ?, page_count = ?, updated_at = ? WHERE id = ?", ("complete", len(pages), now(), request.document_id))
    except Exception as exc:
        with db() as connection:
            connection.execute("UPDATE documents SET status = ?, updated_at = ?, warning = ? WHERE id = ?", ("error", now(), str(exc), request.document_id))
        raise HTTPException(422, str(exc)) from exc
    return get_document_response(request.document_id)


def get_document_response(document_id: str) -> dict[str, Any]:
    document = get_document(document_id)
    with db() as connection:
        pages = connection.execute("SELECT * FROM pages WHERE document_id = ? ORDER BY page_number", (document_id,)).fetchall()
    return base_document(document, pages)


@app.get("/api/ocr/document/{document_id}")
def document_detail(document_id: str) -> dict[str, Any]:
    return get_document_response(document_id)


@app.get("/api/ocr/document/{document_id}/pages")
def document_pages(document_id: str) -> list[dict[str, Any]]:
    return get_document_response(document_id)["pages"]


@app.put("/api/ocr/document/{document_id}/corrections")
def corrections(document_id: str, request: CorrectionRequest) -> dict[str, Any]:
    get_document(document_id)
    with db() as connection:
        for page_number, text in request.pages.items():
            connection.execute("UPDATE pages SET text = ?, detected_language = ? WHERE document_id = ? AND page_number = ?", (text, detect_language(text), document_id, int(page_number)))
        connection.execute("INSERT OR REPLACE INTO corrections VALUES (?, ?, ?)", (document_id, json.dumps(request.pages, ensure_ascii=False), now()))
        connection.execute("UPDATE documents SET updated_at = ? WHERE id = ?", (now(), document_id))
    return get_document_response(document_id)


def safe_export_name(document: sqlite3.Row, extension: str) -> str:
    stem = re.sub(r"[^A-Za-z0-9_-]+", "_", Path(document["original_name"]).stem).strip("_") or "land-document"
    return f"{stem}-landai.{extension}"


def export_text(document_id: str) -> str:
    return "\n\n".join(page["text"] for page in get_document_response(document_id)["pages"])


@app.get("/api/ocr/document/{document_id}/export/txt")
def export_txt(document_id: str) -> StreamingResponse:
    document = get_document(document_id)
    return StreamingResponse(io.BytesIO(export_text(document_id).encode("utf-8")), media_type="text/plain; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="{safe_export_name(document, "txt")}"'})


@app.get("/api/ocr/document/{document_id}/export/json")
def export_json(document_id: str) -> StreamingResponse:
    document = get_document(document_id)
    payload = json.dumps(get_document_response(document_id), ensure_ascii=False, indent=2).encode("utf-8")
    return StreamingResponse(io.BytesIO(payload), media_type="application/json", headers={"Content-Disposition": f'attachment; filename="{safe_export_name(document, "json")}"'})


@app.get("/api/ocr/document/{document_id}/export/docx")
def export_docx(document_id: str) -> StreamingResponse:
    document_row = get_document(document_id)
    word = WordDocument()
    word.add_heading("Land Document Transcription", 0)
    word.add_paragraph("OCR transcription generated by LandAI. This is not a certified legal copy.")
    for page in get_document_response(document_id)["pages"]:
        word.add_heading(f"Page {page['page_number']}", level=1)
        for paragraph in page["text"].splitlines() or [""]:
            word.add_paragraph(paragraph)
    stream = io.BytesIO()
    word.save(stream)
    stream.seek(0)
    return StreamingResponse(stream, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": f'attachment; filename="{safe_export_name(document_row, "docx")}"'})


@app.get("/api/ocr/document/{document_id}/export/pdf")
def export_pdf(document_id: str, kind: str = "digital") -> StreamingResponse:
    document_row = get_document(document_id)
    response = get_document_response(document_id)
    if kind == "original":
        return FileResponse(document_row["stored_path"], media_type=document_row["content_type"], filename=safe_export_name(document_row, "pdf"))
    if kind == "searchable":
        return searchable_pdf(document_row, response)
    stream = io.BytesIO()
    pdf = canvas.Canvas(stream, pagesize=A4)
    width, height = A4
    pdf.setTitle("LandAI Digital Transcription")
    for page in response["pages"]:
        pdf.setFont(REPORT_FONT, 10)
        pdf.drawString(50, height - 45, f"LandAI transcription - Page {page['page_number']}")
        y = height - 75
        for line in page["text"].splitlines() or [""]:
            if y < 50:
                pdf.showPage(); pdf.setFont(REPORT_FONT, 10); y = height - 50
            pdf.drawString(50, y, line[:110])
            y -= 15
        pdf.showPage()
    pdf.save(); stream.seek(0)
    return StreamingResponse(stream, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{safe_export_name(document_row, "pdf")}"'})


def searchable_pdf(document: sqlite3.Row, response: dict[str, Any]) -> StreamingResponse:
    source = Path(document["stored_path"])
    output = EXPORTS / f"{document['id']}-searchable.pdf"
    if source.suffix.lower() == ".pdf":
        pdf = fitz.open(source)
        for page_data in response["pages"]:
            page = pdf[page_data["page_number"] - 1]
            for word in page_data["words"]:
                rectangle = fitz.Rect(word["left"] / 2, word["top"] / 2, (word["left"] + word["width"]) / 2, (word["top"] + word["height"]) / 2)
                page.insert_textbox(rectangle, word["text"], fontsize=max(5, rectangle.height * .8), render_mode=3, fontname="helv")
        pdf.save(output, garbage=4, deflate=True)
        pdf.close()
    else:
        pages = render_pages(source, document["content_type"])
        pdf = fitz.open()
        for image, page_number in pages:
            page = pdf.new_page(width=image.width / 2, height=image.height / 2)
            image_stream = io.BytesIO(); image.save(image_stream, format="PNG")
            page.insert_image(page.rect, stream=image_stream.getvalue())
            for word in response["pages"][page_number - 1]["words"]:
                rectangle = fitz.Rect(word["left"] / 2, word["top"] / 2, (word["left"] + word["width"]) / 2, (word["top"] + word["height"]) / 2)
                page.insert_textbox(rectangle, word["text"], fontsize=max(5, rectangle.height * .8), render_mode=3, fontname="helv")
        pdf.save(output, garbage=4, deflate=True); pdf.close()
    return FileResponse(output, media_type="application/pdf", filename=safe_export_name(document, "pdf"))


@app.get("/api/ocr/document/{document_id}/original")
def original(document_id: str) -> FileResponse:
    document = get_document(document_id)
    return FileResponse(document["stored_path"], media_type=document["content_type"], filename=document["original_name"])
