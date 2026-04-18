export interface Language {
    id: number;
    code: string;
    name: string;
    isDefault: boolean;
    isEnabled: boolean;
}

export interface ResolvedRevealTranslation {
    revealId: number;
    languageId: number;
    languageCode: string;
    languageName: string;
    defaultLanguage: boolean;
    hasStoredTranslation: boolean;
    fallbackToDefault: boolean;
    translationId: number | null;
    storedDisplayedDate?: string | null;
    storedDisplayedTitle?: string | null;
    storedDisplayedDescription?: string | null;
    displayedDate?: string;
    displayedTitle?: string;
    displayedDescription?: string;
    source?: string | null;
}

export type TranslationField = 'displayedDate' | 'displayedTitle' | 'displayedDescription';

export interface RevealCardData {
    id: number;
    eventId: number;
    apparentTimelineId?: number;
    episodeId: number;
    episodeTime: number;
    displayedDate?: string;
    displayedTitle?: string;
    displayedDescription?: string;
    translationContext?: string;
    screenshotFilename?: string;
}
