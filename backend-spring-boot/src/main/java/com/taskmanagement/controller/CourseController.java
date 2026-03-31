package com.taskmanagement.controller;

import com.taskmanagement.entity.Course;
import com.taskmanagement.service.CourseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {
    
    private final CourseService service;

    @GetMapping
    public List<Course> getAll() {
        return service.getAll();
    }

    @GetMapping("/teacher/{teacherId}")
    public List<Course> getByTeacher(@PathVariable Long teacherId) {
        return service.getByTeacherId(teacherId);
    }

    @GetMapping("/student/{studentId}")
    public List<Course> getByStudent(@PathVariable Long studentId) {
        return service.getByStudentId(studentId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Course> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<Course> create(@RequestBody Course course) {
        return ResponseEntity.ok(service.create(course));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Course> update(@PathVariable Long id, @RequestBody Course course) {
        return ResponseEntity.ok(service.update(id, course));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/assign-teacher/{teacherId}")
    public ResponseEntity<Course> assignTeacher(@PathVariable Long id, @PathVariable Long teacherId) {
        return ResponseEntity.ok(service.assignTeacher(id, teacherId));
    }

    @PutMapping("/{id}/assign-student/{studentId}")
    public ResponseEntity<Course> assignStudent(@PathVariable Long id, @PathVariable Long studentId) {
        return ResponseEntity.ok(service.assignStudent(id, studentId));
    }
}
