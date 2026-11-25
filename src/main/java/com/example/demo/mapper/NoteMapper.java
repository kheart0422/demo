package com.example.demo.mapper;

import com.example.demo.entity.NoteDocument;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Mapper
@Repository
public interface NoteMapper {

    // 사용자가 작성한 노트 목록 조회
    List<NoteDocument> findNotesByUsername(@Param("username") String username);
    // 사용자의 특정 노트 1개 조회
    NoteDocument findNoteById(@Param("username") String username, @Param("noteId") long noteId);
    // 새 노트 생성 후 자동 생성된 노트 ID 반환
    int insertNote(NoteDocument note);
    // 노트와 사용자 연결 정보 저장
    int insertNoteOwner(@Param("noteId") long noteId, @Param("userId") long userId);
    // 특정 사용자의 노트 제목 수정
    int updateNote(@Param("username") String username, @Param("note") NoteDocument note);
    // 사용자의 노트 삭제
    int deleteNote(@Param("username") String username, @Param("noteId") long noteId);
    // 노트의 특정 페이지 필기 데이터 조회
    String findPageStrokes(@Param("username") String username, @Param("noteId") long noteId, @Param("pageNumber") int pageNumber);
    // 페이지 필기 데이터 저장 및 기존 데이터가 있으면 덮어쓰기
    int savePageStrokes(@Param("noteId") long noteId, @Param("pageNumber") int pageNumber, @Param("strokesJson") String strokesJson);
    // 노트의 전체 페이지 필기 데이터 삭제
    int deletePageStrokes(@Param("noteId") long noteId);
    // 노트의 전체 페이지 수 조회
    int getPageCount(@Param("username") String username, @Param("noteId") long noteId);
    // 새로운 빈 페이지 생성 및 초기 필기 데이터 저장
    int insertBlankPage(@Param("noteId") long noteId, @Param("pageNumber") int pageNumber);
}
