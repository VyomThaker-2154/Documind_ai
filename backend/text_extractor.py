"""Module for extracting and structuring text content from PDFs."""

import os
from typing import Dict, Any
from PyPDF2 import PdfReader

class TextExtractor:
    """Handles extraction and structuring of textual content from PDFs."""
    
    async def async_extract(self, file_path: str) -> Dict[str, Any]:
        """Extract and structure text content with advanced hierarchy preservation."""
        reader = PdfReader(file_path)
        content = []
        total_pages = len(reader.pages)
        statistics = {
            "total_words": 0,
            "total_paragraphs": 0,
            "total_headings": 0,
            "total_list_items": 0,
            "total_sections": 0,
            "hierarchy_depth": 0,
        }
        
        for page_num, page in enumerate(reader.pages, 1):
            text = page.extract_text()
            if not text:
                continue
                
            lines = text.split('\n')
            page_content = []
            paragraph_buffer = []
            
            for line in lines:
                line = line.strip()
                if not line:
                    if paragraph_buffer:
                        # Process accumulated paragraph
                        paragraph_text = " ".join(paragraph_buffer)
                        page_content.append({
                            "type": "paragraph",
                            "text": paragraph_text
                        })
                        statistics["total_paragraphs"] += 1
                        statistics["total_words"] += len(paragraph_text.split())
                        paragraph_buffer = []
                    continue
                
                if self._is_heading(line):
                    # Process any accumulated paragraph before the heading
                    if paragraph_buffer:
                        paragraph_text = " ".join(paragraph_buffer)
                        page_content.append({
                            "type": "paragraph",
                            "text": paragraph_text
                        })
                        statistics["total_paragraphs"] += 1
                        statistics["total_words"] += len(paragraph_text.split())
                        paragraph_buffer = []
                    
                    # Add the heading
                    page_content.append({
                        "type": "heading",
                        "text": line,
                        "level": self._determine_heading_level(line)
                    })
                    statistics["total_headings"] += 1
                else:
                    paragraph_buffer.append(line)
            
            # Handle any remaining paragraph text
            if paragraph_buffer:
                paragraph_text = " ".join(paragraph_buffer)
                page_content.append({
                    "type": "paragraph",
                    "text": paragraph_text
                })
                statistics["total_paragraphs"] += 1
                statistics["total_words"] += len(paragraph_text.split())
            
            if page_content:
                content.extend(page_content)
        
        return {
            "content": content,
            "statistics": statistics,
            "total_pages": total_pages
        }
    
    def _is_heading(self, line: str) -> bool:
        """Identify if a line is a heading."""
        if not line:
            return False
        line = line.strip()
        # Check for common heading patterns
        if len(line.split()) <= 10 and (
            line.isupper() or
            line.istitle() or
            any(char.isdigit() and char + "." in line for char in "123456789") or
            line.endswith(":") or
            len(line) < 100 and line[0].isupper()
        ):
            return True
        return False

    def _determine_heading_level(self, heading: str) -> int:
        """Determine the hierarchy level of a heading."""
        heading = heading.strip()
        # Basic heading level detection rules
        if any(char.isdigit() and char + "." in heading for char in "123456789"):
            # Count the number of dot-separated numbers
            return len([p for p in heading.split(".") if p and p[0].isdigit()])
        if heading.isupper():
            return 1
        if heading.istitle() and len(heading) < 50:
            return 2
        return 3  # Default level for other types of headings
