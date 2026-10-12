package com.example.demo.service.file;

import com.example.demo.mapper.FileMapper;
import com.example.demo.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.UUID;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {

    // 한글 초성별 유니코드 음절 범위를 매핑한 정규식 검색용 맵 (예: 'ㄱ' -> "[가-깋]")
    private static final Map<Character, String> CHOSEONG_RANGES = Map.ofEntries(
            Map.entry('ㄱ', "[가-깋]"), Map.entry('ㄲ', "[까-낗]"),
            Map.entry('ㄴ', "[나-닣]"), Map.entry('ㄷ', "[다-딯]"),
            Map.entry('ㄸ', "[따-띻]"), Map.entry('ㄹ', "[라-맇]"),
            Map.entry('ㅁ', "[마-밓]"), Map.entry('ㅂ', "[바-빟]"),
            Map.entry('ㅃ', "[빠-삫]"), Map.entry('ㅅ', "[사-싷]"),
            Map.entry('ㅆ', "[싸-앃]"), Map.entry('ㅇ', "[아-잏]"),
            Map.entry('ㅈ', "[자-짛]"), Map.entry('ㅉ', "[짜-찧]"),
            Map.entry('ㅊ', "[차-칳]"), Map.entry('ㅋ', "[카-킿]"),
            Map.entry('ㅌ', "[타-팋]"), Map.entry('ㅍ', "[파-핗]"),
            Map.entry('ㅎ', "[하-힣]")
    );

    @Value("${file.dir}")
    private String filePath;
    private final FileMapper fileMapper;
    private final UserMapper userMapper;

    /**
     * 커서 기반 페이지네이션을 사용하여 사용자의 파일 목록을 조회 및 가공하는 메서드
     * @param username 사용자 아이디
     * @param pageSize 페이지당 보여줄 파일 개수
     * @param cursorDate 기준 날짜 커서
     * @param cursorId 기준 파일 고유 ID 커서
     * @param previous 이전 페이지 방향 조회 여부
     * @return 파일 목록과 이전/다음 페이지 존재 여부를 담은 FilePage 객체
     */
    public FilePage findFilesByUsername(String username, int pageSize, String cursorDate, Long cursorId, boolean previous, SearchFilter filter) {
        // 커서(기준점)가 존재하는지 여부 확인 (첫 페이지 조회인지 여부 판단)
        boolean hasCursor = cursorDate != null && cursorId != null;
        List<Map<String, Object>> fetchedFiles;
        boolean hasPrevious = false;
        boolean hasNext = false;

        // 1. 커서 유무와 방향에 따른 DB 조회 및 다음/이전 페이지 여부(HasMore) 판별
        // (요청한 pageSize보다 1개 더 조회하여 다음/이전 데이터가 실제로 존재하는지 확인합니다)
        if (!hasCursor) {
            // 최초 첫 페이지 조회
            fetchedFiles = fileMapper.selectFirstFilesByUsername(username, pageSize + 1,
                    filter.fileNameSearch(), filter.initialPattern(), filter.uploadDate());
        } else if (previous) {
            // 이전 페이지 방향으로 조회 (역방향)
            fetchedFiles = fileMapper.selectPreviousFilesByUsername(username, cursorDate, cursorId, pageSize + 1,
                    filter.fileNameSearch(), filter.initialPattern(), filter.uploadDate());
            hasPrevious = fetchedFiles.size() > pageSize;
            if (hasPrevious) {
                fetchedFiles.remove(fetchedFiles.size() - 1); // 초과분 제거
            }
            Collections.reverse(fetchedFiles); // 역방향 조회된 데이터를 올바른 오름차순/내림차순 정렬로 복원
            hasNext = !fetchedFiles.isEmpty();
        } else {
            // 다음 페이지 방향으로 조회 (정방향)
            fetchedFiles = fileMapper.selectNextFilesByUsername(username, cursorDate, cursorId, pageSize + 1,
                    filter.fileNameSearch(), filter.initialPattern(), filter.uploadDate());
            hasNext = fetchedFiles.size() > pageSize;
            if (hasNext) {
                fetchedFiles.remove(fetchedFiles.size() - 1);
            }
            hasPrevious = !fetchedFiles.isEmpty();
        }

        // 최초 조회 시 pageSize보다 많이 가져왔다면 초과분 제거 및 다음 페이지 존재 처리
        if (!hasCursor && fetchedFiles.size() > pageSize) {
            fetchedFiles.remove(fetchedFiles.size() - 1);
            hasNext = true;
        }

        List<Map<String, Object>> fileList = new ArrayList<>(fetchedFiles);

        // 2. 각 파일의 용량을 보기 편한 문자열(KB, MB 등)로 변환
        for (Map<String, Object> file : fileList) {
            Object sizeObj = file.get("fileSize");
            if (sizeObj != null) {
                // DB 종류나 드라이버에 따라 Long 또는 Integer로 반환될 수 있으므로 Number로 안전하게 캐스팅
                long size = ((Number) sizeObj).longValue();

                // 포맷팅 메서드 적용 후 다시 Map에 저장
                file.put("fileSize", formatFileSize(size));
            }
        }

        // 3. 최종 파일 목록과 페이징 상태 정보를 담은 레코드 반환
        return new FilePage(fileList, hasPrevious, hasNext);
    }

    // 로그인한 사용자의 업로드된 파일의 총 갯수
    public long countFilesByUsername(String username, SearchFilter filter) {
        return fileMapper.countFilesByUsername(username, filter.fileNameSearch(), filter.initialPattern(), filter.uploadDate());
    }

    /**
     * 사용자가 입력한 검색 유형과 값에 따라 적절한 SearchFilter(검색 조건 객체)를 생성하는 메서드
     * @param searchType 검색 타입 (예: "date" 또는 일반 검색)
     * @param searchValue 검색어 값
     * @return 생성된 SearchFilter 객체 (파일명 검색, 초성 정규식, 날짜 조건 포함)
     */
    public SearchFilter createSearchFilter(String searchType, String searchValue) {
        // 검색어가 없거나 공백인 경우 빈 필터 반환
        if (searchValue == null || searchValue.isBlank()) {
            return new SearchFilter(null, null, null);
        }

        String value = searchValue.trim();
        // 1. 날짜 검색 타입인 경우 날짜 형식 문자열로 변환하여 필터 생성
        if ("date".equalsIgnoreCase(searchType)) {
            return new SearchFilter(null, null, LocalDate.parse(value).toString());
        }

        // 2. 입력된 검색어가 모두 한글 초성으로만 이루어져 있는지 확인
        boolean chosungOnly = value.chars().allMatch(character -> CHOSEONG_RANGES.containsKey((char) character));
        if (chosungOnly) {
            // 초성 검색인 경우 정규식 패턴 생성 (예: 'ㄱㅅ' -> ".*[가-깋][사-싷].*")
            StringBuilder pattern = new StringBuilder(".*");
            value.chars().forEach(character -> pattern.append(CHOSEONG_RANGES.get((char) character)));
            pattern.append(".*");
            return new SearchFilter(null, pattern.toString(), null);
        }
        // 3. 일반 키워드 검색인 경우 파일명 검색어로 설정
        return new SearchFilter(value, null, null);
    }

    /**
     * 파일 목록 조회 시 사용할 검색 조건을 담는 불변 데이터 객체(Record)
     * @param fileNameSearch 파일명 일반 키워드 검색어
     * @param initialPattern 한글 초성 정규식 패턴
     * @param uploadDate 업로드 날짜 검색 조건
     */
    public record SearchFilter(String fileNameSearch, String initialPattern, String uploadDate) { }

    // 파일 목록과 페이징 상태(이전/다음 페이지 존재 여부)를 전달하기 위한 불변 데이터 객체(Record)
    public record FilePage(List<Map<String, Object>> files, boolean hasPrevious, boolean hasNext) { }

    // 파일 용량 계산
    public String formatFileSize(long size) {
        if (size <= 0) return "0 B";
        final String[] units = { "B", "KB", "MB", "GB", "TB" };
        int digitGroups = (int) (Math.log10(size) / Math.log10(1024));
        return new java.text.DecimalFormat("#,##0.#").format(size / Math.pow(1024, digitGroups)) + " " + units[digitGroups];
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

    /** 매 시간 만 14일이 지난 업로드 파일과 DB 정보를 정리합니다. */
    @Scheduled(cron = "0 0 * * * *", zone = "Asia/Seoul")
    public void deleteExpiredFiles() {
        Path storageRoot = Paths.get(filePath).toAbsolutePath().normalize();
        List<Map<String, Object>> expiredFiles = fileMapper.selectExpiredFiles();
        int deletedRecords = 0;
        Set<Path> candidateDirectories = new LinkedHashSet<>();

        for (Map<String, Object> file : expiredFiles) {
            Object idValue = file.get("fileId");
            Object pathValue = file.get("fileDir");
            if (!(idValue instanceof Number) || pathValue == null) {
                log.warn("만료 파일 정보를 확인할 수 없어 건너뜁니다: {}", file);
                continue;
            }

            try {
                Path physicalFile = Paths.get(pathValue.toString()).toAbsolutePath().normalize();
                if (physicalFile.equals(storageRoot) || !physicalFile.startsWith(storageRoot)) {
                    log.error("저장 루트 밖의 파일 경로라 삭제를 건너뜁니다: {}", physicalFile);
                    continue;
                }

                // 이미 파일이 없더라도 DB의 만료 레코드는 정리합니다.
                Files.deleteIfExists(physicalFile);
                fileMapper.deleteFileById(((Number) idValue).longValue());
                deletedRecords++;
                if (physicalFile.getParent() != null) {
                    candidateDirectories.add(physicalFile.getParent());
                }
            } catch (IOException | RuntimeException e) {
                // 물리 파일 삭제가 실패하면 DB 레코드를 남겨 다음 정리 주기에 재시도합니다.
                log.error("만료 파일 삭제에 실패했습니다: {}", pathValue, e);
            }
        }

        deleteEmptyDirectories(storageRoot, candidateDirectories);
        if (deletedRecords > 0) {
            log.info("만료 파일 정리 완료: {}개", deletedRecords);
        }
    }

    /** 삭제한 파일이 있던 경로만 확인해 빈 하위 디렉터리를 삭제합니다. */
    private void deleteEmptyDirectories(Path storageRoot, Set<Path> candidates) {
        for (Path candidate : candidates) {
            Path directory = candidate;
            while (directory != null && !directory.equals(storageRoot) && directory.startsWith(storageRoot)) {
                try (Stream<Path> contents = Files.list(directory)) {
                    if (contents.findAny().isPresent()) {
                        break;
                    }
                } catch (java.nio.file.NoSuchFileException e) {
                    directory = directory.getParent();
                    continue;
                } catch (IOException e) {
                    log.warn("디렉터리 확인에 실패했습니다: {}", directory, e);
                    break;
                }

                try {
                    Files.deleteIfExists(directory);
                    directory = directory.getParent();
                } catch (IOException e) {
                    log.warn("빈 디렉터리 삭제에 실패했습니다: {}", directory, e);
                    break;
                }
            }
        }
    }


}
