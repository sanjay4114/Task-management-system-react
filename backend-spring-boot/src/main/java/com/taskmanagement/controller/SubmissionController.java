package com.taskmanagement.controller;

import com.taskmanagement.entity.Submission;
import com.taskmanagement.service.SubmissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {
    
    private final SubmissionService service;

    @GetMapping
    public List<Submission> getAll() {
        return service.getAll();
    }

    @GetMapping("/student/{studentId}")
    public List<Submission> getByStudent(@PathVariable Long studentId) {
        return service.getByStudentId(studentId);
    }

    @GetMapping("/teacher/{teacherId}")
    public List<Submission> getByTeacher(@PathVariable Long teacherId) {
        return service.getByTeacherId(teacherId);
    }

    @GetMapping("/assignment/{assignmentId}")
    public List<Submission> getByAssignment(@PathVariable Long assignmentId) {
        return service.getByAssignmentId(assignmentId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Submission> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<Submission> create(@RequestBody Submission submission) {
        return ResponseEntity.ok(service.create(submission));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Submission> update(@PathVariable Long id, @RequestBody Submission submission) {
        return ResponseEntity.ok(service.update(id, submission));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
