# Postman Testing Guide for OriginX API

## Using the Test Token

The hardcoded test token `test-token-originx-12345-hardcoded-for-testing` works for testing API endpoints in development mode.

## Setup Instructions

### 1. Authorization Header Format

In Postman, set up your request with the following header:

**Header Name:** `Authorization`  
**Header Value:** `Bearer test-token-originx-12345-hardcoded-for-testing`

**Important:** 
- Include the word "Bearer" followed by a space
- The token must be exactly: `test-token-originx-12345-hardcoded-for-testing`
- No extra spaces or quotes

### 2. Postman Setup Steps

1. Open Postman
2. Create a new request (or open an existing one)
3. Go to the **Headers** tab
4. Add a new header:
   - **Key:** `Authorization`
   - **Value:** `Bearer test-token-originx-12345-hardcoded-for-testing`
5. Set your request method (GET, POST, etc.)
6. Set your URL (e.g., `http://localhost:3000/api/movements`)
7. For POST requests, add your JSON body in the **Body** tab

### 3. Alternative: Using Postman Authorization Tab

1. Go to the **Authorization** tab
2. Select **Type:** `Bearer Token`
3. In the **Token** field, enter: `test-token-originx-12345-hardcoded-for-testing`
4. Postman will automatically format it as `Bearer {token}`

### 4. Example Requests

#### GET Movements
```
GET http://localhost:3000/api/movements
Headers:
  Authorization: Bearer test-token-originx-12345-hardcoded-for-testing
```

#### POST Create Movement
```
POST http://localhost:3000/api/movements
Headers:
  Authorization: Bearer test-token-originx-12345-hardcoded-for-testing
  Content-Type: application/json
Body:
{
  "productId": "test-product-123",
  "productName": "Test Product",
  "type": "inbound",
  "from": "Supplier Warehouse",
  "to": "Main Warehouse",
  "quantity": 10
}
```

## Troubleshooting

### Error: "Unauthorized - Missing or invalid authorization header"
- Check that the header is named exactly `Authorization` (case-sensitive)
- Ensure the value starts with `Bearer ` (with a space after "Bearer")
- Verify there are no extra spaces or quotes

### Error: "Invalid or expired token"
- Verify the token is exactly: `test-token-originx-12345-hardcoded-for-testing`
- Check that your server is running in development mode (not production)
- Ensure `NODE_ENV` is not set to `production`

### Error: 500 Internal Server Error
- Check server logs for detailed error messages
- Verify Firebase is configured (or test token will work but return empty data)
- Ensure the server is running: `npm run dev`

## Test Token - How It Works

### ✅ **YES - It Connects to REAL Firebase Data!**

When you use the test token `test-token-originx-12345-hardcoded-for-testing`:

1. **Authentication Bypass**: The token bypasses Firebase Auth verification and creates a test user (`test-user-123`) with admin role
2. **Real Firebase Connection**: After authentication, ALL data operations connect to **REAL Firebase Firestore**:
   - ✅ Creates/reads/writes to your actual Firestore database
   - ✅ Queries real collections (movements, transactions, products, etc.)
   - ✅ All data is stored in and retrieved from your Firebase project
3. **Only if Firebase is NOT configured**: Returns empty/mock data as fallback

### Test Token Limitations

⚠️ **Important:** The test token:
- Only works when `NODE_ENV !== 'production'`
- Returns mock/test user data for authentication (uid: `test-user-123`, role: `admin`)
- **BUT** all data operations use **REAL Firebase Firestore** (if configured)
- If Firebase is not configured, returns empty/mock data
- **Should NOT be used in production**

### What Gets Stored

When using the test token:
- ✅ Movements created via POST → Stored in **real Firestore** `movements` collection
- ✅ Transactions → Stored in **real Firestore** `transactions` collection  
- ✅ Products → Stored in **real Firestore** `products` collection
- ✅ All data is **real** and **persistent** in your Firebase project

### To Use Real Data

1. **Firebase must be configured** with environment variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

2. **Restart your dev server** after setting environment variables

3. **Test token will then use REAL Firebase data** for all operations

## For Production Testing

For production environments, you need to:
1. Use real Firebase authentication
2. Get a valid Firebase ID token
3. Use that token in the Authorization header

## Available Test Endpoints

- `GET /api/movements` - List movements
- `POST /api/movements` - Create movement
- `GET /api/transactions` - List transactions
- `GET /api/products` - List products
- `POST /api/products` - Create product
- And more... (see API documentation)