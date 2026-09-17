# LexAI — REST API Documentation

LexAI provides a RESTful API for document ingestion, analysis, querying, and comparison. All JSON responses adhere to predictable schemas and HTTP status codes.

---

## 1. System Endpoints

### `GET /api/health`
Liveness and readiness check.
- **Response (200 OK):**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-09-17T18:00:00.000Z",
  "aiProvider": "gemini"
}
```

---

## 2. Document Management

### `GET /api/documents`
Lists all uploaded documents.
- **Response (200 OK):**
```json
{
  "documents": [
    {
      "id": "uuid-v4",
      "filename": "uuid.pdf",
      "original_name": "SaaS_Agreement.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 1048576,
      "status": "ready",
      "error_message": null,
      "created_at": "2026-09-17T18:00:00.000Z",
      "updated_at": "2026-09-17T18:00:05.000Z"
    }
  ]
}
```

### `POST /api/documents`
Uploads a document for background processing.
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (PDF, DOCX, TXT - max 10MB)
- **Response (201 Created):**
```json
{
  "document": {
    "id": "uuid-v4",
    "filename": "uuid.pdf",
    "original_name": "SaaS_Agreement.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 1048576,
    "status": "uploaded"
  }
}
```

### `GET /api/documents/:id`
Retrieves metadata and processing status for a single document.
- **Response (200 OK):** `{ "document": { ... } }`
- **Error (404 Not Found):** `{ "error": "Document not found." }`

### `DELETE /api/documents/:id`
Permanently deletes the stored file, chunks, analyses, and questions.
- **Response (200 OK):** `{ "success": true }`

---

## 3. Sample Documents (Zero-Friction Testing)

### `GET /api/documents/sample`
Lists curated legal contract samples available for 1-click evaluation.

### `POST /api/documents/sample`
Loads and analyzes a curated sample contract.
- **Body**: `{ "sampleId": "sample-saas-msa" | "sample-mutual-nda" | "sample-commercial-lease" }`
- **Response (201 Created):** `{ "document": { "id": "...", "status": "ready" } }`

---

## 4. Document Intelligence & Analysis

### `GET /api/documents/:id/summary`
Returns plain-language summary, key takeaways, parties, and governing law.
- **Response (200 OK):**
```json
{
  "summary": {
    "plainLanguageSummary": "...",
    "keyPoints": ["..."],
    "metadata": {
      "documentType": "SaaS Agreement",
      "governingLaw": "California",
      "parties": ["CloudScale Technologies Inc.", "Apex Global Enterprises LLC"]
    }
  }
}
```

### `GET /api/documents/:id/clauses`
Extracts and categorizes clauses with plain-English translations and risk levels.
- **Response (200 OK):**
```json
{
  "clauses": [
    {
      "id": "clause-uuid",
      "category": "liability",
      "title": "Limitation of Liability",
      "originalText": "...",
      "plainLanguageExplanation": "...",
      "riskLevel": "high",
      "sourceSection": "Section 9.2"
    }
  ]
}
```

### `GET /api/documents/:id/risks`
Evaluates hazards, traps, and missing contractual protections.
- **Response (200 OK):**
```json
{
  "risks": {
    "highAttentionCount": 2,
    "reviewCount": 3,
    "informationalCount": 1,
    "overallAssessment": "...",
    "risks": [
      {
        "id": "risk-uuid",
        "level": "high-attention",
        "title": "Unilateral Modification Right",
        "description": "...",
        "whyItMatters": "...",
        "suggestedAction": "...",
        "clauseReference": "Section 2.3"
      }
    ]
  }
}
```

### `GET /api/documents/:id/obligations`
Extracts action items, deadlines, recurrence, and breach penalties.
- **Response (200 OK):**
```json
{
  "obligations": [
    {
      "id": "ob-uuid",
      "party": "Subscriber",
      "obligation": "Pay invoice within 30 calendar days",
      "deadline": "30 days from invoice",
      "consequence": "1.5% monthly interest and suspension"
    }
  ]
}
```

---

## 5. Grounded Q&A (RAG)

### `POST /api/documents/:id/questions`
Submits a question to be answered using TF-IDF retrieved excerpts.
- **Body**: `{ "question": "Can the vendor terminate for convenience?" }`
- **Response (200 OK):**
```json
{
  "answer": {
    "question": "Can the vendor terminate for convenience?",
    "answer": "Yes. Section 4.4 grants the Provider the unilateral right to terminate for convenience upon 60 days written notice.",
    "isGrounded": true,
    "citations": [
      {
        "sectionId": "chunk-uuid",
        "sectionTitle": "Section 4. Term and Termination",
        "excerpt": "Provider may terminate this Agreement for convenience at any time upon sixty (60) days written notice...",
        "confidence": 0.95
      }
    ],
    "confidence": 0.92
  }
}
```

### `GET /api/documents/:id/questions`
Retrieves past Q&A history for this document.

---

## 6. Actionable Checklists

### `POST /api/documents/:id/checklist`
Generates an interactive checklist for a specific contract milestone.
- **Body**: `{ "type": "before-signing" | "after-signing" | "lawyer-questions" | "termination" | "renewal" }`
- **Response (200 OK):**
```json
{
  "checklist": {
    "id": "uuid",
    "type": "before-signing",
    "title": "Before Signing Due Diligence",
    "items": [
      {
        "id": "item-1",
        "item": "Verify liability cap reciprocity",
        "description": "...",
        "priority": "high",
        "completed": false
      }
    ]
  }
}
```

---

## 7. Document Comparison

### `POST /api/compare`
Compares two documents semantically.
- **Body**: `{ "documentAId": "uuid-a", "documentBId": "uuid-b" }`
- **Response (200 OK):**
```json
{
  "comparison": {
    "docATitle": "CloudScale_v1.txt",
    "docBTitle": "CloudScale_v2.txt",
    "overallSummary": "...",
    "addedCount": 1,
    "removedCount": 0,
    "modifiedCount": 2,
    "unchangedCount": 8,
    "clauseComparisons": [
      {
        "id": "diff-1",
        "category": "liability",
        "changeType": "modified",
        "docAText": "...",
        "docBText": "...",
        "changeSummary": "...",
        "whyItMatters": "..."
      }
    ]
  }
}
```
