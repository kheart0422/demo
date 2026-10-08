package com.example.demo.service;

import com.example.demo.entity.CustomUserDetails;
import com.example.demo.entity.UserEntity;
import com.example.demo.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final PasswordEncoder passwordEncoder;

    @Autowired
    private UserMapper userMapper;

    // username을 이용해 사용자 정보를 조회
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 로그인시도 username DB 확인
        UserEntity user = userMapper.selectLoginUserByUserName(username);

        if (user == null) {
            log.debug("없는 사용자입니다 {}",username);
            throw new UsernameNotFoundException("회원이 아닙니다. 회원가입을 진행해주세요");
        }
        else{
            // Map에서 데이터를 꺼내 CustomUserDetails를 생성하여 반환
            return new CustomUserDetails(user);
        }
    }

}
