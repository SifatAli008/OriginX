# OriginX API Documentation

**Version:** 1.0  
**Base URL:** `https://your-domain.com/api`  
**Last Updated:** January 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [User Roles & Permissions](#user-roles--permissions)
4. [API Endpoints](#api-endpoints)
   - [Authentication & MFA](#authentication--mfa)
   - [Products](#products)
   - [Batches](#batches)
   - [Verification](#verification)
   - [Movements](#movements)
   - [Handovers](#handovers)
   - [Quality Control](#quality-control)
   - [Transactions (Blockchain)](#transactions-blockchain)
   - [Analytics](#analytics)
   - [Reports](#reports)
   - [AI Services](#ai-services)
   - [User Feedback & Support](#user-feedback--support)
   - [Security & Compliance](#security--compliance)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

---

## Overview

OriginX is a blockchain-powered anti-counterfeiting platform that enables product registration, verification, supply chain tracking, and analytics. This API provides RESTful endpoints for all core functionality.

### Key Features

- **Product Registration**: Register products with encrypted QR codes
- **Batch Import**: Bulk product registration via CSV/XLS files
- **QR Verification**: AI-powered counterfeit detection
- **Supply Chain Tracking**: Movement and handover management
- **Quality Control**: QC logging and approval workflows
- **Blockchain Transactions**: Immutable transaction ledger
- **Analytics**: KPIs, trends, and reporting
- **Multi-Factor Authentication**: Email, SMS, and TOTP support
- **User Feedback & Support**: Ticket-based support system with in-app alerts and notifications
- **Security & Compliance**: AES-256 encryption, GDPR-compliant data management, audit logging

---

## Authentication

All API endpoints (except public ones) require authentication via Firebase ID tokens.

### How to Authenticate

1. **Obtain Firebase ID Token** from your client application
2. **Include in Request Header**:
   ```
   Authorization: Bearer <firebase_id_token>
   ```

### Example

```javascript
const response = await fetch('https://api.originx.com/api/products', {
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Token Expiration

Firebase ID tokens expire after 1 hour. Your client should refresh tokens automatically or handle 401 errors by re-authenticating the user.

---

## User Roles & Permissions

OriginX supports role-based access control with the following roles:

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **sme** | Small/Medium Enterprise | Create products, manage movements, verify products |
| **supplier** | Supplier/Manufacturer | Same as SME - register products and manage supply chain |
| **warehouse** | Warehouse Manager | Manage movements, perform QC checks, handle handovers |
| **auditor** | Auditor (Read-Only) | View products, verifications, transactions, analytics |
| **admin** | System Administrator | Full access including user management |

### Permission Matrix

| Action | SME/Supplier | Warehouse | Auditor | Admin |
|--------|--------------|-----------|---------|-------|
| Create Products | ✅ | ❌ | ❌ | ✅ |
| Read Products | ✅ | ✅ | ✅ | ✅ |
| Create Movements | ✅ | ✅ | ❌ | ✅ |
| Read Movements | ✅ | ✅ | ✅ | ✅ |
| Verify Products | ✅ | ✅ | ❌ | ✅ |
| Read Verifications | ✅ | ✅ | ✅ | ✅ |
| Perform QC Checks | ❌ | ✅ | ❌ | ✅ |
| Read Transactions | ✅ | ✅ | ✅ | ✅ |
| Read Analytics | ✅ | ✅ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| Generate Reports | ✅ | ❌ | ✅ | ✅ |

### Organization Scoping

- **Non-admin users** can only access data from their own organization (`orgId`)
- **Admin users** can access data across all organizations
- Organization membership is defined in the user document

---

## API Endpoints

### Authentication & MFA

#### POST /api/auth/mfa/challenge

Request MFA challenge (Email OTP, SMS OTP, or TOTP setup).

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "method": "email" | "sms" | "totp"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "method": "email",
  "message": "OTP code sent to email",
  "otpCode": "123456"  // Only in development mode
}
```

**TOTP Setup Response:**
```json
{
  "success": true,
  "method": "totp",
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,...",
  "message": "Scan QR code with authenticator app"
}
```

**Error Responses:**
- `401` - Unauthorized (invalid/missing token)
- `400` - Invalid MFA method
- `404` - User not found
- `500` - Internal server error

---

#### POST /api/auth/mfa/verify

Verify MFA code (Email OTP, SMS OTP, or TOTP).

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "method": "email" | "sms" | "totp",
  "code": "123456",
  "secret": "JBSWY3DPEHPK3PXP",  // Only for TOTP setup
  "setup": true  // Only for initial TOTP setup
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "TOTP code verified",
  "backupCodes": ["ABC123", "DEF456", ...]  // Only on TOTP setup
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - Invalid code or method
- `404` - User not found
- `500` - Internal server error

---

### Products

#### POST /api/products

Create a new product with encrypted QR code.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Brake Pad X1",
  "sku": "BPX1-2025",
  "category": "automotive",
  "description": "High-performance brake pad",
  "image": "data:image/png;base64,...",  // Base64 image data
  "metadata": {
    "brand": "XYZ",
    "model": "Premium",
    "serialNumber": "SN123456"
  }
}
```

**Valid Categories:**
- `electronics`
- `automotive`
- `pharmaceuticals`
- `food`
- `textiles`
- `machinery`
- `chemicals`
- `other`

**Response (201 Created):**
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

**Error Responses:**
- `401` - Unauthorized
- `400` - Missing required fields or invalid category
- `403` - User must be associated with an organization
- `500` - Internal server error

---

#### GET /api/products

List products with filters and pagination.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `pageSize` (optional, default: 20) - Items per page
- `category` (optional) - Filter by category
- `status` (optional) - Filter by status (`active`, `inactive`, etc.)
- `search` (optional) - Search in product name/SKU
- `batchId` (optional) - Filter by batch ID
- `manufacturerId` (optional, admin only) - Filter by manufacturer

**Response (200 OK):**
```json
{
  "items": [
    {
      "productId": "prod_9s8df7",
      "name": "Brake Pad X1",
      "sku": "BPX1-2025",
      "category": "automotive",
      "status": "active",
      "orgId": "org_123",
      "manufacturerId": "uid_abc",
      "manufacturerName": "John Doe",
      "imgUrl": "https://res.cloudinary.com/...",
      "createdAt": 1730385600
    }
  ],
  "total": 120,
  "page": 1,
  "pageSize": 20
}
```

**Error Responses:**
- `401` - Unauthorized
- `404` - User not found
- `500` - Internal server error

---

### Batches

#### POST /api/batches/import

Import multiple products from CSV/XLS file.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `file` (required) - CSV or XLS/XLSX file
- `name` (optional) - Batch name (default: "Batch-{timestamp}")

**File Format:**
CSV/XLS files should contain columns:
- `name` (required)
- `sku` (required)
- `category` (required)
- `description` (optional)
- `brand` (optional)
- `model` (optional)
- `serialNumber` (optional)
- `manufacturingDate` (optional)
- `expiryDate` (optional)
- `imageUrl` (optional)

**Response (201 Created):**
```json
{
  "batchId": "batch_abc123",
  "status": "completed",
  "totalCount": 100,
  "processedCount": 98,
  "failedCount": 2,
  "productIds": ["prod_1", "prod_2", ...],
  "errors": ["Row 45: Invalid category", "Row 67: Missing SKU"]
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - No file provided or invalid file type
- `403` - User must be associated with an organization
- `500` - Internal server error

---

### Verification

#### POST /api/verify

Verify product authenticity via QR code with AI-powered counterfeit detection.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "qrEncrypted": "U2FsdGVkX1...",
  "image": "data:image/png;base64,..."  // Optional: verification image
}
```

**Response (200 OK):**
```json
{
  "verdict": "GENUINE",
  "aiScore": 92.5,
  "confidence": 95,
  "riskLevel": "low",
  "factors": [
    "Product is active in system - LOW RISK",
    "Manufacturer ID matches - LOW RISK",
    "Recent QR code timestamp - LOW RISK"
  ],
  "product": {
    "productId": "prod_9s8df7",
    "name": "Brake Pad X1",
    "sku": "BPX1-2025",
    "category": "automotive",
    "manufacturerId": "uid_abc",
    "status": "active"
  },
  "transaction": {
    "txHash": "0x9ab4...",
    "blockNumber": 1025,
    "status": "confirmed",
    "type": "VERIFY",
    "timestamp": 1730385655
  }
}
```

**Verdict Values:**
- `GENUINE` - Product is authentic (score ≥ 80)
- `SUSPICIOUS` - Some concerns detected (score 60-79)
- `FAKE` - Likely counterfeit (score 40-59)
- `INVALID` - QR code invalid or product not found (score < 40)

**Risk Levels:**
- `low` - Risk score < 20
- `medium` - Risk score 20-39
- `high` - Risk score 40-59
- `critical` - Risk score ≥ 60

**Error Responses:**
- `401` - Unauthorized
- `400` - Missing qrEncrypted field
- `404` - User not found
- `500` - Internal server error

---

### Movements

#### POST /api/movements

Create a new movement/shipment.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "productId": "prod_9s8df7",
  "productName": "Brake Pad X1",
  "type": "outbound",
  "from": "Warehouse A",
  "to": "Warehouse B",
  "status": "pending",
  "quantity": 10,
  "trackingNumber": "TRACK123",
  "estimatedDelivery": "2025-01-15T00:00:00Z",
  "notes": "Express delivery"
}
```

**Movement Types:**
- `inbound` - Products arriving at location
- `outbound` - Products leaving location
- `transfer` - Internal transfer between locations

**Status Values:**
- `pending` - Movement created, not started
- `in_transit` - Currently in transit
- `delivered` - Delivered to destination
- `cancelled` - Movement cancelled
- `qc_passed` - QC check passed
- `qc_failed` - QC check failed

**Response (201 Created):**
```json
{
  "movementId": "movement_abc123",
  "productId": "prod_9s8df7",
  "productName": "Brake Pad X1",
  "orgId": "org_123",
  "type": "outbound",
  "from": "Warehouse A",
  "to": "Warehouse B",
  "status": "pending",
  "quantity": 10,
  "trackingNumber": "TRACK123",
  "createdBy": "uid_abc",
  "createdAt": 1730385600,
  "transaction": {
    "txHash": "0x1f3a...",
    "blockNumber": 1024,
    "status": "confirmed",
    "type": "MOVEMENT",
    "timestamp": 1730385600
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - Missing required fields or invalid type
- `403` - User must be associated with an organization
- `500` - Internal server error

---

#### GET /api/movements

List movements with filters and pagination.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `pageSize` (optional, default: 25) - Items per page
- `type` (optional) - Filter by type (`inbound`, `outbound`, `transfer`)
- `status` (optional) - Filter by status
- `productId` (optional) - Filter by product ID

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "movement_abc123",
      "productId": "prod_9s8df7",
      "productName": "Brake Pad X1",
      "type": "outbound",
      "from": "Warehouse A",
      "to": "Warehouse B",
      "status": "pending",
      "quantity": 10,
      "trackingNumber": "TRACK123",
      "createdAt": 1730385600
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 25
}
```

**Error Responses:**
- `401` - Unauthorized
- `404` - User not found
- `500` - Internal server error

---

#### GET /api/movements/:productId

Fetch movements for a specific product using an API key (no user token required).

**Headers:**
```
x-api-key: <INTERNAL_API_KEY>
```

**URL Parameters:**
- `productId` - Product ID to filter movements

**Query Parameters:**
- `pageSize` (optional, default: 50) - Max items to return

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "movement_abc123",
      "productId": "prod_9s8df7",
      "productName": "Brake Pad X1",
      "type": "outbound",
      "from": "Warehouse A",
      "to": "Warehouse B",
      "status": "pending",
      "quantity": 10,
      "trackingNumber": "TRACK123",
      "createdAt": 1730385600
    }
  ],
  "total": 1,
  "pageSize": 50
}
```

**Example:**
```
GET /api/movements/prod_9s8df7?pageSize=25
Header: x-api-key: <INTERNAL_API_KEY>
```

**Error Responses:**
- `401` - Missing/invalid API key
- `400` - Missing productId
- `500` - Internal server error

---

### Handovers

#### POST /api/movements/:id/handover

Record a handover event for a movement.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**URL Parameters:**
- `id` - Movement ID

**Request Body:**
```json
{
  "handedOverBy": "John Doe",
  "receivedBy": "Jane Smith",
  "handoverLocation": "Warehouse B",
  "handoverNotes": "Items received in good condition",
  "condition": "excellent",
  "signature": "data:image/png;base64,...",
  "updateStatus": true
}
```

**Fields:**
- `handedOverBy` (optional) - Name/ID of person handing over
- `receivedBy` (optional) - Name/ID of person receiving
- `handoverLocation` (optional) - Location of handover
- `handoverNotes` (optional) - Notes about handover
- `condition` (optional) - Condition of items (`excellent`, `good`, `fair`, `poor`)
- `signature` (optional) - Digital signature image
- `updateStatus` (optional, default: false) - Whether to update movement status to "delivered"

**Response (201 Created):**
```json
{
  "handoverId": "handover_xyz789",
  "movementId": "movement_abc123",
  "orgId": "org_123",
  "productId": "prod_9s8df7",
  "handedOverBy": "John Doe",
  "handedOverById": "uid_abc",
  "receivedBy": "Jane Smith",
  "handoverLocation": "Warehouse B",
  "condition": "excellent",
  "createdAt": 1730385600,
  "movement": {
    "id": "movement_abc123",
    "status": "delivered",
    "trackingNumber": "TRACK123"
  },
  "transaction": {
    "txHash": "0x2f4b...",
    "blockNumber": 1025,
    "status": "confirmed",
    "type": "MOVEMENT",
    "timestamp": 1730385600
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - Movement ID required
- `403` - Access denied (not your organization)
- `404` - Movement not found
- `500` - Internal server error

---

#### GET /api/handovers

List handovers with filters.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `pageSize` (optional, default: 20) - Items per page
- `movementId` (optional) - Filter by movement ID

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "handover_xyz789",
      "movementId": "movement_abc123",
      "handedOverBy": "John Doe",
      "receivedBy": "Jane Smith",
      "handoverLocation": "Warehouse B",
      "handoverTimestamp": 1730385600,
      "condition": "excellent",
      "handoverNotes": "Items received in good condition"
    }
  ],
  "total": 30,
  "page": 1,
  "pageSize": 20,
  "totalPages": 2
}
```

---

### Quality Control

#### POST /api/movements/:id/qc

Record a quality control check for a movement.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**URL Parameters:**
- `id` - Movement ID

**Required Role:** `warehouse` or `admin`

**Request Body:**
```json
{
  "qcResult": "passed",
  "qcNotes": "All items inspected and passed",
  "qcInspector": "QC Inspector Name",
  "defects": [],
  "images": ["https://example.com/qc-image1.jpg"],
  "approvedBy": "Manager Name",
  "approvalNotes": "Approved for shipment",
  "updateStatus": true
}
```

**QC Result Values:**
- `passed` - QC check passed
- `failed` - QC check failed
- `pending` - QC check pending review

**Fields:**
- `qcResult` (required) - Result of QC check
- `qcNotes` (optional) - Notes about the QC check
- `qcInspector` or `inspectedBy` (optional) - Name/ID of inspector
- `defects` (optional) - Array of defect descriptions
- `images` (optional) - Array of QC image URLs
- `approvedBy` (optional) - Name/ID of approver
- `approvalNotes` (optional) - Approval notes
- `updateStatus` (optional, default: true) - Whether to update movement status based on QC result

**Response (201 Created):**
```json
{
  "qcId": "qc_abc123",
  "movementId": "movement_xyz789",
  "orgId": "org_123",
  "productId": "prod_9s8df7",
  "qcResult": "passed",
  "qcInspector": "QC Inspector Name",
  "qcInspectorId": "uid_abc",
  "qcNotes": "All items inspected and passed",
  "defects": [],
  "images": ["https://example.com/qc-image1.jpg"],
  "approvedBy": "Manager Name",
  "createdAt": 1730385600,
  "movement": {
    "id": "movement_xyz789",
    "status": "qc_passed",
    "qcStatus": "passed",
    "trackingNumber": "TRACK123"
  },
  "transaction": {
    "txHash": "0x3f5c...",
    "blockNumber": 1026,
    "status": "confirmed",
    "type": "QC_LOG",
    "timestamp": 1730385600
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - Invalid qcResult or missing required fields
- `403` - Access denied (not warehouse/admin or not your organization)
- `404` - Movement not found
- `500` - Internal server error

---

#### GET /api/qc-logs

List QC logs with filters.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `pageSize` (optional, default: 20) - Items per page
- `movementId` (optional) - Filter by movement ID
- `productId` (optional) - Filter by product ID
- `qcResult` (optional) - Filter by QC result
- `startDate` (optional) - Filter by start date (timestamp)
- `endDate` (optional) - Filter by end date (timestamp)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "qc_abc123",
      "movementId": "movement_xyz789",
      "productId": "prod_9s8df7",
      "productName": "Brake Pad X1",
      "qcResult": "passed",
      "qcInspector": "QC Inspector Name",
      "qcNotes": "All items inspected and passed",
      "defects": [],
      "images": ["https://example.com/qc-image1.jpg"],
      "approvedBy": "Manager Name",
      "createdAt": 1730385600,
      "trackingNumber": "TRACK123",
      "quantity": 10
    }
  ],
  "total": 25,
  "page": 1,
  "pageSize": 20,
  "totalPages": 2
}
```

---

### Transactions (Blockchain)

#### GET /api/transactions

List blockchain transactions with filters.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `pageSize` (optional, default: 25) - Items per page
- `type` (optional) - Filter by transaction type (`PRODUCT_REGISTER`, `VERIFY`, `MOVEMENT`, `QC_LOG`)
- `refType` (optional) - Filter by reference type (`product`, `movement`, `verification`, `batch`)
- `refId` (optional) - Filter by reference ID
- `productId` (optional) - Filter by product ID (searches in payload)
- `status` (optional) - Filter by status (`pending`, `confirmed`, `failed`)
- `startDate` (optional) - Filter by start date (timestamp)
- `endDate` (optional) - Filter by end date (timestamp)

**Transaction Types:**
- `PRODUCT_REGISTER` - Product registration
- `VERIFY` - Product verification
- `MOVEMENT` - Movement/handover creation
- `QC_LOG` - Quality control log

**Response (200 OK):**
```json
{
  "items": [
    {
      "txHash": "0x1f3a...",
      "type": "PRODUCT_REGISTER",
      "status": "confirmed",
      "blockNumber": 1024,
      "refType": "product",
      "refId": "prod_9s8df7",
      "orgId": "org_123",
      "createdBy": "uid_abc",
      "createdAt": 1730385600,
      "confirmedAt": 1730385610,
      "payload": {
        "productId": "prod_9s8df7",
        "productName": "Brake Pad X1",
        "sku": "BPX1-2025",
        "category": "automotive"
      }
    }
  ],
  "total": 250,
  "page": 1,
  "pageSize": 25,
  "hasMore": true
}
```

---

#### GET /api/transactions/:txHash

Get transaction details by hash.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**URL Parameters:**
- `txHash` - Transaction hash

**Response (200 OK):**
```json
{
  "txHash": "0x1f3a...",
  "type": "PRODUCT_REGISTER",
  "status": "confirmed",
  "blockNumber": 1024,
  "refType": "product",
  "refId": "prod_9s8df7",
  "orgId": "org_123",
  "createdBy": "uid_abc",
  "createdAt": 1730385600,
  "confirmedAt": 1730385610,
  "payload": {
    "productId": "prod_9s8df7",
    "productName": "Brake Pad X1",
    "sku": "BPX1-2025",
    "category": "automotive"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - Transaction hash required
- `403` - Access denied (not your organization)
- `404` - Transaction not found
- `500` - Internal server error

---

### Analytics

#### GET /api/analytics

Get KPIs, trends, and analytics data.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `startDate` (optional) - Start date timestamp (default: 30 days ago)
- `endDate` (optional) - End date timestamp (default: now)

**Response (200 OK):**
```json
{
  "kpis": {
    "totalProducts": 1250,
    "totalVerifications": 3420,
    "counterfeitCount": 45,
    "lossPrevented": 4500,
    "genuineCount": 3200,
    "suspiciousCount": 150,
    "fakeCount": 45,
    "invalidCount": 25
  },
  "trends": {
    "dailyMovements": [
      {
        "date": "2025-01-01",
        "count": 25
      },
      {
        "date": "2025-01-02",
        "count": 30
      }
    ],
    "verificationSuccessRate": [
      {
        "date": "2025-01-01",
        "rate": 95.5
      },
      {
        "date": "2025-01-02",
        "rate": 96.2
      }
    ],
    "counterfeitRate": [
      {
        "date": "2025-01-01",
        "rate": 1.3
      },
      {
        "date": "2025-01-02",
        "rate": 1.1
      }
    ]
  },
  "recentActivity": {
    "verifications": 45,
    "movements": 12,
    "registrations": 8
  }
}
```

**KPI Descriptions:**
- `totalProducts` - Total products registered
- `totalVerifications` - Total verifications performed (within date range)
- `counterfeitCount` - Total counterfeit detections (suspicious + fake + invalid)
- `lossPrevented` - Estimated financial loss prevented (USD)
- `genuineCount` - Number of genuine verifications
- `suspiciousCount` - Number of suspicious verifications
- `fakeCount` - Number of fake detections
- `invalidCount` - Number of invalid QR codes

---

### Reports

#### GET /api/reports

Generate and download reports in various formats.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `type` (required) - Report type (`products`, `verifications`, `movements`, `analytics`)
- `format` (optional, default: `csv`) - Export format (`csv`, `excel`, `pdf`)
- `startDate` (optional) - Filter by start date (timestamp)
- `endDate` (optional) - Filter by end date (timestamp)

**Response (200 OK):**
Returns a file download with appropriate headers:
- **CSV**: `Content-Type: text/csv`
- **Excel**: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **PDF**: `Content-Type: application/pdf`

**File Name Format:**
`{type}_report_{date}.{extension}`

**Example:**
```
GET /api/reports?type=verifications&format=csv&startDate=1730304000000&endDate=1730390400000
```

**Response Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="verifications_report_2025-01-01.csv"
```

**Note:** Excel and PDF formats are currently stubbed (CSV/JSON) in MVP phase. Full implementation coming in Phase 2.

---

### AI Services

#### GET /api/ai/user-behavior

Analyze a user's scanning behavior for anomalies.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `userId` (optional) - Target user ID (admin only). Defaults to current user

**Response (200 OK):**
```json
{
  "userId": "uid_abc",
  "analysis": {
    "isAnomalous": false,
    "anomalyScore": 18,
    "riskLevel": "low",
    "anomalies": ["Normal scan frequency (5 scans today)"],
    "confidence": 82,
    "recommendations": []
  },
  "scanCount": 145
}
```

**Error Responses:** `401`, `403`, `404`, `500`

---

#### GET /api/ai/supply-chain-alerts

List supply chain monitoring alerts (admin only).

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "alertId": "alert_...",
      "type": "fraud_detected",
      "severity": "critical",
      "supplierId": "uid_supplier",
      "description": "Supplier has critical fraud risk score of 82/100...",
      "riskScore": 82,
      "timestamp": 1730385600
    }
  ],
  "summary": {
    "totalAlerts": 3,
    "criticalAlerts": 1,
    "highAlerts": 1,
    "mediumAlerts": 1,
    "lowAlerts": 0,
    "byType": {"fraud_detected": 1}
  },
  "timestamp": 1730385600
}
```

**Error Responses:** `401`, `403`, `500`

---

#### POST /api/ai/chatbot

Process customer support queries with AI and suggest actions.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "How do I verify a product?",
  "conversationHistory": [
    {"role": "user", "content": "Hi", "timestamp": 1730385600}
  ]
}
```

**Response (200 OK):**
```json
{
  "response": "To verify a product, scan the QR code using the verification page...",
  "confidence": 0.9,
  "suggestedActions": [
    {"label": "Go to Verification Page", "action": "navigate", "url": "/verify"}
  ],
  "flagged": false,
  "incidentType": "verification_issue",
  "escalate": false
}
```

**Error Responses:** `401`, `400`, `404`, `500`

---

#### GET /api/ai/recommendations/suppliers

Get supplier recommendations based on risk, quality, and certifications.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `category` (optional) - Product category
- `location` (optional) - Supplier location
- `minQuality` (optional) - Minimum average quality score (0-100)
- `certifications` (optional) - Comma-separated required certifications

**Response (200 OK):**
```json
{
  "recommendations": [
    {
      "supplierId": "uid_supplier",
      "supplierName": "Acme Ltd",
      "matchScore": 92,
      "confidence": 88,
      "reasons": ["Very low fraud risk", "High quality products (80%+)"]
    }
  ]
}
```

**Error Responses:** `401`, `404`, `500`

---

#### GET /api/ai/compliance

Generate compliance advisory for suppliers/products.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `supplierId` (optional)
- `productId` (optional)
- `category` (optional) - Product category

**Response (200 OK):**
```json
{
  "advisory": {
    "overallRiskLevel": "high",
    "risks": [
      {
        "riskLevel": "high",
        "category": "bsti",
        "description": "Product category requires BSTI certification",
        "actionRequired": true
      }
    ],
    "recommendations": ["Apply for BSTI certification"],
    "applicableRegulations": ["BSTI Act 2018"]
  }
}
```

**Error Responses:** `401`, `404`, `500`

---

### User Feedback & Support

#### POST /api/support/tickets

Create a new support ticket.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "Issue with product verification",
  "description": "I'm experiencing problems when verifying products via QR code",
  "category": "technical",
  "priority": "high"
}
```

**Fields:**
- `subject` (required) - Ticket subject/title
- `description` (required) - Detailed description of the issue
- `category` (optional) - Ticket category (`technical`, `billing`, `feature`, `bug`, `other`)
- `priority` (optional) - Priority level (`low`, `medium`, `high`, `urgent`)

**Response (201 Created):**
```json
{
  "ticketId": "ticket_abc123",
  "userId": "uid_xyz",
  "subject": "Issue with product verification",
  "description": "I'm experiencing problems when verifying products via QR code",
  "category": "technical",
  "priority": "high",
  "status": "open",
  "createdAt": 1730385600,
  "updatedAt": 1730385600
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - Missing required fields (subject, description)
- `500` - Internal server error

---

#### GET /api/support/tickets

List support tickets for the authenticated user.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `pageSize` (optional, default: 20) - Items per page
- `status` (optional) - Filter by status (`open`, `in_progress`, `resolved`, `closed`)
- `priority` (optional) - Filter by priority (`low`, `medium`, `high`, `urgent`)
- `category` (optional) - Filter by category

**Response (200 OK):**
```json
{
  "items": [
    {
      "ticketId": "ticket_abc123",
      "subject": "Issue with product verification",
      "category": "technical",
      "priority": "high",
      "status": "open",
      "createdAt": 1730385600,
      "updatedAt": 1730385600,
      "repliesCount": 2
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "hasMore": false
}
```

**Error Responses:**
- `401` - Unauthorized
- `500` - Internal server error

---

#### GET /api/support/tickets/:id

Get detailed information about a specific support ticket.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**URL Parameters:**
- `id` - Ticket ID

**Response (200 OK):**
```json
{
  "ticketId": "ticket_abc123",
  "userId": "uid_xyz",
  "subject": "Issue with product verification",
  "description": "I'm experiencing problems when verifying products via QR code",
  "category": "technical",
  "priority": "high",
  "status": "in_progress",
  "createdAt": 1730385600,
  "updatedAt": 1730385700,
  "replies": [
    {
      "replyId": "reply_xyz789",
      "message": "Thank you for reporting this. We're looking into it.",
      "authorId": "support_team",
      "authorName": "Support Team",
      "createdAt": 1730385650
    }
  ]
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Access denied (not your ticket)
- `404` - Ticket not found
- `500` - Internal server error

---

#### POST /api/support/tickets/:id/reply

Add a reply to a support ticket.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**URL Parameters:**
- `id` - Ticket ID

**Request Body:**
```json
{
  "message": "Thank you for the update. I'll try that solution."
}
```

**Fields:**
- `message` (required) - Reply message content

**Response (201 Created):**
```json
{
  "replyId": "reply_xyz789",
  "ticketId": "ticket_abc123",
  "message": "Thank you for the update. I'll try that solution.",
  "authorId": "uid_xyz",
  "createdAt": 1730385800
}
```

**Error Responses:**
- `401` - Unauthorized
- `400` - Missing message field
- `403` - Access denied (not your ticket)
- `404` - Ticket not found
- `500` - Internal server error

---

#### PUT /api/support/tickets/:id

Update ticket status or other fields (admin/support only).

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**URL Parameters:**
- `id` - Ticket ID

**Request Body:**
```json
{
  "status": "resolved",
  "priority": "medium"
}
```

**Fields (all optional):**
- `status` - New status (`open`, `in_progress`, `resolved`, `closed`)
- `priority` - New priority level
- `assignedTo` - User ID to assign ticket to

**Response (200 OK):**
```json
{
  "ticketId": "ticket_abc123",
  "status": "resolved",
  "updatedAt": 1730385900
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Access denied (admin/support role required)
- `404` - Ticket not found
- `500` - Internal server error

---

#### GET /api/alerts

Get in-app alerts and notifications for the authenticated user.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `pageSize` (optional, default: 20) - Items per page
- `severity` (optional) - Filter by severity (`info`, `warning`, `error`, `critical`)
- `read` (optional) - Filter by read status (`true`, `false`)

**Response (200 OK):**
```json
{
  "items": [
    {
      "alertId": "alert_abc123",
      "title": "New Support Ticket Reply",
      "message": "You have a new reply on ticket #ticket_abc123",
      "severity": "info",
      "read": false,
      "createdAt": 1730385600,
      "actionUrl": "/support/tickets/ticket_abc123"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "hasMore": false,
  "unreadCount": 1
}
```

**Error Responses:**
- `401` - Unauthorized
- `500` - Internal server error

---

### Security & Compliance

#### GET /api/gdpr/export

Export all personal data for the authenticated user in compliance with GDPR Article 15 (Right of Access).

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `format` (optional, default: `json`) - Export format (`json`, `csv`, `pdf`)

**Response (200 OK):**

For JSON format:
```json
{
  "userId": "uid_xyz",
  "exportedAt": 1730385600,
  "format": "json",
  "data": {
    "profile": {
      "email": "user@example.com",
      "displayName": "John Doe",
      "createdAt": 1727788800
    },
    "products": [...],
    "verifications": [...],
    "movements": [...],
    "tickets": [...]
  },
  "downloadUrl": "https://storage.example.com/exports/user_uid_xyz_2025-01-01.json",
  "expiresAt": 1730472000
}
```

For CSV/PDF formats, returns file download with appropriate headers.

**Note:** Export files are stored temporarily and expire after 7 days.

**Error Responses:**
- `401` - Unauthorized
- `500` - Internal server error

---

#### DELETE /api/gdpr/delete

Delete all personal data for the authenticated user in compliance with GDPR Article 17 (Right to Erasure).

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Request Body:**
```json
{
  "confirm": true,
  "reason": "User requested data deletion"
}
```

**Fields:**
- `confirm` (required) - Must be `true` to proceed
- `reason` (optional) - Reason for deletion

**Response (200 OK):**
```json
{
  "message": "All personal data has been deleted successfully",
  "deletedAt": 1730385600,
  "deletedItems": {
    "profile": true,
    "products": 125,
    "verifications": 342,
    "movements": 45,
    "tickets": 3
  },
  "anonymizedData": {
    "transactions": 500
  }
}
```

**Important Notes:**
- This action is **permanent and irreversible**
- All personal data is deleted
- Transaction data is anonymized (removes personal identifiers) but retained for audit/compliance purposes
- Some data may be retained for legal compliance (e.g., financial records)
- The user account will be deactivated

**Error Responses:**
- `401` - Unauthorized
- `400` - Missing confirmation or invalid request
- `500` - Internal server error

---

## Error Handling

All API endpoints return standard HTTP status codes and error responses in JSON format.

### Standard Error Response Format

```json
{
  "error": "Error message description",
  "details": "Additional error details (development only)",
  "code": "ERROR_CODE",
  "name": "ErrorName"
}
```

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request - Invalid input or missing required fields |
| `401` | Unauthorized - Invalid or missing authentication token |
| `403` | Forbidden - Insufficient permissions or access denied |
| `404` | Not Found - Resource not found |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error - Server error |

### Common Error Codes

- `UNAUTHORIZED` - Authentication required or token invalid
- `FORBIDDEN` - Access denied (permissions or organization)
- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource not found
- `INTERNAL` - Internal server error

### Example Error Response

```json
{
  "error": "Missing required fields: productId, type, from, to",
  "code": "VALIDATION_ERROR"
}
```

---

## Rate Limiting

Rate limiting is implemented to prevent API abuse. Current limits:

- **Default**: 100 requests per minute per user
- **Burst**: Up to 10 requests per second

When rate limit is exceeded, the API returns:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

Status code: `429 Too Many Requests`

---

## Examples

### Complete Product Registration Flow

```javascript
// 1. Authenticate user (Firebase Auth)
const user = firebase.auth().currentUser;
const token = await user.getIdToken();

// 2. Create product
const productResponse = await fetch('https://api.originx.com/api/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Brake Pad X1',
    sku: 'BPX1-2025',
    category: 'automotive',
    description: 'High-performance brake pad',
    image: base64ImageData,
    metadata: {
      brand: 'XYZ',
      model: 'Premium'
    }
  })
});

const product = await productResponse.json();
console.log('Product ID:', product.productId);
console.log('QR Code:', product.qr.pngDataUrl);
```

### Verify Product Flow

```javascript
// 1. Scan QR code (get encrypted data)
const qrEncrypted = scannedQRData;

// 2. Verify product
const verifyResponse = await fetch('https://api.originx.com/api/verify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    qrEncrypted: qrEncrypted,
    image: verificationImageBase64
  })
});

const verification = await verifyResponse.json();
console.log('Verdict:', verification.verdict);
console.log('AI Score:', verification.aiScore);
console.log('Risk Level:', verification.riskLevel);
```

### Create Movement and Record Handover

```javascript
// 1. Create movement
const movementResponse = await fetch('https://api.originx.com/api/movements', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productId: 'prod_9s8df7',
    productName: 'Brake Pad X1',
    type: 'outbound',
    from: 'Warehouse A',
    to: 'Warehouse B',
    quantity: 10,
    trackingNumber: 'TRACK123'
  })
});

const movement = await movementResponse.json();
console.log('Movement ID:', movement.movementId);

// 2. Record handover when delivered
const handoverResponse = await fetch(
  `https://api.originx.com/api/movements/${movement.movementId}/handover`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      handedOverBy: 'John Doe',
      receivedBy: 'Jane Smith',
      handoverLocation: 'Warehouse B',
      condition: 'excellent',
      updateStatus: true
    })
  }
);

const handover = await handoverResponse.json();
console.log('Handover recorded:', handover.handoverId);
```

### Batch Import Products

```javascript
// 1. Prepare form data
const formData = new FormData();
formData.append('file', csvFile);
formData.append('name', 'Q1 2025 Product Batch');

// 2. Upload batch
const batchResponse = await fetch('https://api.originx.com/api/batches/import', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const batch = await batchResponse.json();
console.log('Batch ID:', batch.batchId);
console.log('Status:', batch.status);
console.log('Processed:', batch.processedCount, '/', batch.totalCount);
```

### Get Analytics

```javascript
// Get analytics for last 30 days
const analyticsResponse = await fetch(
  'https://api.originx.com/api/analytics?startDate=1730304000000&endDate=1730390400000',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const analytics = await analyticsResponse.json();
console.log('Total Products:', analytics.kpis.totalProducts);
console.log('Counterfeit Rate:', analytics.kpis.counterfeitCount);
console.log('Loss Prevented:', `$${analytics.kpis.lossPrevented}`);
```

---

## Additional Notes

### Development Mode

In development mode, the API may return mock data or simplified responses when Firebase is not fully configured. Look for the `warning` field in responses.

### Transaction Immutability

All transactions are immutable (write-once). Once created, transactions cannot be modified or deleted. This ensures a complete audit trail.

### Organization Isolation

Non-admin users are automatically scoped to their organization. All queries filter by `orgId` unless the user has admin role.

### QR Code Security

QR codes are encrypted using AES encryption. The encryption secret is stored server-side and never exposed to clients.

### Image Uploads

Product images and verification images are uploaded to Cloudinary. The API accepts base64-encoded images or Cloudinary URLs.

---

## Support

For API support, questions, or feature requests:
- Email: support@originx.com
- Documentation: https://docs.originx.com
- GitHub Issues: https://github.com/originx/issues

---

**End of API Documentation**

