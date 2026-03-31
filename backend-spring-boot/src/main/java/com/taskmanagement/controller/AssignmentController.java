package com.taskmanagement.controller;

import com.taskmanagement.entity.Assignment;
import com.taskmanagement.service.AssignmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class AssignmentController {
    
    private final AssignmentService service;

    @GetMapping
    public List<Assignment> getAll() {
        return service.getAll();
    }

    @GetMapping("/teacher/{teacherId}")
    public List<Assignment> getByTeacher(@PathVariable Long teacherId) {
        return service.getByTeacherId(teacherId);
    }

    @GetMapping("/student/{studentId}")
    public List<Assignment> getByStudent(@PathVariable Long studentId) {
        return service.getByStudentId(studentId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Assignment> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<Assignment> create(@RequestBody Assignment assignment) {
        return ResponseEntity.ok(service.create(assignment));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Assignment> update(@PathVariable Long id, @RequestBody Assignment assignment) {
        return ResponseEntity.ok(service.update(id, assignment));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
