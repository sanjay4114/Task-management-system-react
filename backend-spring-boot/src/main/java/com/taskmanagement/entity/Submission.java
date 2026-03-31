package com.taskmanagement.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

@Entity
@Table(name = "submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Submission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String submissionLink;
    private String submissionFile;
    private LocalDateTime submittedAt;
    private String status;
    private Double grade;

    @ManyToOne
    @JoinColumn(name = "assignment_id", nullable = false)
    @JsonIgnoreProperties("course")
    private Assignment assignment;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    @JsonIgnoreProperties({"taughtCourses", "enrolledCourses"})
    private User student;
}
