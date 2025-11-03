# Manual Testing Guide - OriginX Platform

This guide provides step-by-step instructions for manually testing all features of the OriginX platform.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [3.1 Authentication & Access Control](#31-authentication--access-control)
3. [3.2 Product Registration & Management](#32-product-registration--management)
4. [3.3 QR Verification](#33-qr-verification)
5. [3.4 Blockchain (Simulated Ledger)](#34-blockchain-simulated-ledger)
6. [3.5 Movement & Logistics](#35-movement--logistics)
7. [3.6 AI Counterfeit Detection](#36-ai-counterfeit-detection)
8. [3.7 Analytics & Reports](#37-analytics--reports)

---

## Prerequisites

1. **Start the Development Server**
   ```bash
   npm run dev
   ```
   - Server should run on `http://localhost:3000`

2. **Firebase Configuration**
   - Ensure Firebase is properly configured
   - Firestore database is accessible
   - Authentication is enabled

3. **Test Users**
   - Admin: `admin@originx.com` (auto-creates with admin role)
   - Regular user: Any email (will need company registration)

4. **Test Data**
   - Have sample CSV/XLS file ready for batch import testing
   - Prepare product images for upload

---

## 3.1 Authentication & Access Control

### Test 1.1: User Registration

#### Steps:
1. Navigate to `http://localhost:3000/register`
2. Fill in the registration form:
   - **Name**: Test User
   - **Email**: `testuser@example.com` (or any email)
   - **Password**: `TestPassword123!` (must meet requirements)
3. Click **"Create Account"**
4. Observe password strength indicator

#### Expected Results:
- ✅ Password strength indicator shows "Strong" with green bar
- ✅ Account is created successfully
- ✅ Redirected to `/register-company` (for non-admin users)
- ✅ Admin user (`admin@originx.com`) goes directly to dashboard

#### Test Cases:
- ✅ Weak password (should show warning)
- ✅ Missing required fields (should show validation errors)
- ✅ Invalid email format (should show error)

---

### Test 1.2: User Login (Email/Password)

#### Steps:
1. Navigate to `http://localhost:3000/login`
2. Enter credentials:
   - **Email**: `testuser@example.com`
   - **Password**: `TestPassword123!`
3. Click **"Sign In"**
4. If MFA is enabled, verify MFA code (see Test 1.4)

#### Expected Results:
- ✅ Successful login
- ✅ Redirected to dashboard
- ✅ User role displayed in sidebar
- ✅ Role-appropriate navigation items visible

#### Test Cases:
- ✅ Invalid credentials (should show error)
- ✅ Empty fields (should show validation)
- ✅ Admin login bypasses company registration

---

### Test 1.3: Google OAuth Login

#### Steps:
1. Navigate to `http://localhost:3000/login`
2. Click **"Continue with Google"** button
3. Complete Google OAuth flow
4. Select account and authorize

#### Expected Results:
- ✅ Google OAuth popup opens
- ✅ Account selection successful
- ✅ Redirected to dashboard
- ✅ User document created in Firestore

---

### Test 1.4: MFA Setup (Google Authenticator/TOTP)

#### Steps:
1. Login to the system
2. Navigate to **Settings** (if available) or MFA setup page
3. Click **"Enable MFA"** or **"Setup Multi-Factor Authentication"**
4. Select **"Authenticator App"** option
5. Scan QR code with Google Authenticator (or similar app)
6. Enter 6-digit code from authenticator app
7. Click **"Verify and Enable"**

#### Expected Results:
- ✅ QR code displayed for scanning
- ✅ Secret key generated
- ✅ Code verification successful
- ✅ MFA enabled confirmation message
- ✅ Backup codes displayed (if implemented)

#### Alternative: Email OTP Setup

1. Select **"Email OTP"** method
2. Click **"Send Code"**
3. Check email/console for OTP code (development mode)
4. Enter code and verify

#### Expected Results:
- ✅ OTP code generated
- ✅ Code displayed in console (dev mode) or sent via email
- ✅ Verification successful

#### Alternative: SMS OTP Setup

1. Select **"SMS OTP"** method
2. Enter phone number
3. Click **"Send Code"**
4. Enter received code

#### Expected Results:
- ✅ SMS OTP sent (if SMS service configured)
- ✅ Code verification successful

---

### Test 1.5: MFA Login Flow

#### Steps:
1. Login with user that has MFA enabled
2. After entering credentials, MFA verification screen appears
3. Enter 6-digit code from authenticator app (or OTP)
4. Click **"Verify"**

#### Expected Results:
- ✅ MFA prompt appears after initial login
- ✅ Invalid code shows error
- ✅ Valid code proceeds to dashboard
- ✅ "Remember this device" option works (if implemented)

---

### Test 1.6: Role-Based Dashboard Access

#### Steps:
1. **Login as Admin** (`admin@originx.com`):
   - Check dashboard navigation
   - Verify admin-only features visible
   
2. **Login as SME**:
   - Check dashboard navigation
   - Verify SME-specific features
   
3. **Login as Supplier**:
   - Check dashboard navigation
   - Verify supplier-specific features
   
4. **Login as Warehouse**:
   - Check dashboard navigation
   - Verify warehouse-specific features
   
5. **Login as Auditor**:
   - Check dashboard navigation
   - Verify auditor-specific features

#### Expected Results:
- ✅ Each role sees appropriate navigation items
- ✅ Admin sees all features
- ✅ Non-admin users see limited features
- ✅ Role-specific dashboards load correctly

---

### Test 1.7: Firestore Security Rules

#### Steps:
1. Login as non-admin user
2. Try to access admin-only Firestore collections via browser console:
   ```javascript
   // This should fail if rules are working
   const db = getFirestore();
   const usersRef = collection(db, "users");
   // Try to read other users' data
   ```

#### Expected Results:
- ✅ Access denied for unauthorized operations
- ✅ Users can only read their own data
- ✅ Admin can read all data
- ✅ Organization-based isolation works

---

## 3.2 Product Registration & Management

### Test 2.1: Single Product Registration

#### Steps:
1. Login as SME, Supplier, or Admin
2. Navigate to **Products** → **New Product** (or `/products/new`)
3. Fill in product form:
   - **Product Name**: Test Product 001
   - **SKU**: SKU-001-TEST
   - **Category**: Electronics (or any category)
   - **Description**: Test product description
   - **Brand**: Test Brand
   - **Model**: Model X1
   - **Serial Number**: SN-12345
   - **Manufacturer ID**: MFG-001
4. **Upload Product Image**:
   - Click "Choose File" or drag & drop
   - Select an image file (JPG, PNG)
   - Wait for upload to complete
5. Click **"Register Product"**

#### Expected Results:
- ✅ Image uploads to Cloudinary successfully
- ✅ QR code is generated and displayed
- ✅ Product saved to Firestore `products` collection
- ✅ PRODUCT_REGISTER transaction created
- ✅ Success message displayed
- ✅ QR code image is downloadable

#### Verify in Firestore:
- Check `products` collection for new product
- Verify `transactions` collection has PRODUCT_REGISTER entry
- Verify `txHash` is unique
- Verify `blockNumber` is assigned

---

### Test 2.2: Batch Product Import (CSV/XLS)

#### Steps:
1. Login as SME, Supplier, or Admin
2. Navigate to **Products** → **Batch Import** (or `/products/batch-import`)
3. Download the template CSV (if available)
4. Prepare CSV file with columns:
   ```
   name,sku,category,description,brand,model,serialNumber,manufacturerId
   Product A,SKU-A,Electronics,Description A,Brand A,Model A,SN-A,MFG-A
   Product B,SKU-B,Clothing,Description B,Brand B,Model B,SN-B,MFG-B
   Product C,SKU-C,Food,Description C,Brand C,Model C,SN-C,MFG-C
   ```
5. Click **"Choose File"** and select CSV file
6. Click **"Upload and Process"**
7. Monitor progress indicator

#### Expected Results:
- ✅ File upload successful
- ✅ Progress indicator shows processing
- ✅ Products are parsed from CSV
- ✅ Each product is registered individually
- ✅ QR codes generated for each product
- ✅ Batch document created in `batches` collection
- ✅ Multiple PRODUCT_REGISTER transactions created
- ✅ Success message with count of imported products

#### Test Cases:
- ✅ Invalid CSV format (should show error)
- ✅ Missing required columns (should show error)
- ✅ Empty rows (should be skipped)
- ✅ Duplicate SKUs (should handle gracefully)

---

### Test 2.3: Product List View

#### Steps:
1. Navigate to **Products** page (`/products`)
2. View product list
3. Test filters (if available):
   - Filter by category
   - Filter by brand
   - Search by name/SKU
4. Click on a product to view details

#### Expected Results:
- ✅ Products displayed in list/grid view
- ✅ Filters work correctly
- ✅ Search functionality works
- ✅ Product details page loads
- ✅ QR code visible on product card/details

---

### Test 2.4: QR Code Generation

#### Steps:
1. Register a new product (see Test 2.1)
2. After registration, QR code should be displayed
3. Click **"Download QR Code"** (if available)
4. Inspect QR code data:
   - Scan QR code with phone camera
   - Verify encrypted data structure

#### Expected Results:
- ✅ QR code image generated successfully
- ✅ QR code is scannable
- ✅ Contains encrypted payload
- ✅ Download works (saves image file)

#### Verify QR Payload (Optional):
- Decrypt QR code payload (requires secret key)
- Verify contains: `{ productId, manufacturerId, orgId, timestamp }`

---

## 3.3 QR Verification

### Test 3.1: QR Code Verification (Valid Product)

#### Steps:
1. Login to the system
2. Navigate to **Verify Product** (`/verify`) or from sidebar
3. **Option A - Paste Encrypted QR Data**:
   - Register a product (see Test 2.1)
   - Copy the encrypted QR code string from product details
   - Paste into verification input field
   
4. **Option B - Scan QR Code**:
   - Click camera icon (if camera integration available)
   - Scan QR code from product
   
5. **(Optional) Upload Verification Image**:
   - Click "Upload Image"
   - Select product photo
   
6. Click **"Verify Product"**

#### Expected Results:
- ✅ QR code decrypted successfully
- ✅ Product found in database
- ✅ Verification result displayed:
   - **Verdict**: GENUINE, SUSPICIOUS, FAKE, or INVALID
   - **AI Score**: 0-100 percentage
   - **Confidence**: Confidence level
   - **Product Details**: Name, SKU, manufacturer, etc.
- ✅ Verification document created in `verifications` collection
- ✅ VERIFY transaction created in `transactions` collection

---

### Test 3.2: QR Code Verification (Invalid/Fake)

#### Steps:
1. Navigate to `/verify`
2. Enter invalid/fake QR code string:
   ```
   0xINVALID1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ
   ```
3. Click **"Verify Product"**

#### Expected Results:
- ✅ Decryption fails or invalid structure
- ✅ Verdict: **INVALID**
- ✅ AI Score: Low (< 40)
- ✅ Error message displayed
- ✅ Verification record created with INVALID status

---

### Test 3.3: QR Code Verification (Expired/Old)

#### Steps:
1. Create a QR code with old timestamp (simulate by modifying QR payload)
2. Verify the QR code

#### Expected Results:
- ✅ QR code decrypted successfully
- ✅ Product found
- ✅ Verdict: **SUSPICIOUS** or **FAKE** (depending on age)
- ✅ AI Score: Lower due to timestamp factor
- ✅ Warning about old QR code

---

### Test 3.4: Verification History

#### Steps:
1. Navigate to **Verifications** page (if available)
2. View list of verifications
3. Filter by verdict, date, product
4. Click on a verification to view details

#### Expected Results:
- ✅ Verification list displays
- ✅ Filters work
- ✅ Details show full verification data
- ✅ Links to product and transaction

---

## 3.4 Blockchain (Simulated Ledger)

### Test 4.1: View Blockchain Transactions

#### Steps:
1. Login to the system
2. Navigate to **Blockchain** (`/blockchain`)
3. View transaction list
4. Observe statistics cards:
   - Total Transactions
   - Confirmed
   - Pending
   - Last Block

#### Expected Results:
- ✅ Transactions displayed in list
- ✅ Statistics cards show correct counts
- ✅ Transactions ordered by date (newest first)
- ✅ Each transaction shows:
   - Transaction Hash (txHash)
   - Block Number
   - Type (PRODUCT_REGISTER, VERIFY, etc.)
   - Status (confirmed, pending, failed)
   - Timestamp

---

### Test 4.2: Filter and Search Transactions

#### Steps:
1. On Blockchain page, use search box
2. Search by:
   - Transaction hash
   - Product ID
   - Product name
3. Use type filter dropdown:
   - Select "Product Registration"
   - Select "Verification"
   - Select "All Types"
4. Click refresh button

#### Expected Results:
- ✅ Search filters transactions correctly
- ✅ Type filter works
- ✅ Results update in real-time
- ✅ Empty state shown when no matches

---

### Test 4.3: View Transaction Details

#### Steps:
1. On Blockchain page, find a transaction
2. Click **"Details"** button
3. View transaction detail modal

#### Expected Results:
- ✅ Modal opens with full transaction details
- ✅ Shows:
   - Full transaction hash
   - Block number
   - Type and status
   - Reference type and ID
   - Organization ID
   - Created by user
   - Timestamps
   - Full payload (JSON)
- ✅ "View Product" link works (if applicable)
- ✅ Close button works

---

### Test 4.4: Verify Transaction Immutability

#### Steps:
1. Register a new product (creates PRODUCT_REGISTER transaction)
2. Go to Blockchain page
3. Find the new transaction
4. Note the transaction hash
5. Try to verify transaction exists in Firestore console:
   ```javascript
   // In browser console (as authenticated user)
   // Transaction should be readable but not writable
   ```

#### Expected Results:
- ✅ Transaction appears in blockchain explorer
- ✅ Transaction hash is unique
- ✅ Block number is sequential (incremented from previous)
- ✅ Transaction cannot be updated or deleted (Firestore rules prevent)

---

### Test 4.5: Transaction Type Coverage

#### Steps:
1. Perform various actions to generate transactions:
   - Register a product → PRODUCT_REGISTER
   - Verify a QR code → VERIFY
   - Create movement → MOVEMENT (see Test 4.7)
2. Check Blockchain page for each transaction type

#### Expected Results:
- ✅ All implemented transaction types appear
- ✅ Each has unique txHash
- ✅ Each has sequential block number
- ✅ Type labels are correct

---

### Test 4.7: Movement Transaction Creation

#### Steps:
1. Login as Warehouse, SME, Supplier, or Admin
2. Create a movement via API or UI:
   ```bash
   POST /api/movements
   Authorization: Bearer <token>
   Content-Type: application/json
   
   {
     "productId": "<product-id>",
     "productName": "Test Product",
     "type": "outbound",
     "from": "Warehouse A",
     "to": "Warehouse B",
     "status": "pending",
     "quantity": 1,
     "trackingNumber": "TRACK-001",
     "notes": "Test movement"
   }
   ```
3. Verify movement was created
4. Navigate to **Blockchain** page
5. Filter by type "Movement" or search for the movement ID

#### Expected Results:
- ✅ Movement created successfully
- ✅ MOVEMENT transaction created automatically
- ✅ Transaction appears on blockchain explorer
- ✅ Transaction has unique txHash
- ✅ Transaction has sequential block number
- ✅ Transaction payload contains movement metadata:
   - productId
   - productName
   - type (inbound/outbound/transfer)
   - from
   - to
   - status
   - quantity
   - trackingNumber

---

### Test 4.6: Sequential Block Numbers

#### Steps:
1. Note the "Last Block" number on Blockchain page
2. Register a new product
3. Refresh Blockchain page
4. Check new transaction's block number

#### Expected Results:
- ✅ New block number = Previous block number + 1
- ✅ Block numbers are sequential (not random)
- ✅ Starting block number is 1000

---

## Integration Testing

### Test 5.1: Complete Product Lifecycle

#### Steps:
1. **Register Product**:
   - Login as SME/Supplier
   - Register a new product
   - Note the product ID and QR code
   
2. **Verify Product**:
   - Login as any user (or same user)
   - Go to Verify page
   - Paste/scan QR code
   - Verify product authenticity
   
3. **Create Movement**:
   - Create a movement for the product (POST /api/movements)
   - Include the product ID from step 1
   
4. **Check Blockchain**:
   - Go to Blockchain page
   - Find PRODUCT_REGISTER transaction
   - Find VERIFY transaction
   - Find MOVEMENT transaction
   - Verify all transactions are linked to same product

#### Expected Results:
- ✅ Product registration creates transaction
- ✅ Verification creates transaction
- ✅ Movement creates transaction
- ✅ All transactions visible on blockchain
- ✅ Transactions linked by product ID
- ✅ Complete audit trail maintained
- ✅ Sequential block numbers (1000, 1001, 1002...)

---

### Test 5.3: Movement API Integration

#### Steps:
1. Login and get authentication token
2. Create a product first (to get productId)
3. Use API to create movement:
   ```bash
   curl -X POST http://localhost:3000/api/movements \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "productId": "<product-id>",
       "productName": "Test Product",
       "type": "outbound",
       "from": "Warehouse A",
       "to": "Warehouse B",
       "status": "pending",
       "quantity": 1
     }'
   ```
4. Verify response includes transaction details:
   - txHash
   - blockNumber
   - status
   - type

#### Expected Results:
- ✅ API returns 201 Created
- ✅ Response includes movementId
- ✅ Response includes transaction object
- ✅ Transaction has valid txHash
- ✅ Transaction has blockNumber
- ✅ MOVEMENT transaction created in Firestore

---

### Test 5.2: Role-Based Transaction Access

#### Steps:
1. Login as non-admin user
2. Go to Blockchain page
3. View transactions

#### Expected Results:
- ✅ Only see transactions from user's organization
- ✅ Cannot see other organizations' transactions
- ✅ Admin can see all transactions

---

## Troubleshooting

### Common Issues:

1. **MFA Not Working**:
   - Check if MFA is enabled for user
   - Verify TOTP secret is stored correctly
   - Check time sync on device

2. **QR Code Not Scanning**:
   - Verify QR code image quality
   - Check if QR code contains valid encrypted data
   - Ensure camera permissions granted

3. **Transactions Not Appearing**:
   - Check Firestore rules allow reading
   - Verify user is authenticated
   - Check organization ID matches

4. **Image Upload Fails**:
   - Verify Cloudinary configuration
   - Check file size limits
   - Ensure image format is supported

---

## Test Data Examples

### Sample CSV for Batch Import:
```csv
name,sku,category,description,brand,model,serialNumber,manufacturerId
iPhone 14 Pro,IPH-14-PRO,Electronics,Latest iPhone model,Apple,iPhone 14 Pro,SN-IPH001,MFG-APPLE
Samsung Galaxy S23,SAM-S23,Electronics,Android flagship,Samsung,Galaxy S23,SN-SAM001,MFG-SAMSUNG
MacBook Pro 16,MBP-16,Electronics,Professional laptop,Apple,MacBook Pro 16,SN-MBP001,MFG-APPLE
```

### Sample QR Code Test Data:
- Valid QR: Use encrypted string from registered product
- Invalid QR: `0xINVALID1234567890ABCDEF`
- Old QR: Create product, modify timestamp in QR payload

---

## 3.5 Movement & Logistics

### Test 5.1: Create Movement/Shipment

#### Steps:
1. Login as **Admin** or **Warehouse** user
2. Navigate to **Shipments** (`/movements`) or from sidebar
3. Click **"New Shipment"** button
4. Fill in movement form:
   - **Product ID**: Select from dropdown or enter manually
   - **Product Name**: Enter product name
   - **Type**: Select `inbound`, `outbound`, or `transfer`
   - **From**: Enter source location (e.g., "Supplier Warehouse")
   - **To**: Enter destination location (e.g., "Main Warehouse")
   - **Quantity**: Enter quantity (default: 1)
   - **Tracking Number**: Auto-generated or enter manually
   - **Estimated Delivery**: Select date (optional)
   - **Notes**: Add any notes (optional)
5. Click **"Create Movement"**

#### Expected Results:
- ✅ Movement created successfully
- ✅ Movement ID returned
- ✅ Status set to "pending" by default
- ✅ Automatic MOVEMENT transaction created
- ✅ Transaction hash displayed
- ✅ Movement appears in movements list

#### Verify in Blockchain:
- Navigate to **Blockchain** (`/blockchain`)
- Filter by type: `MOVEMENT`
- Find the transaction with the movement details
- Verify transaction hash matches

---

### Test 5.2: Record Digital Handover

#### Prerequisites:
- A movement must exist (create one via Test 5.1 or API)

#### Steps:
1. Login as **Warehouse** or **Admin** user
2. Navigate to **Shipments** (`/movements`)
3. Find a movement in the list
4. Click **"Handover"** button (visible to warehouse/admin)
5. Fill in handover form:
   - **Handed Over By**: Name of sender (auto-filled with current user)
   - **Received By**: Name of receiver
   - **Handover Location**: Location where handover occurs
   - **Condition**: Condition of items (e.g., "Good", "Damaged")
   - **Handover Notes**: Additional notes
   - **Update Status to Delivered**: Check if movement should be marked as delivered
6. Click **"Record Handover"**

#### Expected Results:
- ✅ Handover record created
- ✅ Handover ID returned
- ✅ Movement status updated (if `updateStatus` was true)
- ✅ Automatic MOVEMENT transaction created (with handover metadata)
- ✅ Handover appears in `handovers` collection
- ✅ Transaction visible in blockchain

#### Verify in Blockchain:
- Check blockchain for MOVEMENT transaction
- Verify payload contains handover details
- Verify transaction is immutable

---

### Test 5.3: Quality Control (QC) Check

#### Prerequisites:
- A movement must exist
- Must be logged in as **Warehouse** or **Admin** user

#### Steps:
1. Navigate to **Shipments** (`/movements`)
2. Find a movement in the list
3. Click **"QC Check"** button (visible to warehouse/admin)
4. Fill in QC form:
   - **QC Result**: Select `passed`, `failed`, or `pending`
   - **QC Notes**: Enter inspection notes
   - **Defects**: List any defects found (optional)
   - **Images**: Upload QC inspection images (optional)
   - **Approved By**: Name of approver (optional)
   - **Update Movement Status**: Check to auto-update movement status
5. Click **"Submit QC Check"**

#### Expected Results:
- ✅ QC log created
- ✅ QC Log ID returned
- ✅ Movement status updated based on QC result:
  - `passed` → status: `qc_passed`
  - `failed` → status: `qc_failed`
- ✅ Automatic QC_LOG transaction created
- ✅ QC log appears in `qc_logs` collection
- ✅ Transaction visible in blockchain

#### Test Cases:
- ✅ QC passed (movement status updates)
- ✅ QC failed (movement status updates)
- ✅ QC pending (movement status unchanged)
- ✅ Multiple QC logs for same movement (all immutable)

---

## 3.6 AI Counterfeit Detection

### Test 6.1: Verification with Risk Level

#### Steps:
1. Navigate to **Verify Product** (`/verify`)
2. Enter or scan a QR code (see Test 3.1)
3. Optionally upload a product image
4. Click **"Verify Product"**

#### Expected Results:
- ✅ Verification result displayed
- ✅ **Risk Level** shown:
  - `LOW` - Green indicator (safe)
  - `MEDIUM` - Yellow indicator (caution)
  - `HIGH` - Orange indicator (warning)
  - `CRITICAL` - Red indicator (critical)
- ✅ AI Score displayed (0-100)
- ✅ Confidence level displayed (0-100)
- ✅ Detailed factors listed with risk levels
- ✅ Risk level stored in `verifications` collection

#### Verify Risk Levels:
- **Low Risk**: Valid product, matching IDs, recent QR code
- **Medium Risk**: Missing image, some metadata mismatches
- **High Risk**: Metadata mismatches, suspicious patterns
- **Critical Risk**: Product not found, major inconsistencies

---

### Test 6.2: Verify Risk Scoring Factors

#### Test Different Scenarios:

1. **Genuine Product (Low Risk)**:
   - Product exists and is active
   - Manufacturer ID matches
   - Organization ID matches
   - Recent QR code timestamp
   - Verification image provided
   - **Expected**: Risk Level = LOW, Score ≥ 80

2. **Suspicious Product (Medium Risk)**:
   - Product exists but some mismatches
   - Missing verification image
   - Older QR code
   - **Expected**: Risk Level = MEDIUM, Score 60-79

3. **Counterfeit Product (High/Critical Risk)**:
   - Product not found
   - Manufacturer ID mismatch
   - Organization ID mismatch
   - Future timestamp in QR
   - **Expected**: Risk Level = HIGH/CRITICAL, Score < 60

---

## 3.7 Analytics & Reports

### Test 7.1: View Analytics Dashboard

#### Steps:
1. Login to the system
2. Navigate to **Analytics** (`/analytics`) from sidebar
3. View the analytics dashboard

#### Expected Results:
- ✅ **KPIs Section**:
  - Total Products count
  - Total Verifications count
  - Counterfeit Detected count
  - Loss Prevented (estimated $)
  - Verification breakdown (Genuine, Suspicious, Fake, Invalid)
- ✅ **Trend Charts**:
  - Daily Movements chart (bar chart)
  - Verification Success Rate chart (line chart)
  - Counterfeit Detection Rate chart (area chart)
- ✅ **Recent Activity**:
  - Verifications (last 24h)
  - Movements (last 24h)
  - Registrations (last 24h)

#### Verify Data:
- Check KPIs match actual counts
- Verify charts display correctly
- Check date ranges are correct

---

### Test 7.2: Export CSV Report

#### Steps:
1. Navigate to **Analytics** (`/analytics`)
2. Click **"Export CSV"** button
3. Report should download automatically

#### Expected Results:
- ✅ CSV file downloaded
- ✅ Filename: `verifications_report_YYYY-MM-DD.csv`
- ✅ File contains verification data:
  - ID, Product ID, Verdict, AI Score, Confidence, Verifier Name, Created At
- ✅ Data is properly formatted (CSV with headers)

#### Alternative via API:
```bash
curl -X GET "http://localhost:3000/api/reports?type=verifications&format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output verifications.csv
```

---

### Test 7.3: Export Excel Report

#### Steps:
1. Navigate to **Analytics** (`/analytics`) or use API
2. Export report with format: `excel`

#### Expected Results:
- ✅ Excel file downloaded (CSV format in MVP)
- ✅ Filename: `verifications_report_YYYY-MM-DD.xlsx`
- ✅ Data is properly formatted

#### Note:
- In MVP, Excel format returns CSV
- In Phase 2, will use proper Excel format with xlsx library

---

### Test 7.4: Export PDF Report

#### Steps:
1. Use API to export PDF:
```bash
curl -X GET "http://localhost:3000/api/reports?type=verifications&format=pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output report.pdf
```

#### Expected Results:
- ✅ PDF file downloaded
- ✅ Filename: `verifications_report_YYYY-MM-DD.pdf`
- ✅ Contains report data

#### Note:
- In MVP, PDF format returns JSON
- In Phase 2, will use proper PDF format with PDF library

---

### Test 7.5: Export Different Report Types

#### Test Each Type:

1. **Products Report**:
   ```bash
   curl -X GET "http://localhost:3000/api/reports?type=products&format=csv"
   ```
   - ✅ Contains: ID, Name, SKU, Category, Status, Org ID, Created At

2. **Movements Report**:
   ```bash
   curl -X GET "http://localhost:3000/api/reports?type=movements&format=csv"
   ```
   - ✅ Contains: ID, Product ID, Product Name, Type, From, To, Status, Tracking Number, Created At

3. **Verifications Report**:
   ```bash
   curl -X GET "http://localhost:3000/api/reports?type=verifications&format=csv"
   ```
   - ✅ Contains: ID, Product ID, Verdict, AI Score, Confidence, Verifier Name, Created At

---

### Test 7.6: Analytics Date Range Filtering

#### Steps:
1. Navigate to **Analytics** (`/analytics`)
2. Use API with date range:
   ```bash
   curl -X GET "http://localhost:3000/api/analytics?startDate=1704067200000&endDate=1735689600000"
   ```
3. Verify data matches date range

#### Expected Results:
- ✅ Only data within date range is included
- ✅ KPIs calculated for date range
- ✅ Trends filtered by date range

---

## Notes

1. **Development Mode**: Some features (like OTP codes) may return codes in console for testing
2. **Firestore Rules**: May need to deploy rules if testing in production
3. **Cloudinary**: Ensure environment variables are set
4. **Firebase Auth**: Ensure authentication is properly configured

---

## Success Criteria

✅ All features can be accessed and used
✅ No console errors
✅ Data persists correctly
✅ Security rules prevent unauthorized access
✅ Transactions are immutable
✅ QR codes work correctly
✅ MFA flows work as expected
✅ Role-based access works correctly

---

**End of Testing Guide**

