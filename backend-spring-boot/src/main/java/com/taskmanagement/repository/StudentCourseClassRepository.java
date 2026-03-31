package com.taskmanagement.repository;

import com.taskmanagement.entity.StudentCourseClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentCourseClassRepository extends JpaRepository<StudentCourseClass, Long> {
    List<StudentCourseClass> findByCourseId(Long courseId);
    List<StudentCourseClass> findByCourseIdAndStudentId(Long courseId, Long studentId);
    List<StudentCourseClass> findByStudentId(Long studentId);
    void deleteByCourseIdAndStudentId(Long courseId, Long studentId);
    void deleteByCourseId(Long courseId);
    @org.springframework.transaction.annotation.Transactional
    void deleteByStudentId(Long studentId);
}
