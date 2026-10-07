package com.sliit.se2030.apartmentsales.patterns;

import org.springframework.stereotype.Component;

/**
 * STRATEGY DESIGN PATTERN:
 * Defines a family of pricing & discount algorithms, encapsulates each one,
 * and makes them interchangeable at runtime depending on buyer payment plans.
 */
public interface PricingStrategy {
    String getStrategyName();
    double calculateFinalAmount(double basePrice);
    double calculateDepositAmount(double basePrice);
}

class StandardPricingStrategy implements PricingStrategy {
    @Override
    public String getStrategyName() { return "STANDARD"; }

    @Override
    public double calculateFinalAmount(double basePrice) {
        return basePrice; // No discount
    }

    @Override
    public double calculateDepositAmount(double basePrice) {
        return basePrice * 0.10; // Standard 10% reservation deposit
    }
}

class EarlyBirdDiscountStrategy implements PricingStrategy {
    @Override
    public String getStrategyName() { return "EARLY_BIRD"; }

    @Override
    public double calculateFinalAmount(double basePrice) {
        return basePrice * 0.95; // 5% promotional discount
    }

    @Override
    public double calculateDepositAmount(double basePrice) {
        return basePrice * 0.05; // 5% promotional reservation deposit
    }
}

class FullCashDiscountStrategy implements PricingStrategy {
    @Override
    public String getStrategyName() { return "FULL_CASH"; }

    @Override
    public double calculateFinalAmount(double basePrice) {
        return basePrice * 0.98; // 2% immediate full settlement discount
    }

    @Override
    public double calculateDepositAmount(double basePrice) {
        return basePrice * 0.98; // Full settlement (100% of discounted price)
    }
}
