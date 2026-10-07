package com.sliit.se2030.apartmentsales;

import com.sliit.se2030.apartmentsales.patterns.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("SE2030 Applied Design Pattern Unit Tests")
public class DesignPatternTests {

    // 1. SINGLETON PATTERN TEST
    @Test
    @DisplayName("Singleton: DatabaseConfigHelper returns unique single instance")
    void testSingletonDatabaseConfigHelper() {
        DatabaseConfigHelper instance1 = DatabaseConfigHelper.getInstance();
        DatabaseConfigHelper instance2 = DatabaseConfigHelper.getInstance();

        assertNotNull(instance1, "Instance should not be null");
        assertSame(instance1, instance2, "Both instances must reference the exact same memory address (Singleton guarantee)");
        assertTrue(instance1.getDatabaseStatus().contains("ONLINE"), "Database status should be ONLINE");
    }

    // 2. STRATEGY PATTERN (PRICING) TESTS
    @Test
    @DisplayName("Strategy (Pricing): StandardPricingStrategy calculates correct full price and 10% deposit")
    void testStandardPricingStrategy() {
        PricingStrategyFactory factory = new PricingStrategyFactory();
        PricingStrategy strategy = factory.getStrategy("STANDARD");

        assertEquals("STANDARD", strategy.getStrategyName());
        double basePrice = 10_000_000.0;
        assertEquals(10_000_000.0, strategy.calculateFinalAmount(basePrice), 0.01);
        assertEquals(1_000_000.0, strategy.calculateDepositAmount(basePrice), 0.01);
    }

    @Test
    @DisplayName("Strategy (Pricing): EarlyBirdDiscountStrategy calculates 5% discount and 5% deposit")
    void testEarlyBirdPricingStrategy() {
        PricingStrategyFactory factory = new PricingStrategyFactory();
        PricingStrategy strategy = factory.getStrategy("EARLY_BIRD");

        assertEquals("EARLY_BIRD", strategy.getStrategyName());
        double basePrice = 10_000_000.0;
        assertEquals(9_500_000.0, strategy.calculateFinalAmount(basePrice), 0.01);
        assertEquals(500_000.0, strategy.calculateDepositAmount(basePrice), 0.01);
    }

    @Test
    @DisplayName("Strategy (Pricing): FullCashDiscountStrategy calculates 2% discount and 100% full settlement")
    void testFullCashPricingStrategy() {
        PricingStrategyFactory factory = new PricingStrategyFactory();
        PricingStrategy strategy = factory.getStrategy("FULL_CASH");

        assertEquals("FULL_CASH", strategy.getStrategyName());
        double basePrice = 10_000_000.0;
        assertEquals(9_800_000.0, strategy.calculateFinalAmount(basePrice), 0.01);
        assertEquals(9_800_000.0, strategy.calculateDepositAmount(basePrice), 0.01);
    }

    // 3. STRATEGY & FACTORY PATTERN (REFUND POLICIES) TESTS
    @Test
    @DisplayName("Strategy & Factory (Refund): Tier 1 (Days 0-2) yields FullRefund with 0% tax deduction")
    void testRefundPolicyTier1FullRefund() {
        RefundPolicyFactory factory = new RefundPolicyFactory();
        RefundPolicyStrategy strategy = factory.getStrategy(1);

        assertEquals("FULL_REFUND", strategy.getPolicyName());
        double deposit = 2_000_000.0;
        RefundResult result = strategy.calculateRefund(deposit, 1);

        assertTrue(result.isEligible(), "Refund should be eligible within days 0-2");
        assertEquals(0.0, result.getTaxDeduction(), 0.01, "Zero tax should be deducted");
        assertEquals(2_000_000.0, result.getNetRefundAmount(), 0.01, "100% deposit should be refunded");
    }

    @Test
    @DisplayName("Strategy & Factory (Refund): Tier 2 (Days 3-7) yields PartialRefund with 15% tax deduction")
    void testRefundPolicyTier2PartialRefund() {
        RefundPolicyFactory factory = new RefundPolicyFactory();
        RefundPolicyStrategy strategy = factory.getStrategy(5);

        assertEquals("PARTIAL_REFUND", strategy.getPolicyName());
        double deposit = 2_000_000.0;
        RefundResult result = strategy.calculateRefund(deposit, 5);

        assertTrue(result.isEligible(), "Refund should be eligible within days 3-7");
        assertEquals(300_000.0, result.getTaxDeduction(), 0.01, "15% of 2,000,000 is 300,000 tax");
        assertEquals(1_700_000.0, result.getNetRefundAmount(), 0.01, "85% net refund payable");
    }

    @Test
    @DisplayName("Strategy & Factory (Refund): Tier 3 (Days > 7 / After 1 week) strictly non-refundable (no returns)")
    void testRefundPolicyTier3NoRefund() {
        RefundPolicyFactory factory = new RefundPolicyFactory();
        RefundPolicyStrategy strategy = factory.getStrategy(8);

        assertEquals("NO_REFUND", strategy.getPolicyName());
        double deposit = 2_000_000.0;
        RefundResult result = strategy.calculateRefund(deposit, 8);

        assertFalse(result.isEligible(), "Must NOT be eligible after 7 days (strict 1-week policy)");
        assertEquals(0.0, result.getNetRefundAmount(), 0.01, "Net refund must be zero");
        assertTrue(result.getMessage().contains("Strictly no returns"), "Message must explain no-returns policy");
    }

    // 4. FACTORY PATTERN (PAYMENT PROCESSORS) TEST
    @Test
    @DisplayName("Factory: PaymentProcessorFactory resolves appropriate payment channel")
    void testPaymentProcessorFactory() {
        PaymentProcessorFactory factory = new PaymentProcessorFactory();

        PaymentProcessor card = factory.getProcessor("CREDIT_DEBIT_CARD");
        assertEquals("CREDIT_DEBIT_CARD", card.getPaymentType());
        assertTrue(card.processPayment(50_000, "CARD-REF-12345"));

        PaymentProcessor wire = factory.getProcessor("BANK_TRANSFER");
        assertEquals("BANK_TRANSFER", wire.getPaymentType());
        assertTrue(wire.processPayment(50_000, "TXN-WIRE-12345"));

        PaymentProcessor slip = factory.getProcessor("SLIP_UPLOAD");
        assertEquals("SLIP_UPLOAD", slip.getPaymentType());
        assertTrue(slip.processPayment(50_000, "SLIP-REF-12345"));

        // High-Value Real Estate Payment Channels
        PaymentProcessor rtgs = factory.getProcessor("BANK_WIRE");
        assertEquals("BANK_WIRE", rtgs.getPaymentType());
        assertTrue(rtgs.processPayment(50_000_000, "RTGS-982145"));

        PaymentProcessor draft = factory.getProcessor("BANKERS_DRAFT");
        assertEquals("BANKERS_DRAFT", draft.getPaymentType());
        assertTrue(draft.processPayment(50_000_000, "BD-771204-HNB"));

        PaymentProcessor escrow = factory.getProcessor("BANK_SLIP_UPLOAD");
        assertEquals("BANK_SLIP_UPLOAD", escrow.getPaymentType());
        assertTrue(escrow.processPayment(50_000_000, "SLIP-40192-COMBANK"));
    }
}
