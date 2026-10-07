package com.sliit.se2030.apartmentsales.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * MODULE 2.3: Anti-Scraping / Rate Limiting Filter
 * Implements an in-memory sliding-window rate limiter per client IP
 * on public search discovery and listing endpoints.
 * Limits clients to 60 requests per minute.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_MINUTE = 60;
    private static final long ONE_MINUTE_MILLIS = 60_000L;

    private final ConcurrentHashMap<String, Deque<Long>> requestLogMap = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Rate limit applies to public search and public listing browsing endpoints
        if (isRateLimitedPath(path)) {
            String clientIp = extractClientIp(request);
            long now = System.currentTimeMillis();

            Deque<Long> timestamps = requestLogMap.computeIfAbsent(clientIp, k -> new ArrayDeque<>());

            synchronized (timestamps) {
                // Evict timestamps older than 1 minute
                while (!timestamps.isEmpty() && (now - timestamps.peekFirst()) > ONE_MINUTE_MILLIS) {
                    timestamps.pollFirst();
                }

                if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
                    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setHeader("Retry-After", "60");
                    response.getWriter().write(
                            "{\"error\":\"Too Many Requests: Public search & discovery rate limit exceeded (60 req/min). Anti-scraping policy in effect. Please try again later.\",\"status\":429}"
                    );
                    return;
                }

                timestamps.addLast(now);
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimitedPath(String path) {
        if (path == null) return false;
        return path.startsWith("/api/search") || path.startsWith("/api/listings/public");
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
