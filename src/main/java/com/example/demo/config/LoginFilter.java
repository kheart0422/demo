package com.example.demo.config;

import com.example.demo.entity.CustomUserDetails;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
// Spring Security에서 사용하는 인증 객체
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.util.Collection;
import java.util.Iterator;

@RequiredArgsConstructor
public class LoginFilter extends UsernamePasswordAuthenticationFilter {

    private final AuthenticationManager authenticationManager;
    private final JWTUtil jwtUtil;

    // 로그인 요청 시 사용자 인증 처리
    @Override
    public Authentication attemptAuthentication(HttpServletRequest req, HttpServletResponse res) throws AuthenticationException{
        String username = req.getParameter("username");
        String password = req.getParameter("password");

        UsernamePasswordAuthenticationToken authRequest = new UsernamePasswordAuthenticationToken(username, password);

        // AuthenticationManager를 통해 인증 수행
        return authenticationManager.authenticate(authRequest);
    }

    // 로그인 성공 시 JWT 토큰 발급
    @Override
    protected void successfulAuthentication(HttpServletRequest req, HttpServletResponse res, FilterChain chain, Authentication auth) throws IOException {
        CustomUserDetails customUserDetails = (CustomUserDetails) auth.getPrincipal();
        String username = customUserDetails.getUsername();

        // 사용자 역할 조회
        Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
        Iterator<? extends GrantedAuthority> iterator = authorities.iterator();
        GrantedAuthority authority = iterator.next();

        String role = authority.getAuthority();
        // 1시간 유효 토큰 생성
        String token = jwtUtil.createJwt(username, role, 60*60*1000L);
        // HTTP 응답 헤더의 Authorization에 JWT
        // 웹에서 토큰 관리 하기 힘들어서 쿠키로 변경
//        res.addHeader("Authorization", "Bearer " + token);
        Cookie cookie = new Cookie("token", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        res.addCookie(cookie);
        // 페이지 이동
        res.sendRedirect(req.getContextPath() + "/main");
    }

    // 로그인 실패 시
    @Override
    protected void unsuccessfulAuthentication(HttpServletRequest req, HttpServletResponse res, AuthenticationException failed) throws IOException {
        // 401 Unauthorized 응답
        // res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        // 회원가입페이지로 이동(signup.jsp)
        res.sendRedirect(req.getContextPath() + "/signup");
    }

}
