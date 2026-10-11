package com.example.demo.service.file;

import com.example.demo.mapper.FileMapper;
import com.example.demo.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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

        String safeName = Paths.get(originalName).getFileName().toString().replaceAll("[^가-힣a-zA-Z0-9._-]", "_");
        // 특정 시간대(Asia/Seoul)나 형식을 지정할 필요
        String today = LocalDate.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ISO_LOCAL_DATE);
        Path uploadDirectory = Paths.get(filePath).toAbsolutePath().normalize().resolve(today).normalize();
        Files.createDirectories(uploadDirectory);

        String storedName = UUID.randomUUID() + "_" + safeName;
        Path destination = uploadDirectory.resolve(storedName).normalize();
        if (!destination.startsWith(uploadDirectory)) {
            throw new IllegalArgumentException("올바르지 않은 파일 이름입니다.");
        }

        // 로그인한 사용자 아이디 -> 세션에 저장해서 가져오는건?
        Long userId = userMapper.selectIdByUsername(username);
        if (userId == null) {
            throw new IllegalArgumentException("로그인 사용자를 찾을 수 없습니다. 다시 로그인해 주세요.");
        }

        file.transferTo(destination);
        try {
            // 저장
            fileMapper.insertFile(userId, originalName, storedName, destination.toString(), file.getSize());
        } catch (RuntimeException e) {
            Files.deleteIfExists(destination);
            throw e;
        }
        log.info("파일 저장 완료: {} ({} bytes)", destination, file.getSize());
        return safeName;
    }

    // 다운로드할 파일의 물리적 위치와 원본 이름을 안전하게 포장해서 서비스 레이어 밖(컨트롤러 등)으로 전달하기 위한 레코드(Record) 기반의 보안 파일 조회 구조
    // record는 클래스의 일종으로, 데이터를 저장하는 필드(멤버 변수) 정의와 생성자, 간단한 유효성 검사(컴팩트 생성자) 정도만 들어갈 수 있음
    // record: 데이터 운반용 택배 상자 (예: DownloadFile)
    // Service 클래스: 택배 상자에 무엇을 담을지 결정하고 검증하는 일꾼 (예: findFileForDownload 메서드)
    public record DownloadFile(Path path, String originalName) { }

    public DownloadFile findFileForDownload(String username, String fileSaveName) throws IOException {
        Map<String, Object> file = fileMapper.selectFileForDownload(username, fileSaveName);
        if (file == null) {
            throw new NoSuchFileException("파일을 찾을 수 없습니다.");
        }

        Path storageRoot = Paths.get(filePath).toAbsolutePath().normalize();
        Path filePath = Paths.get(String.valueOf(file.get("fileDir"))).toAbsolutePath().normalize();
        if (!filePath.startsWith(storageRoot) || !Files.isRegularFile(filePath)) {
            throw new NoSuchFileException("저장된 파일을 찾을 수 없습니다.");
        }
        return new DownloadFile(filePath, String.valueOf(file.get("fileName")));
    }


}
