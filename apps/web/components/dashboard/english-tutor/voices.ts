/**
 * Curated Microsoft Edge neural voices (free, no API key, high quality).
 * Indian English is the default — clear English with a South-Asian accent
 * that's familiar and easy to follow for a Bangladeshi listener, while still
 * modelling correct English pronunciation.
 */

export type EdgeVoice = {
  id: string;
  label: string;
  lang: string;
};

export const EDGE_VOICES: EdgeVoice[] = [
  { id: "en-IN-NeerjaNeural", label: "Neerja — Indian English (female)", lang: "en-IN" },
  { id: "en-IN-PrabhatNeural", label: "Prabhat — Indian English (male)", lang: "en-IN" },
  { id: "en-US-AriaNeural", label: "Aria — US English (female)", lang: "en-US" },
  { id: "en-US-JennyNeural", label: "Jenny — US English (female)", lang: "en-US" },
  { id: "en-US-GuyNeural", label: "Guy — US English (male)", lang: "en-US" },
  { id: "en-GB-SoniaNeural", label: "Sonia — British English (female)", lang: "en-GB" },
  { id: "en-GB-RyanNeural", label: "Ryan — British English (male)", lang: "en-GB" },
  { id: "en-AU-NatashaNeural", label: "Natasha — Australian English (female)", lang: "en-AU" },
];

export const DEFAULT_VOICE_ID = "en-IN-NeerjaNeural";

const VOICE_IDS = new Set(EDGE_VOICES.map((v) => v.id));

export function isValidVoice(id: string): boolean {
  return VOICE_IDS.has(id);
}
