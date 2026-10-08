package com.example.demo.service;

import com.example.demo.mapper.UserMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class TestService {

    @Autowired
    private UserMapper userMapper;

    @PostConstruct
    public void test(){
        List<Map<String, Object>> users = userMapper.selectAllUsers();

        users.forEach(item->{
            System.out.println("USER:" + item);
        });
    }
}
