/**
 * Gemini 3.5 Transcribe supported languages and BCP-47 normalization.
 */

export interface ParsedLanguages {
  isReset: boolean;
  validCodes: string[];
  invalidTokens: string[];
}

export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  "tr-TR": "Türkçe",
  "en-US": "İngilizce (ABD)",
  "en-GB": "İngilizce (Birleşik Krallık)",
  "en-IN": "İngilizce (Hindistan)",
  "es-US": "İspanyolca (ABD)",
  "es-419": "İspanyolca (Latin Amerika)",
  "es-ES": "İspanyolca (İspanya)",
  "de-DE": "Almanca",
  "fr-FR": "Fransızca",
  "ru-RU": "Rusça",
  "it-IT": "İtalyanca",
  "ar-EG": "Arapça (Mısır)",
  "pt-BR": "Portekizce (Brezilya)",
  "pt-PT": "Portekizce (Portekiz)",
  "az-AZ": "Azerbaycan Türkçesi",
  "nl-NL": "Felemenkçe",
  "ja-JP": "Japonca",
  "ko-KR": "Korece",
  "cmn-Hans-CN": "Çince (Basitleştirilmiş)",
  "yue-Hant-HK": "Kantonca",
  "uk-UA": "Ukraynaca",
  "pl-PL": "Lehçe (Polonyaca)",
  "sv-SE": "İsveççe",
  "nb-NO": "Norveççe",
  "da-DK": "Danimarkaca",
  "fi-FI": "Fince",
  "el-GR": "Yunanca",
  "hi-IN": "Hintçe",
  "fa-IR": "Farsça",
  "he-IL": "İbranice",
  "id-ID": "Endonezce",
  "vi-VN": "Vietnamca",
  "th-TH": "Tayca",
  "cs-CZ": "Çekçe",
  "ro-RO": "Romence",
  "hu-HU": "Macarca",
  "bg-BG": "Bulgarca",
  "hr-HR": "Hırvatça",
  "sr-RS": "Sırpça",
  "sk-SK": "Slovakça",
  "sl-SI": "Slovence",
  "ca-ES": "Katalanca",
  "uz-UZ": "Özbekçe",
  "kk-KZ": "Kazakça",
  "ka-GE": "Gürcüce",
  "hy-AM": "Ermenice",
  "ur-PK": "Urduca",
  "ms-MY": "Malezyaca",
  "fil-PH": "Filipince",
};

const RESET_KEYWORDS = new Set([
  "auto",
  "automatic",
  "otomatik",
  "reset",
  "sıfırla",
  "sifirla",
  "clear",
  "none",
  "default",
  "varsayılan",
  "varsayilan",
]);

const LANGUAGE_ALIASES: Record<string, string> = {
  // Turkish
  tr: "tr-TR",
  tur: "tr-TR",
  turkish: "tr-TR",
  türkçe: "tr-TR",
  turkce: "tr-TR",
  "tr-tr": "tr-TR",

  // English
  en: "en-US",
  eng: "en-US",
  english: "en-US",
  ingilizce: "en-US",
  "en-us": "en-US",
  "en-gb": "en-GB",
  "en-uk": "en-GB",
  "en-in": "en-IN",

  // Spanish
  es: "es-US",
  spa: "es-US",
  spanish: "es-US",
  ispanyolca: "es-US",
  "es-us": "es-US",
  "es-419": "es-419",
  "es-es": "es-ES",

  // German
  de: "de-DE",
  ger: "de-DE",
  deu: "de-DE",
  german: "de-DE",
  almanca: "de-DE",
  "de-de": "de-DE",

  // French
  fr: "fr-FR",
  fra: "fr-FR",
  fre: "fr-FR",
  french: "fr-FR",
  fransızca: "fr-FR",
  fransizca: "fr-FR",
  "fr-fr": "fr-FR",

  // Russian
  ru: "ru-RU",
  rus: "ru-RU",
  russian: "ru-RU",
  rusça: "ru-RU",
  rusca: "ru-RU",
  "ru-ru": "ru-RU",

  // Italian
  it: "it-IT",
  ita: "it-IT",
  italian: "it-IT",
  italyanca: "it-IT",
  "it-it": "it-IT",

  // Arabic
  ar: "ar-EG",
  ara: "ar-EG",
  arabic: "ar-EG",
  arapça: "ar-EG",
  arapca: "ar-EG",
  "ar-eg": "ar-EG",

  // Portuguese
  pt: "pt-BR",
  por: "pt-BR",
  portuguese: "pt-BR",
  portekizce: "pt-BR",
  "pt-br": "pt-BR",
  "pt-pt": "pt-PT",

  // Azerbaijani
  az: "az-AZ",
  aze: "az-AZ",
  azerbaijani: "az-AZ",
  azerice: "az-AZ",
  azeri: "az-AZ",
  "az-az": "az-AZ",

  // Dutch
  nl: "nl-NL",
  nld: "nl-NL",
  dut: "nl-NL",
  dutch: "nl-NL",
  felemenkçe: "nl-NL",
  felemenkce: "nl-NL",
  hollandaca: "nl-NL",
  "nl-nl": "nl-NL",

  // Japanese
  ja: "ja-JP",
  jpn: "ja-JP",
  japanese: "ja-JP",
  japonca: "ja-JP",
  "ja-jp": "ja-JP",

  // Korean
  ko: "ko-KR",
  kor: "ko-KR",
  korean: "ko-KR",
  korece: "ko-KR",
  "ko-kr": "ko-KR",

  // Chinese
  zh: "cmn-Hans-CN",
  zho: "cmn-Hans-CN",
  chi: "cmn-Hans-CN",
  chinese: "cmn-Hans-CN",
  çince: "cmn-Hans-CN",
  cince: "cmn-Hans-CN",
  "cmn-hans-cn": "cmn-Hans-CN",
  yue: "yue-Hant-HK",
  cantonese: "yue-Hant-HK",
  "yue-hant-hk": "yue-Hant-HK",

  // Ukrainian
  uk: "uk-UA",
  ukr: "uk-UA",
  ukrainian: "uk-UA",
  ukraynaca: "uk-UA",
  "uk-ua": "uk-UA",

  // Polish
  pl: "pl-PL",
  pol: "pl-PL",
  polish: "pl-PL",
  lehçe: "pl-PL",
  lehce: "pl-PL",
  polonyaca: "pl-PL",
  "pl-pl": "pl-PL",

  // Swedish
  sv: "sv-SE",
  swe: "sv-SE",
  swedish: "sv-SE",
  isveççe: "sv-SE",
  isvecce: "sv-SE",
  "sv-se": "sv-SE",

  // Norwegian
  nb: "nb-NO",
  no: "nb-NO",
  nor: "nb-NO",
  norwegian: "nb-NO",
  norveççe: "nb-NO",
  norvecce: "nb-NO",
  "nb-no": "nb-NO",

  // Danish
  da: "da-DK",
  dan: "da-DK",
  danish: "da-DK",
  danimarkaca: "da-DK",
  "da-dk": "da-DK",

  // Finnish
  fi: "fi-FI",
  fin: "fi-FI",
  finnish: "fi-FI",
  fince: "fi-FI",
  "fi-fi": "fi-FI",

  // Greek
  el: "el-GR",
  ell: "el-GR",
  gre: "el-GR",
  greek: "el-GR",
  yunanca: "el-GR",
  "el-gr": "el-GR",

  // Hindi
  hi: "hi-IN",
  hin: "hi-IN",
  hindi: "hi-IN",
  hintçe: "hi-IN",
  hintce: "hi-IN",
  "hi-in": "hi-IN",

  // Persian
  fa: "fa-IR",
  fas: "fa-IR",
  per: "fa-IR",
  persian: "fa-IR",
  farsi: "fa-IR",
  farsça: "fa-IR",
  farsca: "fa-IR",
  "fa-ir": "fa-IR",

  // Hebrew
  he: "he-IL",
  heb: "he-IL",
  hebrew: "he-IL",
  ibranice: "he-IL",
  "he-il": "he-IL",

  // Indonesian
  id: "id-ID",
  ind: "id-ID",
  indonesian: "id-ID",
  endonezce: "id-ID",
  "id-id": "id-ID",

  // Vietnamese
  vi: "vi-VN",
  vie: "vi-VN",
  vietnamese: "vi-VN",
  vietnamca: "vi-VN",
  "vi-vn": "vi-VN",

  // Thai
  th: "th-TH",
  tha: "th-TH",
  thai: "th-TH",
  tayca: "th-TH",
  "th-th": "th-TH",

  // Czech
  cs: "cs-CZ",
  ces: "cs-CZ",
  cze: "cs-CZ",
  czech: "cs-CZ",
  çekçe: "cs-CZ",
  cekce: "cs-CZ",
  "cs-cz": "cs-CZ",

  // Romanian
  ro: "ro-RO",
  ron: "ro-RO",
  rum: "ro-RO",
  romanian: "ro-RO",
  romence: "ro-RO",
  "ro-ro": "ro-RO",

  // Hungarian
  hu: "hu-HU",
  hun: "hu-HU",
  hungarian: "hu-HU",
  macarca: "hu-HU",
  "hu-hu": "hu-HU",

  // Bulgarian
  bg: "bg-BG",
  bul: "bg-BG",
  bulgarian: "bg-BG",
  bulgarca: "bg-BG",
  "bg-bg": "bg-BG",

  // Croatian
  hr: "hr-HR",
  hrv: "hr-HR",
  croatian: "hr-HR",
  hırvatça: "hr-HR",
  hirvatca: "hr-HR",
  "hr-hr": "hr-HR",

  // Serbian
  sr: "sr-RS",
  srp: "sr-RS",
  serbian: "sr-RS",
  sırpça: "sr-RS",
  sirpca: "sr-RS",
  "sr-rs": "sr-RS",

  // Slovak
  sk: "sk-SK",
  slk: "sk-SK",
  slo: "sk-SK",
  slovak: "sk-SK",
  slovakça: "sk-SK",
  slovakca: "sk-SK",
  "sk-sk": "sk-SK",

  // Slovenian
  sl: "sl-SI",
  slv: "sl-SI",
  slovenian: "sl-SI",
  slovence: "sl-SI",
  "sl-si": "sl-SI",

  // Catalan
  ca: "ca-ES",
  cat: "ca-ES",
  catalan: "ca-ES",
  katalanca: "ca-ES",
  "ca-es": "ca-ES",

  // Uzbek
  uz: "uz-UZ",
  uzb: "uz-UZ",
  uzbek: "uz-UZ",
  özbekçe: "uz-UZ",
  ozbekce: "uz-UZ",
  "uz-uz": "uz-UZ",

  // Kazakh
  kk: "kk-KZ",
  kaz: "kk-KZ",
  kazakh: "kk-KZ",
  kazakça: "kk-KZ",
  kazakca: "kk-KZ",
  "kk-kz": "kk-KZ",

  // Georgian
  ka: "ka-GE",
  kat: "ka-GE",
  geo: "ka-GE",
  georgian: "ka-GE",
  gürcüce: "ka-GE",
  gurcuce: "ka-GE",
  "ka-ge": "ka-GE",

  // Armenian
  hy: "hy-AM",
  hye: "hy-AM",
  arm: "hy-AM",
  armenian: "hy-AM",
  ermenice: "hy-AM",
  "hy-am": "hy-AM",

  // Urdu
  ur: "ur-PK",
  urd: "ur-PK",
  urdu: "ur-PK",
  "ur-pk": "ur-PK",

  // Malay
  ms: "ms-MY",
  msa: "ms-MY",
  may: "ms-MY",
  malay: "ms-MY",
  malezyaca: "ms-MY",
  "ms-my": "ms-MY",

  // Filipino / Tagalog
  fil: "fil-PH",
  filipino: "fil-PH",
  tagalog: "fil-PH",
  tl: "fil-PH",
  "fil-ph": "fil-PH",
};

/**
 * Resolves a single token/alias into a standard BCP-47 language tag.
 */
export function resolveLanguageCode(rawToken: string): string | null {
  const normalized = rawToken.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  // 1. Direct alias check
  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }

  // 2. Exact match in known display names (case insensitive lookup)
  for (const bcpCode of Object.keys(LANGUAGE_DISPLAY_NAMES)) {
    if (bcpCode.toLowerCase() === normalized) {
      return bcpCode;
    }
  }

  // 3. Fallback: Check if it's already a valid BCP-47 pattern like xx-YY or xx
  if (/^[a-z]{2,3}(-[a-z0-9]+)*$/i.test(normalized)) {
    // Format appropriately: e.g. "tr-tr" -> "tr-TR"
    const parts = normalized.split("-");
    if (parts.length === 2 && parts[1].length === 2) {
      return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
    }
    return rawToken.trim();
  }

  return null;
}

/**
 * Returns formatted display text for language code(s).
 */
export function formatLanguagesDisplay(codes: string[]): string {
  if (!codes || codes.length === 0) {
    return "Otomatik Algılama (Tüm diller)";
  }

  return codes
    .map((code) => {
      const name = LANGUAGE_DISPLAY_NAMES[code] || code;
      return `${name} (${code})`;
    })
    .join(" + ");
}

/**
 * Parses a raw command string containing language names or codes.
 */
export function parseLanguageInput(raw: string): ParsedLanguages {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { isReset: false, validCodes: [], invalidTokens: [] };
  }

  const tokens = trimmed
    .split(/[\s,+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Check if reset keyword is present
  if (tokens.some((t) => RESET_KEYWORDS.has(t.toLowerCase()))) {
    return { isReset: true, validCodes: [], invalidTokens: [] };
  }

  const validCodes: string[] = [];
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    const resolved = resolveLanguageCode(token);
    if (resolved) {
      if (!validCodes.includes(resolved)) {
        validCodes.push(resolved);
      }
    } else {
      invalidTokens.push(token);
    }
  }

  return {
    isReset: false,
    validCodes,
    invalidTokens,
  };
}
