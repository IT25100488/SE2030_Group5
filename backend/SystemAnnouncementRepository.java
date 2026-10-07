package com.sliit.se2030.apartmentsales.repository;

import com.sliit.se2030.apartmentsales.model.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemAnnouncementRepository extends JpaRepository<SystemAnnouncement, Long> {
    List<SystemAnnouncement> findByActiveTrue();
    List<SystemAnnouncement> findByTargetRoleOrTargetRole(String role1, String role2);
}
