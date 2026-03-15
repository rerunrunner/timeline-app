import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { getTableData } from '../../api/client';

interface Tag {
    id: number;
    tag: string;
}

interface TagSelectorProps {
    selectedTagIds: number[];
    onTagsChange: (tagIds: number[]) => void;
    className?: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({
    selectedTagIds,
    onTagsChange,
    className = ''
}) => {
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddTag, setShowAddTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');

    useEffect(() => {
        const fetchTags = async () => {
            try {
                const tags = await getTableData('tag');
                setAllTags(tags);
            } catch (error) {
                console.error('Failed to fetch tags:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTags();
    }, []);

    const handleTagToggle = (tagId: number) => {
        if (selectedTagIds.includes(tagId)) {
            onTagsChange(selectedTagIds.filter(id => id !== tagId));
        } else {
            onTagsChange([...selectedTagIds, tagId]);
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;

        try {
            const newTag = await fetch('/api/tables/tag', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tag: newTagName.trim() }),
            }).then(res => res.json());

            setAllTags(prev => [...prev, newTag]);
            onTagsChange([...selectedTagIds, newTag.id]);
            setNewTagName('');
            setShowAddTag(false);
        } catch (error) {
            console.error('Failed to create tag:', error);
            alert('Failed to create tag');
        }
    };

    const selectedTags = allTags.filter(tag => selectedTagIds.includes(tag.id));
    const availableTags = allTags.filter(tag => !selectedTagIds.includes(tag.id));

    if (loading) {
        return (
            <div className={`tag-selector ${className}`}>
                <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
            </div>
        );
    }

    return (
        <div className={`tag-selector ${className}`}>
            <div className="tag-selector-label">Tags</div>
            
            {/* Selected Tags */}
            {selectedTags.length > 0 && (
                <div className="tag-list selected-tags">
                    {selectedTags.map(tag => (
                        <div
                            key={tag.id}
                            className="tag-tile selected"
                            onClick={() => handleTagToggle(tag.id)}
                        >
                            <span>{tag.tag}</span>
                            <X className="tag-remove-icon" />
                        </div>
                    ))}
                </div>
            )}

            {/* Available Tags */}
            {availableTags.length > 0 && (
                <div className="tag-list available-tags">
                    {availableTags.map(tag => (
                        <div
                            key={tag.id}
                            className="tag-tile available"
                            onClick={() => handleTagToggle(tag.id)}
                        >
                            <span>{tag.tag}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Add New Tag */}
            {showAddTag ? (
                <div className="add-tag-form">
                    <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleCreateTag();
                            } else if (e.key === 'Escape') {
                                setShowAddTag(false);
                                setNewTagName('');
                            }
                        }}
                        onBlur={() => {
                            if (newTagName.trim()) {
                                handleCreateTag();
                            } else {
                                setShowAddTag(false);
                            }
                        }}
                        placeholder="Enter tag name..."
                        autoFocus
                        className="add-tag-input"
                    />
                </div>
            ) : (
                <button
                    className="add-tag-button"
                    onClick={() => setShowAddTag(true)}
                >
                    <Plus className="add-tag-icon" />
                    Add Tag
                </button>
            )}
        </div>
    );
};

export default TagSelector;
