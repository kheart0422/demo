package com.example.demo.controller.file;

import com.example.demo.service.file.FileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Controller
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @PostMapping("/main/upload")
    public String upload(@RequestParam("file") MultipartFile file, @AuthenticationPrincipal UserDetails userDetails, RedirectAttributes redirectAttributes) {
        try {
            String savedName = fileService.save(file, userDetails.getUsername());
            redirectAttributes.addFlashAttribute("uploadMessage", "업로드 완료: " + savedName);
            redirectAttributes.addFlashAttribute("uploadSuccess", true);
        } catch (IllegalArgumentException e) {
            redirectAttributes.addFlashAttribute("uploadMessage", e.getMessage());
            redirectAttributes.addFlashAttribute("uploadSuccess", false);
        } catch (Exception e) {
            log.error("파일 업로드 실패", e);
            redirectAttributes.addFlashAttribute("uploadMessage", "파일 저장에 실패했습니다. 저장 경로와 쓰기 권한을 확인해 주세요.");
            redirectAttributes.addFlashAttribute("uploadSuccess", false);
        }
        return "redirect:/main";
    }

}
