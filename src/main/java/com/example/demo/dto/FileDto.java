package com.example.demo.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
// 이 DTO 내의 모든 필드는 JSON 변환 시 스네이크 케이스(_ )가 적용됩니다.
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class FileDto {

    private long fileId;
    //사용자 아이디
    private long Id;

    private String fileName;

    private String fileSaveName;

    private String fileDir;

    private long fileSize;

    private LocalDateTime fileUploadDate;
}
