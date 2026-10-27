// On-device redaction settings. Everything here runs in the browser only.
export const PRIVACY_CONFIG = {
  // Token-classification model with PER (person) labels, quantized for size
  nerModel: "Xenova/bert-base-NER",
  nerDtype: "q8",
  // Minimum confidence for a token to count as part of a person's name
  minScore: 0.6,
  // Never redact these (platforms and common words NER sometimes tags as people)
  alwaysAllow: ["Headway", "Alma", "Grow", "Grow Therapy", "Therapay", "Medicare", "Medicaid", "Tricare", "Cash", "Self-Pay"],
  // Second pass (on title-cased text, to catch lowercase names) needs higher confidence…
  lowercaseMinScore: 0.9,
  // …and skips everyday words that double as names
  lowercaseStopwords: [
    "bill", "will", "may", "june", "april", "august", "mark", "grant", "sue", "pat", "art", "rose",
    "chase", "cash", "page", "dean", "frank", "jack", "max", "ray", "rich", "sunny", "summer", "winter",
    "self", "pay", "blue", "cross", "united", "oscar", "humana", "aetna", "cigna", "anthem", "optum",
  ],
} as const;

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
  "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska",
  "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas",
  "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

// Speech-to-text model (transcription happens on device)
export const STT_CONFIG = {
  model: "onnx-community/whisper-base.en",
  // q8 decoder transcribed full sentences in testing; fp32 and q4 both cut off early
  dtype: { encoder_model: "fp32", decoder_model_merged: "q8" },
} as const;
