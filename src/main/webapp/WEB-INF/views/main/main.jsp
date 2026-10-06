<%@ page contentType="text/html;charset=UTF-8" language="java" import="java.util.*" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%
    // 화면 확인용 임시 데이터입니다. 실제 업로드 목록 연동 시 이 부분을 제거하면 됩니다.
    List<Map<String, String>> sampleFiles = new ArrayList<>();
    String[] names = {"보고서.pdf", "프로젝트_기획안.docx", "회의록.xlsx", "화면설계.png", "자료모음.zip",
            "요구사항정의서.pdf", "테스트결과.xlsx", "참고이미지.jpg", "발표자료.pptx", "개발가이드.txt",
            "계약서.pdf", "정산내역.xlsx", "로고시안.png", "일정표.xlsx", "데이터.csv",
            "매뉴얼.docx", "아키텍처.png", "샘플영상.mp4", "견적서.pdf", "백업파일.zip",
            "디자인시안.fig", "업무정리.md", "최종자료.pdf"};
    String[] sizes = {"1.2 MB", "842 KB", "256 KB", "3.4 MB", "8.1 MB", "520 KB", "174 KB", "2.0 MB", "5.6 MB", "18 KB"};
    for (int i = 0; i < names.length; i++) {
        Map<String, String> file = new HashMap<>();
        file.put("name", names[i]);
        file.put("sizeText", sizes[i % sizes.length]);
        file.put("uploadedAtText", String.format("2026-10-%02d %02d:%02d", 6 - (i % 6), 10 + (i % 12), (i * 7) % 60));
        sampleFiles.add(file);
    }
    int pageSize = 10;
    int totalPages = (int) Math.ceil((double) sampleFiles.size() / pageSize);
    int currentPage = 1;
    try { currentPage = Integer.parseInt(request.getParameter("page")); } catch (Exception ignored) { }
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);
    int pageGroupStart = ((currentPage - 1) / 5) * 5 + 1;
    int pageGroupEnd = Math.min(pageGroupStart + 4, totalPages);
    int fromIndex = (currentPage - 1) * pageSize;
    request.setAttribute("files", sampleFiles.subList(fromIndex, Math.min(fromIndex + pageSize, sampleFiles.size())));
    request.setAttribute("currentPage", currentPage);
    request.setAttribute("totalPages", totalPages);
    request.setAttribute("pageGroupStart", pageGroupStart);
    request.setAttribute("pageGroupEnd", pageGroupEnd);
%>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>업로드 파일</title>
    <style>
        * { box-sizing: border-box; }
        html, body { height: 100%; margin: 0; font-family: Arial, sans-serif; color: #202124; }
        body { display: flex; flex-direction: column; }
        header { flex: 0 0 auto; min-height: 72px; padding: 14px 28px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #e5e7eb; }
        header h1 { margin: 0 auto 0 0; font-size: 20px; }
        button, .upload-label { border: 0; border-radius: 6px; padding: 10px 16px; background: #2563eb; color: white; cursor: pointer; font-size: 14px; }
        .logout button { background: #6b7280; }
        main { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 28px 24px; }
        .table-wrap { max-width: 1000px; margin: 0 auto; padding-top: 24px; }
        table { width: 100%; border-collapse: separate; border-spacing: 0; }
        th, td { text-align: left; padding: 14px 16px; border-bottom: 1px solid #e5e7eb; }
        thead th { position: sticky; top: 0; z-index: 2; background: #f8fafc; box-shadow: 0 1px 0 #e5e7eb; }
        .empty { padding: 56px 16px; text-align: center; color: #6b7280; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 22px 0; }
        .pagination a { color: #2563eb; text-decoration: none; }
        .pagination .page-number { min-width: 28px; text-align: center; }
        .pagination .current { color: #202124; font-weight: 700; }
        .pagination .disabled { color: #9ca3af; pointer-events: none; }
        footer { flex: 0 0 auto; padding: 16px 28px; border-top: 1px solid #e5e7eb; color: #6b7280; text-align: center; }
        #fileInput { display: none; }
        @media (max-width: 600px) { header, main { padding-left: 14px; padding-right: 14px; } th, td { padding: 11px 8px; font-size: 14px; } }
    </style>
</head>
<body>
<header>
    <h1>업로드 파일</h1>
    <form action="${pageContext.request.contextPath}/main/upload" method="post" enctype="multipart/form-data" id="uploadForm">
        <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}" />
        <input id="fileInput" type="file" name="file" required onchange="document.getElementById('uploadForm').submit()">
        <label class="upload-label" for="fileInput">파일 업로드</label>
    </form>
    <form class="logout" action="${pageContext.request.contextPath}/logout" method="post">
        <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}" />
        <button type="submit">로그아웃</button>
    </form>
</header>
<main>
    <div class="table-wrap">
        <table>
            <thead><tr><th>파일이름</th><th>용량</th><th>파일 업로드일</th></tr></thead>
            <tbody>
            <c:choose>
                <c:when test="${empty files}"><tr><td colspan="3" class="empty">업로드한 파일이 없습니다.</td></tr></c:when>
                <c:otherwise>
                    <c:forEach var="file" items="${files}">
                        <tr><td><c:out value="${file.name}" /></td><td><c:out value="${file.sizeText}" /></td><td><c:out value="${file.uploadedAtText}" /></td></tr>
                    </c:forEach>
                </c:otherwise>
            </c:choose>
            </tbody>
        </table>
        <c:if test="${totalPages > 1}">
            <nav class="pagination" aria-label="파일 목록 페이지">
                <a class="${currentPage <= 1 ? 'disabled' : ''}" href="?page=${currentPage - 1}">이전</a>
                <c:forEach var="pageNumber" begin="${pageGroupStart}" end="${pageGroupEnd}">
                    <a class="page-number ${pageNumber == currentPage ? 'current' : ''}" href="?page=${pageNumber}" aria-label="${pageNumber}페이지" ${pageNumber == currentPage ? 'aria-current="page"' : ''}>${pageNumber}</a>
                </c:forEach>
                <a class="${currentPage >= totalPages ? 'disabled' : ''}" href="?page=${currentPage + 1}">다음</a>
            </nav>
        </c:if>
    </div>
</main>
<footer>업로드일 기준으로 14일 뒤에 자동 삭제 됩니다.</footer>
</body>
</html>
