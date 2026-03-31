package com.taskmanagement.repository;

import com.taskmanagement.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findByCourseTeacherId(Long teacherId);
    List<Exam> findByCourseStudentsId(Long studentId);
}
