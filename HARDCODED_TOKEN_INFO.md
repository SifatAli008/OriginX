# Hardcoded Test Token

## Token
```
test-token-originx-12345-hardcoded-for-testing
```

## Usage
Use this token in the `Authorization` header:
```
Authorization: Bearer test-token-originx-12345-hardcoded-for-testing
```

## Test User Details
- **UID:** `test-user-123`
- **Email:** `test@originx.com`
- **Role:** `admin`
- **Organization ID:** `test-org-123`
- **Organization Name:** `Test Organization`

## Important Notes

1. **Development Only:** This token only works when `NODE_ENV === 'development'`
2. **Not for Production:** Will be automatically rejected in production builds
3. **Always Available:** Token never expires, perfect for automated testing

## Example cURL Commands

### Create Movement
```bash
curl -X POST http://localhost:3000/api/movements \
  -H "Authorization: Bearer test-token-originx-12345-hardcoded-for-testing" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "test-123",
    "productName": "Test Product",
    "type": "inbound",
    "from": "Supplier",
    "to": "Warehouse"
  }'
```

### Create Handover
```bash
curl -X POST http://localhost:3000/api/movements/MOVEMENT_ID/handover \
  -H "Authorization: Bearer test-token-originx-12345-hardcoded-for-testing" \
  -H "Content-Type: application/json" \
  -d '{
    "handedOverBy": "John Doe",
    "receivedBy": "Jane Smith",
    "handoverLocation": "Main Warehouse",
    "handoverNotes": "Items verified",
    "updateStatus": true
  }'
```

### Create QC Log
```bash
curl -X POST http://localhost:3000/api/movements/MOVEMENT_ID/qc \
  -H "Authorization: Bearer test-token-originx-12345-hardcoded-for-testing" \
  -H "Content-Type: application/json" \
  -d '{
    "qcResult": "passed",
    "qcNotes": "All items passed inspection",
    "defects": []
  }'
```

### Get Analytics
```bash
curl -X GET "http://localhost:3000/api/analytics?startDate=1704067200000&endDate=1735689600000" \
  -H "Authorization: Bearer test-token-originx-12345-hardcoded-for-testing"
```

### Export Report
```bash
curl -X GET "http://localhost:3000/api/reports?type=verifications&format=csv" \
  -H "Authorization: Bearer test-token-originx-12345-hardcoded-for-testing" \
  --output verifications_report.csv
```

## Test Files

- `test-api.html` - Already has token pre-filled
- `test-api-endpoints.ts` - Token is hardcoded as default value

