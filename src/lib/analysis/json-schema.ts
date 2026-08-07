/**
 * Structured Output용 JSON Schema.
 * (zod 스키마와 항목이 일치해야 한다 — types.ts 참고)
 */
const stringArray = { type: "array", items: { type: "string" } } as const;

export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    overallTrend: { type: "string" },
    positives: stringArray,
    improvements: stringArray,
    keyChoiceFindings: stringArray,
    recurringThemes: stringArray,
    alignmentAndConflicts: stringArray,
    organizationalSignals: stringArray,
    actionableRecommendations: stringArray,
    interpretationCautions: stringArray,
  },
  required: [
    "overallTrend",
    "positives",
    "improvements",
    "keyChoiceFindings",
    "recurringThemes",
    "alignmentAndConflicts",
    "organizationalSignals",
    "actionableRecommendations",
    "interpretationCautions",
  ],
  additionalProperties: false,
} as const;
