# OriginX Web Platform (Full Web System)

<!-- markdownlint-disable MD022 MD032 MD031 MD040 MD009 MD012 -->

A Next.js web platform for SMEs, warehouses, suppliers, auditors, and admins to register products, track movements, verify authenticity (QR), and review a simulated blockchain transaction history using Firebase and Cloud Functions.

## Overview
- Website-first MVP with a "blockchain feel"
- Core capabilities:
  - Auth with roles (SME, warehouse, supplier, auditor, admin)
  - Product registration, batch imports, QR binding
  - Movements/shipment tracking with handover logs
  - Verification (QR) with AI risk scoring (stub in MVP)
  - Transactions explorer (hash, block, status, time)
  - Analytics, reports, alerts, and audit trails

## SupplyGuard Web Feature List

### 1. User Access & Authentication
- Secure login/signup for SMEs, warehouses, and admins
- Multi-factor authentication (email, SMS, Google Auth)
- Role-based dashboards for different users (supplier, manager, auditor)

### 2. Product Registration & Tracking
- Add/register new products with unique IDs and batch numbers
- QR code generation and download for printing/sticking on products
 
- Bulk/batch upload (CSV/XLS) for many products at once

### 3. Blockchain Integration
- Live product journey visualization on blockchain (factory → warehouse → wholesaler → retailer → customer)
- View tamper-proof blockchain records for every transaction
- Verify product authenticity with blockchain scan (QR)

### 4. AI-Powered Counterfeit Detection
- Automated fraud detection on suppliers, shipments, and transactions
- Risk scoring per product, supplier, and batch
- Real-time anomaly alerts for suspicious activity (price drops, delivery speed, quality outliers)

### 5. Worker and Quality Monitoring
- Worker approval logging (which worker checked/approved which shipment)
- AI-based detection for suspicious worker behavior (frequent approvals, anomaly patterns)
- Team performance stats (honesty, quality consistency)

### 6. Supply Chain & Logistics Management
- Real-time shipment/transfer tracking between locations (factory, warehouse, etc.)
- Digital handover records for each movement
- Automated quality check logs and records

### 7. Reporting & Analytics
- Interactive dashboards with KPIs (counterfeit attempts blocked, product movement, loss prevented)
- Custom report builder (filter by date, supplier, location, batch)
- Downloadable reports (PDF, Excel)

### 8. Smart Contract Controls
- Payment escrow and release tied to product verification
- Automated blocking/refunds for flagged fakes
- Transaction log/audit for compliance

### 9. User Feedback & Support
- Integrated customer support ticketing system
- Built-in tutorials and onboarding guides
- Real-time alerts and notifications (email/SMS/in-app)

### 10. Security & Compliance
- End-to-end encryption of sensitive data
- Full GDPR/data protection compliance tools
- User activity logs and audit trails

### 11. Mobile-Optimized Features
- Responsive design (usable on phone/tablet)
- QR scanning from web app (with browser permissions)

### 12. Ecosystem Integrations (Optional/Advanced)
- API for ERP/CRM integration (SAP, Oracle, Odoo)
- REST API for third-party app extensions
- Integration with Bangladesh customs/government portals (if applicable)

All features are modular: enable/disable based on customer needs. Custom branding and white-labeling available for partners.

---

## Roles & Dashboards
- SME/Supplier: product registration, batch import, QR, shipments
- Warehouse Manager: inbound/outbound, transfers, handovers, QC logs
- Auditor: journey visualization, verification history, compliance views
- Admin: user/role management, suppliers, reports, policies, analytics

Dashboards by role:
- Overview KPIs, quick actions, recent activity, alerts

## Web Modules & Routes
```
web/
├─ app/
│  ├─ auth/login                      # MFA-enabled auth
│  ├─ dashboard                       # role-based widgets
│  ├─ products                        # list, filters
│  │  ├─ new                          # register product
│  │  └─ [id]                         # details + QR
│  ├─ batches                         # CSV/XLS imports
│  ├─ movements                       # transfers, shipments
│  │  └─ new                          # create shipment/transfer
│  ├─ verify                          # QR verify (web scanning)
│  ├─ blockchain                      # transaction explorer
│  ├─ analytics                       # KPIs, charts
│  ├─ reports                         # counterfeit reports
│  ├─ suppliers                       # directory (admin)
│  ├─ users                           # user/role mgmt (admin)
│  ├─ settings                        # org, branding, policies
│  └─ support                         # tickets, guides
```

## Data Model (Firestore) — High Level
- `users` — `{ uid, role, orgId, mfaEnabled, status, createdAt }`
- `orgs` — `{ orgId, name, type, branding, settings }`
- `products` — `{ productId, orgId, name, sku, batchId, imgUrl, qrHash, status, createdAt }`
- `batches` — `{ batchId, orgId, fileUrl, status, counts, createdAt }`
- `movements` — `{ moveId, productId, from, to, by, type, qc, createdAt }`
- `verifications` — `{ verificationId, productId, by, aiScore, verdict, channel, createdAt }`
- `transactions` — `{ txHash, type, status, blockNumber, refType, refId, orgId, createdAt }`
- `suppliers` — `{ supplierId, orgId, name, rating, status }`
- `reports` — `{ reportId, productId, orgId, reason, reporterId, createdAt }`
- `alerts` — `{ alertId, orgId, subject, severity, status, createdAt }`

Immutability: `transactions` are append-only; key actions write a corresponding transaction.

## Permissions (Summary)
- SME/Supplier: write own products, batches, movements; read own data; verify
- Warehouse: write movements/QC for assigned org/sites; read relevant products
- Auditor: read-only across assigned orgs; export permissions
- Admin: global admin or org admin; manage users/roles/suppliers/policies

## API Surface (Cloud Functions HTTPS)

Auth & Users
- `POST /api/auth/mfa/challenge` — request MFA (email/SMS/OTP)
- `POST /api/auth/mfa/verify` — complete MFA
- `GET /api/users/me` — profile
- `GET /api/users` (admin) — list users
- `POST /api/users` (admin) — create/update user, assign role

Products & Batches
- `POST /api/products` — create product
- `GET /api/products/:id` — product detail
- `GET /api/products` — list/filter
- `POST /api/batches/import` — upload CSV/XLS and enqueue
- `GET /api/batches/:id` — batch status/results

QR & Verification
- `POST /api/qr/generate` — encrypted QR for product/batch
- `POST /api/verify` — verification (QR), AI scoring (stub in MVP)

Movements & Logistics
- `POST /api/movements` — create movement/shipment
- `GET /api/movements` — list by filters (date, from, to, product)
- `POST /api/movements/:id/handover` — record handover event
- `POST /api/movements/:id/qc` — add QC result

Blockchain (Simulated Ledger)
- `GET /api/transactions` — explorer list
- `GET /api/transactions/:txHash` — detail

Analytics & Reports
- `GET /api/analytics` — KPIs + trends
- `GET /api/reports` — list counterfeit reports
- `POST /api/reports` — file report

Suppliers & Admin
- `GET /api/suppliers` — list suppliers (admin)
- `POST /api/suppliers` — create/update supplier (admin)
- `GET /api/orgs/:id/settings` — get org settings
- `POST /api/orgs/:id/settings` — update settings (admin)

Notifications & Support
- `POST /api/alerts` — create alert (rule-triggered)
- `GET /api/alerts` — list alerts
- `POST /api/support/tickets` — create support ticket
- `GET /api/support/tickets` — list tickets by user/org

Error envelope and rate limits follow the earlier API section.

## MFA & Security
- MFA factors: email OTP, SMS OTP, TOTP (Google Authenticator)
- Secrets: server-only; never exposed to client
- Firestore rules enforce org scoping and write restrictions
- Audit trails: `transactions` + `users` action logs
- Encryption: QR AES-256, TLS in transit; sensitive fields hashed

## Analytics & Dashboards
- KPIs: total products, movements, verifications, counterfeit attempts, loss prevented
- Trends: per-day verifications, movement volumes, risk levels
- Drill-down: by org, supplier, location, batch, product

## Integrations (Optional)
- ERP/CRM connectors (SAP/Oracle/Odoo) via REST webhooks
- Government/customs API hooks (country-specific)
- Public REST API keys (scoped, rate-limited) for partners

## Feature Matrix (MVP vs Phase 2)
- MVP: auth with roles, products, QR, verification stub, movements basic, transactions explorer, analytics basic
- Phase 2: NFC binding, AI anomaly models, custom reports, support tickets, ERP integrations, advanced alerts, payment escrow smart-contracts

## Tech Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Firebase: Auth, Firestore, Cloud Functions, Storage
- Cloudinary for image upload/optimization
- QR via `qrcode`; AES-256 via `crypto-js`
- Charts via `recharts`

## Prerequisites
- Node.js 18+
- Firebase project (Auth, Firestore, Storage enabled)
- Cloudinary account (API Key/Secret)
- Vercel (recommended) for web deploys

## Environment Variables
Create `web/.env.local` and set the same in Vercel for production:

```
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Cloudinary (client)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

# Server-only (never expose to client)
QR_AES_SECRET=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Setup
```
# Scaffold (if needed)
npx create-next-app@latest web --ts --eslint --tailwind --app

cd web
npm i firebase qrcode crypto-js axios recharts

# Run
npm run dev
```

## Project Structure (web)
```
web/
├─ app/
│  ├─ auth/login
│  ├─ dashboard
│  ├─ products
│  │  ├─ page.tsx
│  │  ├─ new/page.tsx
│  │  └─ [id]/page.tsx
│  ├─ blockchain
│  ├─ verifications
│  ├─ suppliers
│  └─ reports
├─ components/
├─ lib/
├─ styles/
├─ public/
├─ env.example
└─ package.json
```

## Auth & Roles
- Firebase Auth (email/password)
- Roles: `manufacturer` (default), `admin`
- Protect pages with server or client guards

## Firestore Collections (MVP)
- `users` — `{ uid, role, orgName, createdAt }`
- `products` — `{ productId, manufacturerId, name, imgUrl, qrDataHash, status, createdAt }`
- `verifications` — `{ verificationId, productId, aiScore, verdict, createdAt }`
- `transactions` — `{ txHash, type, status, blockNumber, payloadRef, createdAt }`
- `suppliers` — `{ supplierId, name, status }`
- `reports` — `{ reportId, productId, reason, reporterId, createdAt }`

Transactions are immutable (write-once) in MVP.

## API (via Cloud Functions)
- `POST /api/products` — create product (upload -> doc -> QR -> transaction)
- `GET /api/products/:id` — product detail
- `GET /api/products` — list with filters/pagination
- `POST /api/verify` — verification stub (decode -> score -> records)
- `GET /api/transactions` — list/paginate
- `GET /api/transactions/:txHash` — transaction detail
- `GET /api/analytics` — KPIs

### API Reference

All endpoints are HTTPS Functions. Auth via Firebase ID token in `Authorization: Bearer <token>` unless marked public.

#### POST /api/products
Creates a product, uploads image to Cloudinary, generates encrypted QR payload, writes a `PRODUCT_REGISTER` transaction.

Headers:
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

Request body:
```json
{
  "name": "Brake Pad X1",
  "category": "auto",
  "image": {
    "uploadUrl": "https://api.cloudinary.com/v1_1/<cloud>/image/upload",
    "publicId": "products/brake-pad-x1-abc123"
  },
  "metadata": { "sku": "BPX1-2025", "brand": "XYZ" }
}
```

Response 201:
```json
{
  "productId": "prod_9s8df7",
  "qr": {
    "encrypted": "U2FsdGVkX1...",
    "pngDataUrl": "data:image/png;base64,iVBORw0..."
  },
  "transaction": {
    "txHash": "0x1f3a...",
    "blockNumber": 1024,
    "status": "confirmed",
    "type": "PRODUCT_REGISTER",
    "timestamp": 1730385600
  }
}
```

Errors:
- 400 invalid payload
- 401 unauthorized
- 429 rate limited
- 500 unexpected

#### GET /api/products/:id
Returns product detail (public read).

Response 200:
```json
{
  "productId": "prod_9s8df7",
  "name": "Brake Pad X1",
  "category": "auto",
  "imgUrl": "https://res.cloudinary.com/...",
  "manufacturerId": "uid_abc",
  "createdAt": 1730385600,
  "status": "active",
  "verificationsCount": 12
}
```

#### GET /api/products
Query params: `page`, `pageSize`, `category`, `manufacturerId` (admin only for cross-org).

Response 200:
```json
{
  "items": [ { "productId": "prod_...", "name": "..." } ],
  "page": 1,
  "pageSize": 20,
  "total": 120
}
```

#### POST /api/verify
Verification stub: decrypts QR payload, checks product, runs mock AI, writes verification + `VERIFY` transaction.

Headers:
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

Request body:
```json
{
  "qrEncrypted": "U2FsdGVkX1...",
  "image": {
    "uploadUrl": "https://api.cloudinary.com/v1_1/<cloud>/image/upload",
    "publicId": "verifications/prod_9s8df7-169999"
  }
}
```

Response 200:
```json
{
  "verdict": "GENUINE",
  "aiScore": 92.5,
  "transaction": {
    "txHash": "0x9ab4...",
    "blockNumber": 1025,
    "status": "confirmed",
    "type": "VERIFY",
    "timestamp": 1730385655
  }
}
```

Errors:
- 400 invalid QR / product not found → `FAKE` with reason (or 404 if strict)
- 401 unauthorized
- 422 image validation failed
- 429 rate limited

#### GET /api/transactions
Query params: `page`, `pageSize`, `type` (PRODUCT_REGISTER|VERIFY), `manufacturerId` (admin only), `productId`.

Response 200:
```json
{
  "items": [
    {
      "txHash": "0x1f3a...",
      "type": "PRODUCT_REGISTER",
      "status": "confirmed",
      "blockNumber": 1024,
      "timestamp": 1730385600
    }
  ],
  "page": 1,
  "pageSize": 25,
  "total": 250
}
```

#### GET /api/transactions/:txHash
Returns transaction detail.

Response 200:
```json
{
  "txHash": "0x1f3a...",
  "type": "PRODUCT_REGISTER",
  "status": "confirmed",
  "blockNumber": 1024,
  "timestamp": 1730385600,
  "payload": {
    "productId": "prod_9s8df7",
    "manufacturerId": "uid_abc"
  }
}
```

#### GET /api/analytics
Returns KPIs and simple trends.

Response 200:
```json
{
  "kpis": {
    "totalProducts": 120,
    "totalVerifications": 4321,
    "avgConfidence": 0.905,
    "counterfeitCount": 42
  },
  "trends": {
    "verificationsDaily": [
      { "date": "2025-10-20", "count": 120 },
      { "date": "2025-10-21", "count": 140 }
    ]
  }
}
```

#### Admin/Support (stubs for web views)
- `GET /api/suppliers` — list suppliers (admin)
- `POST /api/suppliers` — create/update supplier (admin)
- `GET /api/reports` — list counterfeit reports (admin)

These can be added post-MVP; web routes may call Firestore directly with admin checks or go through Functions.

### Error Envelope (standardized)
When possible, wrap errors as:
```json
{
  "error": {
    "code": "INVALID_QR",
    "message": "QR payload could not be decrypted",
    "status": 400
  }
}
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_QR`, `NOT_FOUND`, `RATE_LIMITED`, `VALIDATION_ERROR`, `INTERNAL`.

## QR Encryption
- AES-256 encrypt JSON `{ productId, manufacturerId, ts }` using `QR_AES_SECRET`
- Encode encrypted string as QR image (PNG/SVG) using `qrcode`
- On verify: decrypt and cross-check Firestore

Helpers (web/lib):
```ts
// encryptQrPayload(payload: object): string
// decryptQrPayload(cipherText: string): object
// generateQrPngDataUrl(text: string, options?): Promise<string>
```

## AI Counterfeit Detection

MVP uses a lightweight, deterministic scoring stub to simulate AI behavior; Phase 2 swaps in a real model with identical inputs/outputs.

### Input
- QR decrypted payload → `productId`
- Optional product photo URL (uploaded to Cloudinary)
- Product reference data (brand, SKU, packaging features) from Firestore

### MVP Scoring (Stub)
- Features: string similarity (brand/SKU), basic metadata checks, image presence check
- Score range: 0.0–1.0
- Verdict: `GENUINE` if score ≥ 0.85 and product exists; otherwise `FAKE`
- Latency target: ≤ 3s end-to-end

Example response:
```json
{
  "verdict": "GENUINE",
  "aiScore": 0.925,
  "reasons": ["sku_match", "brand_match", "image_present"],
  "threshold": 0.85
}
```

### Phase 2 Model (Planned)
- Model: CNN/ViT for packaging/logo/hologram features; OCR for text
- Training data: manufacturer-provided assets + verified captures
- Serving: Cloud Function or external inference API (GPU optional)
- Continual learning: periodic fine-tuning; drift monitoring

### API Contract
- `POST /api/verify` accepts `{ qrEncrypted, image? }`
- Returns `{ verdict, aiScore, transaction }`
- Writes to `verifications` and `transactions` with the same schema across MVP and Phase 2

## Security Notes
- Products: public read; owner can create; no updates
- Transactions: public read; Function-only writes; no updates/deletes
- Verifications: Function-only writes; limited reads
- Users: self readable; updates restricted

Deploy concrete rules in `firestore.rules` and deploy with Firebase CLI.

### Rate Limiting
- `POST /api/products`: 30/min per manufacturer
- `POST /api/verify`: 60/min per org, burst 10
- `GET /api/transactions`: 120/min

### Access Control Summary
- Manufacturer: CRUD own products (create only, no update), read own verifications, read public transactions
- Admin: cross-org reads, manage suppliers/reports

## Testing Checklist
- Auth + role gating
- Product create + image upload + QR generation
- Transactions show `txHash`, `blockNumber`, `confirmed`
- Verification stub writes records; UI reflects results
- <2s page loads, no console errors
- Secrets not exposed to client

## Deployment
- Web: Vercel (connect repo, set env vars)
- Functions: `firebase deploy --only functions`
- Firestore Rules: `firebase deploy --only firestore:rules`

## Roadmap
- Real TensorFlow.js verification
- Rich transaction explorer (filters, deep links)
- Supplier directory + counterfeit reports
- Swap mock ledger with Hyperledger Fabric (no UX changes)


