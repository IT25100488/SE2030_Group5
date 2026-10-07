package com.sliit.se2030.apartmentsales.patterns;

import org.springframework.stereotype.Component;

/**
 * FACTORY DESIGN PATTERN:
 * Resolves the appropriate RefundPolicyStrategy based on days elapsed
 * since the reservation/payment creation:
 * - Days 0–2: FullRefundStrategy (100% refund, 0% tax)
 * - Days 3–7: PartialRefundStrategy (85% refund, 15% cut off as tax)
 * - Days > 7: NoRefundStrategy (After 1 week: strictly no returns, no going back)
 */
@Component
public class RefundPolicyFactory {

    public RefundPolicyStrategy getStrategy(long daysElapsed) {
        if (daysElapsed <= 2) {
            return new FullRefundStrategy();
        } else if (daysElapsed <= 7) {
            return new PartialRefundStrategy();
        } else {
            return new NoRefundStrategy();
        }
    }
}
