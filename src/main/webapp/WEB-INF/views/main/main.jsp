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
    <title>파일 보관함</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/vendor/bootstrap/css/bootstrap.min.css">
</head>
<body class="bg-body-tertiary">
<nav class="navbar navbar-expand-lg bg-white border-bottom shadow-sm">
    <div class="container py-2">
        <a class="navbar-brand fw-bold text-primary" href="${pageContext.request.contextPath}/main">파일 보관함</a>
        <div class="d-flex align-items-center gap-2">
            <form action="${pageContext.request.contextPath}/main/upload" method="post" enctype="multipart/form-data" id="uploadForm" class="m-0">
                <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}" />
                <input id="fileInput" class="d-none" type="file" name="file" required onchange="document.getElementById('uploadForm').submit()">
                <label class="btn btn-primary" for="fileInput">파일 업로드</label>
            </form>
            <form action="${pageContext.request.contextPath}/logout" method="post" class="m-0">
                <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}" />
                <button type="submit" class="btn btn-outline-secondary">로그아웃</button>
            </form>
        </div>
    </div>
</nav>

<main class="container py-4 py-lg-5">
    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-end gap-2 mb-4">
        <div>
            <p class="text-primary fw-semibold small text-uppercase mb-1">내 공간</p>
            <h1 class="h2 fw-bold mb-1">업로드 파일</h1>
            <p class="text-body-secondary mb-0">파일을 한곳에서 확인하고 관리하세요.</p>
        </div>
        <span class="badge rounded-pill text-bg-light border text-secondary px-3 py-2">총 <%= sampleFiles.size() %>개</span>
    </div>

    <section class="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div class="card-header bg-white border-0 px-3 px-md-4 pt-4 pb-3">
            <h2 class="h5 fw-semibold mb-0">파일 목록</h2>
        </div>
        <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
                <tr><th class="ps-3 ps-md-4 py-3">파일 이름</th><th class="py-3">용량</th><th class="py-3">업로드 날짜</th></tr>
            </thead>
            <tbody>
            <c:choose>
                <c:when test="${empty files}"><tr><td colspan="3" class="text-center text-body-secondary py-5">업로드한 파일이 없습니다.</td></tr></c:when>
                <c:otherwise>
                    <c:forEach var="file" items="${files}">
                        <tr>
                            <td class="ps-3 ps-md-4 fw-medium"><c:out value="${file.name}" /></td>
                            <td class="text-body-secondary"><c:out value="${file.sizeText}" /></td>
                            <td class="text-body-secondary"><c:out value="${file.uploadedAtText}" /></td>
                        </tr>
                    </c:forEach>
                </c:otherwise>
            </c:choose>
            </tbody>
        </table>
        </div>
        <c:if test="${totalPages > 1}">
            <nav class="py-4" aria-label="파일 목록 페이지">
                <ul class="pagination justify-content-center mb-0">
                <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}"><a class="page-link" href="?page=${currentPage - 1}">이전</a></li>
                <c:forEach var="pageNumber" begin="${pageGroupStart}" end="${pageGroupEnd}">
                    <li class="page-item ${pageNumber == currentPage ? 'active' : ''}"><a class="page-link" href="?page=${pageNumber}" aria-label="${pageNumber}페이지" ${pageNumber == currentPage ? 'aria-current="page"' : ''}>${pageNumber}</a></li>
                </c:forEach>
                <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}"><a class="page-link" href="?page=${currentPage + 1}">다음</a></li>
                </ul>
            </nav>
        </c:if>
    </section>
</main>

<footer class="container pb-4 text-center text-body-secondary small">업로드한 파일은 14일 뒤에 자동 삭제됩니다.</footer>
<script src="${pageContext.request.contextPath}/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
</body>
</html>
