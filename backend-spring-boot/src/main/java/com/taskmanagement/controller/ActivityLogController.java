package com.taskmanagement.controller;

import com.taskmanagement.entity.ActivityLog;
import com.taskmanagement.service.ActivityLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;

@RestController
@RequestMapping("/api/activitylogs")
@RequiredArgsConstructor
public class ActivityLogController {
    
    private final ActivityLogService service;

    @GetMapping
    public List<ActivityLog> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActivityLog> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<ActivityLog> create(@RequestBody ActivityLog activityLog) {
        return ResponseEntity.ok(service.create(activityLog));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActivityLog> update(@PathVariable Long id, @RequestBody ActivityLog activityLog) {
        return ResponseEntity.ok(service.update(id, activityLog));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
