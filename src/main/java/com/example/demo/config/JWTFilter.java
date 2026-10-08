package com.example.demo.config;

import com.example.demo.entity.CustomUserDetails;
import com.example.demo.entity.UserEntity;
import io.jsonwebtoken.ExpiredJwtException;
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
        // 공개 페이지와 공개 API는 요청 메서드와 관계없이 만료 토큰 검증을 건너뜁니다.
        // permitAll은 인가만 허용하며, 이 필터의 실행 자체를 생략하지는 않습니다.
        return isPath(request, "/")
                || isPath(request, "/login")
                || isPath(request, "/signup")
                || isPath(request, "/signupApi")
                || isPath(request, "/logout");
    }

    private boolean isPath(HttpServletRequest request, String path) {
        return path.equals(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {

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

        if (token != null) {
            try {
                // 구문 분석(parsing) 과정에서 서명과 만료 여부를 검증합니다. 오래되었거나 유효하지 않은 쿠키
                // 이 요청은 익명으로 처리해야 합니다. 보안 담당자가 URL을 익명으로 처리할지 여부를 결정합니다.
                // 인증이 필요합니다
                String username = jwtUtil.getUsername(token);
                UserEntity user = UserEntity.builder()
                        .username(username)
                        .password("N/A")
                        .build();

                CustomUserDetails customUserDetails = new CustomUserDetails(user);
                Authentication authToken = new UsernamePasswordAuthenticationToken(customUserDetails, null, customUserDetails.getAuthorities());

                if (SecurityContextHolder.getContext().getAuthentication() == null) {
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (ExpiredJwtException e) {
                log.debug("JWT 토큰 만료: {}", e.getMessage());
                continueAsAnonymous(request, response, filterChain);
                return;
            } catch (Exception e) {
                log.debug("유효하지 않은 JWT: {}", e.getMessage());
                continueAsAnonymous(request, response, filterChain);
                return;
            }
        }
        // 별도의 요청이나 디스패치가 거부되거나 요청된 값 확인
        log.info("method={} uri={} servletPath={} dispatcher={}", request.getMethod(), request.getRequestURI(), request.getServletPath(), request.getDispatcherType());
        filterChain.doFilter(request, response);
    }

    private void continueAsAnonymous(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        SecurityContextHolder.clearContext();

        Cookie expiredCookie = new Cookie("token", "");
        expiredCookie.setHttpOnly(true);
        expiredCookie.setPath("/");
        expiredCookie.setMaxAge(0);
        response.addCookie(expiredCookie);

        // 만료/손상 토큰만으로 공개 페이지 접근을 막지 않습니다.
        // 보호 페이지는 다음 Spring Security 인가 단계에서 익명 사용자로 거부됩니다.
        filterChain.doFilter(request, response);
    }

}
