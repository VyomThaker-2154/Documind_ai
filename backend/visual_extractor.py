"""Module for extracting and processing visual content from PDFs."""

import os
from typing import Dict, Any, Optional
import numpy as np
import cv2
from PIL import Image
import pytesseract
from pdf2image import convert_from_path

class VisualExtractor:
    """Handles extraction and processing of images and graphs from PDFs."""
    
    def __init__(self, ocr_dpi: int = 300):
        """Initialize with OCR configuration."""
        self.ocr_dpi = ocr_dpi
        self.ocr_config = {
            'text': '--oem 3 --psm 6',
            'graph': '--oem 3 --psm 6 -c tessedit_char_whitelist="0123456789.%-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"',
            'table': '--oem 3 --psm 6 -c preserve_interword_spaces=1'
        }

    async def async_extract(self, file_path: str) -> Dict[str, Any]:
        """Extract and process images and graphs with OCR."""
        try:
            images = convert_from_path(file_path, dpi=self.ocr_dpi)
            visual_elements = {
                "images": [],
                "graphs": [],
                "statistics": {
                    "total_images": 0,
                    "total_graphs": 0,
                    "total_text_extracted": 0
                }
            }
            
            for page_num, img in enumerate(images, 1):
                # Convert PIL Image to numpy array for OpenCV processing
                img_array = np.array(img)
                # Check if image contains a graph
                graph_data = self._detect_and_process_graph(img_array)
                
                if graph_data:
                    # Process graph
                    graph_text = self._extract_text_from_region(img, self.ocr_config['graph'])
                    visual_elements["graphs"].append({
                        "page_number": page_num,
                        "graph_data": graph_data,
                        "extracted_text": graph_text,
                        "type": graph_data["graph_type"]
                    })
                    visual_elements["statistics"]["total_graphs"] += 1
                    visual_elements["statistics"]["total_text_extracted"] += len(graph_text.split())
                else:
                    # Process as regular image
                    ocr_text = self._extract_text_from_region(img, self.ocr_config['text'])
                    if ocr_text.strip():
                        visual_elements["images"].append({
                            "page_number": page_num,
                            "extracted_text": ocr_text,
                            "word_count": len(ocr_text.split()),
                            "type": "image"
                        })
                        visual_elements["statistics"]["total_images"] += 1
                        visual_elements["statistics"]["total_text_extracted"] += len(ocr_text.split())
            
            return visual_elements
            
        except Exception as e:
            print(f"Error extracting visual elements: {str(e)}")
            return {
                "images": [],
                "graphs": [],
                "statistics": {
                    "total_images": 0,
                    "total_graphs": 0,
                    "total_text_extracted": 0,
                    "error": str(e)
                }
            }

    def _extract_text_from_region(self, image: Image.Image, config: str) -> str:
        """Extract text from an image region using OCR."""
        try:
            return pytesseract.image_to_string(image, config=config).strip()
        except Exception as e:
            print(f"OCR error: {str(e)}")
            return ""

    def _detect_and_process_graph(self, image: np.ndarray) -> Optional[Dict[str, Any]]:
        """Detect and analyze graph elements in the image."""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            
            # Detect lines using Hough transform
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10)
            
            if lines is None:
                return None
                
            horizontal_lines = []
            vertical_lines = []
            
            # Analyze line orientations
            for line in lines:
                x1, y1, x2, y2 = line[0]
                angle = abs(np.arctan2(y2-y1, x2-x1) * 180 / np.pi)
                
                # Classify lines as horizontal or vertical
                if angle < 10 or angle > 170:
                    horizontal_lines.append((x1, y1, x2, y2))
                elif 80 < angle < 100:
                    vertical_lines.append((x1, y1, x2, y2))
            
            # Check for sufficient graph elements
            if len(horizontal_lines) >= 2 and len(vertical_lines) >= 2:
                # Determine graph type based on structure
                graph_type = self._determine_graph_type(horizontal_lines, vertical_lines)
                return {
                    "graph_type": graph_type,
                    "axes": {
                        "horizontal": len(horizontal_lines),
                        "vertical": len(vertical_lines)
                    }
                }
                
            return None
            
        except Exception as e:
            print(f"Graph detection error: {str(e)}")
            return None

    def _determine_graph_type(self, horizontal_lines: list, vertical_lines: list) -> str:
        """Determine the type of graph based on detected elements."""
        try:
            # Calculate average spacing between lines
            v_spacing = np.mean([abs(v1[0] - v2[0]) for v1, v2 in zip(vertical_lines[:-1], vertical_lines[1:])])
            h_spacing = np.mean([abs(h1[1] - h2[1]) for h1, h2 in zip(horizontal_lines[:-1], horizontal_lines[1:])])
            
            if abs(v_spacing - h_spacing) < 10:
                return "grid_chart"
            elif len(vertical_lines) > len(horizontal_lines):
                return "bar_chart"
            else:
                return "line_graph"
                
        except Exception as e:
            print(f"Graph type determination error: {str(e)}")
            return "unknown_graph_type"
