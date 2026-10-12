package com.example.demo.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.springframework.stereotype.Repository;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
@Repository
public interface FileMapper {
    // 로그인한 사용자의 업로드된 파일의 총 갯수
    long countFilesByUsername(@Param("username") String username, @Param("fileNameSearch") String fileNameSearch, @Param("initialPattern") String initialPattern, @Param("uploadDate") String uploadDate);

    /**
     * 첫 페이지 파일 목록 조회 (검색 필터 적용)
     * @param username 사용자 아이디
     * @param limit 조회할 파일 개수 (다음 페이지 존재 여부 확인을 위해 pageSize + 1로 요청)
     * @param fileNameSearch 파일 이름 검색 키워드 (일반 검색)
     * @param initialPattern 한글 초성 검색 정규식 패턴 (초성 검색)
     * @param uploadDate 업로드 날짜 검색 조건 (날짜 검색)
     * @return 검색 조건이 적용된 파일 정보 맵 리스트
     */
    List<Map<String, Object>> selectFirstFilesByUsername(@Param("username") String username, @Param("limit") int limit, @Param("fileNameSearch") String fileNameSearch, @Param("initialPattern") String initialPattern, @Param("uploadDate") String uploadDate);

    /**
     * @param username 사용자 아이디
     * @param cursorDate 기준 날짜 커서
     * @param cursorId 기준 파일 고유 ID 커서
     * @param limit 조회할 파일 개수 (pageSize + 1)
     */
    // 다음 페이지 파일 목록 조회 (정방향, 더보기 클릭 시)
    List<Map<String, Object>> selectNextFilesByUsername(@Param("username") String username, @Param("cursorDate") String cursorDate, @Param("cursorId") long cursorId, @Param("limit") int limit, @Param("fileNameSearch") String fileNameSearch, @Param("initialPattern") String initialPattern, @Param("uploadDate") String uploadDate);
    // 이전 페이지 파일 목록 조회 (역방향, 이전 페이지로 이동 시)
    List<Map<String, Object>> selectPreviousFilesByUsername(@Param("username") String username, @Param("cursorDate") String cursorDate, @Param("cursorId") long cursorId, @Param("limit") int limit, @Param("fileNameSearch") String fileNameSearch, @Param("initialPattern") String initialPattern, @Param("uploadDate") String uploadDate);

    int insertFile(@Param("userId") long userId, // 사용자 아이디
                   @Param("fileName") String fileName, // 파일 원본이름
                   @Param("fileSaveName") String fileSaveName, // 파일 저장되는 이름
                   @Param("fileDir") String fileDir, // 파일 저장경로
                   @Param("fileSize") long fileSize); // 파일 사이즈

    // 다운로드 시 사용자의 파일인지 확인
    Map<String, Object> selectFileForDownload(@Param("username") String username, @Param("fileSaveName") String fileSaveName);

    // 업로드 시각 기준 14일이 지난 파일 조회 및 정리
    List<Map<String, Object>> selectExpiredFiles();
    int deleteFileById(@Param("fileId") long fileId);
}
