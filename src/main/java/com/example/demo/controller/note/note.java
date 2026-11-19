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

import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.NoSuchFileException;

@Slf4j
@Controller
@RequiredArgsConstructor
public class note {
    private final FileService fileService;

    @GetMapping("/note")
    public String notePage(@RequestParam(required = false) Long fileId,
                           @AuthenticationPrincipal UserDetails userDetails, Model model) {
        if (fileId != null && userDetails != null) {
            try {
                FileService.DownloadFile file = fileService.findFileForNote(userDetails.getUsername(), fileId);
                try (PDDocument document = Loader.loadPDF(file.path().toFile())) {
                    model.addAttribute("pdfFileId", fileId);
                    model.addAttribute("pdfPageCount", document.getNumberOfPages());
                    model.addAttribute("pdfFileName", file.originalName());
                }
            } catch (NoSuchFileException e) {
                model.addAttribute("pdfError", "파일을 찾을 수 없거나 접근 권한이 없습니다.");
            } catch (IOException e) {
                log.warn("노트 PDF를 열 수 없습니다. fileId={}", fileId, e);
                model.addAttribute("pdfError", "PDF 파일을 읽을 수 없습니다.");
            }
        }
        return "note/note";
    }

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
