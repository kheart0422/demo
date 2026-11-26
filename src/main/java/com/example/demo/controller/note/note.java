package com.example.demo.controller.note;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.rendering.ImageType;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;
import com.example.demo.service.file.FileService;
import com.example.demo.entity.NoteDocument;
import com.example.demo.service.note.NoteService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;

import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.util.List;

@Slf4j
@Controller
@RequiredArgsConstructor
public class note {
    private final FileService fileService;
    private final NoteService noteService;
    private final ObjectMapper objectMapper;

    @GetMapping("/note")
    public String notePage(@RequestParam(required = false) Long fileId,
                           @RequestParam(required = false) Long noteId,
                           @AuthenticationPrincipal UserDetails userDetails, Model model) {
        Long selectedFileId = fileId;
        if (noteId != null && userDetails != null) {
            NoteDocument selectedNote = noteService.get(userDetails.getUsername(), noteId);
            if (selectedNote == null) {
                model.addAttribute("pdfError", "노트를 찾을 수 없거나 접근 권한이 없습니다.");
                selectedFileId = null;
            } else {
                model.addAttribute("initialNoteId", noteId);
                selectedFileId = selectedNote.getFileId();
            }
        }
        if (selectedFileId != null && userDetails != null) {
            try {
                FileService.DownloadFile file = fileService.findFileForNote(userDetails.getUsername(), selectedFileId);
                try (PDDocument document = Loader.loadPDF(file.path().toFile())) {
                    model.addAttribute("pdfFileId", selectedFileId);
                    model.addAttribute("pdfPageCount", document.getNumberOfPages());
                    model.addAttribute("pdfFileName", file.originalName());
                }
            } catch (NoSuchFileException e) {
                model.addAttribute("pdfError", "파일을 찾을 수 없거나 접근 권한이 없습니다.");
            } catch (IOException e) {
                log.warn("노트 PDF를 열 수 없습니다. fileId={}", selectedFileId, e);
                model.addAttribute("pdfError", "PDF 파일을 읽을 수 없습니다.");
            }
        }
        return "note/note";
    }

    @GetMapping("/note/api/notes")
    @ResponseBody
    public ResponseEntity<?> listNotes(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        List<NoteDocument> notes = noteService.list(userDetails.getUsername());
        for (NoteDocument note : notes) {
            if (note.getFileId() == null) continue;
            try {
                String fileName = fileService.findFileForNote(userDetails.getUsername(), note.getFileId()).originalName();
                if (!fileName.equals(note.getTitle())) {
                    note.setTitle(fileName);
                    noteService.update(userDetails.getUsername(), note);
                }
            } catch (IOException ignored) {
                // Missing or inaccessible PDFs remain hidden from the note title synchronization path.
            }
        }
        return ResponseEntity.ok(notes.stream().map(note -> toResponse(note, userDetails.getUsername())).toList());
    }

    @GetMapping("/note/api/notes/{noteId}")
    @ResponseBody
    public ResponseEntity<?> getNote(@PathVariable long noteId, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        NoteDocument note = noteService.get(userDetails.getUsername(), noteId);
        return note == null ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(toResponse(note, userDetails.getUsername()));
    }

    @PostMapping("/note/api/notes")
    @ResponseBody
    public ResponseEntity<?> createNote(@RequestBody(required = false) CreateNoteRequest request,
                                        @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        Long fileId = request == null ? null : request.fileId();
        if (fileId != null && (fileId < 1 || !canAccessFile(fileId, userDetails))) {
            return ResponseEntity.notFound().build();
        }
        String initialTitle = "새 노트";
        if (fileId != null) {
            try {
                initialTitle = fileService.findFileForNote(userDetails.getUsername(), fileId).originalName();
            } catch (IOException e) {
                return ResponseEntity.notFound().build();
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(noteService.create(userDetails.getUsername(), fileId, initialTitle), userDetails.getUsername()));
    }

    @PutMapping("/note/api/notes/{noteId}")
    @ResponseBody
    public ResponseEntity<?> updateNote(@PathVariable long noteId, @RequestBody NoteRequest request,
                                        @AuthenticationPrincipal UserDetails userDetails) throws JsonProcessingException {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (request == null) {
            return ResponseEntity.badRequest().body("노트 제목이 올바르지 않습니다.");
        }
        NoteDocument existing = noteService.get(userDetails.getUsername(), noteId);
        if (existing == null) return ResponseEntity.notFound().build();

        String title;
        if (existing.getFileId() != null) {
            try {
                title = fileService.findFileForNote(userDetails.getUsername(), existing.getFileId()).originalName();
            } catch (IOException e) {
                return ResponseEntity.notFound().build();
            }
        } else {
            if (request.title() == null || request.title().isBlank() || request.title().trim().length() > 255) {
                return ResponseEntity.badRequest().body("노트 제목은 1~255자여야 합니다.");
            }
            title = request.title().trim();
        }
        NoteDocument note = new NoteDocument();
        note.setNoteId(noteId);
        note.setTitle(title);
        NoteDocument updated = noteService.update(userDetails.getUsername(), note);
        return updated == null ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(toResponse(updated, userDetails.getUsername()));
    }

    @DeleteMapping("/note/api/notes/{noteId}")
    @ResponseBody
    public ResponseEntity<?> deleteNote(@PathVariable long noteId, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return noteService.delete(userDetails.getUsername(), noteId)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @PostMapping("/note/api/notes/{noteId}/pages")
    @ResponseBody
    public ResponseEntity<?> addNotePage(@PathVariable long noteId, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        NoteDocument note = noteService.get(userDetails.getUsername(), noteId);
        if (note == null) return ResponseEntity.notFound().build();
        if (note.getFileId() != null) return ResponseEntity.badRequest().body("PDF 노트는 PDF 페이지를 사용합니다.");
        int newPage = noteService.addPage(userDetails.getUsername(), noteId);
        if (newPage == 0) return ResponseEntity.status(HttpStatus.CONFLICT).body("일반 노트는 최대 10페이지까지 만들 수 있습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(new PageAddedResponse(newPage));
    }

    @GetMapping("/note/api/notes/{noteId}/pages/{pageNumber}/strokes")
    @ResponseBody
    public ResponseEntity<?> getPageStrokes(@PathVariable long noteId, @PathVariable int pageNumber,
                                             @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (!isOwnedNotePage(userDetails.getUsername(), noteId, pageNumber)) return ResponseEntity.notFound().build();
        try {
            return ResponseEntity.ok(objectMapper.readTree(noteService.getPageStrokes(userDetails.getUsername(), noteId, pageNumber)));
        } catch (JsonProcessingException e) {
            return ResponseEntity.ok(objectMapper.createArrayNode());
        }
    }

    @PutMapping("/note/api/notes/{noteId}/pages/{pageNumber}/strokes")
    @ResponseBody
    public ResponseEntity<?> savePageStrokes(@PathVariable long noteId, @PathVariable int pageNumber,
                                              @RequestBody PageStrokesRequest request,
                                              @AuthenticationPrincipal UserDetails userDetails) throws JsonProcessingException {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (request == null || request.strokes() == null || !request.strokes().isArray()) {
            return ResponseEntity.badRequest().body("판서 데이터 형식이 올바르지 않습니다.");
        }
        if (request.images() != null && !request.images().isArray()) {
            return ResponseEntity.badRequest().body("이미지 데이터 형식이 올바르지 않습니다.");
        }
        if (!isOwnedNotePage(userDetails.getUsername(), noteId, pageNumber)) return ResponseEntity.notFound().build();
        ObjectNode pageData = objectMapper.createObjectNode();
        pageData.set("strokes", request.strokes());
        pageData.set("images", request.images() == null ? objectMapper.createArrayNode() : request.images());
        pageData.put("text", request.text() == null ? "" : request.text());
        String pageJson = objectMapper.writeValueAsString(pageData);
        return noteService.savePageStrokes(userDetails.getUsername(), noteId, pageNumber, pageJson)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    private boolean isOwnedNotePage(String username, long noteId, int pageNumber) {
        if (pageNumber < 1) return false;
        NoteDocument note = noteService.get(username, noteId);
        if (note == null) return false;
        if (note.getFileId() == null) return pageNumber <= noteService.getPageCount(username, noteId);
        try {
            FileService.DownloadFile file = fileService.findFileForNote(username, note.getFileId());
            try (PDDocument document = Loader.loadPDF(file.path().toFile())) {
                return pageNumber <= document.getNumberOfPages();
            }
        } catch (IOException e) {
            return false;
        }
    }

    private NoteResponse toResponse(NoteDocument note, String username) {
        JsonNode strokes;
        String writing = "";
        try {
            strokes = note.getStrokesJson() == null
                    ? objectMapper.createArrayNode()
                    : objectMapper.readTree(note.getStrokesJson());
            if (strokes.isObject()) writing = strokes.path("text").asText("");
        } catch (JsonProcessingException e) {
            strokes = objectMapper.createArrayNode();
        }
        int pageCount = note.getFileId() == null ? noteService.getPageCount(username, note.getNoteId()) : 1;
        return new NoteResponse(note.getNoteId(), note.getFileId(), note.getTitle(), writing, strokes, pageCount);
    }

    private boolean canAccessFile(Long fileId, UserDetails userDetails) {
        if (fileId == null) return true;
        try {
            fileService.findFileForNote(userDetails.getUsername(), fileId);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    public record CreateNoteRequest(Long fileId) { }
    public record NoteRequest(String title) { }
    public record PageStrokesRequest(JsonNode strokes, String text, JsonNode images) { }
    public record PageAddedResponse(int pageNumber) { }
    public record NoteResponse(long noteId, Long fileId, String title, String writing,
                               JsonNode strokes, int pageCount) { }

    @GetMapping(value = "/note/pdf/{fileId}/page/{page}", produces = MediaType.IMAGE_PNG_VALUE)
    @ResponseBody
    public ResponseEntity<byte[]> renderPage(@PathVariable long fileId, @PathVariable int page,
                                              @RequestParam(defaultValue = "false") boolean thumbnail,
                                              @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            FileService.DownloadFile file = fileService.findFileForNote(userDetails.getUsername(), fileId);
            try (PDDocument document = Loader.loadPDF(file.path().toFile())) {
                if (page < 1 || page > document.getNumberOfPages()) {
                    return ResponseEntity.notFound().build();
                }
                float dpi = thumbnail ? 36f : 120f;
                var image = new PDFRenderer(document).renderImageWithDPI(page - 1, dpi, ImageType.RGB);
                try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                    ImageIO.write(image, "png", output);
                    return ResponseEntity.ok()
                            .contentType(MediaType.IMAGE_PNG)
                            .cacheControl(CacheControl.noStore())
                            .body(output.toByteArray());
                }
            }
        } catch (NoSuchFileException e) {
            return ResponseEntity.notFound().build();
        } catch (IOException | RuntimeException e) {
            log.warn("PDF 페이지 렌더링에 실패했습니다. fileId={}, page={}", fileId, page, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

}
