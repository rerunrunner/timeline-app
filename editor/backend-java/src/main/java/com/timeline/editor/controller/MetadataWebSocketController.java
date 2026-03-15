package com.timeline.editor.controller;

import com.timeline.editor.model.DatasetMetadata;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class MetadataWebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void broadcastMetadataUpdate(DatasetMetadata metadata) {
        // Broadcast the metadata update to all clients subscribed to /topic/metadata
        messagingTemplate.convertAndSend("/topic/metadata", metadata);
    }
}
