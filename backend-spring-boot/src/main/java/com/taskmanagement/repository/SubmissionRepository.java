package com.taskmanagement.repository;

import com.taskmanagement.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

import org.springframework.transaction.annotation.Transactional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByStudentId(Long studentId);
    List<Submission> findByAssignmentId(Long assignmentId);
    List<Submission> findByAssignmentCourseTeacherId(Long teacherId);
    @Transactional
    void deleteByStudentId(Long studentId);
}
