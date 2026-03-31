package com.taskmanagement.dto;

import lombok.Data;
import java.util.List;

@Data
public class ClassAssignmentRequest {
    private Long courseId;
    private Long studentId;
    private List<ClassAssignmentItem> assignments;
}
