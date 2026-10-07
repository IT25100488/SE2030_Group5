package com.sliit.se2030.apartmentsales.dto;

import com.sliit.se2030.apartmentsales.model.*;

import java.util.Map;

public class DashboardMetricsDTO {

    private long totalListings;
    private long availableListings;
    private long reservedListings;
    private long soldListings;
    private long totalUsers;
    private long totalAppointments;
    private long totalTransactions;
    private double totalRevenue;
    private double totalInventoryValue;
    private long openSupportTickets;
    private Map<String, Long> usersByRole;

    public DashboardMetricsDTO() {}

    public long getTotalListings() { return totalListings; }
    public void setTotalListings(long totalListings) { this.totalListings = totalListings; }

    public long getAvailableListings() { return availableListings; }
    public void setAvailableListings(long availableListings) { this.availableListings = availableListings; }

    public long getReservedListings() { return reservedListings; }
    public void setReservedListings(long reservedListings) { this.reservedListings = reservedListings; }

    public long getSoldListings() { return soldListings; }
    public void setSoldListings(long soldListings) { this.soldListings = soldListings; }

    public long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }

    public long getTotalAppointments() { return totalAppointments; }
    public void setTotalAppointments(long totalAppointments) { this.totalAppointments = totalAppointments; }

    public long getTotalTransactions() { return totalTransactions; }
    public void setTotalTransactions(long totalTransactions) { this.totalTransactions = totalTransactions; }

    public double getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(double totalRevenue) { this.totalRevenue = totalRevenue; }

    public double getTotalInventoryValue() { return totalInventoryValue; }
    public void setTotalInventoryValue(double totalInventoryValue) { this.totalInventoryValue = totalInventoryValue; }

    public long getOpenSupportTickets() { return openSupportTickets; }
    public void setOpenSupportTickets(long openSupportTickets) { this.openSupportTickets = openSupportTickets; }

    public Map<String, Long> getUsersByRole() { return usersByRole; }
    public void setUsersByRole(Map<String, Long> usersByRole) { this.usersByRole = usersByRole; }
}
