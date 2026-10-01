package com.example.demo;

import org.springframework.stereotype.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class HomeController {

    @GetMapping("/")
    // 이거 추가하니까 index 출력하는데 성공함
    // HTML 렌더링 대신 문자열, 자바 객체 등을 HTTP 응답 본문에 직접 씁니다
    // @ResponseBody
    public String home() throws Exception{
        System.out.println("HomeController 실행3");
        return "index";
    }

//    public ModelAndView home1() throws Exception{
//        System.out.println("HomeController 실행2");
//        ModelAndView mv = new ModelAndView();
//        System.out.println("HomeController 실행2-1");
//        mv.setViewName("index");
//        return mv;
//    }
}
