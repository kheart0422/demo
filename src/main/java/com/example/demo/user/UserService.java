package com.example.demo.user;

import com.example.demo.dto.SignUpDto;
import com.example.demo.entity.UserEntity;
import com.example.demo.entity.UserRole;
import com.example.demo.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final PasswordEncoder passwordEncoder;

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
        // user.setPassword(passwordEncoder.encode(signUpDto.getPassword()));

        // 4. 임시로 지정된 ID 세팅 (DB Auto Increment 대용)
        // user.setId(123L);

        // 5. DB가 없는 상황을 가정한 ID 조건 검사 !username.equals("123")
        if (!user.getUsername().equals("123")) {
            throw new IllegalArgumentException("허용되지 않은 회원가입 요청입니다.");
        }

        log.info("회원가입 완료 - userId : {}", user.getId());

        // 6. DB 저장은 주석 처리 또는 메모리 Repository 활용
        // userRepository.save(user);
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
    private UserEntity createUserEntity(SignUpDto signUpDto) {
        return UserEntity.builder()
                .username(signUpDto.getUsername())
                .password(bCryptPasswordEncoder.encode(signUpDto.getPassword())) // 비밀번호 암호화
                .role(UserRole.ROLE_ADMIN) // 기본 권한 부여 (추후 변경 가능)
                .build();
    }

}
