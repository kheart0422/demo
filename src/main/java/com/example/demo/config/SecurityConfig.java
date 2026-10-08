package com.example.demo.config;

import jakarta.servlet.DispatcherType;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final AuthenticationConfiguration authenticationConfiguration;
    private final JWTUtil jwtUtil;

    // Spring Security의 AuthenticationManager를 빈으로 등록
    // - 로그인 시 사용자의 인증(Authentication)을 담당
    @Bean
    public AuthenticationManager authenticationManager() throws Exception{
        return authenticationConfiguration.getAuthenticationManager();
    }

    // 비밀번호 암호화를 위한 BCryptPasswordEncoder 빈 등록
    // - 회의가입 시 비밀번호 안전하게 암호화하여 저장
    @Bean
    public BCryptPasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    // cors 설정을 위한 Bean 등록
    // - 프론트엔드에서 api 요청 시 cors 문제 해결
    @Bean
    public CorsConfigurationSource corsConfigurationSource(){
        // 람다식(Lambda Expression) 문법
        // 메서드를 간단하게 표현하는 문법이야. 특히 인터페이스에 메서드가 하나만 있을 때
        return request ->{
            CorsConfiguration configuration = new CorsConfiguration();
            //허용할 도메인
            configuration.setAllowedOrigins(Collections.singletonList("http://localhost:8080"));
            // 모든 http 메서드 허용
            configuration.setAllowedMethods(Collections.singletonList("*"));
            // 인증 정보 포함 허용
            configuration.setAllowCredentials(true);
            // 모든 헤더 허용
            configuration.setAllowedHeaders(Collections.singletonList("*"));
            // Authorization 헤더 노출
            // configuration.setExposedHeaders(Collections.singletonList("Authorization", "Set-Cookie"));
            configuration.setExposedHeaders(Arrays.asList("Authorization", "Set-Cookie"));
            // 1시간 동안 캐싱
            configuration.setMaxAge(3600L);
            return configuration;
        };
    }

    // spring security 필터 체인 설정
    // -JWT 인증을 기반으로 한 보안 설정 적용
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CORS 설정 적용
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // JWT 사용 시 csrf 보호 비활성화
                .csrf(csrf -> csrf.disable())
                // 기본 로그인 폴 비활성화 (JWT 사용)
                .formLogin(form -> form.disable())
                // HTTP Basic 인증 비활성화
                .httpBasic(httpBasic -> httpBasic.disable())
                // 로그아웃 후 쿼리 파라미터 없이 로그인 페이지로 이동하고 JWT 쿠키 삭제
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/login")
                        .deleteCookies("token"))

                // 엔드포인트별 접급 권한 설정
                .authorizeHttpRequests(auth -> auth
                        // JSP로 내부 전달하는 요청 허용
                        .dispatcherTypeMatchers(
                                DispatcherType.FORWARD,
                                DispatcherType.ERROR
                        ).permitAll()
                        .requestMatchers(
                                "/vendor/**",
                                "/css/**",
                                "/js/**",
                                "/images/**"
                        ).permitAll()
                        // 로그인, 회원가입, 홈은 누구나 접근
                        .requestMatchers("/login", "/signup", "/signupApi", "/logout", "/"
                                // DevTools 요청 허용 (개발자 모드일 때 Access Denied 에러남)
                                , "/.well-known/appspecific/com.chrome.devtools.json").permitAll()
                        // 그 외 요청은 인증된 사용자만 접근 가능
                        .anyRequest().authenticated())
                // JWT 필터 추가
                .addFilterBefore(new JWTFilter(jwtUtil), UsernamePasswordAuthenticationFilter.class)
                // 로그인 필터 추가 (JWTFilter 실행 후 JWT 발급 처리)
                .addFilterAfter(new LoginFilter(authenticationManager(), jwtUtil), JWTFilter.class)
                // 세션을 사용하지 않음(JWT 기반 인증이므로 STATELESS 모드 설정)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        return http.build();
    }


}
