# Testing Checklist - Quick Reference

Use this checklist to track your manual testing progress.

## 3.1 Authentication & Access Control

- [ ] **Test 1.1**: User Registration
  - [ ] Valid registration succeeds
  - [ ] Password strength indicator works
  - [ ] Validation errors shown for invalid input
  - [ ] Admin user goes directly to dashboard

- [ ] **Test 1.2**: Email/Password Login
  - [ ] Successful login
  - [ ] Invalid credentials rejected
  - [ ] Redirect to dashboard works

- [ ] **Test 1.3**: Google OAuth Login
  - [ ] Google popup appears
  - [ ] OAuth flow completes
  - [ ] User document created

- [ ] **Test 1.4**: MFA Setup
  - [ ] TOTP (Google Authenticator) setup works
  - [ ] QR code scans correctly
  - [ ] Email OTP setup works
  - [ ] SMS OTP setup works (if configured)

- [ ] **Test 1.5**: MFA Login Flow
  - [ ] MFA prompt appears
  - [ ] Valid code accepts
  - [ ] Invalid code rejects

- [ ] **Test 1.6**: Role-Based Dashboards
  - [ ] Admin dashboard shows all features
  - [ ] SME dashboard shows SME features
  - [ ] Supplier dashboard shows supplier features
  - [ ] Warehouse dashboard shows warehouse features
  - [ ] Auditor dashboard shows auditor features

- [ ] **Test 1.7**: Firestore Security Rules
  - [ ] Non-admin cannot access admin data
  - [ ] Users can only see their org's data
  - [ ] Admin can access all data

---

## 3.2 Product Registration & Management

- [ ] **Test 2.1**: Single Product Registration
  - [ ] Form validation works
  - [ ] Image uploads to Cloudinary
  - [ ] QR code generated
  - [ ] Product saved to Firestore
  - [ ] PRODUCT_REGISTER transaction created

- [ ] **Test 2.2**: Batch Import (CSV/XLS)
  - [ ] CSV file upload works
  - [ ] Products parsed correctly
  - [ ] Multiple products registered
  - [ ] QR codes generated for each
  - [ ] Batch document created
  - [ ] Multiple transactions created

- [ ] **Test 2.3**: Product List View
  - [ ] Products display correctly
  - [ ] Filters work
  - [ ] Search works
  - [ ] Product details page loads

- [ ] **Test 2.4**: QR Code Generation
  - [ ] QR code image generated
  - [ ] QR code is scannable
  - [ ] Contains encrypted payload
  - [ ] Download works

---

## 3.3 QR Verification

- [ ] **Test 3.1**: Valid Product Verification
  - [ ] QR code decrypted successfully
  - [ ] Product found
  - [ ] Verdict displayed (GENUINE)
  - [ ] AI score calculated
  - [ ] Verification document created
  - [ ] VERIFY transaction created

- [ ] **Test 3.2**: Invalid QR Code
  - [ ] Invalid QR rejected
  - [ ] Verdict: INVALID
  - [ ] Error message shown
  - [ ] Verification record created

- [ ] **Test 3.3**: Old/Expired QR Code
  - [ ] Old QR detected
  - [ ] Verdict: SUSPICIOUS or FAKE
  - [ ] AI score reflects age

- [ ] **Test 3.4**: Verification History
  - [ ] Verification list displays
  - [ ] Filters work
  - [ ] Details page loads

---

## 3.4 Blockchain (Simulated Ledger)

- [ ] **Test 4.1**: View Transactions
  - [ ] Transactions list displays
  - [ ] Statistics cards show correct counts
  - [ ] Transaction details visible

- [ ] **Test 4.2**: Filter and Search
  - [ ] Search by hash works
  - [ ] Search by product ID works
  - [ ] Type filter works
  - [ ] Refresh works

- [ ] **Test 4.3**: Transaction Details
  - [ ] Modal opens
  - [ ] Full details displayed
  - [ ] Payload visible
  - [ ] Links work

- [ ] **Test 4.4**: Transaction Immutability
  - [ ] Transaction cannot be updated
  - [ ] Transaction cannot be deleted
  - [ ] Hash is unique

- [ ] **Test 4.5**: Transaction Types
  - [ ] PRODUCT_REGISTER appears
  - [ ] VERIFY appears
  - [ ] MOVEMENT appears
  - [ ] Types are labeled correctly

- [ ] **Test 4.6**: Sequential Block Numbers
  - [ ] Block numbers increment
  - [ ] Starting block is 1000
  - [ ] No gaps in sequence

- [ ] **Test 4.7**: Movement Transaction Creation
  - [ ] Movement API creates movement
  - [ ] MOVEMENT transaction created automatically
  - [ ] Transaction appears on blockchain
  - [ ] Transaction has unique txHash
  - [ ] Transaction payload contains movement data

---

## Integration Testing

- [ ] **Test 5.1**: Complete Product Lifecycle
  - [ ] Register product → Transaction created
  - [ ] Verify product → Transaction created
  - [ ] Create movement → Transaction created
  - [ ] All visible on blockchain
  - [ ] Linked by product ID
  - [ ] Sequential block numbers

- [ ] **Test 5.2**: Role-Based Transaction Access
  - [ ] Non-admin sees only org transactions
  - [ ] Admin sees all transactions

- [ ] **Test 5.3**: Movement API Integration
  - [ ] POST /api/movements works
  - [ ] Response includes transaction details
  - [ ] MOVEMENT transaction created in Firestore
  - [ ] GET /api/movements lists movements

---

## Test Results Summary

**Date**: _______________
**Tester**: _______________
**Environment**: Development / Production

**Total Tests**: ______
**Passed**: ______
**Failed**: ______
**Blocked**: ______

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________

---

## Quick Test Scenarios

### 🔥 Critical Paths (Test These First)

1. **Login → Register Product → Verify → Create Movement → View Blockchain**
   - Complete end-to-end flow with all transaction types

2. **Admin Login → View All Transactions**
   - Verify admin access
   - Verify all transaction types visible

3. **MFA Setup → Login with MFA**
   - Verify MFA flow works

4. **Batch Import → Check Multiple Transactions**
   - Verify batch processing
   - Multiple PRODUCT_REGISTER transactions created

5. **Movement API → Check Transaction**
   - Create movement via API
   - Verify MOVEMENT transaction created
   - Check sequential block number

6. **Handover → QC → Verify Transactions**
   - Create movement
   - Record handover
   - Perform QC check
   - Verify all transactions in blockchain

7. **Analytics → Reports → Verify Data**
   - View analytics dashboard
   - Export CSV report
   - Verify data accuracy

---

## Known Issues / Limitations

- [ ] Document any issues found during testing
- [ ] Note any missing features
- [ ] Log any error messages

---

**Happy Testing! 🚀**

