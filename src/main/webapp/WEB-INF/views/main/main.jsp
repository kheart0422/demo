<%@ page contentType="text/html;charset=UTF-8" language="java" import="java.util.*" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>파일 보관함</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/vendor/bootstrap/css/bootstrap.min.css">
    <style>
        #searchDate::-webkit-calendar-picker-indicator {
            display: block;
            opacity: 1;
            cursor: pointer;
        }
    </style>
</head>
<body class="bg-body-tertiary">
<nav class="navbar navbar-expand-lg bg-white border-bottom shadow-sm">
    <div class="container py-2">
        <a class="navbar-brand fw-bold text-primary" href="${pageContext.request.contextPath}/main">파일 보관함</a>
        <div class="d-flex align-items-center gap-2">
            <button type="button" id="myNote" class="btn btn-outline-primary" onclick="location.href='${pageContext.request.contextPath}/note'">내 노트</button>
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
        <span class="badge rounded-pill text-bg-light border text-secondary px-3 py-2">총 ${totalCount}개</span>
    </div>

    <section class="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div class="card-header bg-white border-0 px-3 px-md-4 pt-4 pb-3">
            <form action="${pageContext.request.contextPath}/main" method="get" class="d-flex flex-wrap align-items-center gap-2">
                <label class="visually-hidden" for="searchType">검색 기준</label>
                <select class="form-select w-auto" id="searchType" name="searchType">
                    <option value="name" ${searchType != 'date' ? 'selected' : ''}>파일명</option>
                    <option value="date" ${searchType == 'date' ? 'selected' : ''}>업로드 날짜</option>
                </select>
                <label class="visually-hidden" for="searchName">파일명 또는 초성</label>
                <input class="form-control flex-grow-1 ${searchType == 'date' ? 'd-none' : ''}" id="searchName" name="searchValue"
                       type="search" value="<c:out value='${searchValue}' />"
                       placeholder="파일명 또는 초성 입력" ${searchType == 'date' ? 'disabled' : ''}>
                <label class="visually-hidden" for="searchDate">업로드 날짜</label>
                <input class="form-control flex-grow-1 ${searchType == 'date' ? '' : 'd-none'}" id="searchDate" name="searchValue"
                       type="date" value="<c:out value='${searchValue}' />"
                       ${searchType == 'date' ? '' : 'disabled'}>
                <button class="btn btn-primary" type="submit">검색</button>
                <a class="btn btn-outline-secondary" href="${pageContext.request.contextPath}/main">초기화</a>
            </form>
        </div>
        <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
                <tr><th class="ps-3 ps-md-4 py-3">파일 이름</th><th class="py-3">용량</th><th class="py-3">업로드 날짜</th><th class="py-3"></th></tr>
            </thead>
            <tbody>
            <c:choose>
                <c:when test="${empty files}"><tr><td colspan="4" class="text-center text-body-secondary py-5">업로드한 파일이 없습니다.</td></tr></c:when>
                <c:otherwise>
                    <c:forEach var="file" items="${files}">
                        <tr>
                            <c:url var="downloadUrl" value="/main/download">
                                <c:param name="fileSaveName" value="${file.fileSaveName}" />
                            </c:url>
                            <c:url var="previewUrl" value="/main/preview">
                                <c:param name="fileSaveName" value="${file.fileSaveName}" />
                            </c:url>
                            <td class="ps-3 ps-md-4 fw-medium"><a href="${downloadUrl}" class="link-dark text-decoration-none"><c:out value="${file.fileName}" /></a></td>
                            <td class="text-body-secondary"><c:out value="${file.fileSize}" /></td>
                            <td class="text-body-secondary"><c:out value="${file.fileUploadDate}" /></td>
                            <td><a class="btn btn-outline-primary btn-sm" href="${previewUrl}#page=1" target="_blank" rel="noopener noreferrer">미리보기</a></td>
                        </tr>
                    </c:forEach>
                </c:otherwise>
            </c:choose>
            </tbody>
        </table>
        </div>
        <c:if test="${not empty files and (hasPrevious or hasNext)}">
            <nav class="py-4" aria-label="파일 목록 페이지">
                <ul class="pagination justify-content-center mb-0">
                <c:choose>
                    <c:when test="${hasPrevious}">
                        <c:url var="previousUrl" value="/main">
                            <c:param name="direction" value="prev" />
                            <c:param name="cursorDate" value="${firstFile.cursorDate}" />
                            <c:param name="cursorId" value="${firstFile.fileId}" />
                            <c:param name="searchType" value="${searchType}" />
                            <c:param name="searchValue" value="${searchValue}" />
                        </c:url>
                        <li class="page-item"><a class="page-link" href="${previousUrl}">이전</a></li>
                    </c:when>
                    <c:otherwise><li class="page-item disabled"><span class="page-link">이전</span></li></c:otherwise>
                </c:choose>
                <c:choose>
                    <c:when test="${hasNext}">
                        <c:url var="nextUrl" value="/main">
                            <c:param name="direction" value="next" />
                            <c:param name="cursorDate" value="${lastFile.cursorDate}" />
                            <c:param name="cursorId" value="${lastFile.fileId}" />
                            <c:param name="searchType" value="${searchType}" />
                            <c:param name="searchValue" value="${searchValue}" />
                        </c:url>
                        <li class="page-item"><a class="page-link" href="${nextUrl}">다음</a></li>
                    </c:when>
                    <c:otherwise><li class="page-item disabled"><span class="page-link">다음</span></li></c:otherwise>
                </c:choose>
                </ul>
            </nav>
        </c:if>
    </section>
</main>

<footer class="container pb-4 text-center text-body-secondary small">업로드한 파일은 14일 뒤에 자동 삭제됩니다.</footer>
<script src="${pageContext.request.contextPath}/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
<script>
    const contextPath = '${pageContext.request.contextPath}';

    // HTTP 상태 코드를 Key로 사용하는 프론트엔드 메시지 프로퍼티 객체
    const fileErrorMessages = {
        401: '로그인이 필요합니다.',
        404: '파일이 삭제되었거나 찾을 수 없습니다. 목록을 새로고침합니다.',
        500: '파일 처리 중 서버 오류가 발생했습니다.',
        default: '파일 요청 중 알 수 없는 오류가 발생했습니다.'
    };

    // 파일 권한 및 존재 여부를 체크하는 공통 비동기 함수
    async function checkFileAccessible(url) {
        try {
            // 파일 본문을 다운받지 않고 헤더 정보(상태 코드)만 가볍게 찔러봅니다.
            const response = await fetch(url, { method: 'HEAD', credentials: 'same-origin' });

            if (response.ok) {
                return true; // 파일이 정상적으로 존재함
            } else {
                // 200번대 성공이 아니면 알림창을 띄우고 무조건 새로고침합니다.
                const message = fileErrorMessages[response.status] || fileErrorMessages.default;
                alert(message);
                window.location.reload();
                return false;
            }
        } catch (error) {
            // 네트워크 단절 등 아예 요청이 실패한 경우 예외 처리
            alert(fileErrorMessages.default);
            window.location.reload();
            return false;
        }
    }

    // [다운로드 이벤트 핸들러]
    document.querySelectorAll('a[href*="/main/download"]').forEach(function (link) {
        link.addEventListener('click', async function (event) {
            event.preventDefault();
            // 사전 체크가 통과했을 때만 브라우저 기본 다운로드 흐름을 실행합니다.
            if (await checkFileAccessible(link.href)) {
                window.location.href = link.href;
            }
        });
    });

    // [미리보기 이벤트 핸들러]
    document.querySelectorAll('a[href*="/main/preview"]').forEach(function (link) {
        link.addEventListener('click', async function (event) {
            event.preventDefault();
            // 사전 체크가 통과했을 때만 안전하게 새 창을 열어 미리보기를 띄웁니다.
            if (await checkFileAccessible(link.href)) {
                window.open(link.href, '_blank');
            }
        });
    });


    const searchType = document.getElementById('searchType');
    const searchName = document.getElementById('searchName');
    const searchDate = document.getElementById('searchDate');
    searchType.addEventListener('change', function () {
        const useDate = this.value === 'date';
        searchName.classList.toggle('d-none', useDate);
        searchDate.classList.toggle('d-none', !useDate);
        searchName.disabled = useDate;
        searchDate.disabled = !useDate;
        searchName.value = '';
        searchDate.value = '';
    });

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
