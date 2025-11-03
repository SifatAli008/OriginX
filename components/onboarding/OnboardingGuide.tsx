/**
 * Onboarding Guide Component
 * Interactive step-by-step guide for new users
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  HelpCircle,
  Package,
  Shield,
  BarChart3,
  Truck,
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  action?: {
    label: string;
    url: string;
  };
}

interface OnboardingGuideProps {
  role: "sme" | "supplier" | "warehouse" | "auditor" | "admin";
  onComplete?: () => void;
  onDismiss?: () => void;
}

export default function OnboardingGuide({ role, onComplete, onDismiss }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const steps: OnboardingStep[] = getStepsForRole(role);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(new Set([...completedSteps, stepId]));
  };

  const handleComplete = () => {
    // Mark onboarding as completed
    localStorage.setItem(`onboarding_${role}_completed`, "true");
    onComplete?.();
  };

  const handleDismiss = () => {
    localStorage.setItem(`onboarding_${role}_dismissed`, "true");
    onDismiss?.();
  };

  const currentStepData = steps[currentStep];

  return (
    <Card className="fixed inset-4 z-50 bg-gray-900 border-gray-800 shadow-2xl max-w-4xl mx-auto">
      <CardHeader className="border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-blue-400" />
            <CardTitle className="text-white">Welcome to OriginX</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 h-2 rounded-full transition-all ${
                index <= currentStep
                  ? "bg-blue-500"
                  : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Step icon */}
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            {currentStepData.icon}
          </div>

          {/* Step content */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-gray-400 mb-4">
              {currentStepData.description}
            </p>

            {currentStepData.content}

            {currentStepData.action && (
              <Button
                className="mt-4"
                onClick={() => {
                  window.location.href = currentStepData.action!.url;
                  handleStepComplete(currentStepData.id);
                }}
              >
                {currentStepData.action.label}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "bg-blue-500 w-8"
                    : index < currentStep
                    ? "bg-blue-400"
                    : "bg-gray-600"
                }`}
              />
            ))}
          </div>

          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? "Get Started" : "Next"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getStepsForRole(role: string): OnboardingStep[] {
  const baseSteps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to OriginX",
      description: "Let's get you started with anti-counterfeiting and supply chain tracking.",
      icon: <Shield className="h-8 w-8 text-blue-400" />,
      content: (
        <div className="text-gray-300 space-y-2">
          <p>OriginX helps you:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Register products with encrypted QR codes</li>
            <li>Track products through the supply chain</li>
            <li>Verify product authenticity</li>
            <li>Prevent counterfeiting</li>
          </ul>
        </div>
      ),
    },
  ];

  switch (role) {
    case "sme":
    case "supplier":
      return [
        ...baseSteps,
        {
          id: "register-products",
          title: "Register Your Products",
          description: "Create products and generate secure QR codes for each item.",
          icon: <Package className="h-8 w-8 text-blue-400" />,
          content: (
            <div className="text-gray-300">
              <p>Start by registering your products:</p>
              <ol className="list-decimal list-inside space-y-1 mt-2 ml-4">
                <li>Go to Products → New Product</li>
                <li>Fill in product details</li>
                <li>Upload product images</li>
                <li>Generate encrypted QR code</li>
              </ol>
            </div>
          ),
          action: {
            label: "Create Your First Product",
            url: "/products/new",
          },
        },
        {
          id: "track-movements",
          title: "Track Product Movements",
          description: "Record shipments and transfers throughout your supply chain.",
          icon: <Truck className="h-8 w-8 text-blue-400" />,
          content: (
            <div className="text-gray-300">
              <p>Monitor product movements:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                <li>Create outbound shipments</li>
                <li>Track delivery status</li>
                <li>Record handovers</li>
                <li>View movement history</li>
              </ul>
            </div>
          ),
          action: {
            label: "View Movements",
            url: "/movements",
          },
        },
        {
          id: "verify-products",
          title: "Verify Authenticity",
          description: "Use the verification system to check product authenticity.",
          icon: <Shield className="h-8 w-8 text-blue-400" />,
          content: (
            <div className="text-gray-300">
              <p>Verify products using QR codes:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                <li>Scan QR codes to verify</li>
                <li>Get AI-powered authenticity scores</li>
                <li>Track verification history</li>
                <li>Identify counterfeit attempts</li>
              </ul>
            </div>
          ),
          action: {
            label: "Try Verification",
            url: "/verify",
          },
        },
      ];

    case "warehouse":
      return [
        ...baseSteps,
        {
          id: "qc-process",
          title: "Quality Control Process",
          description: "Perform QC checks on incoming and outgoing shipments.",
          icon: <CheckCircle2 className="h-8 w-8 text-blue-400" />,
          content: (
            <div className="text-gray-300">
              <p>Your QC workflow:</p>
              <ol className="list-decimal list-inside space-y-1 mt-2 ml-4">
                <li>Review incoming movements</li>
                <li>Perform QC inspections</li>
                <li>Record QC results</li>
                <li>Approve or reject shipments</li>
              </ol>
            </div>
          ),
          action: {
            label: "View QC Logs",
            url: "/qc-logs",
          },
        },
      ];

    case "auditor":
      return [
        ...baseSteps,
        {
          id: "analytics",
          title: "Analytics & Reporting",
          description: "Access comprehensive analytics and generate compliance reports.",
          icon: <BarChart3 className="h-8 w-8 text-blue-400" />,
          content: (
            <div className="text-gray-300">
              <p>Available tools:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                <li>View KPIs and trends</li>
                <li>Export reports (CSV, Excel, PDF)</li>
                <li>Track verification history</li>
                <li>Audit transaction logs</li>
              </ul>
            </div>
          ),
          action: {
            label: "View Analytics",
            url: "/analytics",
          },
        },
      ];

    default:
      return baseSteps;
  }
}

