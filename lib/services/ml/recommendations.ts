/**
 * Recommendation and Advisory Service
 * Supplier recommendation engine and compliance advisory
 */

// import { calculateFraudRisk } from "./predictive-analytics";

export interface SupplierProfile {
  supplierId: string;
  orgId: string;
  name: string;
  category?: string;
  location?: string;
  productCount: number;
  totalVerifications: number;
  successRate: number; // Percentage of GENUINE verifications
  averageRiskScore: number; // Lower is better
  fraudCount: number;
  averageQualityScore: number; // 0-100
  responseTime?: number; // Hours
  certifications?: string[];
  bstiCertified?: boolean;
  importLicense?: boolean;
}

interface SupplierRecommendation {
  supplierId: string;
  supplierName: string;
  matchScore: number; // 0-100 (higher = better match)
  confidence: number;
  reasons: string[];
  riskLevel: "low" | "medium" | "high";
  estimatedQuality: number;
  certifications?: string[];
}

interface ComplianceRisk {
  riskLevel: "low" | "medium" | "high" | "critical";
  category: "bsti" | "import_license" | "certification" | "documentation" | "quality_standard";
  description: string;
  recommendation: string;
  applicableRegulations?: string[];
  actionRequired: boolean;
}

interface ComplianceAdvisory {
  orgId: string;
  supplierId?: string;
  productId?: string;
  risks: ComplianceRisk[];
  overallRiskLevel: "low" | "medium" | "high" | "critical";
  recommendations: string[];
  applicableRegulations: string[];
  lastUpdated: number;
}

/**
 * Recommend suppliers to SMEs based on fraud risk and quality
 */
export async function recommendSuppliers(
  criteria: {
    orgId?: string;
    category?: string;
    location?: string;
    minQualityScore?: number;
    maxRiskScore?: number;
    requiredCertifications?: string[];
    excludeSuppliers?: string[];
  },
  availableSuppliers: SupplierProfile[]
): Promise<SupplierRecommendation[]> {
  const recommendations: SupplierRecommendation[] = [];

  for (const supplier of availableSuppliers) {
    // Skip excluded suppliers
    if (criteria.excludeSuppliers?.includes(supplier.supplierId)) {
      continue;
    }

    // Filter by criteria
    if (criteria.category && supplier.category !== criteria.category) {
      continue;
    }

    if (criteria.location && supplier.location && supplier.location !== criteria.location) {
      continue;
    }

    // Calculate match score (0-100)
    let matchScore = 50; // Base score
    const reasons: string[] = [];

    // Factor 1: Quality score (30 points)
    if (supplier.averageQualityScore >= 80) {
      matchScore += 30;
      reasons.push("High quality products (80%+ quality score)");
    } else if (supplier.averageQualityScore >= 70) {
      matchScore += 20;
      reasons.push("Good quality products (70%+ quality score)");
    } else if (supplier.averageQualityScore >= 60) {
      matchScore += 10;
      reasons.push("Acceptable quality (60%+ quality score)");
    } else {
      matchScore -= 10;
      reasons.push("Quality below recommended threshold");
    }

    // Factor 2: Risk score (25 points) - lower risk is better
    if (supplier.averageRiskScore < 20) {
      matchScore += 25;
      reasons.push("Very low fraud risk");
    } else if (supplier.averageRiskScore < 30) {
      matchScore += 20;
      reasons.push("Low fraud risk");
    } else if (supplier.averageRiskScore < 50) {
      matchScore += 10;
      reasons.push("Moderate fraud risk");
    } else {
      matchScore -= 15;
      reasons.push("High fraud risk");
    }

    // Factor 3: Success rate (20 points)
    if (supplier.successRate >= 0.95) {
      matchScore += 20;
      reasons.push("Excellent verification success rate (95%+)");
    } else if (supplier.successRate >= 0.85) {
      matchScore += 15;
      reasons.push("Good verification success rate (85%+)");
    } else if (supplier.successRate >= 0.75) {
      matchScore += 10;
      reasons.push("Acceptable verification success rate (75%+)");
    }

    // Factor 4: Fraud history (15 points) - negative for fraud
    if (supplier.fraudCount === 0) {
      matchScore += 15;
      reasons.push("No fraud incidents reported");
    } else if (supplier.fraudCount <= 2) {
      matchScore -= 10;
      reasons.push(`${supplier.fraudCount} fraud incident(s) in history`);
    } else {
      matchScore -= 25;
      reasons.push(`Multiple fraud incidents (${supplier.fraudCount}) - HIGH RISK`);
    }

    // Factor 5: Certifications (10 points)
    if (criteria.requiredCertifications && criteria.requiredCertifications.length > 0) {
      const hasRequiredCerts = criteria.requiredCertifications.every((cert) =>
        supplier.certifications?.includes(cert)
      );
      if (hasRequiredCerts) {
        matchScore += 10;
        reasons.push(`Has required certifications: ${criteria.requiredCertifications.join(", ")}`);
      } else {
        matchScore -= 10;
        reasons.push("Missing some required certifications");
      }
    } else if (supplier.bstiCertified) {
      matchScore += 5;
      reasons.push("BSTI certified");
    }

    // Normalize score
    matchScore = Math.max(0, Math.min(100, matchScore));

    // Determine risk level
    let riskLevel: "low" | "medium" | "high";
    if (supplier.averageRiskScore < 25 && supplier.fraudCount === 0) {
      riskLevel = "low";
    } else if (supplier.averageRiskScore < 50 && supplier.fraudCount <= 2) {
      riskLevel = "medium";
    } else {
      riskLevel = "high";
    }

    // Calculate confidence based on data available
    const confidence = Math.min(100, (supplier.totalVerifications / 100) * 100);

    recommendations.push({
      supplierId: supplier.supplierId,
      supplierName: supplier.name,
      matchScore,
      confidence,
      reasons,
      riskLevel,
      estimatedQuality: supplier.averageQualityScore,
      certifications: supplier.certifications,
    });
  }

  // Sort by match score (descending)
  recommendations.sort((a, b) => b.matchScore - a.matchScore);

  // Return top 10 recommendations
  return recommendations.slice(0, 10);
}

/**
 * Generate compliance advisory based on regulations
 */
export async function generateComplianceAdvisory(
  context: {
    orgId: string;
    supplierId?: string;
    productId?: string;
    productCategory?: string;
    originCountry?: string;
    importStatus?: boolean;
    certifications?: string[];
    bstiCertified?: boolean;
  }
): Promise<ComplianceAdvisory> {
  const risks: ComplianceRisk[] = [];
  const recommendations: string[] = [];
  const applicableRegulations: string[] = [];

  // Risk 1: BSTI Certification
  if (context.productCategory === "electronics" || context.productCategory === "food" || context.productCategory === "pharmaceuticals") {
    if (!context.bstiCertified) {
      risks.push({
        riskLevel: "high",
        category: "bsti",
        description: "Product category requires BSTI certification for sale in Bangladesh",
        recommendation: "Obtain BSTI certification before importing or selling this product",
        applicableRegulations: ["BSTI Act 2018", "BSTI Import Regulations"],
        actionRequired: true,
      });
      recommendations.push("Apply for BSTI certification through the official BSTI portal");
      applicableRegulations.push("BSTI Act 2018");
    }
  }

  // Risk 2: Import License
  if (context.originCountry && context.originCountry !== "BD" && !context.importStatus) {
    risks.push({
      riskLevel: "high",
      category: "import_license",
      description: "Imported products require proper import license and customs clearance",
      recommendation: "Ensure valid import license and complete customs documentation",
      applicableRegulations: ["Customs Act", "Import Policy Order"],
      actionRequired: true,
    });
    recommendations.push("Verify import license validity and customs clearance documents");
    applicableRegulations.push("Customs Act");
  }

  // Risk 3: Product-specific certifications
  if (context.productCategory === "pharmaceuticals") {
    if (!context.certifications?.includes("DGDA")) {
      risks.push({
        riskLevel: "critical",
        category: "certification",
        description: "Pharmaceuticals require DGDA (Directorate General of Drug Administration) approval",
        recommendation: "Obtain DGDA approval before importing or distributing pharmaceuticals",
        applicableRegulations: ["Drug Act 1940", "DGDA Regulations"],
        actionRequired: true,
      });
      recommendations.push("Apply for DGDA registration and approval");
      applicableRegulations.push("Drug Act 1940");
    }
  } else if (context.productCategory === "food") {
    if (!context.certifications?.includes("BFSA")) {
      risks.push({
        riskLevel: "high",
        category: "certification",
        description: "Food products may require BFSA (Bangladesh Food Safety Authority) registration",
        recommendation: "Verify BFSA registration requirements for your product",
        applicableRegulations: ["Food Safety Act"],
        actionRequired: true,
      });
      recommendations.push("Check BFSA registration requirements");
      applicableRegulations.push("Food Safety Act");
    }
  }

  // Risk 4: Quality standards
  if (context.productCategory === "textiles" || context.productCategory === "electronics") {
    risks.push({
      riskLevel: "medium",
      category: "quality_standard",
      description: "Products must meet minimum quality standards",
      recommendation: "Ensure products comply with Bangladesh quality standards",
      applicableRegulations: ["Standards and Testing Act"],
      actionRequired: false,
    });
    applicableRegulations.push("Standards and Testing Act");
  }

  // Determine overall risk level
  let overallRiskLevel: ComplianceAdvisory["overallRiskLevel"] = "low";
  if (risks.some((r) => r.riskLevel === "critical")) {
    overallRiskLevel = "critical";
  } else if (risks.some((r) => r.riskLevel === "high")) {
    overallRiskLevel = "high";
  } else if (risks.some((r) => r.riskLevel === "medium")) {
    overallRiskLevel = "medium";
  }

  return {
    orgId: context.orgId,
    supplierId: context.supplierId,
    productId: context.productId,
    risks,
    overallRiskLevel,
    recommendations,
    applicableRegulations: Array.from(new Set(applicableRegulations)),
    lastUpdated: Date.now(),
  };
}

/**
 * Check if supplier meets compliance requirements
 */
export async function checkSupplierCompliance(
  supplier: SupplierProfile
): Promise<{
  compliant: boolean;
  missingRequirements: string[];
  risks: ComplianceRisk[];
}> {
  const missingRequirements: string[] = [];
  const risks: ComplianceRisk[] = [];

  // Check BSTI certification
  if (!supplier.bstiCertified && (supplier.category === "electronics" || supplier.category === "food")) {
    missingRequirements.push("BSTI Certification");
    risks.push({
      riskLevel: "high",
      category: "bsti",
      description: "Supplier lacks BSTI certification for regulated product categories",
      recommendation: "Obtain BSTI certification to comply with regulations",
      applicableRegulations: ["BSTI Act 2018"],
      actionRequired: true,
    });
  }

  // Check import license
  if (!supplier.importLicense && supplier.location && supplier.location !== "BD") {
    missingRequirements.push("Import License");
    risks.push({
      riskLevel: "high",
      category: "import_license",
      description: "Supplier lacks valid import license",
      recommendation: "Ensure valid import license is obtained",
      applicableRegulations: ["Customs Act"],
      actionRequired: true,
    });
  }

  // Check quality standards
  if (supplier.averageQualityScore < 70) {
    missingRequirements.push("Quality Standards Compliance");
    risks.push({
      riskLevel: "medium",
      category: "quality_standard",
      description: "Supplier quality score below recommended threshold",
      recommendation: "Improve product quality to meet standards",
      applicableRegulations: ["Standards and Testing Act"],
      actionRequired: false,
    });
  }

  const compliant = missingRequirements.length === 0;

  return {
    compliant,
    missingRequirements,
    risks,
  };
}

