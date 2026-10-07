package com.example.demo.service;

import com.example.demo.entity.CustomUserDetails;
import com.example.demo.entity.UserEntity;
import com.example.demo.entity.UserRole;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // username을 이용해 사용자 정보를 조회
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Optional<UserEntity> userOptional = userRepository.findByUsername(username);

        // 사용자가 존재하지 않을 경우 예외 throw
//        User user = userOptional.orElseThrow(() -> {
//            log.warn("사용자를 찾을 수 없습니다: username={}", username);
//            return new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + username);
//        });

        // DB 연결전 임시 로그인사용자
        if (!username.equals("123")) {
            throw new UsernameNotFoundException("사용자를 찾을 수 없습니다.");
        }

        UserEntity user = new UserEntity();
        user.setId(123L);
        user.setUsername("123");
        // 암호화
        user.setPassword(passwordEncoder.encode("123"));
        user.setRole(UserRole.ROLE_ADMIN);

        return new CustomUserDetails(user);
    }

}
