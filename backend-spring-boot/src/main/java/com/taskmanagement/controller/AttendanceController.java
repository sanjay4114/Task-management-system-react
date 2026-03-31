package com.taskmanagement.controller;

import com.taskmanagement.entity.Attendance;
import com.taskmanagement.service.AttendanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;

@RestController
@RequestMapping("/api/attendances")
@RequiredArgsConstructor
public class AttendanceController {
    
    private final AttendanceService service;

    @GetMapping
    public List<Attendance> getAll() {
        return service.getAll();
    }

    @GetMapping("/teacher/{teacherId}")
    public List<Attendance> getByTeacher(@PathVariable Long teacherId) {
        return service.getByTeacherId(teacherId);
    }

    @GetMapping("/student/{studentId}")
    public List<Attendance> getByStudent(@PathVariable Long studentId) {
        return service.getByStudentId(studentId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Attendance> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<Attendance> create(@RequestBody Attendance attendance) {
        return ResponseEntity.ok(service.create(attendance));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Attendance> update(@PathVariable Long id, @RequestBody Attendance attendance) {
        return ResponseEntity.ok(service.update(id, attendance));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
