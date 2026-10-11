<%@ page contentType="text/html;charset=UTF-8" language="java" import="java.util.*" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
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
                <input id="fileInput" class="d-none" type="file" name="file" accept=".pdf,application/pdf" required>
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
    <c:if test="${not empty uploadMessage}">
        <div class="alert ${uploadSuccess ? 'alert-success' : 'alert-danger'}" role="alert">
            <c:out value="${uploadMessage}" />
        </div>
    </c:if>
    <div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-end gap-2 mb-4">
        <div>
            <p class="text-primary fw-semibold small text-uppercase mb-1">내 공간</p>
            <h1 class="h2 fw-bold mb-1">업로드 파일</h1>
            <p class="text-body-secondary mb-0"><c:out value="${username}" />님의 파일을 확인하고 관리하세요.</p>
        </div>
        <span class="badge rounded-pill text-bg-light border text-secondary px-3 py-2">총 ${empty files ? 0 : files.size()}개</span>
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
                            <c:url var="downloadUrl" value="/main/download">
                                <c:param name="fileSaveName" value="${file.fileSaveName}" />
                            </c:url>
                            <td class="ps-3 ps-md-4 fw-medium"><a href="${downloadUrl}" class="link-dark text-decoration-none"><c:out value="${file.fileName}" /></a></td>
                            <td class="text-body-secondary"><c:out value="${file.fileSize}" /> bytes</td>
                            <td class="text-body-secondary"><c:out value="${file.fileUploadDate}" /></td>
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
<script>
    document.getElementById('fileInput').addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;

        // accept 속성은 파일 선택창의 안내이므로, 선택 후에도 확장자를 확인합니다.
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            alert('PDF 파일만 업로드할 수 있습니다.');
            this.value = '';
            return;
        }

        document.getElementById('uploadForm').requestSubmit();
    });
</script>
</body>
</html>
