"""FastAPI backend for PDF processing and question answering."""

import os
import tempfile
from typing import Dict, Any, List
from datetime import datetime
import asyncio

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app import PDFProcessor

# Initialize FastAPI app
app = FastAPI(title="PDF Chat API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state (one PDF at a time per session)
pdf_processor = PDFProcessor()
chat_history: List[tuple[str, str]] = []

# Create directory for storing extracted data
STORAGE_DIR = os.path.join(os.path.dirname(__file__), "extracted_data")
os.makedirs(STORAGE_DIR, exist_ok=True)

class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    question: str

@app.post("/upload")
async def upload_pdf_endpoint(file: UploadFile = File(...)):
    """Handle PDF upload and processing."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Check file size
    MAX_SIZE = 10 * 1024 * 1024  # 10 MB
    file_size = 0
    tmp_path = None
    
    try:
        # Create temp file with proper cleanup
        tmp_dir = tempfile.mkdtemp()
        tmp_path = os.path.join(tmp_dir, f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
        
        # Read and validate file size while saving
        with open(tmp_path, 'wb') as tmp:
            while chunk := await file.read(1024 * 1024):  # Read 1MB at a time
                file_size += len(chunk)
                if file_size > MAX_SIZE:
                    raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
                tmp.write(chunk)
                await asyncio.sleep(0)  # Allow other tasks to run

        # Process PDF and extract content
        global pdf_processor, chat_history
        extracted_data = await pdf_processor.process_pdf(tmp_path)
        chat_history = []

        if "error" in extracted_data:
            raise HTTPException(status_code=500, detail=extracted_data["error"])

        # Save extracted data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_filename = f"{os.path.splitext(file.filename)[0]}_{timestamp}.json"
        json_path = os.path.join(STORAGE_DIR, json_filename)

        with open(json_path, 'w', encoding='utf-8') as f:
            import json
            json.dump(extracted_data, f, ensure_ascii=False, indent=2)

        # Prepare detailed content summary
        text_stats = extracted_data.get("text", {}).get("statistics", {})
        table_stats = [table.get("metadata", {}) for table in extracted_data.get("tables", [])]
        visual_stats = extracted_data.get("visual_elements", {}).get("statistics", {})

        return {
            "status": "success",
            "message": "PDF processed successfully. Ready for questions.",
            "extracted_data_path": json_path,
            "content_summary": {
                "metadata": extracted_data.get("metadata", {}),
                "text_content": {
                    "total_pages": extracted_data.get("metadata", {}).get("total_pages", 0),
                    "total_words": text_stats.get("total_words", 0),
                    "total_paragraphs": text_stats.get("total_paragraphs", 0),
                    "total_headings": text_stats.get("total_headings", 0),
                    "total_sections": text_stats.get("total_sections", 0),
                    "hierarchy_depth": text_stats.get("hierarchy_depth", 0)
                },
                "tables": {
                    "total_tables": len(table_stats),
                    "tables_by_page": {str(table["page_number"]): table["row_count"] 
                                     for table in table_stats if "page_number" in table}
                },
                "visual_elements": {
                    "total_images": visual_stats.get("total_images", 0),
                    "total_graphs": visual_stats.get("total_graphs", 0),
                    "total_text_extracted": visual_stats.get("total_text_extracted", 0)
                }
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"Error processing upload: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
        
    finally:
        # Clean up temporary files
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
                os.rmdir(os.path.dirname(tmp_path))
            except Exception as e:
                print(f"Error cleaning up temporary files: {str(e)}")

@app.post("/chat")
async def chat_endpoint(payload: ChatRequest):
    """Answer questions about the processed PDF."""
    global pdf_processor, chat_history
    
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        response = await pdf_processor.ask_question(question, chat_history)
        chat_history.append((question, response["answer"]))
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
