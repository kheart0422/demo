package com.example.demo.entity;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
public class UserEntity {
    private Long id;
    private String username;
    private String password;
    private String passWordConfirm;
}
