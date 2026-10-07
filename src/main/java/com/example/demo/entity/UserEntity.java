package com.example.demo.entity;

import jakarta.persistence.*; // JPA 어노테이션들을 불러옵니다.
import lombok.*;

@Entity
@Table(name = "users") // DB 예약어 문제 방지를 위해 테이블명 명시 권장
@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String passWordConfirm;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private UserRole role; // enum 타입을 사용하거나, 단순 String으로 정의 가능
}
