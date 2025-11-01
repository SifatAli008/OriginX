import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { generateTOTPSecret, generateTOTPQRCode, generateOTPCode } from "@/lib/auth/mfa/utils";
import { getUserDocument } from "@/lib/firebase/firestore";

/**
 * POST /api/auth/mfa/challenge
 * Request MFA challenge (Email OTP, SMS OTP, or TOTP setup)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header", status: 401 } },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const auth = getFirebaseAuth();
    if (!auth) {
      return NextResponse.json(
        { error: { code: "INTERNAL", message: "Firebase not configured", status: 500 } },
        { status: 500 }
      );
    }

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid token", status: 401 } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { method } = body; // "email", "sms", or "totp"

    if (!["email", "sms", "totp"].includes(method)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid MFA method", status: 400 } },
        { status: 400 }
      );
    }

    const userDoc = await getUserDocument(decodedToken.uid);
    if (!userDoc) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found", status: 404 } },
        { status: 404 }
      );
    }

    if (method === "totp") {
      // Generate TOTP secret and QR code for setup
      const secret = generateTOTPSecret();
      const qrCodeDataUrl = await generateTOTPQRCode(
        userDoc.email,
        secret,
        "OriginX"
      );

      // Store secret temporarily (in production, store securely server-side)
      // For now, we'll return it to client for setup (not recommended for production)
      // In production, store in a secure server-side session/database
      return NextResponse.json({
        success: true,
        method: "totp",
        secret, // In production, don't send secret to client
        qrCode: qrCodeDataUrl,
        message: "Scan QR code with authenticator app",
      });
    } else if (method === "email") {
      // Generate email OTP code
      const otpCode = generateOTPCode();

      // TODO: Send email with OTP (implement email service)
      // For now, we'll store it temporarily and return it (NOT FOR PRODUCTION)
      // In production: store in secure session/database, send email, don't return code

      console.log(`[DEV ONLY] Email OTP for ${userDoc.email}: ${otpCode}`);
      
      // Store OTP temporarily (in production, use Redis or secure session)
      // This is a placeholder - implement proper storage
      return NextResponse.json({
        success: true,
        method: "email",
        // In production, don't return the code
        otpCode: process.env.NODE_ENV === "development" ? otpCode : undefined,
        message: "OTP code sent to email",
      });
    } else if (method === "sms") {
      // Generate SMS OTP code
      const otpCode = generateOTPCode();

      // TODO: Send SMS with OTP (implement SMS service like Twilio)
      // For now, we'll return it (NOT FOR PRODUCTION)

      console.log(`[DEV ONLY] SMS OTP for ${userDoc.email}: ${otpCode}`);
      
      return NextResponse.json({
        success: true,
        method: "sms",
        // In production, don't return the code
        otpCode: process.env.NODE_ENV === "development" ? otpCode : undefined,
        message: "OTP code sent via SMS",
      });
    }

    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Unexpected error", status: 500 } },
      { status: 500 }
    );
  } catch (error) {
    console.error("MFA challenge error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}

