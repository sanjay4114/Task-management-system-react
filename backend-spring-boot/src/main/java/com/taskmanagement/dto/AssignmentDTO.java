package com.taskmanagement.dto;

import lombok.Data;

@Data
public class AssignmentDTO {
    private Long id;
    private String title;
    private String description;
    private String dueDate;
    private Long courseId;
}
