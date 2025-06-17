# Standard library imports
import os
from typing import List, Dict, Any, Tuple
import json
from datetime import datetime
import asyncio
from functools import lru_cache
from pathlib import Path
import re

# Local imports
from text_extractor import TextExtractor
from table_extractor import TableExtractor
from visual_extractor import VisualExtractor

# Machine Learning imports
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise EnvironmentError("Please set the GROQ_API_KEY environment variable.")

MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Initialize extractors
text_extractor = TextExtractor()
table_extractor = TableExtractor(MODEL_NAME, GROQ_API_KEY)
visual_extractor = VisualExtractor()

# Optimization settings
CHUNK_SIZE = 1500  # Increased for better context
CHUNK_OVERLAP = 200  # Increased for better continuity
CACHE_DIR = Path("cache")
VECTOR_CACHE = CACHE_DIR / "vectors"

# Create cache directories
CACHE_DIR.mkdir(exist_ok=True)
VECTOR_CACHE.mkdir(exist_ok=True)

@lru_cache(maxsize=100)
def get_embeddings():
    """Cache the embedding model."""
    return HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

class PDFProcessor:
    """Comprehensive PDF processing with structured content extraction."""
    
    def __init__(self):
        self.vectorstore = None
        self.chain = None
        
    def validate_pdf(self, file_path: str) -> None:
        """Validate the PDF file before processing."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found: {file_path}")
            
        if not file_path.lower().endswith('.pdf'):
            raise ValueError("File must be a PDF")
            
        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE:
            raise ValueError(f"File size ({file_size} bytes) exceeds maximum allowed size ({MAX_FILE_SIZE} bytes)")

    async def process_pdf(self, file_path: str) -> Dict[str, Any]:
        """Process PDF and extract all content into structured format."""
        self.validate_pdf(file_path)
        
        try:
            # Extract content in parallel for efficiency
            text_content, table_content, visual_content = await asyncio.gather(
                text_extractor.async_extract(file_path),
                table_extractor.async_extract(file_path),
                visual_extractor.async_extract(file_path)
            )
            
            # Combine all extracted data in structured format
            extracted_data = {
                "metadata": {
                    "filename": os.path.basename(file_path),
                    "processed_at": datetime.now().isoformat(),
                    "file_size": os.path.getsize(file_path),
                    "total_pages": text_content.get("total_pages", 0)
                },
                "text": text_content,
                "tables": table_content.get("tables", []) if isinstance(table_content, dict) else [],
                "visual_elements": visual_content if isinstance(visual_content, dict) else {"images": [], "graphs": []}
            }
            
            # Create vector store for question answering
            self.vectorstore = await self._create_vectorstore(extracted_data)
            self.chain = self._create_qa_chain()
            
            return extracted_data
            
        except Exception as e:
            raise ValueError(f"Error processing PDF: {str(e)}")

    async def _create_vectorstore(self, extracted_data: Dict[str, Any]) -> FAISS:
        """Create a vectorstore from the extracted content for efficient QA."""
        texts = []
        
        # Add text content
        if "content" in extracted_data.get("text", {}):
            for item in extracted_data["text"]["content"]:
                if isinstance(item, dict) and "type" in item and "text" in item:
                    if item["type"] in ["paragraph", "heading"]:
                        texts.append(f"[{item['type'].capitalize()}] {item['text']}")
        
        # Add table content
        for table in extracted_data.get("tables", []):
            if isinstance(table, dict):
                table_text = f"[Table on page {table.get('page_number', 'unknown')}] "
                if "structured_data" in table:
                    table_text += json.dumps(table['structured_data'])
                    texts.append(table_text)
        
        # Add visual content
        visual_elements = extracted_data.get("visual_elements", {})
        for graph in visual_elements.get("graphs", []):
            if isinstance(graph, dict):
                graph_text = f"[Graph on page {graph.get('page_number', 'unknown')}] "
                graph_text += f"Type: {graph.get('type', 'unknown')}. "
                if "extracted_text" in graph:
                    graph_text += f"Extracted text: {graph['extracted_text']}"
                texts.append(graph_text)
        
        for image in visual_elements.get("images", []):
            if isinstance(image, dict) and "extracted_text" in image:
                image_text = f"[Image on page {image.get('page_number', 'unknown')}] "
                image_text += image["extracted_text"]
                texts.append(image_text)
        
        # Create text chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            length_function=len
        )
        chunks = text_splitter.split_text("\n\n".join(texts))
        
        # Create and return the vector store
        embeddings = get_embeddings()
        return FAISS.from_texts(chunks, embeddings)
        
    def _create_qa_chain(self) -> ConversationalRetrievalChain:
        """Create a conversation chain for QA."""
        llm = ChatGroq(
            temperature=0.2,
            model_name=MODEL_NAME,
            groq_api_key=GROQ_API_KEY
        )
        
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key='answer'
        )
        
        # Custom prompt template for better context utilization
        custom_template = """You are an AI assistant analyzing a PDF document. Use the following pieces of context to answer the question. If you don't know the answer, just say that you don't know, don't try to make up an answer.

Context:
{context}

Chat History:
{chat_history}

Question: {question}
Answer:"""

        CUSTOM_PROMPT = PromptTemplate(
            template=custom_template,
            input_variables=["context", "chat_history", "question"]
        )
        
        return ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=self.vectorstore.as_retriever(
                search_kwargs={"k": 4}
            ),
            memory=memory,
            combine_docs_chain_kwargs={"prompt": CUSTOM_PROMPT},
            return_source_documents=True,
            max_tokens_limit=4000
        )

    async def ask_question(self, question: str, chat_history: List[Tuple[str, str]]) -> Dict[str, Any]:
        """Process a question and return an answer with supporting references."""
        if not self.chain:
            raise ValueError("No PDF has been processed yet. Please upload a PDF first.")
        
        # Get answer from the chain
        result = await self.chain.ainvoke({
            "question": question,
            "chat_history": chat_history
        })
        
        # Extract source references
        sources = []
        for doc in result.get("source_documents", []):
            source_text = doc.page_content
            
            # Determine source type and location
            if source_text.startswith("[Table"):
                source_type = "table"
            elif source_text.startswith("[Graph"):
                source_type = "graph"
            elif source_text.startswith("[Image"):
                source_type = "image"
            else:
                source_type = "text"
            
            # Extract page number if available
            page_match = re.search(r"page (\d+)", source_text)
            page_number = int(page_match.group(1)) if page_match else None
            
            sources.append({
                "type": source_type,
                "page": page_number,
                "content": source_text
            })
        
        return {
            "answer": result["answer"],
            "sources": sources
        }
