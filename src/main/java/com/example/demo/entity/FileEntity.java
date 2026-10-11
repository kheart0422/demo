package com.example.demo.entity;


import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
public class FileEntity {

    private long fileId;
    //사용자 아이디
    private long Id;

    private String fileName;

    private String fileDir;

    private long fileSize;

    private LocalDateTime fileUploadDate;

    public void UploadFile(String fileName, String fileDir, long fileSize) {
        this.fileName = fileName;
        this.fileDir = fileDir;
        this.fileSize = fileSize;
    }
}
