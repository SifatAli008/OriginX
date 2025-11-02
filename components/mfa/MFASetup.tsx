"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Smartphone, Mail, MessageSquare } from "lucide-react";
import { useAppSelector } from "@/lib/store";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { MFAMethod } from "@/lib/types/user";

interface MFASetupProps {
  onComplete?: () => void;
}

export default function MFASetup({ onComplete }: MFASetupProps) {
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  const handleMethodSelect = async (method: MFAMethod) => {
    setSelectedMethod(method);
    setError(null);
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      if (!auth || !user) {
        setError("Authentication required");
        return;
      }

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError("Failed to get authentication token");
        return;
      }

      const response = await fetch("/api/auth/mfa/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ method }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "Failed to setup MFA");
        return;
      }

      if (method === "totp") {
        setQrCode(data.qrCode);
        setSecret(data.secret);
      }
    } catch (err) {
      setError("Failed to setup MFA. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTOTP = async () => {
    if (!verificationCode || !secret) {
      setError("Please enter the verification code");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      if (!auth || !user) {
        setError("Authentication required");
        return;
      }

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError("Failed to get authentication token");
        return;
      }

      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: "totp",
          code: verificationCode,
          secret: secret,
          setup: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "Verification failed");
        return;
      }

      setBackupCodes(data.backupCodes || []);
      setSuccess(true);
      if (onComplete) {
        setTimeout(() => onComplete(), 2000);
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  if (success) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h3 className="text-xl font-semibold">MFA Enabled Successfully!</h3>
          {backupCodes.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Save these backup codes:</p>
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                {backupCodes.map((code, i) => (
                  <div key={i} className="p-2 bg-background rounded">
                    {code}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Store these codes securely. You&apos;ll need them if you lose access to your authenticator app.
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (selectedMethod === "totp" && qrCode) {
    return (
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="TOTP QR Code" className="border rounded-lg" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="verify-code">Enter 6-digit code from your app</Label>
          <Input
            id="verify-code"
            type="text"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="text-center text-lg tracking-widest"
          />
        </div>
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedMethod(null);
              setQrCode(null);
              setSecret(null);
            }}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleVerifyTOTP}
            disabled={verificationCode.length !== 6 || verifying}
            className="flex-1"
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Enable"
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose MFA Method</h3>
        <p className="text-sm text-muted-foreground">
          Select a method to add an extra layer of security to your account
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => handleMethodSelect("totp")}
          disabled={loading}
          className="p-4 border rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50"
        >
          <Smartphone className="h-8 w-8 mb-2 text-primary" />
          <h4 className="font-semibold mb-1">Authenticator App</h4>
          <p className="text-xs text-muted-foreground">
            Use Google Authenticator or similar apps
          </p>
          {loading && selectedMethod === "totp" && (
            <Loader2 className="h-4 w-4 animate-spin mt-2" />
          )}
        </button>

        <button
          onClick={() => handleMethodSelect("email")}
          disabled={loading}
          className="p-4 border rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50"
        >
          <Mail className="h-8 w-8 mb-2 text-primary" />
          <h4 className="font-semibold mb-1">Email OTP</h4>
          <p className="text-xs text-muted-foreground">
            Receive codes via email
          </p>
          {loading && selectedMethod === "email" && (
            <Loader2 className="h-4 w-4 animate-spin mt-2" />
          )}
        </button>

        <button
          onClick={() => handleMethodSelect("sms")}
          disabled={loading}
          className="p-4 border rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50"
        >
          <MessageSquare className="h-8 w-8 mb-2 text-primary" />
          <h4 className="font-semibold mb-1">SMS OTP</h4>
          <p className="text-xs text-muted-foreground">
            Receive codes via SMS
          </p>
          {loading && selectedMethod === "sms" && (
            <Loader2 className="h-4 w-4 animate-spin mt-2" />
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </Card>
  );
}

