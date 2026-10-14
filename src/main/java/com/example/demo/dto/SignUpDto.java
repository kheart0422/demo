package com.example.demo.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SignUpDto {

    private String username;
    private String password;
    private String passwordConfirm;

    //  사용자가 입력한 패스워드와 패스워드 확인이 같은지
    public boolean checkPassword() {
        return this.password != null && this.password.equals(this.passwordConfirm);
    }
}