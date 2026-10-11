package com.example.demo.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class FileDto {

    private long fileId;
    //사용자 아이디
    private long Id;

    private String fileName;

    private String fileDir;

    private long fileSize;

    private LocalDateTime fileUploadDate;
}
