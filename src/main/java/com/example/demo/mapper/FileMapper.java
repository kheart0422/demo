package com.example.demo.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.springframework.stereotype.Repository;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
@Repository
public interface FileMapper {
    List<Map<String, Object>> selectFilesByUsername(@Param("username") String username);

    int insertFile(@Param("userId") long userId, // 사용자 아이디
                   @Param("fileName") String fileName, // 파일 원본이름
                   @Param("fileSaveName") String fileSaveName, // 파일 저장되는 이름
                   @Param("fileDir") String fileDir, // 파일 저장경로
                   @Param("fileSize") long fileSize); // 파일 사이즈

    // 다운로드 시 사용자의 파일인지 확인
    Map<String, Object> selectFileForDownload(@Param("username") String username, @Param("fileSaveName") String fileSaveName);
}
