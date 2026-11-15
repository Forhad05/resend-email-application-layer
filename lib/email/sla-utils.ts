export const SLA_RESPONSE_HOURS: Record<string, number> = {
  urgent: 1,
  high: 4,
  normal: 24,
  low: 48,
};

export const SLA_RESOLUTION_HOURS: Record<string, number> = {
  urgent: 4,
  high: 12,
  normal: 48,
  low: 72,
};

/**
 * Computes target deadline date for SLA first response
 */
export function computeSlaDueAt(
  priority: string = "normal",
  baseDate: Date = new Date()
): Date {
  const hours = SLA_RESPONSE_HOURS[priority] ?? 24;
  return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
}

export interface AutoTriageResult {
  priority?: "urgent" | "high" | "normal" | "low";
  labels: string[];
  matchedRules: string[];
}

/**
 * Evaluates subject and body content against priority rules and topic tags
 */
export function evaluateAutoTriage(
  subject: string,
  bodyText: string
): AutoTriageResult {
  const content = `${subject} ${bodyText}`.toLowerCase();
  const matchedRules: string[] = [];
  const labels: string[] = [];
  let priority: "urgent" | "high" | "normal" | "low" | undefined = undefined;

  // 1. Urgent priority triage keywords
  const urgentKeywords = [
    "urgent",
    "critical",
    "outage",
    "downtime",
    "emergency",
    "production down",
    "sev-1",
    "sev1",
    "broken",
  ];
  if (urgentKeywords.some((kw) => content.includes(kw))) {
    priority = "urgent";
    matchedRules.push("keyword_urgent");
  }

  // 2. High priority triage keywords (if not already urgent)
  if (!priority) {
    const highKeywords = [
      "asap",
      "escalate",
      "unauthorized",
      "security",
      "exploit",
      "vulnerability",
      "data breach",
    ];
    if (highKeywords.some((kw) => content.includes(kw))) {
      priority = "high";
      matchedRules.push("keyword_high");
    }
  }

  // 3. Topic classification: Billing
  const billingKeywords = [
    "invoice",
    "refund",
    "subscription",
    "billing",
    "charge",
    "payment",
    "receipt",
    "credit card",
    "stripe",
  ];
  if (billingKeywords.some((kw) => content.includes(kw))) {
    labels.push("billing");
    matchedRules.push("topic_billing");
  }

  // 4. Topic classification: Bug / Technical
  const technicalKeywords = [
    "bug",
    "error",
    "crash",
    "exception",
    "stack trace",
    "500 internal",
    "api failure",
    "syntax error",
  ];
  if (technicalKeywords.some((kw) => content.includes(kw))) {
    labels.push("bug");
    matchedRules.push("topic_bug");
  }

  // 5. Topic classification: Legal / Compliance
  const legalKeywords = [
    "gdpr",
    "privacy policy",
    "terms of service",
    "nda",
    "compliance",
    "legal notice",
  ];
  if (legalKeywords.some((kw) => content.includes(kw))) {
    labels.push("legal");
    matchedRules.push("topic_legal");
  }

  // 6. Topic classification: Feature Request
  const featureKeywords = [
    "feature request",
    "feature suggestion",
    "roadmap",
    "enhancement",
    "would be great if",
  ];
  if (featureKeywords.some((kw) => content.includes(kw))) {
    labels.push("feature");
    matchedRules.push("topic_feature");
  }

  return { priority, labels, matchedRules };
}

export interface SlaStatusBadge {
  state: "breached" | "warning" | "normal" | "met";
  label: string;
  overdueMinutes?: number;
  remainingMinutes?: number;
}

/**
 * Calculates current visual countdown, warning, or breach status
 */
export function calculateSlaStatus(thread: {
  status: string;
  priority: string;
  slaDueAt?: Date | string | null;
  slaBreached?: boolean;
  firstResponseAt?: Date | string | null;
  resolvedAt?: Date | string | null;
  referenceTime?: number;
}): SlaStatusBadge | null {
  if (thread.status === "resolved" || thread.status === "closed") {
    return {
      state: "met",
      label: "SLA Met",
    };
  }

  if (!thread.slaDueAt) {
    return null;
  }

  const now = thread.referenceTime ?? Date.now();
  const due = new Date(thread.slaDueAt).getTime();
  const diffMinutes = Math.round((due - now) / (1000 * 60));

  if (thread.slaBreached || diffMinutes <= 0) {
    const overdue = Math.abs(diffMinutes);
    let overdueLabel = `${overdue}m`;
    if (overdue >= 60) {
      const hours = Math.floor(overdue / 60);
      const mins = overdue % 60;
      overdueLabel = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return {
      state: "breached",
      label: `Breached (+${overdueLabel})`,
      overdueMinutes: overdue,
    };
  }

  if (diffMinutes <= 120) {
    let remLabel = `${diffMinutes}m`;
    if (diffMinutes >= 60) {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      remLabel = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return {
      state: "warning",
      label: `Due in ${remLabel}`,
      remainingMinutes: diffMinutes,
    };
  }

  const hours = Math.floor(diffMinutes / 60);
  return {
    state: "normal",
    label: `Due in ${hours}h`,
    remainingMinutes: diffMinutes,
  };
}
