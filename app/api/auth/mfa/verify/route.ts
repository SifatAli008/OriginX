import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { verifyTOTPToken, verifyBackupCode } from "@/lib/auth/mfa/utils";
import { getUserDocument, updateMFAConfig } from "@/lib/firebase/firestore";
import { generateBackupCodes } from "@/lib/auth/mfa/utils";

/**
 * POST /api/auth/mfa/verify
 * Verify MFA code (Email OTP, SMS OTP, or TOTP)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing authorization", status: 401 } },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid token", status: 401 } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { method, code, secret, setup } = body; // setup=true for initial TOTP setup

    const userDoc = await getUserDocument(decodedToken.uid);
    if (!userDoc) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found", status: 404 } },
        { status: 404 }
      );
    }

    if (method === "totp") {
      if (setup && secret) {
        // Initial TOTP setup - verify the token
        const isValid = verifyTOTPToken(code, secret);
        if (!isValid) {
          return NextResponse.json(
            { error: { code: "INVALID_CODE", message: "Invalid TOTP code", status: 400 } },
            { status: 400 }
          );
        }

        // Generate backup codes
        const backupCodes = generateBackupCodes();

        // Update MFA config in Firestore
        await updateMFAConfig(decodedToken.uid, true, {
          method: "totp",
          totpSecret: secret, // In production, encrypt before storing
          backupCodes: backupCodes.map(code => 
            Buffer.from(code).toString("base64") // Simple encoding - use proper hashing in production
          ),
        });

        return NextResponse.json({
          success: true,
          message: "TOTP MFA enabled successfully",
          backupCodes: backupCodes, // Show once - user should save these
        });
      } else {
        // Verify existing TOTP code
        const storedSecret = userDoc.mfaConfig?.totpSecret;
        if (!storedSecret) {
          return NextResponse.json(
            { error: { code: "NOT_SETUP", message: "TOTP not set up", status: 400 } },
            { status: 400 }
          );
        }

        // Check if it's a backup code
        if (userDoc.mfaConfig?.backupCodes) {
          const isBackupCode = verifyBackupCode(code, userDoc.mfaConfig.backupCodes);
          if (isBackupCode) {
            // Remove used backup code
            const updatedBackupCodes = userDoc.mfaConfig.backupCodes.filter(
              bc => bc !== Buffer.from(code).toString("base64")
            );
            await updateMFAConfig(decodedToken.uid, true, {
              backupCodes: updatedBackupCodes,
            });

            return NextResponse.json({
              success: true,
              message: "Backup code verified",
              usedBackupCode: true,
            });
          }
        }

        const isValid = verifyTOTPToken(code, storedSecret);
        if (!isValid) {
          return NextResponse.json(
            { error: { code: "INVALID_CODE", message: "Invalid TOTP code", status: 400 } },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "TOTP code verified",
        });
      }
    } else if (method === "email" || method === "sms") {
      // Verify OTP code (in production, check against stored OTP in session/database)
      // This is a placeholder - implement proper OTP verification
      
      // For now, accept any 6-digit code in development
      if (process.env.NODE_ENV === "development" && /^\d{6}$/.test(code)) {
        return NextResponse.json({
          success: true,
          message: "OTP code verified",
        });
      }

      return NextResponse.json(
        { error: { code: "INVALID_CODE", message: "Invalid OTP code", status: 400 } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid method", status: 400 } },
      { status: 400 }
    );
  } catch (error) {
    console.error("MFA verify error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}

