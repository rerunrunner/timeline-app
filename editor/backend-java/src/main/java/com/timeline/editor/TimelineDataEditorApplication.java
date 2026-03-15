package com.timeline.editor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.CrossOrigin;

@SpringBootApplication
@CrossOrigin(origins = "http://localhost:5173")
public class TimelineDataEditorApplication {

    private static final Logger log = LoggerFactory.getLogger(TimelineDataEditorApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(TimelineDataEditorApplication.class, args);
        log.info("🚀 Timeline Data Editor Backend started at: http://localhost:5001 🚀 ");
        log.info("💾 H2 Console available at: http://localhost:5001/h2-console      💾 ");
    }
}
