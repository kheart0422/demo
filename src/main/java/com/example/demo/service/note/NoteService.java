package com.example.demo.service.note;

import com.example.demo.entity.NoteDocument;
import com.example.demo.mapper.NoteMapper;
import com.example.demo.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteMapper noteMapper;
    private final UserMapper userMapper;

    // 노트 목록
    public List<NoteDocument> list(String username) {
        return noteMapper.findNotesByUsername(username);
    }

    // 선택한 노트 조회
    public NoteDocument get(String username, long noteId) {
        return noteMapper.findNoteById(username, noteId);
    }

    // 판서 조회
    public String getPageStrokes(String username, long noteId, int pageNumber) {
        NoteDocument note = get(username, noteId);
        if (note == null) return null;
        String strokes = noteMapper.findPageStrokes(username, noteId, pageNumber);
        return strokes == null ? "[]" : strokes;
    }

    // 판서 저장
    @Transactional
    public boolean savePageStrokes(String username, long noteId, int pageNumber, String strokesJson) {
        NoteDocument note = get(username, noteId);
        if (note == null) return false;
        noteMapper.savePageStrokes(noteId, pageNumber, strokesJson);
        return true;
    }

    // 페이지 수 조회
    public int getPageCount(String username, long noteId) {
        return noteMapper.getPageCount(username, noteId);
    }

    // 페이지 추가
    @Transactional
    public int addPage(String username, long noteId) {
        NoteDocument note = get(username, noteId);
        if (note == null || note.getFileId() != null) return 0;
        int pageCount = getPageCount(username, noteId);
        if (pageCount >= 10) return 0;
        int nextPage = pageCount + 1;
        noteMapper.insertBlankPage(noteId, nextPage);
        return nextPage;
    }

    // 생성
    @Transactional
    public NoteDocument create(String username, Long fileId, String initialTitle) {
        Long userId = userMapper.selectIdByUsername(username);
        if (userId == null) throw new IllegalStateException("로그인 사용자를 찾을 수 없습니다.");

        NoteDocument note = new NoteDocument();
        note.setUserId(userId);
        note.setFileId(fileId);
        note.setTitle(initialTitle);
        note.setStrokesJson("[]");
        noteMapper.insertNote(note);
        noteMapper.insertNoteOwner(note.getNoteId(), userId);
        noteMapper.savePageStrokes(note.getNoteId(), 1, "[]");
        return noteMapper.findNoteById(username, note.getNoteId());
    }

    // 저장
    @Transactional
    public NoteDocument update(String username, NoteDocument note) {
        NoteDocument existing = noteMapper.findNoteById(username, note.getNoteId());
        if (existing == null) return null;
        noteMapper.updateNote(username, note);
        return noteMapper.findNoteById(username, note.getNoteId());
    }

    // 삭제
    @Transactional
    public boolean delete(String username, long noteId) {
        if (noteMapper.findNoteById(username, noteId) == null) return false;
        noteMapper.deletePageStrokes(noteId);
        return noteMapper.deleteNote(username, noteId) > 0;
    }
}
