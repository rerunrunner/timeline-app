package com.timeline.editor.service;

import com.timeline.editor.model.DatasetMetadata;
import com.timeline.editor.repository.DatasetMetadataRepository;
import com.timeline.editor.controller.MetadataWebSocketController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import org.springframework.beans.factory.annotation.Value;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.*;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;

@Service
public class DatasetMetadataService {
    
    private static final Logger log = LoggerFactory.getLogger(DatasetMetadataService.class);

    @Autowired
    private DatasetMetadataRepository datasetMetadataRepository;

    @Autowired
    private MetadataWebSocketController metadataWebSocketController;

    @Autowired
    private DataSource dataSource;

    @Value("${timeline.data.path:./data}")
    private String dataPath;

    private Path getDumpDir() {
        return Path.of(dataPath, "flyway_dump");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String updateVersionAndGetVersion() {
        try {
            DatasetMetadata metadata = datasetMetadataRepository.findFirstByIdIsNotNull();
            if (metadata != null) {
                SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMdd-HHmmss");
                String currentVersion = formatter.format(new Date());
                metadata.setVersion(currentVersion);
                datasetMetadataRepository.save(metadata);

                log.debug("Updated metadata version to: {}", currentVersion);

                // Broadcast the update via WebSocket
                metadataWebSocketController.broadcastMetadataUpdate(metadata);
                
                return currentVersion;
            }
        } catch (Exception e) {
            // Log error but don't fail the operation
            log.error("Failed to update dataset metadata version", e);
        }
        return null;
    }
    
    public void scheduleDump(String version) {
        // Schedule database dump to run asynchronously after current transaction commits
        final String versionToDump = version;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                // Run in async thread to ensure transaction is fully committed
                new Thread(() -> {
                    try {
                        Thread.sleep(100); // Small delay to ensure commit is fully persisted
                        dumpDatabase(versionToDump);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                }).start();
            }
            @Override
            public void suspend() {}
            @Override
            public void resume() {}
            @Override
            public void flush() {}
            @Override
            public void beforeCommit(boolean readOnly) {}
            @Override
            public void beforeCompletion() {}
            @Override
            public void afterCompletion(int status) {}
        });
    }

    public DatasetMetadata getMetadata() {
        return datasetMetadataRepository.findFirstByIdIsNotNull();
    }
    
    @Transactional
    public DatasetMetadata updateMetadata(DatasetMetadata metadata) {
        DatasetMetadata existing = datasetMetadataRepository.findFirstByIdIsNotNull();
        
        if (existing != null) {
            // Update existing metadata
            // Update only user-editable fields, not version
            existing.setId(metadata.getId());
            existing.setName(metadata.getName());
            existing.setDescription(metadata.getDescription());
            
            // Save the metadata update
            DatasetMetadata saved = datasetMetadataRepository.save(existing);
            
            // Trigger version update and dump
            String newVersion = updateVersionAndGetVersion();
            if (newVersion != null) {
                scheduleDump(newVersion);
            }
            
            return saved;
        } else {
            // Create new metadata if none exists
            DatasetMetadata newMetadata = new DatasetMetadata();
            newMetadata.setId(metadata.getId());
            newMetadata.setName(metadata.getName());
            newMetadata.setDescription(metadata.getDescription());
            
            // Generate initial version
            SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMdd-HHmmss");
            newMetadata.setVersion(formatter.format(new Date()));
            
            DatasetMetadata saved = datasetMetadataRepository.save(newMetadata);
            
            log.info("Created new dataset metadata: {}", saved.getId());
            
            return saved;
        }
    }

    /**
     * Creates Flyway-ready SQL dump files (schema + data).
     */
    private void dumpDatabase(String version) {
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(true); // Ensure we're not in a transaction
            Path dumpDir = getDumpDir();
            Files.createDirectories(dumpDir);

            log.debug("Dumping H2 database using DataSource connection...");

            Path dataFile = dumpDir.resolve("V1000__data.sql");

            // First, get the list of tables (excluding Flyway tables)
            ArrayList<String> tableNames = new ArrayList<String>();
            try (Statement stmt = conn.createStatement();
                 ResultSet tables = stmt.executeQuery("""
                        SELECT TABLE_NAME
                        FROM INFORMATION_SCHEMA.TABLES
                        WHERE TABLE_SCHEMA='PUBLIC'
                        ORDER BY TABLE_NAME
                    """)) {
                while (tables.next()) {
                    String tableName = tables.getString("TABLE_NAME");
                    // Skip Flyway tables
                    if (!tableName.toLowerCase().contains("flyway")) {
                        tableNames.add(tableName);
                    }
                }
            }

            // Skip schema export - schema migrations should be manually created

            // ---- Data export
            var dataBuilder = new StringBuilder("SET REFERENTIAL_INTEGRITY FALSE;\n");

            for (String table : tableNames) {
                try (Statement stmt = conn.createStatement()) {
                    dataBuilder.append("-- Data for ").append(table).append("\n");
                    
                    try (ResultSet rs = stmt.executeQuery("SELECT * FROM " + table)) {
                        ResultSetMetaData meta = rs.getMetaData();
                        int cols = meta.getColumnCount();

                        while (rs.next()) {
                            dataBuilder.append("INSERT INTO ").append(table).append(" VALUES(");
                            for (int i = 1; i <= cols; i++) {
                                Object val = rs.getObject(i);
                                if (val == null) {
                                    dataBuilder.append("NULL");
                                } else {
                                    String strVal = val.toString();
                                    
                                    // Check if the value contains special characters
                                    if (strVal.contains("\n") || strVal.contains("\r") || strVal.contains("\t")) {
                                        // Build the value using concatenation with CHR() functions
                                        StringBuilder valueBuilder = new StringBuilder();
                                        StringBuilder currentString = new StringBuilder();
                                        boolean hasContent = false;
                                        
                                        for (int j = 0; j < strVal.length(); j++) {
                                            char c = strVal.charAt(j);
                                            
                                            if (c == '\n' || c == '\r' || c == '\t') {
                                                // Flush current string if any
                                                if (currentString.length() > 0) {
                                                    if (hasContent) valueBuilder.append("||");
                                                    valueBuilder.append("'").append(currentString).append("'");
                                                    currentString.setLength(0);
                                                    hasContent = true;
                                                }
                                                
                                                // Add CHR() function
                                                if (hasContent) valueBuilder.append("||");
                                                int charCode = (int) c;
                                                valueBuilder.append("CHR(").append(charCode).append(")");
                                                hasContent = true;
                                            } else {
                                                // Regular character - accumulate in string
                                                // Escape single quotes
                                                if (c == '\'') {
                                                    currentString.append("''");
                                                } else {
                                                    currentString.append(c);
                                                }
                                            }
                                        }
                                        
                                        // Flush remaining string if any
                                        if (currentString.length() > 0) {
                                            if (hasContent) valueBuilder.append("||");
                                            valueBuilder.append("'").append(currentString).append("'");
                                        }
                                        
                                        dataBuilder.append(valueBuilder);
                                    } else {
                                        // No special characters, just escape single quotes
                                        dataBuilder.append("'").append(strVal.replace("'", "''")).append("'");
                                    }
                                }
                                if (i < cols) dataBuilder.append(", ");
                            }
                            dataBuilder.append(");\n");
                        }
                    }
                    dataBuilder.append("\n");
                }
            }

            dataBuilder.append("SET REFERENTIAL_INTEGRITY TRUE;\n\n");

            // ---- Sequence reset (set auto-increment to max ID + 1)
            dataBuilder.append("-- Reset auto-increment sequences to max ID + 1\n");
            
            for (String table : tableNames) {
                try (Statement stmt = conn.createStatement()) {
                    // Check if table has an ID column with auto-increment
                    try (ResultSet rs = stmt.executeQuery(
                            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS " +
                            "WHERE TABLE_NAME = '" + table + "' " +
                            "AND COLUMN_NAME = 'ID' " +
                            "AND IS_IDENTITY = 'YES'")) {
                        
                        if (rs.next()) {
                            // Get the max ID from the table
                            try (ResultSet maxRs = stmt.executeQuery("SELECT MAX(ID) as MAX_ID FROM " + table)) {
                                if (maxRs.next()) {
                                    long maxId = maxRs.getLong("MAX_ID");
                                    if (maxId > 0) {
                                        dataBuilder.append("ALTER TABLE ")
                                            .append(table)
                                            .append(" ALTER COLUMN ID RESTART WITH ")
                                            .append(maxId + 1)
                                            .append(";\n");
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Files.writeString(dataFile, dataBuilder.toString());

            log.debug("Database dump complete - Data: {}", dataFile.toAbsolutePath());

        } catch (SQLException | IOException e) {
            log.error("Failed to dump H2 database", e);
        }
    }
}
