package com.sliit.se2030.apartmentsales.patterns;

/**
 * STRATEGY DESIGN PATTERN FOR REFUND POLICIES:
 * Encapsulates the refund calculation algorithms:
 * 1. FullRefund (Days 0–2): 100% refunded, 0% tax
 * 2. PartialRefund (Days 3–7): 85% refunded, 15% cutoff as tax
 * 3. NoRefund (After 1 week / > 7 days): 0% refunded, strictly no returns
 */
public interface RefundPolicyStrategy {
    String getPolicyName();
    RefundResult calculateRefund(double totalPaidAmount, long daysElapsed);
}

class FullRefundStrategy implements RefundPolicyStrategy {
    @Override
    public String getPolicyName() {
        return "FULL_REFUND";
    }

    @Override
    public RefundResult calculateRefund(double totalPaidAmount, long daysElapsed) {
        double taxRate = 0.0;
        double taxDeduction = 0.0;
        double netRefund = totalPaidAmount;
        String message = String.format(
                "Full Refund (Day %d, window 0–2 days): 100%% of deposit refunded with zero tax deduction.",
                daysElapsed
        );
        return new RefundResult(getPolicyName(), daysElapsed, totalPaidAmount, taxRate, taxDeduction, netRefund, true, message);
    }
}

class PartialRefundStrategy implements RefundPolicyStrategy {
    private static final double TAX_RATE = 0.15; // 15% cut off as tax

    @Override
    public String getPolicyName() {
        return "PARTIAL_REFUND";
    }

    @Override
    public RefundResult calculateRefund(double totalPaidAmount, long daysElapsed) {
        double taxDeduction = Math.round(totalPaidAmount * TAX_RATE * 100.0) / 100.0;
        double netRefund = Math.round((totalPaidAmount - taxDeduction) * 100.0) / 100.0;
        String message = String.format(
                "Partial Refund (Day %d, window 3–7 days): 15%% tax deducted (LKR %,.2f). Net refund payable: LKR %,.2f.",
                daysElapsed, taxDeduction, netRefund
        );
        return new RefundResult(getPolicyName(), daysElapsed, totalPaidAmount, TAX_RATE, taxDeduction, netRefund, true, message);
    }
}

class NoRefundStrategy implements RefundPolicyStrategy {
    @Override
    public String getPolicyName() {
        return "NO_REFUND";
    }

    @Override
    public RefundResult calculateRefund(double totalPaidAmount, long daysElapsed) {
        double taxDeduction = totalPaidAmount;
        double netRefund = 0.0;
        String message = String.format(
                "Non-Refundable (Day %d): The 1-week grace period has expired. Strictly no returns or refunds permitted.",
                daysElapsed
        );
        return new RefundResult(getPolicyName(), daysElapsed, totalPaidAmount, 0.0, taxDeduction, netRefund, false, message);
    }
}
