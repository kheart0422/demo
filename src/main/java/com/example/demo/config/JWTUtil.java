package com.example.demo.config;

import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JWTUtil {

    private final SecretKey secretKey;

    // 생성자에서 application.properties에 저장된 SecretKey 값을 가져와 설정
    public JWTUtil(@Value("${spring.jwt.secret}") String secret) {
        secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), Jwts.SIG.HS256.key().build().getAlgorithm());
    }

    // JWT에서 username 추출
    public String getUsername(String token){
        return Jwts.parser()
                // JWT(io.jsonwebtoken) 라이브러리가 0.12.0 버전 이상으로 업그레이드되면서 API 빌더 구조가 변경되었기 때문에 발생하는 컴파일 에러
                .verifyWith(secretKey)
                .build()
                // 'parseClaimsJws(java.lang.CharSequence)'은(는) 더 이상 사용되지 않습니다
                // parseClaimsJws(java.lang.CharSequence) 메서드는 JJWT(Java JWT) 라이브러리 0.12.0 버전부터
                // Deprecated(더 이상 사용되지 않음)되었습니다. 대신 parseSignedClaims(CharSequence) 메서드를 사용
                // JJWT 라이브러리가 업데이트되면서 JWT의 용어와 구조를 더 명확하게 반영하도록 API가 변경
                .parseSignedClaims(token)
                .getPayload()
                .get("username", String.class);
    }

    // JWT에서 role(권한) 추출
    public String getRole(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("role", String.class);
    }

    // JWT 만료 여부 확인
    public Boolean isTokenExpired(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getExpiration()
                .before(new Date());
    }

    // JWT 생성 메서드
    // - username, role(권한), 만료 시간(expiredMs)을 포함한 JWT 발급
    public String createJwt(String username, String role, Long expiredMs) {
        return Jwts.builder()
                .claim("username", username)
                .claim("role", role)
                .issuedAt(new Date(System.currentTimeMillis())) // 발급 시간
                .expiration(new Date(System.currentTimeMillis() + expiredMs)) // 만료 시간
                .signWith(secretKey) // 비밀키를 사용하여 서명
                .compact();
    }

}
