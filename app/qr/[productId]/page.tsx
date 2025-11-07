/**
 * Public QR Code Product Page
 * /qr/[productId] - Public page showing product info and all hashes
 * 
 * This page is accessible to anyone who scans a product QR code.
 * No authentication required.
 */

import QRProductContent from "./QRProductContent";

export const metadata = {
  title: "Product Verification | OriginX",
  description: "Verify product authenticity and view complete transaction history",
  robots: "index, follow",
};

export default function QRProductPage() {
  return <QRProductContent />;
}

