package com.taskmanagement.controller;

import com.taskmanagement.entity.Exam;
import com.taskmanagement.service.ExamService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;

@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {
    
    private final ExamService service;

    @GetMapping
    public List<Exam> getAll() {
        return service.getAll();
    }

    @GetMapping("/teacher/{teacherId}")
    public List<Exam> getByTeacher(@PathVariable Long teacherId) {
        return service.getByTeacherId(teacherId);
    }

    @GetMapping("/student/{studentId}")
    public List<Exam> getByStudent(@PathVariable Long studentId) {
        return service.getByStudentId(studentId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Exam> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<Exam> create(@RequestBody Exam exam) {
        return ResponseEntity.ok(service.create(exam));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Exam> update(@PathVariable Long id, @RequestBody Exam exam) {
        return ResponseEntity.ok(service.update(id, exam));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
