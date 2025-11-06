# OriginX - Anti-Counterfeit Platform

A Next.js platform for supply chain management and product authentication using blockchain simulation and QR code encryption.

## Features

- **Product Management**: Register products, generate encrypted QR codes, batch imports
- **Movement Tracking**: Track shipments and transfers with handover records
- **Verification System**: QR code verification with AI-powered counterfeit detection
- **Blockchain Ledger**: Immutable transaction history
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
