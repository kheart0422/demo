package com.example.demo.service.file;

import com.example.demo.mapper.FileMapper;
import com.example.demo.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {

    @Value("${file.dir}")
    private String filePath;
    private final FileMapper fileMapper;
    private final UserMapper userMapper;

    public List<Map<String, Object>> findFilesByUsername(String username) {
        return fileMapper.selectFilesByUsername(username);
    }

    public String save(MultipartFile file, String username) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("업로드할 파일을 선택해 주세요.");
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException("PDF 파일만 업로드할 수 있습니다.");
        }

        String safeName = Paths.get(originalName).getFileName().toString()
                .replaceAll("[^가-힣a-zA-Z0-9._-]", "_");
        Path uploadDirectory = Paths.get(filePath).toAbsolutePath().normalize();
        Files.createDirectories(uploadDirectory);

        Path destination = uploadDirectory.resolve(UUID.randomUUID() + "_" + safeName).normalize();
        if (!destination.startsWith(uploadDirectory)) {
            throw new IllegalArgumentException("올바르지 않은 파일 이름입니다.");
        }

        Long userId = userMapper.selectIdByUsername(username);
        if (userId == null) {
            throw new IllegalArgumentException("로그인 사용자를 찾을 수 없습니다. 다시 로그인해 주세요.");
        }

        file.transferTo(destination);
        try {
            fileMapper.insertFile(userId, safeName, destination.toString(), file.getSize());
        } catch (RuntimeException e) {
            Files.deleteIfExists(destination);
            throw e;
        }
        log.info("파일 저장 완료: {} ({} bytes)", destination, file.getSize());
        return safeName;
    }

}
