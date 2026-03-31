package com.taskmanagement.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "exams")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Exam {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;
    private String examDate;
    private Integer durationMinutes;
    private Integer totalMarks;
    private String status;

    @ManyToOne
    @JoinColumn(name = "course_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("exams")
    private Course course;
}
