package com.sliit.se2030.apartmentsales.patterns;

import org.springframework.stereotype.Component;

@Component
public class PaymentProcessorFactory {

    public PaymentProcessor getProcessor(String paymentMethod) {
        if (paymentMethod == null) {
            return new BankWireProcessor();
        }

        return switch (paymentMethod.toUpperCase()) {
            case "BANK_WIRE", "RTGS_TRANSFER", "RTGS" -> new BankWireProcessor();
            case "BANK_TRANSFER" -> new BankTransferProcessor();
            case "BANKERS_DRAFT", "MANAGERS_CHEQUE", "PAY_ORDER" -> new BankersDraftProcessor();
            case "BANK_SLIP_UPLOAD", "ESCROW_DEPOSIT" -> new EscrowDepositSlipProcessor();
            case "SLIP_UPLOAD" -> new SlipUploadProcessor();
            case "CREDIT_DEBIT_CARD" -> new CardPaymentProcessor();
            default -> new BankWireProcessor();
        };
    }
}
