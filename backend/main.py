import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import spacy
from pymongo import MongoClient
import torch

app = FastAPI()

# Allow React to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Setup
client = MongoClient("mongodb://localhost:27017/")
db = client["legal_ai_db"]
collection = db["analyses"]

# Load AI Models
print("Loading Legal-BERT models...")
# Summarization with BART
model_name = "facebook/bart-large-cnn"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# Named Entity Recognition (NER) for Legal
nlp = spacy.load("en_core_web_sm") 

@app.post("/upload")
async def process_document(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # 1. Save and Extract Text
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())

    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text()

    # 2. Innovative Logic: BART Summarization
    # We use a custom heuristic for Risk Score (Novelty for your IEEE paper)
    text_to_summarize = text[:1024]
    inputs = tokenizer.encode(text_to_summarize, return_tensors="pt", max_length=1024, truncation=True)
    summary_ids = model.generate(inputs, max_length=150, min_length=40, do_sample=False)
    summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    
    # 3. Entity Extraction
    doc = nlp(text[:5000])
    entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]

    # 4. Custom Risk Scoring (Algorithm Innovation)
    risk_keywords = ["termination", "liability", "breach", "indemnity", "penalty"]
    risk_count = sum(1 for word in risk_keywords if word in text.lower())
    risk_score = "High" if risk_count > 5 else "Medium" if risk_count > 2 else "Low"

    # 5. Store in MongoDB
    result_data = {
        "filename": file.filename,
        "summary": summary,
        "risk_level": risk_score,
        "entities": entities[:10], # Top 10 entities
    }
    
    try:
        res = collection.insert_one(result_data)
        document_id = str(res.inserted_id)
    except Exception as e:
        print(f"MongoDB insert error: {e}")
        document_id = "temp_id"
    
    return {
        "id": document_id,
        "filename": result_data["filename"],
        "summary": result_data["summary"],
        "risk_level": result_data["risk_level"],
        "entities": result_data["entities"]
    }

if __name__ == "__main__":
    import uvicorn
    if not os.path.exists("uploads"): os.makedirs("uploads")
    uvicorn.run(app, host="0.0.0.0", port=8000)