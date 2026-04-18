import type { RawData, RawLanguage, RawRevealTranslation } from './types';

function normalizeLanguage(language: RawLanguage): RawLanguage {
  return {
    code: language.code,
    name: language.name,
    localizedName: language.localizedName || language.name,
    flagEmoji: language.flagEmoji ?? null,
    isDefault: Boolean(language.isDefault),
  };
}

function firstDefinedString(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

function getLegacyFallbackLanguages(rawData: RawData): RawLanguage[] {
  const fallbackCode = rawData.defaultLanguageCode || 'en';
  return [{
    code: fallbackCode,
    name: fallbackCode.toUpperCase(),
    localizedName: fallbackCode.toUpperCase(),
    flagEmoji: null,
    isDefault: true
  }];
}

export function getAvailableLanguages(rawData: RawData | null | undefined): RawLanguage[] {
  if (!rawData) {
    return [];
  }

  if (Array.isArray(rawData.languages) && rawData.languages.length > 0) {
    return rawData.languages.map(normalizeLanguage);
  }

  return getLegacyFallbackLanguages(rawData);
}

export function getDefaultLanguageCode(rawData: RawData | null | undefined): string {
  if (!rawData) {
    return 'en';
  }

  if (typeof rawData.defaultLanguageCode === 'string' && rawData.defaultLanguageCode.length > 0) {
    return rawData.defaultLanguageCode;
  }

  const defaultLanguage = getAvailableLanguages(rawData).find(language => language.isDefault);
  return defaultLanguage?.code || 'en';
}

function resolveTranslationField(
  selectedTranslation: RawRevealTranslation | undefined,
  defaultTranslation: RawRevealTranslation | undefined,
  field: keyof RawRevealTranslation
): string | undefined {
  return firstDefinedString(selectedTranslation?.[field], defaultTranslation?.[field]);
}

export function resolveLocalizedRawData(rawData: RawData, selectedLanguageCode: string): RawData {
  const defaultLanguageCode = getDefaultLanguageCode(rawData);

  return {
    ...rawData,
    events: rawData.events.map(event => ({
      ...event,
      reveals: event.reveals.map(reveal => {
        const defaultTranslation = reveal.translations?.[defaultLanguageCode];
        const selectedTranslation = reveal.translations?.[selectedLanguageCode];

        return {
          ...reveal,
          displayedDate: resolveTranslationField(selectedTranslation, defaultTranslation, 'displayedDate') ?? reveal.displayedDate,
          displayedTitle: resolveTranslationField(selectedTranslation, defaultTranslation, 'displayedTitle') ?? reveal.displayedTitle,
          displayedDescription: resolveTranslationField(selectedTranslation, defaultTranslation, 'displayedDescription') ?? reveal.displayedDescription,
        };
      }),
    })),
  };
}
