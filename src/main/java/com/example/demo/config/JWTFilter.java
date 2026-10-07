package com.example.demo.config;

import com.example.demo.entity.CustomUserDetails;
import com.example.demo.entity.User;
import com.example.demo.entity.UserRole;
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
        return
            "POST".equalsIgnoreCase(request.getMethod())
            // && "/logout".equals(request.getServletPath());
            // 토큰 검증 안함
            && (
                    isPath(request, "/")
                    || isPath(request, "/login")
                    || isPath(request, "/signup")
                    || isPath(request, "/logout")
            );
    }

    private boolean isPath(HttpServletRequest request, String path) {
        return path.equals(request.getServletPath());
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

        if (token != null) {
            try {
                // 구문 분석(parsing) 과정에서 서명과 만료 여부를 검증합니다. 오래되었거나 유효하지 않은 쿠키
                // 이 요청은 익명으로 처리해야 합니다. 보안 담당자가 URL을 익명으로 처리할지 여부를 결정합니다.
                // 인증이 필요합니다
                String username = jwtUtil.getUsername(token);
                UserRole role = UserRole.valueOf(jwtUtil.getRole(token));
                User user = User.builder()
                        .username(username)
                        .password("N/A")
                        .role(role)
                        .build();

                CustomUserDetails customUserDetails = new CustomUserDetails(user);
                Authentication authToken = new UsernamePasswordAuthenticationToken(customUserDetails, null, customUserDetails.getAuthorities());

                if (SecurityContextHolder.getContext().getAuthentication() == null) {
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (ExpiredJwtException e) {
                log.debug("JWT 토큰 만료: {}", e.getMessage());
                // 즉시 401 응답을 반환하고 메서드를 종료(return)합니다.
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"error\": \"Unauthorized\", \"message\": \"토큰이 만료되었습니다. 다시 로그인하거나 Refresh 하세요.\"}");
                return;
            } catch (Exception e) {
                // null인 사용자로부터 UserDetails 객체를 생성하지 마십시오. 익명으로 계속 진행하십시오.
                // permitAll로 설정된 URL은 계속해서 접근 가능하며, 보호 대상 URL은 보안(Security) 기능에 의해 처리됩니다.
                log.debug("유효하지 않은 JWT: {}", e.getMessage());
                // 즉시 401 응답을 반환하고 메서드를 종료(return)합니다.
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"error\": \"Unauthorized\", \"message\": \"토큰이 만료되었습니다. 다시 로그인하거나 Refresh 하세요.\"}");
                return;
            }
        }
        // 별도의 요청이나 디스패치가 거부되거나 요청된 값 확인
        log.info("method={} uri={} servletPath={} dispatcher={}", request.getMethod(), request.getRequestURI(), request.getServletPath(), request.getDispatcherType());
        filterChain.doFilter(request, response);
    }

}
