package com.example.demo.controller.file;

import com.example.demo.service.file.FileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    // 업로드 컨트롤러가 성공·실패 처리 후 모두 redirect:/main을 반환하고 있었습니다. 따라서 파일 저장과 DB 입력이 성공해도 POST 응답은 302 Found이고,
    // 브라우저가 이어서 /main을 GET하는 구조라 302 code를 반환하지만 정상 insert 됨
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

// 200 code를 받지만 jsp에서 응답 표시 해주는 부분을 유지 할 수 없음으로 주석
//    @PostMapping(value = "/main/upload", produces = "application/json;charset=UTF-8")
//    public ResponseEntity<Map<String, Object>> upload(
//            @RequestParam("file") MultipartFile file,
//            @AuthenticationPrincipal UserDetails userDetails) {
//        try {
//            if (userDetails == null) {
//                return response(HttpStatus.UNAUTHORIZED, false, "로그인이 필요합니다.");
//            }
//
//            String savedName = fileService.save(file, userDetails.getUsername());
//            return response(HttpStatus.OK, true, "업로드 완료: " + savedName);
//        } catch (IllegalArgumentException e) {
//            return response(HttpStatus.BAD_REQUEST, false, e.getMessage());
//        } catch (Exception e) {
//            log.error("파일 업로드 실패", e);
//            Throwable cause = rootCause(e);
//            String message = cause.getMessage() == null ? cause.getClass().getSimpleName() : cause.getMessage();
//            return response(HttpStatus.INTERNAL_SERVER_ERROR, false, "파일 저장에 실패했습니다: " + message);
//        }
//    }
//
//    @ExceptionHandler(MaxUploadSizeExceededException.class)
//    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(MaxUploadSizeExceededException e) {
//        return response(HttpStatus.PAYLOAD_TOO_LARGE, false, "업로드 파일 크기가 허용된 제한을 초과했습니다.");
//    }
//
//    @ExceptionHandler(MissingServletRequestParameterException.class)
//    public ResponseEntity<Map<String, Object>> handleMissingParameter(MissingServletRequestParameterException e) {
//        return response(HttpStatus.BAD_REQUEST, false, "필수 요청값이 없습니다: " + e.getParameterName());
//    }
//
//    @ExceptionHandler(MultipartException.class)
//    public ResponseEntity<Map<String, Object>> handleMultipartError(MultipartException e) {
//        Throwable cause = rootCause(e);
//        String message = cause.getMessage() == null ? cause.getClass().getSimpleName() : cause.getMessage();
//        return response(HttpStatus.BAD_REQUEST, false, "업로드 요청을 읽지 못했습니다: " + message);
//    }
//
//    @ExceptionHandler(Exception.class)
//    public ResponseEntity<Map<String, Object>> handleUnexpectedError(Exception e) {
//        log.error("업로드 요청 처리 실패", e);
//        Throwable cause = rootCause(e);
//        String message = cause.getMessage() == null ? cause.getClass().getSimpleName() : cause.getMessage();
//        return response(HttpStatus.INTERNAL_SERVER_ERROR, false, "업로드 처리 실패: " + message);
//    }
//
//    private ResponseEntity<Map<String, Object>> response(HttpStatus status, boolean success, String message) {
//        Map<String, Object> body = new LinkedHashMap<>();
//        body.put("success", success);
//        body.put("message", message);
//        return ResponseEntity.status(status).body(body);
//    }
//
//    private Throwable rootCause(Throwable throwable) {
//        Throwable cause = throwable;
//        while (cause.getCause() != null && cause.getCause() != cause) {
//            cause = cause.getCause();
//        }
//        return cause;
//    }
}
