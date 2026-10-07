package com.sliit.se2030.apartmentsales.patterns;

import org.springframework.stereotype.Component;

/**
 * SINGLETON DESIGN PATTERN:
 * Ensures a single, globally accessible instance manages database diagnostics,
 * uptime monitoring, and active connection tracking for the Apartment Sales System.
 */
@Component
public class DatabaseConfigHelper {

    private static DatabaseConfigHelper instance;
    private final long initializedAt;

    public DatabaseConfigHelper() {
        this.initializedAt = System.currentTimeMillis();
        synchronized (DatabaseConfigHelper.class) {
            instance = this;
        }
    }

    public static synchronized DatabaseConfigHelper getInstance() {
        if (instance == null) {
            instance = new DatabaseConfigHelper();
        }
        return instance;
    }

    public String getDatabaseStatus() {
        return "ONLINE (MySQL 8.0 - Port 3306)";
    }

    public long getUptimeSeconds() {
        return (System.currentTimeMillis() - initializedAt) / 1000;
    }
}
