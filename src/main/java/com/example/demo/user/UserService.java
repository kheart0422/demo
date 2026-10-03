package com.example.demo.user;

import com.example.demo.dto.SignUpDto;
import com.example.demo.entity.User;
import com.example.demo.entity.UserRole;
import com.example.demo.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;

    /**
     * 회원가입 기능
     * - 중복된 username 체크
     * - 비밀번호 암호화 후 저장
     */
    @Transactional
    public void signUp(SignUpDto signUpDto) {
        validateDuplicateUsername(signUpDto.getUsername());
        User user = createUserEntity(signUpDto);
        userRepository.save(user);
    }

    /**
     * 중복된 username 체크
     */
    private void validateDuplicateUsername(String username) {
        if (userRepository.existsByUsername(username)) {
            log.warn("중복된 아이디 입니다: {}" , username);
            throw new IllegalArgumentException("이미 사용중인 아이디입니다.");
        }
    }

    /**
     * User 엔티티 생성 (비밀번호 암호화 적용)
     */
    private User createUserEntity(SignUpDto signUpDto) {
        return User.builder()
                .username(signUpDto.getUsername())
                .password(bCryptPasswordEncoder.encode(signUpDto.getPassword())) // 비밀번호 암호화
                .role(UserRole.ROLE_ADMIN) // 기본 권한 부여 (추후 변경 가능)
                .build();
    }

}
