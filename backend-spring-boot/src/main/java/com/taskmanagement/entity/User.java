package com.taskmanagement.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    private String phone;
    private String dob;
    private String joiningDate;
    private String qualification;
    private String notes;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    private String password;

    @Enumerated(EnumType.STRING)
    private Role role; // ADMIN, TEACHER, STUDENT

    @Enumerated(EnumType.STRING)
    private UserStatus status; // ONLINE, ACTIVE, INACTIVE

    @OneToMany(mappedBy = "teacher")
    @JsonIgnoreProperties("teacher")
    private List<Course> taughtCourses;

    @ManyToMany(mappedBy = "students")
    @JsonIgnoreProperties("students")
    private List<Course> enrolledCourses;

    public enum Role { ADMIN, TEACHER, STUDENT }
    public enum UserStatus { ONLINE, ACTIVE, INACTIVE }
}
