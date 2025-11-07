# OriginX - Anti-Counterfeit Platform

A Next.js platform for supply chain management and product authentication using **blockchain-style simulation** and QR code encryption.

---

## 🔗 Blockchain-Style Product Transfer & Tracking System

> **Note:** Simulation-based — no real blockchain or payment involved

### 🧩 Overview

This system **simulates blockchain principles** to provide **secure and transparent product tracking** between **Companies** and **SMEs**.

It creates a **chain-like record** of product ownership using **SHA-256 hashes** and **AES-256 encryption**, but **does not use any real blockchain or cryptocurrency transactions**.

---

### ⚙️ Core Mechanism

* Each **product creation** generates an **initial record (block-like entry)**.

* Every **ownership transfer** (Company → SME → new SME) adds a **new simulated block**.

* The blocks are **not stored on a blockchain network**, but instead within a **central database**, maintaining a **chain of ownership history**.

---

### 🔐 Hashing & Security

* **Algorithm:** SHA-256 for unique owner hashes

* **Encryption:** AES-256 for product information security

* **Purpose:** Ensure authenticity and traceability of ownership

Each simulated "block" includes:

```json
{
  previous_hash,
  sender_hash,
  receiver_hash,
  product_hash,
  timestamp,
  remarks: "transfer_record"
}
```

---

## 🏢 Database Schemas

### Company

| Field           | Description                                |
| --------------- | ------------------------------------------ |
| name            | Company name                               |
| tin_number      | Tax Identification Number                  |
| registration_id | Government registration ID                 |
| company_id      | Unique company identifier                  |
| user_id         | Linked user account                        |
| products        | List of product IDs created by the company |
| description     | Company description                        |
| phone           | Contact number                             |
| address         | Company address                            |

### 📦 Product

| Field             | Description                                       |
| ----------------- | ------------------------------------------------- |
| name              | Product name                                      |
| description       | Product details                                   |
| product_image     | Image of the product                              |
| product_id        | Unique identifier                                 |
| manufacturer_data | Manufacturing or batch information                |
| expiry_date       | Product expiry date                               |
| product_hash      | AES-256 encrypted hash of product data            |
| owner_hash        | SHA-256 hash of current owner (Company or SME)    |
| new_sme_hash      | SHA-256 hash of next SME (for transfer)           |
| qr                | QR code for product verification and traceability |

### 🧾 SME

| Field           | Description                           |
| --------------- | ------------------------------------- |
| name            | SME name                              |
| tin_number      | Tax Identification Number             |
| registration_id | Government registration ID            |
| company_id      | Unique identifier                     |
| products        | List of product IDs owned or received |
| description     | SME description                       |
| phone           | Contact number                        |
| address         | Business address                      |

### 👤 User

| Field          | Description                      |
| -------------- | -------------------------------- |
| email          | Login email                      |
| password       | Secure (hashed) password         |
| role           | Role type: `COMPANY` or `SME`    |
| created_at     | Account creation date            |
| display_name   | Display name                     |
| last_login     | Last login timestamp             |
| photo_url      | Profile image URL                |
| update_details | Editable user info               |
| status         | Account status (active/inactive) |

---

## 🚫 Rules & Restrictions

* Only **Companies** can **create** products.

* Companies **cannot edit** or **update** product details once created.

* Companies can **transfer** products to SMEs.

* SMEs can **receive** and **transfer** products to other SMEs.

* Each transfer creates a **new simulated block** (database entry) linking sender and receiver.

* No **payment**, **crypto**, or **real blockchain network** is involved — only a **secure record trail** within the system database.

---

## 🧠 Summary

| Concept     | Real Blockchain Equivalent | In This System                       |
| ----------- | -------------------------- | ------------------------------------ |
| Block       | Database entry             | Simulated record                     |
| Hash        | SHA-256                    | Used for owner and transfer security |
| Chain       | Linked blocks              | Sequential product ownership records |
| Transaction | Payment or trade           | Simple transfer update only          |
| Ledger      | Distributed storage        | Centralized database                 |

---

## Features

- **Product Management**: Register products, generate encrypted QR codes, batch imports
- **Movement Tracking**: Track shipments and transfers with handover records
- **Verification System**: QR code verification with AI-powered counterfeit detection
- **Blockchain-Style Ledger**: Immutable transaction history (simulated)
- **Analytics Dashboard**: KPIs and insights for supply chain monitoring
- **Role-Based Access**: Admin, Company, and SME user roles

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Authentication**: Firebase Auth with MFA support
- **Database**: Firestore
- **Storage**: Cloudinary for images

## Prerequisites

- Node.js 18+
- Firebase project with Authentication, Firestore, and Storage enabled
- Cloudinary account (optional)

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/SifatAli008/OriginX.git
cd OriginX
```

1. Install dependencies:

```bash
npm install
```

1. Configure environment variables in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
FIREBASE_SERVICE_ACCOUNT_BASE64=your-base64-service-account
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

1. Run the development server:

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Production Build

```bash
npm run build
npm start
```

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel Dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm install -g vercel
vercel --prod
```

## Environment Variables

**Required:**

- `NEXT_PUBLIC_FIREBASE_*` - Firebase client configuration
- `FIREBASE_SERVICE_ACCOUNT_BASE64` - Base64 encoded service account JSON

**Optional:**

- `CLOUDINARY_*` - Cloudinary image upload configuration
- `QR_AES_SECRET` - QR code encryption secret

## License

Proprietary software. All rights reserved.
