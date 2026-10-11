package com.example.demo.main;

import com.example.demo.service.file.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequiredArgsConstructor
public class MainController {

    private static final int PAGE_SIZE = 10;
    private final FileService fileService;

    /**
     * 커서 기반 페이지네이션을 적용하여 메인 페이지의 파일 목록을 조회하고 뷰(JSP)로 전달하는 메서드
     * @param userDetails 현재 로그인한 사용자 정보 (Spring Security)
     * @param cursorDate 페이지네이션 기준 날짜 커서
     * @param cursorId 페이지네이션 기준 파일 고유 ID 커서
     * @param direction 페이징 이동 방향 ("next" 또는 "prev")
     * @param model 뷰로 데이터를 전달하기 위한 모델 객체
     * @return 메인 페이지 뷰 경로 ("main/main")
     */
    @GetMapping("/main")
    public String mainPage(@AuthenticationPrincipal UserDetails userDetails, @RequestParam(required = false) String cursorDate, @RequestParam(required = false) Long cursorId, @RequestParam(defaultValue = "next") String direction, @RequestParam(defaultValue = "name") String searchType, @RequestParam(required = false) String searchValue, Model model) {
        // 1. 로그인한 사용자 아이디 추출 및 페이징 방향(이전/다음) 설정
        String username = userDetails.getUsername();
        boolean previous = "prev".equalsIgnoreCase(direction);
        String normalizedSearchType = "date".equalsIgnoreCase(searchType) ? "date" : "name";
        String normalizedSearchValue = searchValue == null ? "" : searchValue.trim();
        FileService.SearchFilter searchFilter = fileService.createSearchFilter(normalizedSearchType, normalizedSearchValue);

        // 2. 서비스 레이어를 통해 커서 조건에 맞는 파일 목록 및 페이징 정보 조회
        FileService.FilePage filePage = fileService.findFilesByUsername(username, PAGE_SIZE, cursorDate, cursorId, previous, searchFilter);

        // 3. 뷰(JSP)에서 사용할 데이터 바인딩
        model.addAttribute("username", username);
        model.addAttribute("totalCount", fileService.countFilesByUsername(username, searchFilter));
        model.addAttribute("files", filePage.files());
        model.addAttribute("hasPrevious", filePage.hasPrevious());
        model.addAttribute("hasNext", filePage.hasNext());
        model.addAttribute("searchType", normalizedSearchType);
        model.addAttribute("searchValue", normalizedSearchValue);

        // 4. 현재 조회된 목록의 첫 번째 파일과 마지막 파일 정보 설정 (다음/이전 페이지 요청 시 커서 값으로 활용)
        if (!filePage.files().isEmpty()) {
            model.addAttribute("firstFile", filePage.files().get(0));
            model.addAttribute("lastFile", filePage.files().get(filePage.files().size() - 1));
        }
        return "main/main";
    }

}
