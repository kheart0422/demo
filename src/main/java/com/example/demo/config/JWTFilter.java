package com.example.demo.config;

import com.example.demo.entity.CustomUserDetails;
import com.example.demo.entity.User;
import com.example.demo.entity.UserRole;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@RequiredArgsConstructor
public class JWTFilter extends OncePerRequestFilter {

    private final JWTUtil jwtUtil;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod())
                && "/logout".equals(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {

        // Authorization 헤더에서 JWT 토큰 추출
        // String authorizationHeader = request.getHeader("Authorization");

//        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
//            filterChain.doFilter(request, response);
//            return;
//        }
//
//        // "Bearer " 이후의 토큰 값만 추출
//        String token = authorizationHeader.substring(7);

        String token = null;
        Cookie[] cookies = request.getCookies();

        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("token".equals(cookie.getName())) { // 내가 생성한 쿠키 이름
                    token = cookie.getValue();
                    break;
                }
            }
        }

        try {
            if (token == null) {
                filterChain.doFilter(request, response);
                return;
            }
            // JWT 만료 여부 검증
            if (jwtUtil.isTokenExpired(token)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "JWT 토큰이 만료되었습니다.");
                return;
            }

            // JWT에서 사용자 정보 추출
            String username = jwtUtil.getUsername(token);
            UserRole role = UserRole.valueOf(jwtUtil.getRole(token));

            // 인증 객체 생성
            User user = User.builder()
                    .username(username)
                    .password("N/A") // 비밀번호는 JWT 기반 인증이므로 사용하지 않음
                    .role(role)
                    .build();

            CustomUserDetails customUserDetails = new CustomUserDetails(user);
            Authentication authToken = new UsernamePasswordAuthenticationToken(customUserDetails, null, customUserDetails.getAuthorities());

            // SecurityContext에 인증 정보 저장 (Stateless 모드이므로 요청 종료 시 소멸)
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }

        } catch (Exception e) {
            // log.error("JWT 필터 처리 중 오류 발생: {}", e.getMessage(), e);
            //response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "유효하지 않은 토큰입니다.");

            log.error("JWT 필터 처리 중 오류 발생: {}", e.getMessage(), e);
            response.sendError(
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "유효하지 않은 토큰입니다."
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

}
