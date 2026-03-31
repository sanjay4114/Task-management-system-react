package com.taskmanagement.controller;

import com.taskmanagement.entity.Course;
import com.taskmanagement.entity.StudentCourseClass;
import com.taskmanagement.entity.User;
import com.taskmanagement.repository.CourseRepository;
import com.taskmanagement.repository.StudentCourseClassRepository;
import com.taskmanagement.repository.UserRepository;
import com.taskmanagement.dto.ClassAssignmentRequest;
import com.taskmanagement.dto.ClassAssignmentItem;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RestController
@RequestMapping("/api/student-classes")
@RequiredArgsConstructor
public class StudentCourseClassController {
    
    private final StudentCourseClassRepository repository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    @GetMapping("/course/{courseId}")
    public List<StudentCourseClass> getByCourse(@PathVariable Long courseId) {
        return repository.findByCourseId(courseId);
    }

    @GetMapping("/student/{studentId}")
    public List<StudentCourseClass> getByStudent(@PathVariable Long studentId) {
        return repository.findByStudentId(studentId);
    }

    @PostMapping("/assign")
    @Transactional
    public ResponseEntity<Void> assignClasses(@RequestBody ClassAssignmentRequest req) {
        Course course = courseRepository.findById(req.getCourseId())
            .orElseThrow(() -> new RuntimeException("Course not found"));
        User student = userRepository.findById(req.getStudentId())
            .orElseThrow(() -> new RuntimeException("Student not found"));

        repository.deleteByCourseIdAndStudentId(req.getCourseId(), req.getStudentId());

        if (req.getAssignments() != null) {
            for (ClassAssignmentItem item : req.getAssignments()) {
                if (item.getClassName() == null || item.getClassName().trim().isEmpty()) continue;
                StudentCourseClass scc = new StudentCourseClass();
                scc.setCourse(course);
                scc.setStudent(student);
                scc.setClassName(item.getClassName().trim());
                scc.setSchedule(item.getSchedule());
                repository.save(scc);
            }
        }
        return ResponseEntity.ok().build();
    }
}
