import React from 'react';
import { ImageUpload, TextArea } from './index';
import { RevealCardData } from './RevealCard.types';

interface RevealCardContentProps {
    reveal: RevealCardData;
    onUpdate: (revealId: number, field: string, value: any) => void;
}

const RevealCardContent: React.FC<RevealCardContentProps> = ({
    reveal,
    onUpdate
}) => {
    return (
        <div className="translation-layout-row translation-layout-row-top">
            <div className="translation-panel translation-panel-source">
                <label>English Displayed Description</label>
                <div onClick={(e) => e.stopPropagation()}>
                    <TextArea
                        value={reveal.displayedDescription || ''}
                        onChange={(value) => onUpdate(reveal.id, 'displayedDescription', value)}
                    />
                </div>
            </div>

            <div className="translation-panel translation-panel-screenshot">
                <label>Screenshot</label>
                <ImageUpload
                    revealId={reveal.id}
                    filename={reveal.screenshotFilename}
                    onImageChange={(filename) => onUpdate(reveal.id, 'screenshotFilename', filename)}
                />
            </div>
        </div>
    );
};

export default RevealCardContent;
