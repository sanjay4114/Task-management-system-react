package com.taskmanagement;

import com.taskmanagement.entity.User;
import com.taskmanagement.entity.User.Role;
import com.taskmanagement.entity.User.UserStatus;
import com.taskmanagement.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;

@SpringBootApplication
public class TaskManagementApplication {
    public static void main(String[] args) {
        SpringApplication.run(TaskManagementApplication.class, args);
    }

    @Bean
    public CommandLineRunner bootstrapData(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Admin
            User admin = userRepository.findByEmail("admin@taskflow.com").orElse(new User());
            admin.setName("System Admin");
            admin.setEmail("admin@taskflow.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole(Role.ADMIN);
            admin.setStatus(UserStatus.ACTIVE);
            admin.setJoiningDate(LocalDate.now().toString());
            userRepository.save(admin);
            System.out.println(">>> Admin synced: admin@taskflow.com / admin123");

            // Teacher
            User teacher = userRepository.findByEmail("teacher@taskflow.com").orElse(new User());
            teacher.setName("John Teacher");
            teacher.setEmail("teacher@taskflow.com");
            teacher.setPassword(passwordEncoder.encode("teacher123"));
            teacher.setRole(Role.TEACHER);
            teacher.setStatus(UserStatus.ACTIVE);
            teacher.setJoiningDate(LocalDate.now().toString());
            userRepository.save(teacher);
            System.out.println(">>> Teacher synced: teacher@taskflow.com / teacher123");

            // Student
            User student = userRepository.findByEmail("student@taskflow.com").orElse(new User());
            student.setName("Jane Student");
            student.setEmail("student@taskflow.com");
            student.setPassword(passwordEncoder.encode("student123"));
            student.setRole(Role.STUDENT);
            student.setStatus(UserStatus.ACTIVE);
            student.setJoiningDate(LocalDate.now().toString());
            userRepository.save(student);
            System.out.println(">>> Student synced: student@taskflow.com / student123");
        };
    }
}
