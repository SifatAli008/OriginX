# Firebase Connection Summary

This document outlines all Firebase Firestore collections, security rules, and API connections for the OriginX platform.

## Firestore Collections

### ✅ Core Collections

1. **users** - User accounts and profiles
   - Authentication: Firebase Auth
   - Access: Role-based (admin, sme, supplier, warehouse, auditor)
   - Location: `lib/firebase/firestore.ts`

2. **orgs** - Organizations/Companies
   - Access: Read-all, Write-admin only
   - Location: `lib/firebase/firestore.ts`

3. **products** - Product catalog
   - API: `app/api/products/route.ts`
   - Immutable: Updates disabled via Firestore rules
   - Location: Firestore `products` collection

4. **batches** - Batch import records
   - API: `app/api/batches/import/route.ts`
   - Location: Firestore `batches` collection

5. **verifications** - QR code verification records
   - API: `app/api/verify/route.ts`
   - Immutable: Updates/deletes disabled
   - Fields: `riskLevel`, `aiScore`, `confidence`, `factors`
   - Location: Firestore `verifications` collection

6. **transactions** - Blockchain ledger (append-only)
   - API: `app/api/transactions/route.ts`
   - Types: `PRODUCT_REGISTER`, `VERIFY`, `MOVEMENT`, `QC_LOG`
   - Immutable: Updates/deletes disabled
   - Location: Firestore `transactions` collection

### ✅ Movement & Logistics Collections (3.5)

7. **movements** - Shipment and transfer records
   - API: `app/api/movements/route.ts`
   - Client: `app/movements/page.tsx`
   - Fields: `type`, `status`, `from`, `to`, `trackingNumber`
   - Updates: Warehouse/admin only
   - Location: Firestore `movements` collection

8. **handovers** - Digital handover logs
   - API: 
     - Create: `app/api/movements/[id]/handover/route.ts`
     - List: `app/api/handovers/route.ts` ✅ NEW
   - Immutable: Updates/deletes disabled
   - Fields: `movementId`, `handedOverBy`, `receivedBy`, `handoverLocation`, `condition`
   - Location: Firestore `handovers` collection

9. **qc_logs** - Quality control logs
   - API:
     - Create: `app/api/movements/[id]/qc/route.ts`
     - List: `app/api/qc-logs/route.ts` ✅ NEW
   - Client: `app/qc-logs/page.tsx` ✅ CONNECTED
   - Immutable: Updates/deletes disabled
   - Fields: `movementId`, `qcResult`, `qcInspector`, `qcNotes`, `defects`, `images`
   - Location: Firestore `qc_logs` collection

### ✅ Analytics & Reports Collections (3.7)

10. **analytics** - Fetched from multiple collections
    - API: `app/api/analytics/route.ts`
    - Client: `app/analytics/page.tsx`
    - Sources: `products`, `verifications`, `movements`, `transactions`
    - KPIs: Total products, verifications, counterfeit count, loss prevented
    - Trends: Daily movements, verification success rate, counterfeit rate

11. **reports** - Generated dynamically
    - API: `app/api/reports/route.ts`
    - Formats: CSV, Excel (CSV), PDF (JSON)
    - Sources: `products`, `verifications`, `movements`

## Firebase Security Rules

Location: `firestore.rules`

### ✅ Authentication Helper
```javascript
function isAuthenticated() {
  return request.auth != null;
}

function userDocExists() {
  return isAuthenticated() && exists(/databases/$(database)/documents/users/$(request.auth.uid));
}
```

### ✅ Collection Rules

| Collection | Get | List | Create | Update | Delete |
|------------|-----|------|--------|--------|--------|
| **users** | Own/Admin | Authenticated | Own/Admin | Own/Admin | Admin |
| **orgs** | Authenticated | Authenticated | Admin | Admin | Admin |
| **products** | Authenticated | Authenticated | Authenticated | ❌ Disabled | Admin |
| **batches** | Org Match | Authenticated | Authenticated | Org Match | Admin |
| **movements** | Authenticated | Authenticated | Authenticated | Warehouse/Admin | Admin |
| **handovers** | Authenticated | Authenticated | Authenticated | ❌ Immutable | ❌ Immutable |
| **qc_logs** | Authenticated | Authenticated | Authenticated | ❌ Immutable | ❌ Immutable |
| **verifications** | Authenticated | Authenticated | Authenticated | ❌ Immutable | ❌ Immutable |
| **transactions** | Authenticated | Authenticated | Authenticated | ❌ Immutable | ❌ Immutable |

## API Routes & Firebase Integration

### ✅ Server-Side (Next.js API Routes)

All API routes use:
1. **Firebase Auth Token Verification**: `lib/auth/verify-token.ts`
2. **User Document Lookup**: `lib/firebase/firestore.ts` - `getUserDocument()`
3. **Firestore Access**: Dynamic imports for server-side compatibility

#### Product APIs
- `POST /api/products` - Create product → Firestore `products` collection
- `GET /api/products` - List products → Firestore query with org filtering
- Batch Import: `POST /api/batches/import` → Creates multiple products + batch record

#### Verification APIs
- `POST /api/verify` - QR verification → Firestore `verifications` collection
  - Stores: `riskLevel`, `aiScore`, `confidence`, `factors`
  - Creates: `VERIFY` transaction

#### Movement APIs
- `POST /api/movements` - Create movement → Firestore `movements` collection
  - Creates: `MOVEMENT` transaction
- `GET /api/movements` - List movements → Firestore query with filters
- `POST /api/movements/:id/handover` - Record handover → Firestore `handovers` collection
  - Creates: `MOVEMENT` transaction (with handover metadata)
- `POST /api/movements/:id/qc` - QC check → Firestore `qc_logs` collection
  - Creates: `QC_LOG` transaction
  - Updates: Movement status (if `updateStatus` = true)

#### Transaction APIs
- `GET /api/transactions` - List transactions → Firestore `transactions` collection
- `GET /api/transactions/:txHash` - Get transaction by hash → Firestore query

#### Analytics APIs
- `GET /api/analytics` - Aggregated KPIs and trends
  - Queries: `products`, `verifications`, `movements`, `transactions`
  - Calculates: KPIs, trends, recent activity

#### Report APIs
- `GET /api/reports` - Export reports
  - Queries: `products`, `verifications`, `movements`
  - Formats: CSV, Excel (CSV), PDF (JSON)

#### New List APIs ✅
- `GET /api/qc-logs` - List QC logs → Firestore `qc_logs` collection
- `GET /api/handovers` - List handovers → Firestore `handovers` collection

### ✅ Client-Side (React Components)

All client-side components use:
1. **Firebase Auth**: `lib/firebase/client.ts` - `getFirebaseAuth()`
2. **API Calls**: Fetch with Bearer token from `auth.currentUser.getIdToken()`

#### Connected Components

1. **Dashboard** (`app/dashboard/page.tsx`)
   - Role-based dashboards
   - Navigation links synced
   - Analytics quick actions

2. **Movements** (`app/movements/page.tsx`)
   - ✅ Fetches from `/api/movements`
   - ✅ Uses Firebase Auth token
   - QC/Handover buttons (ready for modals)

3. **QC Logs** (`app/qc-logs/page.tsx`)
   - ✅ Fetches from `/api/qc-logs` (NEW)
   - ✅ Uses Firebase Auth token
   - ✅ Connected to Firestore `qc_logs` collection

4. **Analytics** (`app/analytics/page.tsx`)
   - ✅ Fetches from `/api/analytics`
   - ✅ Uses Firebase Auth token
   - ✅ Displays KPIs, trends, charts

5. **Blockchain** (`app/blockchain/page.tsx`)
   - ✅ Fetches from `/api/transactions`
   - ✅ Uses Firebase Auth token

6. **Verify** (`app/verify/page.tsx`)
   - ✅ Posts to `/api/verify`
   - ✅ Displays `riskLevel` with color coding

## Firebase Initialization

### Server-Side
- Location: `lib/firebase/client.ts`
- Function: `getFirebaseApp()`
- Usage: Dynamic imports in API routes

### Client-Side
- Location: `lib/firebase/client.ts`
- Exports: `getFirebaseAuth()`, `getFirestore()`, `getFirebaseApp()`
- Provider: `components/providers/AuthListener.tsx`

## Transaction Flow (Blockchain Simulation)

1. **Product Registration**:
   - Create product → Firestore `products`
   - Create `PRODUCT_REGISTER` transaction → Firestore `transactions`

2. **QR Verification**:
   - Create verification → Firestore `verifications`
   - Create `VERIFY` transaction → Firestore `transactions`

3. **Movement Creation**:
   - Create movement → Firestore `movements`
   - Create `MOVEMENT` transaction → Firestore `transactions`

4. **Handover**:
   - Create handover → Firestore `handovers`
   - Create `MOVEMENT` transaction (with handover metadata) → Firestore `transactions`

5. **QC Check**:
   - Create QC log → Firestore `qc_logs`
   - Update movement status (if requested) → Firestore `movements`
   - Create `QC_LOG` transaction → Firestore `transactions`

## Data Flow Summary

```
Client Component
    ↓
Firebase Auth Token (getIdToken)
    ↓
API Route (/api/*)
    ↓
verifyIdToken() → getUserDocument()
    ↓
Firestore Query (collection, query, where, etc.)
    ↓
Firestore Collection (products, movements, verifications, etc.)
    ↓
Response to Client
```

## Verification Checklist

- ✅ All collections have Firestore security rules
- ✅ All API routes use Firebase Auth verification
- ✅ All API routes use Firestore for data access
- ✅ Client components use Firebase Auth for token generation
- ✅ Client components call API routes (not direct Firestore access)
- ✅ Immutable collections enforced (transactions, verifications, handovers, qc_logs)
- ✅ Role-based access control in API routes
- ✅ Organization-based data filtering (non-admin users)
- ✅ Transaction creation for all events
- ✅ Analytics API aggregates from Firestore
- ✅ Reports API queries Firestore

## Production Readiness

### ✅ Ready for Production
- Firestore security rules deployed
- API authentication working
- Client-side auth integration
- Data persistence working
- Transaction immutability enforced

### 📝 Production Deployment Steps
1. Deploy Firestore security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

2. Ensure environment variables set:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

3. Verify Firebase project configuration in production

---

**Status**: ✅ **ALL FIREBASE CONNECTIONS VERIFIED**

