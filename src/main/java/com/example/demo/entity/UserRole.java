package com.example.demo.entity;

public enum UserRole {

    // hasRole()을 사용하는 것이 Spring Security의 표준적인 방식이기 때문에, Enum 선언 시 ROLE_USER, ROLE_ADMIN으로 정의해 두는 것이 관례이자 기본 표준입니다.
    ROLE_USER,
    ROLE_ADMIN
}
