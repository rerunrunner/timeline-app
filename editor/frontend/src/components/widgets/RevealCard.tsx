import React, { useEffect, useMemo, useState } from 'react';
import RevealCardContent from './RevealCardContent';
import RevealCardHeader from './RevealCardHeader';
import RevealCardTranslation from './RevealCardTranslation';
import {
    Language,
    ResolvedRevealTranslation,
    RevealCardData,
    TranslationField
} from './RevealCard.types';

interface RevealCardProps {
    reveal: RevealCardData;
    languages: Language[];
    translations: ResolvedRevealTranslation[];
    events: Array<{ id: number; shortDescription: string; timelineId: number }>;
    episodes: Array<{ id: number; number: number; title: string }>;
    timelines: Array<{ id: number; shortId: string; title: string }>;
    onUpdate: (revealId: number, field: string, value: any) => void;
    onUpdateTranslation: (
        revealId: number,
        languageCode: string,
        field: 'displayedDate' | 'displayedTitle' | 'displayedDescription',
        value: string
    ) => void;
    onDelete: (revealId: number) => void;
    onTranslate: (revealId: number, languageCode: string) => void;
    translatingLanguageCodes?: string[];
    getTranslationPlaceholder: (
        reveal: RevealCardProps['reveal'],
        languageCode: string,
        field: TranslationField
    ) => string;
    displayedDatePlaceholder?: string;
    displayedTitlePlaceholder?: string;
}

const RevealCard: React.FC<RevealCardProps> = ({
    reveal,
    languages,
    translations,
    events,
    episodes,
    timelines,
    onUpdate,
    onUpdateTranslation,
    onDelete,
    onTranslate,
    translatingLanguageCodes = [],
    getTranslationPlaceholder,
    displayedDatePlaceholder,
    displayedTitlePlaceholder
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const targetLanguages = useMemo(
        () => languages.filter((language) => !language.isDefault),
        [languages]
    );
    const defaultLanguageCode = useMemo(
        () => languages.find((language) => language.isDefault)?.code ?? languages[0]?.code ?? 'en',
        [languages]
    );
    const [selectedLanguageCode, setSelectedLanguageCode] = useState(targetLanguages[0]?.code ?? defaultLanguageCode);

    useEffect(() => {
        if (!languages.some((language) => language.code === selectedLanguageCode)) {
            setSelectedLanguageCode(targetLanguages[0]?.code ?? defaultLanguageCode);
            return;
        }

        const currentLanguage = languages.find((language) => language.code === selectedLanguageCode);
        if (targetLanguages.length > 0 && currentLanguage?.isDefault) {
            setSelectedLanguageCode(targetLanguages[0].code);
        }
    }, [defaultLanguageCode, languages, selectedLanguageCode, targetLanguages]);

    const isTranslating = translatingLanguageCodes.includes(selectedLanguageCode);

    return (
        <div className="reveal-card">
            <RevealCardHeader
                reveal={reveal}
                events={events}
                episodes={episodes}
                timelines={timelines}
                onUpdate={onUpdate}
                onDelete={onDelete}
                displayedDatePlaceholder={displayedDatePlaceholder}
                displayedTitlePlaceholder={displayedTitlePlaceholder}
            />

            {isExpanded && (
                <div className="reveal-card-content">
                    <RevealCardContent
                        reveal={reveal}
                        onUpdate={onUpdate}
                    />
                    <RevealCardTranslation
                        reveal={reveal}
                        targetLanguages={targetLanguages}
                        translations={translations}
                        selectedLanguageCode={selectedLanguageCode}
                        onSelectLanguage={setSelectedLanguageCode}
                        onUpdate={onUpdate}
                        onUpdateTranslation={onUpdateTranslation}
                        onTranslate={onTranslate}
                        isTranslating={isTranslating}
                        getTranslationPlaceholder={getTranslationPlaceholder}
                    />
                </div>
            )}

            <div className="reveal-card-toggle">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="reveal-toggle-btn"
                >
                    {isExpanded ? 'Collapse' : 'Expand'}
                </button>
            </div>
        </div>
    );
};

export default RevealCard;
