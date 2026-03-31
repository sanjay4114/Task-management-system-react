package com.taskmanagement.service;

import com.taskmanagement.entity.Exam;
import com.taskmanagement.repository.ExamRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExamService {
    private final ExamRepository repository;

    public List<Exam> getAll() {
        return repository.findAll();
    }

    public List<Exam> getByTeacherId(Long teacherId) {
        return repository.findByCourseTeacherId(teacherId);
    }

    public List<Exam> getByStudentId(Long studentId) {
        return repository.findByCourseStudentsId(studentId);
    }

    public Exam getById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Exam not found"));
    }

    public Exam create(Exam exam) {
        return repository.save(exam);
    }

    public Exam update(Long id, Exam updated) {
        if(!repository.existsById(id)) {
            throw new RuntimeException("Exam not found with id " + id);
        }
        updated.setId(id);
        return repository.save(updated);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
