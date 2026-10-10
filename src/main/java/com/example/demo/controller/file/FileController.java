package com.example.demo.controller.file;

import com.example.demo.service.file.FileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

}
