package com.timeline.editor.service;

import com.timeline.editor.model.Reveal;
import com.timeline.editor.repository.RevealRepository;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.Optional;

@Service
public class RevealWriteService {

    private final RevealRepository revealRepository;
    private final TranslationManagerService translationManagerService;

    public RevealWriteService(RevealRepository revealRepository, TranslationManagerService translationManagerService) {
        this.revealRepository = revealRepository;
        this.translationManagerService = translationManagerService;
    }

    public Reveal createReveal(Reveal reveal) {
        Reveal savedReveal = revealRepository.save(reveal);
        translationManagerService.autoTranslateReveal(savedReveal.getId());
        return savedReveal;
    }

    public Optional<Reveal> updateReveal(Long id, Reveal revealDetails) {
        Optional<Reveal> optionalReveal = revealRepository.findById(id);
        if (optionalReveal.isEmpty()) {
            return Optional.empty();
        }

        Reveal existingReveal = optionalReveal.get();
        boolean translationRelevantChange = hasTranslationRelevantChange(existingReveal, revealDetails);

        existingReveal.setEventId(revealDetails.getEventId());
        existingReveal.setApparentTimelineId(revealDetails.getApparentTimelineId());
        existingReveal.setEpisodeId(revealDetails.getEpisodeId());
        existingReveal.setEpisodeTime(revealDetails.getEpisodeTime());
        existingReveal.setDisplayedDate(revealDetails.getDisplayedDate());
        existingReveal.setDisplayedTitle(revealDetails.getDisplayedTitle());
        existingReveal.setDisplayedDescription(revealDetails.getDisplayedDescription());
        existingReveal.setTranslationContext(revealDetails.getTranslationContext());
        existingReveal.setScreenshotFilename(revealDetails.getScreenshotFilename());

        Reveal updatedReveal = revealRepository.save(existingReveal);
        if (translationRelevantChange) {
            translationManagerService.autoTranslateReveal(updatedReveal.getId());
        }

        return Optional.of(updatedReveal);
    }

    private boolean hasTranslationRelevantChange(Reveal existingReveal, Reveal revealDetails) {
        return !Objects.equals(existingReveal.getDisplayedDate(), revealDetails.getDisplayedDate())
                || !Objects.equals(existingReveal.getDisplayedTitle(), revealDetails.getDisplayedTitle())
                || !Objects.equals(existingReveal.getDisplayedDescription(), revealDetails.getDisplayedDescription())
                || !Objects.equals(existingReveal.getTranslationContext(), revealDetails.getTranslationContext());
    }
}
