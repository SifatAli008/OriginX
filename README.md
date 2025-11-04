# OriginX - Anti-Counterfeit Platform

A Next.js web platform for supply chain management, product tracking, and anti-counterfeit verification using blockchain simulation and QR code encryption.

## Overview

OriginX enables manufacturers, warehouses, suppliers, and auditors to:
- Register and track products through the supply chain
- Generate encrypted QR codes for product authentication
- Monitor product movements and handovers
- Verify product authenticity with AI-powered scoring
- View immutable transaction history
- Generate analytics and reports

## Key Features

- **User Authentication**: Multi-factor authentication with role-based access control (Admin, SME, Warehouse, Supplier, Auditor)
- **Product Management**: Register products, generate encrypted QR codes, batch imports
- **Movement Tracking**: Track shipments and transfers with handover records and quality control logs
- **Verification System**: QR code verification with AI-powered counterfeit detection
- **Blockchain Ledger**: Immutable transaction history for all product events
- **Analytics Dashboard**: KPIs, trends, and insights for supply chain monitoring
- **Reporting**: Generate and export reports in multiple formats

## Technology Stack

- **Frontend**: Next.js 16.0.1 (App Router), TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Authentication**: Firebase Auth with MFA support
- **Database**: Firestore (NoSQL)
- **Storage**: Firebase Storage, Cloudinary for images
- **Deployment**: Vercel

## Prerequisites

- Node.js 18 or higher
- Firebase project with Authentication, Firestore, and Storage enabled
- Cloudinary account (optional, for image uploads)

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/SifatAli008/OriginX.git
cd OriginX
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure Firebase in `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

5. Run the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Production Build

```bash
npm run build
npm start
```

## Project Structure

```
app/
├── (auth)/          # Authentication pages
├── dashboard/       # Role-based dashboards
├── products/        # Product management
├── movements/       # Shipment tracking
├── blockchain/      # Transaction explorer
├── verify/          # Product verification
└── api/             # API routes

components/          # Reusable UI components
lib/                 # Utilities and helpers
  ├── firebase/      # Firebase configuration
  ├── auth/          # Authentication utilities
  └── store/         # Redux store
```

## User Roles

- **Admin**: Full system access, user management, analytics
- **SME/Supplier**: Product registration, batch management
- **Warehouse**: Movement tracking, quality control, handovers
- **Auditor**: Read-only access to transactions and reports

## API Endpoints

### Authentication
- `POST /api/auth/mfa/challenge` - Request MFA verification
- `POST /api/auth/mfa/verify` - Complete MFA verification

### Products
- `GET /api/products` - List products with filters
- `POST /api/products` - Create new product
- `GET /api/products/:id` - Get product details

### Movements
- `GET /api/movements` - List movements
- `POST /api/movements` - Create movement
- `POST /api/movements/:id/qc` - Record quality control check
- `POST /api/movements/:id/handover` - Record handover event

### Verification
- `POST /api/verify` - Verify product via QR code

### Analytics
- `GET /api/analytics` - Get KPIs and trends

### Transactions
- `GET /api/transactions` - List blockchain transactions
- `GET /api/transactions/:txHash` - Get transaction details

All endpoints require authentication via Firebase ID token in the `Authorization: Bearer <token>` header.

## Security

- Firebase Authentication with multi-factor authentication support
- Firestore security rules enforce role-based access control
- AES-256 encryption for QR code payloads
- Immutable transaction ledger for audit trails
- Rate limiting on API endpoints

## Environment Variables

Required Firebase variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Optional:
- `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` for image uploads
- `QR_AES_SECRET` for QR code encryption

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel Dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm install -g vercel
vercel --prod
```

### Firebase Deployment

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
```

## Troubleshooting

### Firebase Authentication Domain Error

If you encounter `auth/unauthorized-domain`:
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your domain (localhost for development, production domain for deployment)
3. For local network access, add your IP address (e.g., `192.168.0.100`)

### User Profile Not Found

If you see "User profile not found" errors:
1. Ensure you have completed registration
2. Check that AuthListener has created your user document
3. Refresh the page to allow AuthListener to complete

## Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Blockchain Implementation](./BLOCKCHAIN_IMPLEMENTATION_VERIFICATION.md) - Transaction ledger details
- [Firebase Connection Summary](./FIREBASE_CONNECTION_SUMMARY.md) - Firestore collections and rules

## License

This project is proprietary software. All rights reserved.

## Support

For issues and questions, please contact the development team or create an issue in the repository.
