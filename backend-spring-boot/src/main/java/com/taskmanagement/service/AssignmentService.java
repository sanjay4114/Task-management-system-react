package com.taskmanagement.service;

import com.taskmanagement.entity.Assignment;
import com.taskmanagement.repository.AssignmentRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssignmentService {
    private final AssignmentRepository repository;

    public List<Assignment> getAll() {
        return repository.findAll();
    }

    public List<Assignment> getByTeacherId(Long teacherId) {
        return repository.findByCourseTeacherId(teacherId);
    }

    public List<Assignment> getByStudentId(Long studentId) {
        return repository.findByCourseStudentsId(studentId);
    }

    public Assignment getById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Assignment not found"));
    }

    public Assignment create(Assignment assignment) {
        return repository.save(assignment);
    }

    public Assignment update(Long id, Assignment updated) {
        if(!repository.existsById(id)) {
            throw new RuntimeException("Assignment not found with id " + id);
        }
        updated.setId(id);
        return repository.save(updated);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
