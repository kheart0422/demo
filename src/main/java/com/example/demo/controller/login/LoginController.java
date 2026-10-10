package com.example.demo.controller.login;

import com.example.demo.dto.SignUpDto;
import com.example.demo.service.user.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

//@RestController
@Slf4j
@Controller
@RequiredArgsConstructor
public class LoginController {

    private final UserService userService;


    @GetMapping("/admin")
    public String adminPage(){
        return "Admin";
    }

    @GetMapping("/login")
    public String loginPage(){
        return "login/login";
    }

    @GetMapping("/signup")
    public String signupPage(){
        return "login/signup";
    }

    //회원가입 API
    // - JSON 데이터를 받아 UserService에서 회원가입 처리
    @PostMapping("/signupApi")
    public ResponseEntity<String> signUp(@RequestBody SignUpDto signUpDto) {
        try{
            userService.signupApi(signUpDto);
            return ResponseEntity.ok("회원가입 성공");
        }
        catch(IllegalArgumentException e){
            log.error("회원가입 실패{}",e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/logout")
    public String logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("token", "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return "login/login";
    }
}
