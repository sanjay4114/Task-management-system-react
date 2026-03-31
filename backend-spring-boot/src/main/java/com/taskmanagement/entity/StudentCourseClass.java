package com.taskmanagement.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "student_course_classes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudentCourseClass {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    @JsonIgnoreProperties({"taughtCourses", "enrolledCourses"})
    private User student;

    @ManyToOne
    @JoinColumn(name = "course_id", nullable = false)
    @JsonIgnoreProperties({"assignments", "exams", "attendanceRecords"})
    private Course course;

    @Column(nullable = false)
    private String className;

    private String schedule;
}
