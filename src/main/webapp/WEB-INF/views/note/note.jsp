<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>내 노트</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/vendor/bootstrap/css/bootstrap.min.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/note.css">
</head>
<body>
<div class="app">
    <header class="topbar">
        <div class="brand"><a class="back btn btn-outline-primary" href="${pageContext.request.contextPath}/main" aria-label="파일보관함" title="파일보관함">파일보관함</a><span class="brand-mark">✎</span><strong>내 노트</strong></div>
        <input id="docTitle" class="doc-title" aria-label="문서 제목" value="새 노트">
        <div class="top-actions"><span class="save-state" id="saveState">서버에 자동 저장됩니다</span><button class="button" id="deleteNoteBtn" type="button" disabled>노트 삭제</button><button class="button primary" id="saveBtn" type="button">저장</button></div>
    </header>
    <div class="workspace" id="noteWorkspace" data-context-path="${pageContext.request.contextPath}"
         data-pdf-id="${pdfFileId}" data-pdf-page-count="${pdfPageCount}"
         data-initial-note-id="${initialNoteId}" data-notes-api="${pageContext.request.contextPath}/note/api/notes">
        <aside class="notes-panel" aria-label="내 노트 목록">
            <div class="notes-heading"><h2>내 노트</h2><button class="new-note" id="newNoteBtn" type="button" title="새 노트">＋</button></div>
            <input class="notes-search" id="noteSearch" type="search" placeholder="노트 검색" aria-label="노트 검색">
            <p class="notes-section-label">최근 노트</p>
            <c:if test="${not empty pdfError}"><p class="pdf-error"><c:out value="${pdfError}" /></p></c:if>
            <div class="note-list" id="noteList" aria-live="polite"></div>
        </aside>
        <main class="stage">
            <div class="stage-head"><span><c:out value="${not empty pdfFileName ? pdfFileName : '내 노트'}" /></span><span id="pageInfo">1 페이지</span></div>
            <div class="stage-toolbar">
                <div class="tools" aria-label="작성 도구">
                    <button class="tool active" type="button" data-mode="pen" title="펜" aria-label="펜">✎</button><span class="tool-label">펜</span>
                    <button class="tool" type="button" data-mode="text" title="텍스트 입력" aria-label="텍스트 입력">T</button><span class="tool-label">텍스트</span>
                    <button class="tool" type="button" data-mode="eraser" title="지우개" aria-label="지우개">▱</button><span class="tool-label">지우개</span>
                    <span class="tool-sep"></span><button class="tool" type="button" id="clearBtn" title="판서 지우기" aria-label="판서 지우기">⌫</button><span class="tool-label">지우기</span>
                </div>
                <div class="tool-actions"><button class="button" id="prevPdfPage" type="button">이전</button><button class="button" id="nextPdfPage" type="button">다음</button><button class="button" id="undoBtn" type="button" title="실행 취소">실행 취소</button><button class="button" id="printBtn" type="button">인쇄</button></div>
            </div>
            <div class="pdf-layout ${not empty pdfFileId ? 'pdf-mode' : ''}">
                <c:if test="${not empty pdfFileId}">
                    <div class="pdf-thumbnails" id="pdfThumbnails" aria-label="PDF 페이지 목록">
                        <c:forEach var="page" begin="1" end="${pdfPageCount}">
                            <button class="note-item pdf-thumbnail${page == 1 ? ' active' : ''}" type="button" data-pdf-page="${page}" aria-label="${page} 페이지 보기">
                                <img class="thumbnail-image" src="${pageContext.request.contextPath}/note/pdf/${pdfFileId}/page/${page}?thumbnail=true" alt="PDF ${page}페이지 미리보기" loading="lazy">
                                <span class="note-item-title">${page} 페이지</span>
                            </button>
                        </c:forEach>
                    </div>
                </c:if>
                <section class="page-wrap ${not empty pdfFileId ? 'pdf-mode' : ''}" id="pageWrap" aria-label="노트 페이지"><div class="paper" id="paper">
                <c:if test="${not empty pdfFileId}"><img class="pdf-page" id="pdfPageImage" alt="PDF 1페이지" src="${pageContext.request.contextPath}/note/pdf/${pdfFileId}/page/1"></c:if>
                <h1 class="paper-title" id="paperTitle" contenteditable="true" spellcheck="false">오늘의 노트</h1>
                <div class="writing-area" id="writingArea" contenteditable="true" spellcheck="true" data-placeholder="여기에 글을 입력하세요. 펜 도구를 선택하면 직접 판서할 수 있어요."></div>
                <canvas class="ink-layer" id="inkLayer" aria-label="펜 판서 영역"></canvas>
                </div></section>
            </div>
            <button class="button primary floating-add-page" id="addPageBtn" type="button" disabled ${not empty pdfFileId ? 'hidden' : ''} aria-label="페이지 추가">＋ 페이지 추가</button>
        </main>
        <aside class="side-panel">
            <label class="panel-label">펜 색상</label>
            <div class="colors" id="colors"><button class="color selected" type="button" data-color="#202633" style="background:#202633" aria-label="검정"></button><button class="color" type="button" data-color="#3768d8" style="background:#3768d8" aria-label="파랑"></button><button class="color" type="button" data-color="#e34d59" style="background:#e34d59" aria-label="빨강"></button><button class="color" type="button" data-color="#27a17b" style="background:#27a17b" aria-label="초록"></button><button class="color" type="button" data-color="#e39b27" style="background:#e39b27" aria-label="주황"></button></div>
            <label class="panel-label" for="penSize">펜 굵기</label><div class="size-row"><input id="penSize" type="range" min="1" max="12" value="3"><span class="size-value" id="sizeValue">3</span></div>
            <label class="eraser-size-control" for="eraserSize">지우개 크기</label><div class="size-row"><input id="eraserSize" type="range" min="8" max="64" value="24"><span class="size-value" id="eraserSizeValue">24px</span></div>
            <p class="panel-note">마우스, 터치 또는 펜으로 종이 위에 바로 써 보세요. 작성 내용은 현재 브라우저에 자동 저장됩니다.</p>
        </aside>
    </div>
</div>
<script src="${pageContext.request.contextPath}/js/note/drawing.js"></script>
<script src="${pageContext.request.contextPath}/js/note/note.js"></script>
</body>
</html>
