package com.taskmanagement.service;

import com.taskmanagement.entity.Course;
import com.taskmanagement.entity.User;
import com.taskmanagement.repository.CourseRepository;
import com.taskmanagement.repository.UserRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CourseService {
    private final CourseRepository repository;
    private final UserRepository userRepository;

    public List<Course> getAll() {
        return repository.findAll();
    }

    public List<Course> getByTeacherId(Long teacherId) {
        return repository.findByTeacherId(teacherId);
    }

    public List<Course> getByStudentId(Long studentId) {
        return repository.findByStudentsId(studentId);
    }

    public Course getById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Course not found"));
    }

    public Course create(Course course) {
        return repository.save(course);
    }

    public Course update(Long id, Course updated) {
        Course existing = getById(id);
        if (updated.getName() != null) {
            existing.setName(updated.getName());
        }
        if (updated.getSubject() != null) {
            existing.setSubject(updated.getSubject());
        }
        if (updated.getSchedule() != null) {
            existing.setSchedule(updated.getSchedule());
        }
        return repository.save(existing);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    @org.springframework.transaction.annotation.Transactional
    public Course assignTeacher(Long courseId, Long teacherId) {
        // Unassign teacher from any other courses first if you want 1:1
        List<Course> existing = repository.findByTeacherId(teacherId);
        for (Course c : existing) {
            c.setTeacher(null);
            repository.save(c);
        }

        Course course = getById(courseId);
        User teacher = userRepository.findById(teacherId)
            .orElseThrow(() -> new RuntimeException("Teacher not found"));
        course.setTeacher(teacher);
        return repository.save(course);
    }

    @org.springframework.transaction.annotation.Transactional
    public Course assignStudent(Long courseId, Long studentId) {
        // Remove student from all other courses first for 1:1 mapping in UI
        List<Course> existing = repository.findByStudentsId(studentId);
        User student = userRepository.findById(studentId)
            .orElseThrow(() -> new RuntimeException("Student not found"));
            
        for (Course c : existing) {
            c.getStudents().remove(student);
            repository.save(c);
        }

        Course course = getById(courseId);
        if (!course.getStudents().contains(student)) {
            course.getStudents().add(student);
            return repository.save(course);
        }
        return course;
    }
}
