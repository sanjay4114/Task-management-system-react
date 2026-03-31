package com.taskmanagement.service;

import com.taskmanagement.entity.Attendance;
import com.taskmanagement.repository.AttendanceRepository;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceService {
    private final AttendanceRepository repository;

    public List<Attendance> getAll() {
        return repository.findAll();
    }

    public List<Attendance> getByTeacherId(Long teacherId) {
        return repository.findByCourseTeacherId(teacherId);
    }

    public List<Attendance> getByStudentId(Long studentId) {
        return repository.findByStudentId(studentId);
    }

    public Attendance getById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Attendance not found"));
    }

    public Attendance create(Attendance attendance) {
        return repository.save(attendance);
    }

    public Attendance update(Long id, Attendance updated) {
        if(!repository.existsById(id)) {
            throw new RuntimeException("Attendance not found with id " + id);
        }
        updated.setId(id);
        return repository.save(updated);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
