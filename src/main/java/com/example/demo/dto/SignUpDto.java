package com.example.demo.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SignUpDto {

    private String username;
    private String password;
    // 필요시 추가 필드 (예: name, email 등)
}