package com.taskmanagement.repository;

import com.taskmanagement.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    @Transactional
    void deleteByUserId(Long userId);
}
