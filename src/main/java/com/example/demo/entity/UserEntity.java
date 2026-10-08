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
    private UserRole role; // enum 타입을 사용하거나, 단순 String으로 정의 가능
}
