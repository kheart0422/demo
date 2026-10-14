package com.example.demo.entity;


import jakarta.persistence.Column;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
public class FileEntity {

    @Column(name = "file_id")
    private long fileId;
    //사용자 아이디
    @Column(name = "user_id")
    private long Id;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_save_name")
    private String fileSaveName;

    @Column(name = "file_dir")
    private String fileDir;

    @Column(name = "file_size")
    private long fileSize;

    @Column(name = "uploaded_at")
    private LocalDateTime fileUploadDate;

    public void UploadFile(String fileName, String fileSaveName, String fileDir, long fileSize) {
        this.fileName = fileName;
        this.fileSaveName = fileSaveName;
        this.fileDir = fileDir;
        this.fileSize = fileSize;
    }
}
