package com.timeline.editor.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.*;
import java.util.*;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class SchemaController {

    @Autowired
    private DataSource dataSource;

    @GetMapping("/schema")
    public ResponseEntity<Map<String, Object>> getSchema() {
        try (Connection connection = dataSource.getConnection()) {
            Map<String, Object> schema = new HashMap<>();
            Map<String, Object> tables = new HashMap<>();
            Map<String, Object> foreignKeys = new HashMap<>();

            // Get only user tables from PUBLIC schema (excludes system tables)
            DatabaseMetaData metaData = connection.getMetaData();
            ResultSet tablesResult = metaData.getTables(null, "PUBLIC", null, new String[]{"TABLE"});
            
            // Exclude Flyway's internal table
            while (tablesResult.next()) {
                String tableName = tablesResult.getString("TABLE_NAME");
                if (!"flyway_schema_history".equalsIgnoreCase(tableName)) {
                    Map<String, Object> tableInfo = getTableInfo(connection, tableName);
                    // Convert table name to lowercase to match controller mappings
                    tables.put(tableName.toLowerCase(), tableInfo);
                }
            }

            schema.put("tables", tables);
            schema.put("foreign_keys", foreignKeys);
            
            return ResponseEntity.ok(schema);
        } catch (SQLException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "healthy");
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> getTableInfo(Connection connection, String tableName) throws SQLException {
        Map<String, Object> tableInfo = new HashMap<>();
        List<Map<String, Object>> columns = new ArrayList<>();
        List<Map<String, Object>> foreignKeys = new ArrayList<>();

        DatabaseMetaData metaData = connection.getMetaData();
        
        // Get columns
        ResultSet columnsResult = metaData.getColumns(null, null, tableName, null);
        while (columnsResult.next()) {
            Map<String, Object> column = new HashMap<>();
            String dbColumnName = columnsResult.getString("COLUMN_NAME");
            // Convert database column name to camelCase field name
            String fieldName = toCamelCase(dbColumnName);
            column.put("name", fieldName);
            column.put("type", columnsResult.getString("TYPE_NAME"));
            column.put("not_null", columnsResult.getInt("NULLABLE") == DatabaseMetaData.columnNoNulls);
            column.put("default_value", columnsResult.getString("COLUMN_DEF"));
            column.put("primary_key", false); // Will be updated below
            columns.add(column);
        }

        // Get primary keys
        ResultSet pkResult = metaData.getPrimaryKeys(null, null, tableName);
        Set<String> primaryKeys = new HashSet<>();
        while (pkResult.next()) {
            String dbColumnName = pkResult.getString("COLUMN_NAME");
            // Convert to camelCase to match the field names
            primaryKeys.add(toCamelCase(dbColumnName));
        }

        // Update primary key flags
        for (Map<String, Object> column : columns) {
            column.put("primary_key", primaryKeys.contains(column.get("name")));
        }

        // Get foreign keys
        ResultSet fkResult = metaData.getImportedKeys(null, null, tableName);
        while (fkResult.next()) {
            Map<String, Object> fk = new HashMap<>();
            fk.put("column", fkResult.getString("FKCOLUMN_NAME"));
            fk.put("references_table", fkResult.getString("PKTABLE_NAME"));
            fk.put("references_column", fkResult.getString("PKCOLUMN_NAME"));
            foreignKeys.add(fk);
        }

        tableInfo.put("columns", columns);
        tableInfo.put("foreign_keys", foreignKeys);
        tableInfo.put("check_constraints", new ArrayList<>()); // H2 doesn't expose CHECK constraints easily

        return tableInfo;
    }
    
    /**
     * Convert database column name (e.g., TIMELINE_ID) to camelCase field name (e.g., timelineId)
     */
    private String toCamelCase(String dbColumnName) {
        if (dbColumnName == null || dbColumnName.isEmpty()) {
            return dbColumnName;
        }
        
        // Convert to lowercase and split by underscore
        String[] parts = dbColumnName.toLowerCase().split("_");
        StringBuilder result = new StringBuilder(parts[0]);
        
        // Capitalize first letter of each subsequent part
        for (int i = 1; i < parts.length; i++) {
            if (!parts[i].isEmpty()) {
                result.append(parts[i].substring(0, 1).toUpperCase())
                      .append(parts[i].substring(1));
            }
        }
        
        return result.toString();
    }
}
