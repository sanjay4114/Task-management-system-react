package com.taskmanagement.service;

import com.taskmanagement.entity.ActivityLog;
import com.taskmanagement.repository.ActivityLogRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityLogService {
    private final ActivityLogRepository repository;

    public List<ActivityLog> getAll() {
        return repository.findAll();
    }

    public ActivityLog getById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("ActivityLog not found"));
    }

    public ActivityLog create(ActivityLog activityLog) {
        return repository.save(activityLog);
    }

    public ActivityLog update(Long id, ActivityLog updated) {
        if(!repository.existsById(id)) {
            throw new RuntimeException("ActivityLog not found with id " + id);
        }
        updated.setId(id);
        return repository.save(updated);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
