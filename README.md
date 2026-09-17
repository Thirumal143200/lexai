# LexAI — Legal Document Intelligence

> **Important Legal Disclaimer:** LexAI is designed to provide legal information and basic document navigation assistance. It is **not** a law firm, does not provide formal legal advice, and is not a substitute for professional legal counsel.

LexAI is an opinionated, production-grade legal document intelligence workstation built with **Next.js**, **TypeScript**, **SQLite**, and **Google Gemini** (with deterministic local fallback). It helps non-lawyers, founders, and teams navigate complex contracts with clarity, surface hidden risks, and compare draft versions before signing.

---

## Key Capabilities

### 1. Plain-Language Summarization & Metadata
- Breaks down legalese into direct, readable explanations.
- Automatically extracts document type, effective date, governing law, jurisdiction, and identified parties.
- Builds an indexed glossary of defined legal terms.

### 2. Structured Clause Breakdown
- Categorizes clauses into termination, liability, indemnification, intellectual property, confidentiality, payment, and warranties.
- Provides side-by-side original contract text and plain-English meanings.
- Flags risk levels and assesses contract favourability.

### 3. Risk & Red-Flag Audit
- Evaluates contract hazards across High Attention, Review, and Informational severity levels.
- Surfaces "Missing Protections": industry-standard clauses absent from the draft.
- Provides practical counter-proposals and negotiation strategies.

### 4. Contractual Obligations Matrix
- Extracts affirmative and negative obligations by party.
- Highlights deadlines, trigger conditions, recurrence, and breach consequences.

### 5. Grounded Document Q&A (RAG)
- Interactive question answering grounded strictly in document text via section-aware chunking and TF-IDF cosine similarity.
- **Citation Integrity Engine**: Verifies every citation against actual extracted chunk text, discarding unverified or hallucinated excerpts.

### 6. Actionable Checklists
- Generates targeted checklists for:
  - **Before Signing** (Due diligence & red flags)
  - **After Signing** (Onboarding & compliance)
  - **Questions for Legal Counsel** (Preparation for formal attorney review)
  - **Termination & Exit** (Offboarding & asset return)

### 7. Semantic Document Comparison
- Compares baseline vs counter-proposal agreements.
- Maps clause-by-clause changes (modified, added, removed, unchanged).
- Highlights shifts in risk allocation (e.g. unilateral amendments, liability cap changes).

### 8. One-Click Sample Agreements
- Preloaded with realistic legal documents for immediate testing without uploading private files:
  - *Enterprise SaaS Master Agreement* (Vendor-favorable, auto-renewal, liability caps)
  - *Standard Mutual NDA* (Bilateral confidentiality, 3-year term)
  - *Commercial Office Lease* (Triple-net lease, tenant repairs, entry rights)

---

## Architectural & Engineering Highlights

See [ARCHITECTURE.md](file:///C:/lexai/ARCHITECTURE.md) for deep-dive technical rationale.

- **Zero-ORM SQLite with WAL Mode**: Uses `better-sqlite3` directly with explicit SQL statements. No ORM overhead, fast synchronous execution in Node.js API routes, and full transactional integrity.
- **Section-Aware Chunking**: Chunks text on numbered headings and legal section boundaries rather than arbitrary character splits, preserving clause context for retrieval.
- **TF-IDF Keyword Retrieval**: Deliberately chosen over dense vector embeddings. Avoids secondary paid embedding APIs or heavy local vector stores while providing high-precision retrieval on consistent legal terminology.
- **Strict Schema Enforcement**: Every AI output is validated with **Zod** schemas before reaching the database or frontend.
- **Prompt Injection Defense**: Untrusted document text is encapsulated within strict `<DOCUMENT_DATA>` tags with explicit system-level boundary instructions, ensuring document text is treated as passive data.
- **Deterministic Mock AI Provider**: If no `GEMINI_API_KEY` is provided, LexAI seamlessly falls back to a deterministic mock provider with realistic legal responses for local offline development and testing.

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 & 24)
- npm 9+

### Installation
```bash
cd C:\lexai
npm install
```

### Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Set your Gemini API key:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```
*(If left empty, LexAI automatically operates in local mock mode for zero-configuration testing).*

### Running the App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests
```bash
npm test
```
Runs the complete test suite: **60 unit, integration, and security tests across 10 test suites**.

### Building for Production
```bash
npm run build
npm start
```

---

## Security, Privacy & Tenancy

1. **Deployment Model**: LexAI is designed as a private, single-tenant legal workstation (local or single-tenant container). It stores data in `./data/uploads` and `./data/lexai.db`.
2. **Multi-Tenant Notice**: Multi-tenant authorization is intentionally not simulated. For cloud deployment across multiple organizations, an authentication layer (e.g. NextAuth/OIDC) and tenant-scoped SQL queries should be added as outlined in `ARCHITECTURE.md`.
3. **Path Traversal Protection**: Uploaded filenames and document IDs are strictly sanitized against directory traversal attacks.
4. **MIME & Extension Whitelisting**: Strictly restricts uploads to PDF, DOCX, and plain text files with a 10MB size limit.
5. **Prompt Injection Regression Tested**: Verified to reject adversarial prompt injections embedded inside contract text.
6. **No Telemetry**: Zero external tracking scripts, third-party analytics, or unauthorized data transmission.

---

## Accessibility (a11y)

LexAI incorporates WCAG 2.1 AA design patterns:
- Semantic landmarks (`role="banner"`, `aria-label="Main navigation"`, `role="note"`, `id="main-content"`)
- Keyboard skip-link (`.skip-link`) for jumping straight to primary content
- High-contrast visible focus styling (`:focus-visible`)
- Reduced motion support (`@media (prefers-reduced-motion: reduce)`)
- Screen-reader announcements via `aria-live="polite"` and `role="alert"`
- Fully keyboard-accessible drag-and-drop upload zone (Enter / Space support)

---

## License
MIT License. Created for educational and legal accessibility purposes.
