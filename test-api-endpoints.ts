/**
 * API Testing Script
 * Tests all Movement, Logistics, Analytics, and Transaction APIs
 * 
 * Tests included:
 * 1. Create Movement
 * 2. Get Movements
 * 3. Handover Movement
 * 4. Get Transactions
 * 5. Create QC Log
 * 6. Get Analytics
 * 7. Export Report
 * 8. Get Transaction by Hash
 * 
 * Usage:
 * 1. Make sure you're logged into the app in your browser
 * 2. Open browser console (F12)
 * 3. Get your Firebase Auth token (see instructions below)
 * 4. Copy this entire script and run in console
 * 5. Or use with curl/Postman using the examples
 */

// ============================================
// SETUP: Get your Firebase Auth Token
// ============================================
// In browser console, run:
// const auth = firebase.auth();
// auth.currentUser.getIdToken().then(token => console.log('Token:', token));

const BASE_URL = 'http://localhost:3000'; // Change to your production URL if needed

// Hardcoded test token (works in development mode only)
let AUTH_TOKEN = 'test-token-originx-12345-hardcoded-for-testing'; // Hardcoded for testing

// ============================================
// TEST 1: POST /api/movements
// ============================================
async function testCreateMovement() {
  console.log('\n🧪 TEST 1: POST /api/movements');
  
  const response = await fetch(`${BASE_URL}/api/movements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      productId: 'test-product-123',
      productName: 'Test Brake Pad X1',
      type: 'inbound', // 'inbound' | 'outbound' | 'transfer'
      from: 'Supplier Warehouse',
      to: 'Main Warehouse',
      status: 'pending',
      quantity: 10,
      trackingNumber: `TRACK-${Date.now()}`,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Test movement creation via API',
    }),
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Success!');
    console.log('Movement ID:', data.movementId);
    console.log('Transaction:', data.transaction);
    return data;
  } else {
    console.error('❌ Failed:', data.error);
    throw new Error(data.error);
  }
}

// ============================================
// TEST 2: GET /api/movements
// ============================================
async function testGetMovements(filters?: {
  type?: string;
  status?: string;
  productId?: string;
  page?: number;
  pageSize?: number;
}) {
  console.log('\n🧪 TEST 2: GET /api/movements');
  
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.productId) params.append('productId', filters.productId);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());

  const url = `${BASE_URL}/api/movements${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Success!');
    console.log('Total movements:', data.total);
    console.log('Items:', data.items?.length || 0);
    console.log('Sample movement:', data.items?.[0]);
    return data;
  } else {
    console.error('❌ Failed:', data.error);
    throw new Error(data.error);
  }
}

// ============================================
// TEST 3: POST /api/movements/:id/handover
// ============================================
async function testHandoverMovement(movementId: string) {
  console.log('\n🧪 TEST 3: POST /api/movements/:id/handover');
  
  if (!movementId) {
    console.error('❌ Movement ID is required');
    return null;
  }

  const response = await fetch(`${BASE_URL}/api/movements/${movementId}/handover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      handedOverBy: 'John Doe (Sender)',
      receivedBy: 'Jane Smith (Receiver)',
      handoverLocation: 'Main Warehouse Dock A',
      handoverNotes: 'All items verified and in good condition',
      condition: 'Good',
      signature: 'digital_signature_data_here', // Optional
      updateStatus: true, // Update movement to "delivered"
    }),
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Success!');
    console.log('Handover ID:', data.handoverId);
    console.log('Transaction:', data.transaction);
    return data;
  } else {
    console.error('❌ Failed:', data.error);
    throw new Error(data.error);
  }
}

// ============================================
// TEST 4: GET /api/transactions
// ============================================
async function testGetTransactions(filters?: {
  type?: string;
  refType?: string;
  refId?: string;
  productId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  console.log('\n🧪 TEST 4: GET /api/transactions');
  
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.refType) params.append('refType', filters.refType);
  if (filters?.refId) params.append('refId', filters.refId);
  if (filters?.productId) params.append('productId', filters.productId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());

  const url = `${BASE_URL}/api/transactions${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Success!');
    console.log('Total transactions:', data.total);
    console.log('Items:', data.items?.length || 0);
    console.log('Sample transaction:', data.items?.[0]);
    return data;
  } else {
    console.error('❌ Failed:', data.error);
    throw new Error(data.error);
  }
}

// ============================================
// TEST 5: POST /api/movements/:id/qc
// ============================================
async function testCreateQCLog(movementId: string) {
  console.log('\n🧪 TEST 5: POST /api/movements/:id/qc');
  
  if (!movementId) {
    console.error('❌ Movement ID is required');
    return null;
  }

  const response = await fetch(`${BASE_URL}/api/movements/${movementId}/qc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      qcResult: 'passed', // 'passed' | 'failed' | 'pending'
      qcNotes: 'All items passed quality control inspection',
      defects: [],
      images: [],
      approvedBy: 'Quality Manager',
      updateStatus: true,
    }),
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Success!');
    console.log('QC Log ID:', data.qcId);
    console.log('Movement Status:', data.movement.status);
    console.log('Transaction:', data.transaction);
    return data;
  } else {
    console.error('❌ Failed:', data.error);
    throw new Error(data.error);
  }
}

// ============================================
// TEST 6: GET /api/analytics
// ============================================
async function testGetAnalytics(startDate?: number, endDate?: number) {
  console.log('\n🧪 TEST 6: GET /api/analytics');
  
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate.toString());
  if (endDate) params.append('endDate', endDate.toString());

  const url = `${BASE_URL}/api/analytics${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Success!');
    console.log('KPIs:', data.kpis);
    console.log('Trends:', {
      dailyMovements: data.trends?.dailyMovements?.length || 0,
      verificationSuccessRate: data.trends?.verificationSuccessRate?.length || 0,
      counterfeitRate: data.trends?.counterfeitRate?.length || 0,
    });
    console.log('Recent Activity:', data.recentActivity);
    return data;
  } else {
    console.error('❌ Failed:', data.error);
    throw new Error(data.error);
  }
}

// ============================================
// TEST 7: GET /api/reports
// ============================================
async function testExportReport(
  reportType: 'products' | 'verifications' | 'movements' | 'analytics' = 'verifications',
  format: 'csv' | 'excel' | 'pdf' = 'csv',
  startDate?: number,
  endDate?: number
) {
  console.log(`\n🧪 TEST 7: GET /api/reports (${reportType} as ${format})`);
  
  const params = new URLSearchParams({
    type: reportType,
    format: format,
  });
  if (startDate) params.append('startDate', startDate.toString());
  if (endDate) params.append('endDate', endDate.toString());

  const url = `${BASE_URL}/api/reports?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  if (response.ok) {
    const blob = await response.blob();
    const text = await blob.text();
    console.log('✅ Success!');
    console.log('Report Size:', blob.size, 'bytes');
    console.log('Content Type:', response.headers.get('content-type'));
    console.log('Preview (first 200 chars):', text.substring(0, 200));
    return { blob, text };
  } else {
    const data = await response.json();
    console.error('❌ Failed:', data.error);
    throw new Error(data.error);
  }
}

// ============================================
// TEST 8: GET /api/transactions/:txHash
// ============================================
async function testGetTransactionByHash(txHash: string) {
  console.log('\n🧪 TEST 8: GET /api/transactions/:txHash');
  
  if (!txHash) {
    console.error('❌ Transaction hash is required');
    return null;
  }

  const response = await fetch(`${BASE_URL}/api/transactions/${txHash}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ Success!');
    console.log('Transaction details:', data);
    return data;
  } else {
    console.error('❌ Failed:', data.error);
    throw new Error(data.error);
  }
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runAllTests() {
  console.log('🚀 Starting API Tests...\n');
  console.log('Base URL:', BASE_URL);
  
  if (!AUTH_TOKEN) {
    console.error('❌ AUTH_TOKEN is not set! Please get your Firebase token first.');
    console.log('Run in browser console: firebase.auth().currentUser.getIdToken().then(t => console.log(t))');
    return;
  }

  try {
    // Test 1: Create Movement
    const movement = await testCreateMovement();
    const movementId = movement?.movementId;
    const txHash = movement?.transaction?.txHash;

    // Test 2: Get Movements
    await testGetMovements({ type: 'inbound', page: 1, pageSize: 10 });
    
    // Test 3: Handover Movement (if movement was created)
    if (movementId) {
      await testHandoverMovement(movementId);
    }
    
    // Test 4: Get Transactions
    const transactions = await testGetTransactions({ 
      type: 'MOVEMENT', 
      page: 1, 
      pageSize: 10 
    });
    
    // Test 5: Create QC Log (if movement was created)
    if (movementId) {
      await testCreateQCLog(movementId);
    }
    
    // Test 6: Get Analytics
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    await testGetAnalytics(thirtyDaysAgo, Date.now());
    
    // Test 7: Export Report
    await testExportReport('verifications', 'csv', thirtyDaysAgo, Date.now());
    
    // Test 8: Get Transaction by Hash (if we have one)
    if (txHash) {
      await testGetTransactionByHash(txHash);
    } else if (transactions?.items?.[0]?.txHash) {
      await testGetTransactionByHash(transactions.items[0].txHash);
    }

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testCreateMovement,
    testGetMovements,
    testHandoverMovement,
    testCreateQCLog,
    testGetAnalytics,
    testExportReport,
    testGetTransactions,
    testGetTransactionByHash,
    runAllTests,
  };
}

// Run tests if executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  console.log('Run this script in browser console or use curl/Postman examples');
}

