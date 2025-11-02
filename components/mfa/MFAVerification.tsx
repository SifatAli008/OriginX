"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, Shield } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { MFAMethod } from "@/lib/types/user";

interface MFAVerificationProps {
  method: MFAMethod;
  onVerify: (code: string) => Promise<void>;
  onCancel?: () => void;
}

export default function MFAVerification({ method, onVerify, onCancel }: MFAVerificationProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!code) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      if (!auth) {
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
          method,
          code: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "Verification failed");
        return;
      }

      await onVerify(code);
    } catch (err) {
      setError("Verification failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMethodLabel = () => {
    switch (method) {
      case "totp":
        return "authenticator app";
      case "email":
        return "email";
      case "sms":
        return "SMS";
      default:
        return "MFA code";
    }
  };

  const getCodeLength = () => {
    return method === "totp" ? 6 : 6;
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Two-Factor Authentication</h3>
        <p className="text-sm text-muted-foreground">
          Enter the {getCodeLength()}-digit code from your {getMethodLabel()}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="mfa-code">Verification Code</Label>
          <Input
            id="mfa-code"
            type="text"
            maxLength={getCodeLength()}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="text-center text-lg tracking-widest mt-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.length === getCodeLength()) {
                handleVerify();
              }
            }}
          />
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button
            onClick={handleVerify}
            disabled={code.length !== getCodeLength() || loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>
        </div>

        {method === "totp" && (
          <p className="text-xs text-center text-muted-foreground">
            Don&apos;t have access? Use a backup code instead.
          </p>
        )}
      </div>
    </Card>
  );
}

