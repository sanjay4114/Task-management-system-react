package com.taskmanagement.repository;

import com.taskmanagement.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByCourseTeacherId(Long teacherId);
    List<Attendance> findByStudentId(Long studentId);
    @Transactional
    void deleteByStudentId(Long studentId);
}
