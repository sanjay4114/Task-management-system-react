package com.taskmanagement.repository;

import com.taskmanagement.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByCourseTeacherId(Long teacherId);
    List<Assignment> findByCourseStudentsId(Long studentId);
}
