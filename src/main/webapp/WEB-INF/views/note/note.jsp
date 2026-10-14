<%@ page contentType="text/html;charset=UTF-8" language="java" %>
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
        <div class="top-actions"><span class="save-state" id="saveState">이 기기에 자동 저장됩니다</span><button class="button primary" id="saveBtn" type="button">저장</button></div>
    </header>
    <div class="workspace">
        <aside class="notes-panel" aria-label="내 노트 목록">
            <div class="notes-heading"><h2>내 노트</h2><button class="new-note" id="newNoteBtn" type="button" title="새 노트">＋</button></div>
            <input class="notes-search" id="noteSearch" type="search" placeholder="노트 검색" aria-label="노트 검색">
            <p class="notes-section-label">최근 노트</p>
            <div class="note-list" id="noteList">
                <button class="note-item active" type="button" data-note-title="기획 회의 정리" data-note-content="회의 안건\n• 노트 작성 화면 개선\n• 다음 배포 일정 확인\n\n할 일\n화면 시안 공유하기\n사용자 의견 정리하기">
                    <span class="note-item-title">기획 회의 정리</span><span class="note-item-meta">오늘 · 오후 2:30　노트 작성 화면 개선</span>
                </button>
                <button class="note-item" type="button" data-note-title="Spring Boot 공부" data-note-content="설정 메타데이터 처리 방식 정리\nConfiguration Processor\n빌드 결과물 경로 확인하기">
                    <span class="note-item-title">Spring Boot 공부</span><span class="note-item-meta">오늘 · 오전 10:12　설정 메타데이터 정리</span>
                </button>
                <button class="note-item" type="button" data-note-title="이번 주 할 일" data-note-content="□ 노트 화면 정리\n□ 자료 읽기\n□ 주말 일정 확인">
                    <span class="note-item-title">이번 주 할 일</span><span class="note-item-meta">어제 · 오후 6:45　노트 화면 정리</span>
                </button>
                <button class="note-item" type="button" data-note-title="아이디어 모음" data-note-content="떠오르는 생각을 자유롭게 적어 보세요.">
                    <span class="note-item-title">아이디어 모음</span><span class="note-item-meta">10월 11일　떠오르는 생각 기록</span>
                </button>
            </div>
        </aside>
        <main class="stage">
            <div class="stage-head"><span>내 노트&nbsp; / &nbsp;새 노트</span><span id="pageInfo">1 페이지</span></div>
            <div class="stage-toolbar">
                <div class="tools" aria-label="작성 도구">
                    <button class="tool active" type="button" data-mode="pen" title="펜" aria-label="펜">✎</button><span class="tool-label">펜</span>
                    <button class="tool" type="button" data-mode="text" title="텍스트 입력" aria-label="텍스트 입력">T</button><span class="tool-label">텍스트</span>
                    <button class="tool" type="button" data-mode="eraser" title="지우개" aria-label="지우개">▱</button><span class="tool-label">지우개</span>
                    <span class="tool-sep"></span><button class="tool" type="button" id="clearBtn" title="판서 지우기" aria-label="판서 지우기">⌫</button><span class="tool-label">지우기</span>
                </div>
                <div class="tool-actions"><button class="button" id="undoBtn" type="button" title="실행 취소">실행 취소</button><button class="button" id="printBtn" type="button">인쇄</button></div>
            </div>
            <section class="page-wrap" aria-label="노트 페이지"><div class="paper" id="paper">
                <h1 class="paper-title" id="paperTitle" contenteditable="true" spellcheck="false">오늘의 노트</h1>
                <div class="writing-area" id="writingArea" contenteditable="true" spellcheck="true" data-placeholder="여기에 글을 입력하세요. 펜 도구를 선택하면 직접 판서할 수 있어요."></div>
                <canvas class="ink-layer" id="inkLayer" aria-label="펜 판서 영역"></canvas>
            </div></section>
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
