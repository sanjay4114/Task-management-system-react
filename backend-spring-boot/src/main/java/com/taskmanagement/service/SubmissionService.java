package com.taskmanagement.service;

import com.taskmanagement.entity.Submission;
import com.taskmanagement.repository.SubmissionRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SubmissionService {
    private final SubmissionRepository repository;

    public List<Submission> getAll() {
        return repository.findAll();
    }

    public List<Submission> getByStudentId(Long studentId) {
        return repository.findByStudentId(studentId);
    }

    public List<Submission> getByAssignmentId(Long assignmentId) {
        return repository.findByAssignmentId(assignmentId);
    }

    public List<Submission> getByTeacherId(Long teacherId) {
        return repository.findByAssignmentCourseTeacherId(teacherId);
    }

    public Submission getById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Submission not found"));
    }

    public Submission create(Submission submission) {
        return repository.save(submission);
    }

    public Submission update(Long id, Submission updated) {
        Submission existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Submission not found with id " + id));
        
        // Only update specific fields to prevent overwriting relationships (assignment, student)
        if (updated.getGrade() != null) {
            existing.setGrade(updated.getGrade());
        }
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }
        
        return repository.save(existing);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
