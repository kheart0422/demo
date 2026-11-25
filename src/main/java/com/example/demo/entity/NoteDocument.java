package com.example.demo.entity;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class NoteDocument {

    private Long noteId;
    // 사용자 아이디
    private Long userId;
    // 파일 아이디
    private Long fileId;
    // 노트 제목
    private String title;
    // 파일 이름
    private String fileName;
    // 판서
    private String strokesJson;
}
