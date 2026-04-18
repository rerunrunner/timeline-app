import React from 'react';
import { CardField, Select, TextArea } from './index';
import {
    Language,
    ResolvedRevealTranslation,
    RevealCardData,
    TranslationField
} from './RevealCard.types';

interface RevealCardTranslationProps {
    reveal: RevealCardData;
    targetLanguages: Language[];
    translations: ResolvedRevealTranslation[];
    selectedLanguageCode: string;
    onSelectLanguage: (languageCode: string) => void;
    onUpdate: (revealId: number, field: string, value: any) => void;
    onUpdateTranslation: (
        revealId: number,
        languageCode: string,
        field: TranslationField,
        value: string
    ) => void;
    onTranslate: (revealId: number, languageCode: string) => void;
    isTranslating: boolean;
    getTranslationPlaceholder: (
        reveal: RevealCardData,
        languageCode: string,
        field: TranslationField
    ) => string;
}

const RevealCardTranslation: React.FC<RevealCardTranslationProps> = ({
    reveal,
    targetLanguages,
    translations,
    selectedLanguageCode,
    onSelectLanguage,
    onUpdate,
    onUpdateTranslation,
    onTranslate,
    isTranslating,
    getTranslationPlaceholder
}) => {
    const selectedLanguage = targetLanguages.find((language) => language.code === selectedLanguageCode);
    const selectedTranslation = translations.find((translation) => translation.languageCode === selectedLanguageCode);
    const hasStoredSelectedTranslation = Boolean(selectedTranslation?.hasStoredTranslation);

    const formatLanguageLabel = (language: Language) => {
        const parts = [language.flagEmoji, language.localizedName].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : language.code;
    };

    const languageOptions = targetLanguages.map((language) => ({
        value: language.code,
        label: formatLanguageLabel(language)
    }));

    const displayedDescriptionValue = hasStoredSelectedTranslation
        ? selectedTranslation?.storedDisplayedDescription || ''
        : '';
    const displayedDateValue = hasStoredSelectedTranslation
        ? selectedTranslation?.storedDisplayedDate || ''
        : '';
    const displayedTitleValue = hasStoredSelectedTranslation
        ? selectedTranslation?.storedDisplayedTitle || ''
        : '';

    const translationDatePlaceholder = getTranslationPlaceholder(reveal, selectedLanguageCode, 'displayedDate');
    const translationTitlePlaceholder = getTranslationPlaceholder(reveal, selectedLanguageCode, 'displayedTitle');
    const translationDescriptionPlaceholder = getTranslationPlaceholder(reveal, selectedLanguageCode, 'displayedDescription');

    const translationReady = languageOptions.length > 0;

    return (
        <div className="translation-layout-row translation-layout-row-bottom">
            <div className="translation-panel translation-panel-controls">
                <label>Translation Control</label>
                <div className="translation-control-stack">
                    <Select
                        value={selectedLanguageCode}
                        onChange={(value) => onSelectLanguage(value?.toString() || targetLanguages[0]?.code || '')}
                        options={languageOptions}
                        placeholder="Language"
                        disabled={!translationReady}
                    />
                    <button
                        type="button"
                        onClick={() => onTranslate(reveal.id, selectedLanguageCode)}
                        className="translation-trigger-btn"
                        disabled={isTranslating || !translationReady}
                        title={translationReady ? `Translate this reveal into ${selectedLanguage ? formatLanguageLabel(selectedLanguage) : selectedLanguageCode}` : 'Add a supported target language to translate'}
                    >
                        {isTranslating ? 'Translating...' : 'Translate'}
                    </button>
                </div>
            </div>

            <div className="translation-panel translation-panel-context">
                <label>Translation Context</label>
                <div onClick={(e) => e.stopPropagation()}>
                    <TextArea
                        value={reveal.translationContext || ''}
                        onChange={(value) => onUpdate(reveal.id, 'translationContext', value)}
                        placeholder="Hints for tone, ambiguity, or story context."
                    />
                </div>
            </div>

            <div className="translation-panel translation-panel-target">
                <div className="translation-target-meta">
                    <CardField
                        label="Displayed Date"
                        value={displayedDateValue}
                        onChange={(value) => onUpdateTranslation(reveal.id, selectedLanguageCode, 'displayedDate', value?.toString() || '')}
                        placeholder={translationDatePlaceholder ? `↓ ${translationDatePlaceholder}` : 'Translated date'}
                        disabled={!translationReady}
                        className={`${!displayedDateValue && translationDatePlaceholder ? 'inherited-placeholder' : ''}`}
                    />
                    <CardField
                        label="Displayed Title"
                        value={displayedTitleValue}
                        onChange={(value) => onUpdateTranslation(reveal.id, selectedLanguageCode, 'displayedTitle', value?.toString() || '')}
                        placeholder={translationTitlePlaceholder ? `↓ ${translationTitlePlaceholder}` : 'Translated title'}
                        disabled={!translationReady}
                        className={`${!displayedTitleValue && translationTitlePlaceholder ? 'inherited-placeholder' : ''}`}
                    />
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    <TextArea
                        value={displayedDescriptionValue}
                        onChange={(value) => onUpdateTranslation(reveal.id, selectedLanguageCode, 'displayedDescription', value)}
                        placeholder={
                            !translationReady
                                ? 'Add a supported language to edit translations.'
                                : translationDescriptionPlaceholder
                                    ? `↓ ${translationDescriptionPlaceholder}`
                                    : selectedTranslation?.hasStoredTranslation
                                        ? 'No stored translation yet. Click Translate to generate one.'
                                        : 'Translation will appear here.'
                        }
                        disabled={!translationReady}
                    />
                </div>
            </div>
        </div>
    );
};

export default RevealCardTranslation;
