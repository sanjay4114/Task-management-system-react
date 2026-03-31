package com.taskmanagement.service;

import com.taskmanagement.entity.User;
import com.taskmanagement.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository repository;
    private final CourseRepository courseRepository;
    private final AttendanceRepository attendanceRepository;
    private final SubmissionRepository submissionRepository;
    private final ActivityLogRepository activityLogRepository;
    private final StudentCourseClassRepository studentCourseClassRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public List<User> getAll() {
        return repository.findAll();
    }

    public User getById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User create(User user) {
        if (user.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        return repository.save(user);
    }

    public User update(Long id, User updated) {
        User existing = repository.findById(id).orElseThrow(() -> new RuntimeException("User not found with id " + id));
        
        if (updated.getPassword() != null && !updated.getPassword().isEmpty()) {
            existing.setPassword(passwordEncoder.encode(updated.getPassword()));
        }
        
        existing.setName(updated.getName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setDob(updated.getDob());
        existing.setJoiningDate(updated.getJoiningDate());
        existing.setQualification(updated.getQualification());
        existing.setNotes(updated.getNotes());
        existing.setRole(updated.getRole());
        existing.setStatus(updated.getStatus());
        
        return repository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        User user = getById(id);

        // 1. Cleanup Course Associations (Teacher)
        List<com.taskmanagement.entity.Course> teaching = courseRepository.findByTeacherId(id);
        for (com.taskmanagement.entity.Course c : teaching) {
            c.setTeacher(null);
            courseRepository.save(c);
        }

        // 2. Cleanup Course Associations (Student)
        List<com.taskmanagement.entity.Course> enrolled = courseRepository.findByStudentsId(id);
        for (com.taskmanagement.entity.Course c : enrolled) {
            c.getStudents().remove(user);
            courseRepository.save(c);
        }

        // 3. Cleanup other records
        studentCourseClassRepository.deleteByStudentId(id);
        attendanceRepository.deleteByStudentId(id);
        submissionRepository.deleteByStudentId(id);
        activityLogRepository.deleteByUserId(id);

        // 4. Finally delete user
        repository.deleteById(id);
    }
}
