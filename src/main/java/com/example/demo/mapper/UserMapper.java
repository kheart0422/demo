package com.example.demo.mapper;

import com.example.demo.entity.UserEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Mapper
@Repository
public interface UserMapper {
    List<Map<String, Object>> selectAllUsers();
    // 회원인지 확인
    UserEntity selectLoginUserByUserName(@Param("username") String username);
    // 회원가입
    int insertUser(@Param("username") String username, @Param("password") String password);
}
