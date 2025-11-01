"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { AuthGuard } from "@/lib/middleware/auth-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, CheckCircle2, XCircle } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { getUserDocument, updateMFAConfig } from "@/lib/firebase/firestore";
import MFASetup from "@/components/mfa/MFASetup";

export default function MFASettingsPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const loadMFASettings = async () => {
      if (!user) return;

      try {
        const userDoc = await getUserDocument(user.uid);
        if (userDoc) {
          setMfaEnabled(userDoc.mfaEnabled);
          setMfaMethod(userDoc.mfaConfig?.method || null);
        }
      } catch (error) {
        console.error("Error loading MFA settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMFASettings();
  }, [user]);

  const handleDisableMFA = async () => {
    if (!user) return;

    if (!confirm("Are you sure you want to disable MFA? This will make your account less secure.")) {
      return;
    }

    try {
      await updateMFAConfig(user.uid, false);
      setMfaEnabled(false);
      setMfaMethod(null);
    } catch (error) {
      console.error("Error disabling MFA:", error);
      alert("Failed to disable MFA. Please try again.");
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    setMfaEnabled(true);
    // Reload user data
    window.location.reload();
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8" />
            Multi-Factor Authentication
          </h1>
          <p className="text-muted-foreground mt-2">
            Add an extra layer of security to your account
          </p>
        </div>

        {showSetup ? (
          <div className="space-y-4">
            <Button variant="outline" onClick={() => setShowSetup(false)}>
              ← Back to Settings
            </Button>
            <MFASetup onComplete={handleSetupComplete} />
          </div>
        ) : (
          <Card className="p-6">
            {mfaEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <div>
                      <h3 className="font-semibold">MFA is Enabled</h3>
                      <p className="text-sm text-muted-foreground">
                        Method: {mfaMethod?.toUpperCase() || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <Button variant="destructive" onClick={handleDisableMFA}>
                    Disable MFA
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-semibold mb-2">MFA is Not Enabled</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enable multi-factor authentication to secure your account
                  </p>
                  <Button onClick={() => setShowSetup(true)}>
                    Enable MFA
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}

