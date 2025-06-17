"""Module for extracting and structuring table content from PDFs."""

import os
import json
from typing import Dict, Any, List
import pdfplumber
from langchain_groq import ChatGroq

class TableExtractor:
    """Handles extraction and structuring of table content from PDFs."""
    
    def __init__(self, model_name: str, groq_api_key: str):
        """Initialize with model configuration."""
        self.model_name = model_name
        self.groq_api_key = groq_api_key
        self.llm = ChatGroq(
            temperature=0.2,
            model_name=model_name,
            groq_api_key=groq_api_key
        )
        self.table_settings = {
            'vertical_strategy': 'text',
            'horizontal_strategy': 'text',
            'snap_tolerance': 3,
            'join_tolerance': 3,
            'edge_min_length': 3,
            'min_words_vertical': 3,
            'min_words_horizontal': 1,
            'intersection_x_tolerance': 3,
            'intersection_y_tolerance': 3
        }

    async def async_extract(self, file_path: str) -> Dict[str, Any]:
        """Extract and structure table content using LLM."""
        tables = []
        
        try:
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    page_tables = page.extract_tables()
                    
                    for table_num, table in enumerate(page_tables, 1):
                        if not table:
                            continue
                        
                        # Convert raw table to text format for LLM
                        table_text = self._format_table_for_llm(table)
                        
                        # Process with LLM for structure
                        structured_table = await self._process_table_with_llm(table_text)
                        
                        if structured_table["success"]:
                            tables.append({
                                "page_number": page_num,
                                "table_number": table_num,
                                "structured_data": structured_table["structured_data"],
                                "metadata": {
                                    "row_count": len(table),
                                    "column_count": len(table[0]) if table else 0
                                }
                            })
            
            return {"tables": tables}
            
        except Exception as e:
            print(f"Error extracting tables: {str(e)}")
            return {"tables": []}

    def _format_table_for_llm(self, table: List[List[str]]) -> str:
        """Format table data for LLM processing."""
        formatted_rows = []
        for row in table:
            cleaned_row = [str(cell).strip() if cell else "" for cell in row]
            if any(cleaned_row):  # Skip empty rows
                formatted_rows.append(" | ".join(cleaned_row))
        return "\n".join(formatted_rows)

    async def _process_table_with_llm(self, table_text: str) -> Dict[str, Any]:
        """Process table text with LLM for structured understanding."""
        try:
            prompt = f"""Please analyze this table data and convert it into a structured format.
            Focus on identifying headers and organizing the data appropriately.

            Table Data:
            {table_text}

            Convert this into a structured format with clear headers and data rows.
            Return only the JSON structure without any explanation."""

            response = await self.llm.ainvoke(prompt)
            
            try:
                # Try to parse the response as JSON
                structured_data = json.loads(response.content)
                return {"success": True, "structured_data": structured_data}
            except json.JSONDecodeError:
                # If response isn't valid JSON, return a simplified structure
                return {
                    "success": True,
                    "structured_data": {
                        "raw_text": table_text,
                        "rows": table_text.split("\n")
                    }
                }
                
        except Exception as e:
            print(f"Error processing table with LLM: {str(e)}")
            return {"success": False, "structured_data": {"error": str(e)}}
