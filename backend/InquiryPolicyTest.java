package com.sliit.se2030.apartmentsales;

import com.sliit.se2030.apartmentsales.dto.SupportTicketDTO;
import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.repository.ApartmentListingRepository;
import com.sliit.se2030.apartmentsales.repository.SupportTicketRepository;
import com.sliit.se2030.apartmentsales.repository.UserRepository;
import com.sliit.se2030.apartmentsales.service.SupportReviewService;
import com.sliit.se2030.apartmentsales.service.ViewingInquiryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Inquiry Edit and Deletion Policy Unit Tests")
public class InquiryPolicyTest {

    @Mock
    private SupportTicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApartmentListingRepository listingRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private SupportReviewService supportReviewService;

    private User buyer;
    private User seller;
    private User agentSelf;
    private User agentOther;
    private User superAdmin;
    private User supportAdmin;

    @BeforeEach
    void setUp() {
        buyer = new User();
        buyer.setId(101L);
        buyer.setEmail("buyer@test.com");
        buyer.setRole(Role.BUYER);
        buyer.setFullName("Buyer John");

        seller = new User();
        seller.setId(102L);
        seller.setEmail("seller@test.com");
        seller.setRole(Role.SELLER);
        seller.setFullName("Seller Sarah");

        agentSelf = new User();
        agentSelf.setId(103L);
        agentSelf.setEmail("agent.self@test.com");
        agentSelf.setRole(Role.AGENT);
        agentSelf.setFullName("Agent Alex");

        agentOther = new User();
        agentOther.setId(104L);
        agentOther.setEmail("agent.other@test.com");
        agentOther.setRole(Role.AGENT);
        agentOther.setFullName("Agent Bob");

        superAdmin = new User();
        superAdmin.setId(105L);
        superAdmin.setEmail("admin@test.com");
        superAdmin.setRole(Role.ADMIN);
        superAdmin.setFullName("Super Admin");

        supportAdmin = new User();
        supportAdmin.setId(106L);
        supportAdmin.setEmail("support@test.com");
        supportAdmin.setRole(Role.SUPPORT_ADMIN);
        supportAdmin.setFullName("Support Admin");
    }

    // --- REQUIREMENT 1: AGENT CAN EDIT INPROGRESS INQUIRIES SUBMITTED BY ONLY BUYERS AND REPLIED BY HIMSELF ---

    @Test
    @DisplayName("Agent can edit INPROGRESS inquiry submitted by buyer and replied by himself")
    void testAgentCanEditInProgressInquirySubmittedByBuyerAndRepliedByHimself() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(1L);
        ticket.setUser(buyer);
        ticket.setResponder(agentSelf);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        ticket.setStaffResponse("Initial response from agent self");

        when(ticketRepository.findById(1L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(agentSelf.getEmail())).thenReturn(Optional.of(agentSelf));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        SupportTicketDTO dto = new SupportTicketDTO();
        dto.setStaffResponse("Updated response by agent self");
        dto.setStatus(TicketStatus.IN_PROGRESS);

        SupportTicket updated = supportReviewService.updateTicket(1L, dto, agentSelf.getEmail());
        assertNotNull(updated);
        assertEquals("Updated response by agent self", updated.getStaffResponse());
    }

    @Test
    @DisplayName("Agent cannot edit inquiry submitted by a seller")
    void testAgentCannotEditInquirySubmittedBySeller() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(2L);
        ticket.setUser(seller);
        ticket.setResponder(agentSelf);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        ticket.setStaffResponse("Response");

        when(ticketRepository.findById(2L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(agentSelf.getEmail())).thenReturn(Optional.of(agentSelf));

        SupportTicketDTO dto = new SupportTicketDTO();
        dto.setStaffResponse("Attempted update");

        assertThrows(AccessDeniedException.class, () ->
                supportReviewService.updateTicket(2L, dto, agentSelf.getEmail())
        );
    }

    @Test
    @DisplayName("Agent cannot edit inquiry replied by another agent")
    void testAgentCannotEditInquiryRepliedByAnotherAgent() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(3L);
        ticket.setUser(buyer);
        ticket.setResponder(agentOther);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        ticket.setStaffResponse("Response by Agent Bob");

        when(ticketRepository.findById(3L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(agentSelf.getEmail())).thenReturn(Optional.of(agentSelf));

        SupportTicketDTO dto = new SupportTicketDTO();
        dto.setStaffResponse("Attempted hijack");

        assertThrows(AccessDeniedException.class, () ->
                supportReviewService.updateTicket(3L, dto, agentSelf.getEmail())
        );
    }

    @Test
    @DisplayName("Agent can re-edit response repeatedly with in-progress attached until he clicks completed")
    void testAgentCanReEditRepeatedlyWithInProgressUntilCompleted() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(33L);
        ticket.setUser(buyer);
        ticket.setStatus(TicketStatus.OPEN);

        when(ticketRepository.findById(33L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(agentSelf.getEmail())).thenReturn(Optional.of(agentSelf));
        when(ticketRepository.save(any(SupportTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1st edit: Agent responds with IN_PROGRESS option attached
        SupportTicketDTO dto1 = new SupportTicketDTO();
        dto1.setStaffResponse("First update by agent");
        dto1.setStatus(TicketStatus.IN_PROGRESS);

        SupportTicket round1 = supportReviewService.updateTicket(33L, dto1, agentSelf.getEmail());
        assertEquals(TicketStatus.IN_PROGRESS, round1.getStatus());
        assertEquals("First update by agent", round1.getStaffResponse());
        assertEquals(agentSelf, round1.getResponder());

        // 2nd edit: Agent re-edits again with IN_PROGRESS
        SupportTicketDTO dto2 = new SupportTicketDTO();
        dto2.setStaffResponse("Second update by agent");
        dto2.setStatus(TicketStatus.IN_PROGRESS);

        SupportTicket round2 = supportReviewService.updateTicket(33L, dto2, agentSelf.getEmail());
        assertEquals(TicketStatus.IN_PROGRESS, round2.getStatus());
        assertEquals("Second update by agent", round2.getStaffResponse());

        // 3rd edit: Agent re-edits and completes (RESOLVED)
        SupportTicketDTO dto3 = new SupportTicketDTO();
        dto3.setStaffResponse("Final completed resolution");
        dto3.setStatus(TicketStatus.RESOLVED);

        SupportTicket round3 = supportReviewService.updateTicket(33L, dto3, agentSelf.getEmail());
        assertEquals(TicketStatus.RESOLVED, round3.getStatus());
        assertEquals("Final completed resolution", round3.getStaffResponse());

        // 4th edit: Agent tries to edit again after completion -> BLOCKED
        SupportTicketDTO dto4 = new SupportTicketDTO();
        dto4.setStaffResponse("Post-completion edit attempt");

        assertThrows(IllegalStateException.class, () ->
                supportReviewService.updateTicket(33L, dto4, agentSelf.getEmail())
        );
    }

    // --- REQUIREMENT 2: NO ONE CAN EDIT INQUIRIES AFTER COMPLETED ---

    @Test
    @DisplayName("Agent cannot edit inquiry after COMPLETED (RESOLVED)")
    void testAgentCannotEditInquiryAfterCompleted() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(4L);
        ticket.setUser(buyer);
        ticket.setResponder(agentSelf);
        ticket.setStatus(TicketStatus.RESOLVED);
        ticket.setStaffResponse("Final resolution");

        when(ticketRepository.findById(4L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(agentSelf.getEmail())).thenReturn(Optional.of(agentSelf));

        SupportTicketDTO dto = new SupportTicketDTO();
        dto.setStaffResponse("Attempted edit after solved");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                supportReviewService.updateTicket(4L, dto, agentSelf.getEmail())
        );
        assertTrue(ex.getMessage().contains("No one can edit inquiries after completion"));
    }

    @Test
    @DisplayName("Super Admin cannot edit inquiry after COMPLETED (CLOSED)")
    void testSuperAdminCannotEditInquiryAfterCompleted() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(5L);
        ticket.setUser(buyer);
        ticket.setStatus(TicketStatus.CLOSED);
        ticket.setStaffResponse("Closed resolution");

        when(ticketRepository.findById(5L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));

        SupportTicketDTO dto = new SupportTicketDTO();
        dto.setStaffResponse("Admin edit attempt");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                supportReviewService.updateTicket(5L, dto, superAdmin.getEmail())
        );
        assertTrue(ex.getMessage().contains("No one can edit inquiries after completion"));
    }

    @Test
    @DisplayName("Buyer cannot edit inquiry after COMPLETED")
    void testBuyerCannotEditInquiryAfterCompleted() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(6L);
        ticket.setUser(buyer);
        ticket.setStatus(TicketStatus.RESOLVED);

        when(ticketRepository.findById(6L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        SupportTicketDTO dto = new SupportTicketDTO();
        dto.setMessage("Buyer message edit attempt");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                supportReviewService.updateTicket(6L, dto, buyer.getEmail())
        );
        assertTrue(ex.getMessage().contains("No one can edit inquiries after completion"));
    }

    // --- REQUIREMENT 3: AGENT CANNOT DELETE ANY INQUIRIES AT ALL ---

    @Test
    @DisplayName("Agent cannot delete an open inquiry")
    void testAgentCannotDeleteOpenInquiry() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(7L);
        ticket.setUser(buyer);
        ticket.setStatus(TicketStatus.OPEN);

        when(ticketRepository.findById(7L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(agentSelf.getEmail())).thenReturn(Optional.of(agentSelf));

        assertThrows(AccessDeniedException.class, () ->
                supportReviewService.deleteTicket(7L, agentSelf.getEmail())
        );
        verify(ticketRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Agent cannot delete an in-progress inquiry even if replied by himself")
    void testAgentCannotDeleteInProgressInquiryRepliedByHimself() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(8L);
        ticket.setUser(buyer);
        ticket.setResponder(agentSelf);
        ticket.setStatus(TicketStatus.IN_PROGRESS);

        when(ticketRepository.findById(8L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(agentSelf.getEmail())).thenReturn(Optional.of(agentSelf));

        assertThrows(AccessDeniedException.class, () ->
                supportReviewService.deleteTicket(8L, agentSelf.getEmail())
        );
        verify(ticketRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Agent cannot delete inquiry even if sent by the agent himself")
    void testAgentCannotDeleteInquirySentByHimself() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(9L);
        ticket.setUser(agentSelf);
        ticket.setStatus(TicketStatus.OPEN);

        when(ticketRepository.findById(9L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(agentSelf.getEmail())).thenReturn(Optional.of(agentSelf));

        assertThrows(AccessDeniedException.class, () ->
                supportReviewService.deleteTicket(9L, agentSelf.getEmail())
        );
        verify(ticketRepository, never()).delete(any());
    }

    // --- REQUIREMENT 4: INQUIRY CAN BE DELETED ONLY BY SENDER AND SUPER ADMIN BEFORE COMPLETION ---

    @Test
    @DisplayName("Sender (Buyer) can delete own inquiry before completion")
    void testSenderCanDeleteOwnInquiryBeforeCompletion() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(10L);
        ticket.setUser(buyer);
        ticket.setStatus(TicketStatus.OPEN);

        when(ticketRepository.findById(10L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        assertDoesNotThrow(() -> supportReviewService.deleteTicket(10L, buyer.getEmail()));
        verify(ticketRepository, times(1)).delete(ticket);
    }

    @Test
    @DisplayName("Super Admin can delete inquiry before completion")
    void testSuperAdminCanDeleteInquiryBeforeCompletion() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(11L);
        ticket.setUser(buyer);
        ticket.setStatus(TicketStatus.IN_PROGRESS);

        when(ticketRepository.findById(11L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));

        assertDoesNotThrow(() -> supportReviewService.deleteTicket(11L, superAdmin.getEmail()));
        verify(ticketRepository, times(1)).delete(ticket);
    }

    @Test
    @DisplayName("Sender cannot delete inquiry after completion (RESOLVED)")
    void testSenderCannotDeleteInquiryAfterCompletion() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(12L);
        ticket.setUser(buyer);
        ticket.setStatus(TicketStatus.RESOLVED);

        when(ticketRepository.findById(12L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(buyer.getEmail())).thenReturn(Optional.of(buyer));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                supportReviewService.deleteTicket(12L, buyer.getEmail())
        );
        assertTrue(ex.getMessage().contains("Inquiries cannot be deleted after completion"));
        verify(ticketRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Super Admin cannot delete inquiry after completion (RESOLVED)")
    void testSuperAdminCannotDeleteInquiryAfterCompletion() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(13L);
        ticket.setUser(buyer);
        ticket.setStatus(TicketStatus.RESOLVED);

        when(ticketRepository.findById(13L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                supportReviewService.deleteTicket(13L, superAdmin.getEmail())
        );
        assertTrue(ex.getMessage().contains("Inquiries cannot be deleted after completion"));
        verify(ticketRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Support Admin cannot delete another user's inquiry")
    void testSupportAdminCannotDeleteInquiry() {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(14L);
        ticket.setUser(buyer);
        ticket.setStatus(TicketStatus.OPEN);

        when(ticketRepository.findById(14L)).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail(supportAdmin.getEmail())).thenReturn(Optional.of(supportAdmin));

        assertThrows(AccessDeniedException.class, () ->
                supportReviewService.deleteTicket(14L, supportAdmin.getEmail())
        );
        verify(ticketRepository, never()).delete(any());
    }
}
