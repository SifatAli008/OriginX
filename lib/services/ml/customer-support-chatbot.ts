/**
 * Customer Support Chatbot Service
 * LLM-based conversational agent for SME queries and verification guidance
 */

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface ChatContext {
  userId?: string;
  userRole?: string;
  orgId?: string;
  recentVerifications?: number;
  productQuestions?: number;
  supportHistory?: ChatMessage[];
}

interface ChatResponse {
  response: string;
  confidence: number;
  suggestedActions?: Array<{ label: string; action: string; url?: string }>;
  flagged?: boolean; // True if incident needs human review
  incidentType?: "verification_issue" | "product_question" | "technical_support" | "fraud_report";
}

/**
 * Knowledge base for common queries
 */
const KNOWLEDGE_BASE: Record<string, string> = {
  "how_to_verify": "To verify a product, scan the QR code using the verification page. The system will analyze the product and provide an authenticity score.",
  "what_is_counterfeit_score": "The counterfeit score (0-100) indicates product authenticity. Higher scores mean more genuine products. Scores above 80 are considered genuine.",
  "verification_failed": "If verification fails, check: 1) QR code is not damaged, 2) Product is properly registered, 3) QR code matches the product. Contact support if issues persist.",
  "fake_product": "If you suspect a fake product, report it through the support ticket system. Our team will investigate and take appropriate action.",
  "product_not_found": "If a product is not found, it may not be registered in the system. Verify you're scanning the correct QR code for the product.",
  "registration_process": "To register products, go to Products > New Product. Fill in product details, upload images, and the system will generate encrypted QR codes.",
  "batch_import": "You can import multiple products via CSV/Excel using the Batch Import feature. Download the template first to ensure correct format.",
};

/**
 * Intent detection patterns
 */
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  verification_help: [/how.*verify/, /verify.*product/, /scan.*qr/, /authentication/i],
  product_question: [/what.*product/, /product.*info/, /details/, /specification/i],
  technical_issue: [/not.*work/, /error/, /failed/, /broken/, /issue/i],
  fraud_report: [/fake/, /counterfeit/, /suspicious/, /fraud/, /illegal/i],
  registration: [/register/, /create.*product/, /add.*product/, /import/i],
  scoring: [/score/, /rating/, /authenticity/, /genuine/, /fake.*detect/i],
};

/**
 * Process customer support query with LLM-style response
 * Note: In production, integrate with OpenAI API, Anthropic, or similar
 */
export async function processChatQuery(
  userMessage: string,
  context?: ChatContext
): Promise<ChatResponse> {
  const message = userMessage.toLowerCase().trim();
  const responses: string[] = [];
  let confidence = 0.7;
  const suggestedActions: Array<{ label: string; action: string; url?: string }> = [];
  let flagged = false;
  let incidentType: ChatResponse["incidentType"];

  // Detect intent
  let detectedIntent: string | null = null;
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(message))) {
      detectedIntent = intent;
      confidence = 0.85;
      break;
    }
  }

  // Handle fraud reports (always flag)
  if (detectedIntent === "fraud_report" || /fraud|fake|counterfeit|suspicious/i.test(message)) {
    flagged = true;
    incidentType = "fraud_report";
    responses.push("Thank you for reporting this. We take fraud reports seriously.");
    responses.push("I'm flagging this for immediate human review. Our team will investigate and contact you shortly.");
    suggestedActions.push({
      label: "Create Support Ticket",
      action: "create_ticket",
      url: "/support/tickets/new?priority=high&type=fraud_report",
    });
    confidence = 0.95;
    return {
      response: responses.join(" "),
      confidence,
      suggestedActions,
      flagged: true,
      incidentType: "fraud_report",
    };
  }

  // Handle verification help
  if (detectedIntent === "verification_help") {
    responses.push(KNOWLEDGE_BASE["how_to_verify"]);
    responses.push("You can access the verification page from the main dashboard.");
    suggestedActions.push({
      label: "Go to Verification Page",
      action: "navigate",
      url: "/verify",
    });
    confidence = 0.9;
    incidentType = "verification_issue";
  }
  // Handle product questions
  else if (detectedIntent === "product_question") {
    if (/score|rating|authenticity/i.test(message)) {
      responses.push(KNOWLEDGE_BASE["what_is_counterfeit_score"]);
    } else {
      responses.push("I can help you with product information. What specific details do you need?");
    }
    incidentType = "product_question";
    confidence = 0.75;
  }
  // Handle technical issues
  else if (detectedIntent === "technical_issue") {
    responses.push(KNOWLEDGE_BASE["verification_failed"]);
    responses.push("If the problem persists, please create a support ticket for technical assistance.");
    suggestedActions.push({
      label: "Create Support Ticket",
      action: "create_ticket",
      url: "/support/tickets/new?type=technical",
    });
    incidentType = "technical_support";
    confidence = 0.8;
    
    // Flag complex technical issues
    if (/error|failed|broken/.test(message)) {
      flagged = true;
    }
  }
  // Handle registration questions
  else if (detectedIntent === "registration") {
    if (/batch|import|csv|excel/i.test(message)) {
      responses.push(KNOWLEDGE_BASE["batch_import"]);
    } else {
      responses.push(KNOWLEDGE_BASE["registration_process"]);
    }
    suggestedActions.push({
      label: "Register Product",
      action: "navigate",
      url: "/products/new",
    });
    confidence = 0.85;
  }
  // Generic response
  else {
    // Try to find relevant knowledge base entry
    const matchingKey = Object.keys(KNOWLEDGE_BASE).find((key) =>
      message.includes(key.replace(/_/g, " "))
    );
    
    if (matchingKey) {
      responses.push(KNOWLEDGE_BASE[matchingKey] || "");
    } else {
      responses.push("I'm here to help with product verification, registration, and fraud detection.");
      responses.push("You can ask me about:");
      responses.push("- How to verify products");
      responses.push("- Product registration process");
      responses.push("- Understanding counterfeit scores");
      responses.push("- Reporting suspicious products");
    }
    confidence = 0.6;
  }

  // Add contextual suggestions based on user history
  if (context) {
    if (context.recentVerifications && context.recentVerifications > 0) {
      suggestedActions.push({
        label: "View Verification History",
        action: "navigate",
        url: "/verify/history",
      });
    }
    if (context.productQuestions && context.productQuestions > 2) {
      responses.push("For detailed product information, check the Products page.");
      suggestedActions.push({
        label: "View Products",
        action: "navigate",
        url: "/products",
      });
    }
  }

  return {
    response: responses.join(" "),
    confidence,
    suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
    flagged,
    incidentType,
  };
}

/**
 * Generate conversation summary for support tickets
 */
export function generateConversationSummary(messages: ChatMessage[]): string {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
  const assistantMessages = messages.filter((m) => m.role === "assistant").map((m) => m.content);

  let summary = `Conversation Summary (${messages.length} messages):\n\n`;
  summary += `User Queries:\n${userMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\n`;
  summary += `Assistant Responses:\n${assistantMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\n`;

  // Detect if incident was flagged
  const flaggedMessages = messages.filter((m) => m.role === "assistant" && m.content.includes("flag"));
  if (flaggedMessages.length > 0) {
    summary += "⚠️ This conversation was flagged for human review.\n";
  }

  return summary;
}

/**
 * Escalate to human agent when needed
 */
export function shouldEscalateToHuman(
  response: ChatResponse,
  conversationHistory: ChatMessage[]
): boolean {
  // Escalate if flagged
  if (response.flagged) {
    return true;
  }

  // Escalate if multiple failed attempts
  if (conversationHistory.length > 5) {
    const recentUserMessages = conversationHistory
      .filter((m) => m.role === "user")
      .slice(-3)
      .map((m) => m.content.toLowerCase());
    
    // Check if user keeps asking same question
    const uniqueQuestions = new Set(recentUserMessages);
    if (uniqueQuestions.size === 1 && recentUserMessages.length >= 3) {
      return true; // User asked same question multiple times
    }
  }

  // Escalate if low confidence and complex query
  if (response.confidence < 0.6 && conversationHistory.length > 2) {
    return true;
  }

  return false;
}

