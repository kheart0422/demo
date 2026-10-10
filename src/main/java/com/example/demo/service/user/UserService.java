package com.example.demo.service.user;

import com.example.demo.dto.SignUpDto;
import com.example.demo.entity.UserEntity;
import com.example.demo.mapper.UserMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final PasswordEncoder passwordEncoder;
    @Autowired private UserMapper userMapper;

    /**
     * 회원가입 기능
     * - 중복된 username 체크
     * - 비밀번호 암호화 후 저장
     */
    @Transactional
    public void signupApi(SignUpDto signUpDto) {
        // 1. 비밀번호 일치 여부 사전 검증
        if (!signUpDto.checkPassword()) {
            log.debug("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
            throw new IllegalArgumentException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        // 2. 중복 아이디 검사
        validateDuplicateUsername(signUpDto.getUsername());

        // 3. 엔티티 생성 및 사용자 입력 비밀번호 암호화
        UserEntity user = createUserEntity(signUpDto);
        user.setPassword(passwordEncoder.encode(signUpDto.getPassword()));

        // 4. DB 저장
        userMapper.insertUser(user.getUsername(), user.getPassword());
    }

    /**
     * 중복된 username 체크
     */
    private void validateDuplicateUsername(String username) {
        // 회원가입 시 입력한 아이디 확인
        UserEntity isUser = userMapper.selectLoginUserByUserName(username);
        // 이미 있을 때
        if (isUser != null) {
            log.debug("이미 사용중인 아이디", isUser.getUsername());
            throw new IllegalArgumentException("이미 존재하는 아이디 입니다.");
        }
    }

    /**
     * User 엔티티 생성 (비밀번호 암호화 적용)
     */
    private UserEntity createUserEntity(SignUpDto signUpDto) {
        return UserEntity.builder()
                .username(signUpDto.getUsername())
                .password(passwordEncoder.encode(signUpDto.getPassword()))
                .build();
    }

}
