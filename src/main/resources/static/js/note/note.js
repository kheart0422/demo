(() => {
    // HTML 요소 가져오기
    // 노트 제목 입력 영역
    const title = document.getElementById('docTitle');
    // 노트 작성 영역
    const writing = document.getElementById('writingArea');
    // 저장 상태 표시 영역
    const saveState = document.getElementById('saveState');
    // 노트 삭제 버튼
    const deleteNoteButton = document.getElementById('deleteNoteBtn');
    // 노트 작업 공간
    const workspace = document.getElementById('noteWorkspace');
    // 노트 목록 영역
    const noteList = document.getElementById('noteList');

    // HTML의 data-* 속성에서 서버 API 및 PDF 정보를 가져옴
    // 노트 API 주소
    const notesApi = workspace.dataset.notesApi;
    // 현재 PDF 파일 ID
    const pdfId = Number(workspace.dataset.pdfId || 0);
    // PDF 전체 페이지 수
    const pdfPageCount = Number(workspace.dataset.pdfPageCount || 0);
    // 처음 선택할 노트 ID
    const initialNoteId = Number(workspace.dataset.initialNoteId || 0);

    // 노트 관련 상태 변수
    // 서버에서 불러온 전체 노트 목록
    let notes = [];
    // 현재 선택된 노트 ID
    let activeNoteId = null;
    // 현재 노트가 PDF 기반 노트인지 여부
    let activeNoteIsPdf = false;
    // 일반 노트의 전체 페이지 수
    let activeNotePageCount = 1;
    // 현재 보고 있는 페이지 번호
    let currentPdfPage = 1;
    // 노트 내용 자동 저장 타이머
    let saveTimer;

    // 페이지별 판서 저장 타이머 관리
    // Map 구조: 페이지 번호를 key, 타이머 ID를 value로 저장
    const pageSaveTimers = new Map();

    // 특정 페이지의 예약된 저장 타이머를 제거하는 함수
    function clearPageTimer(page) {
        clearTimeout(pageSaveTimers.get(page)); // 해당 페이지의 타이머 취소
        pageSaveTimers.delete(page);            // Map에서 타이머 정보 삭제
    }

    // 일반 노트의 페이지를 생성하는 함수
    function renderGeneralPages(pageCount) {
        const pageWrap = document.getElementById('pageWrap');

        pageWrap.classList.add('general-mode'); // 일반 노트 모드 적용

        // 기존에 JavaScript로 생성했던 페이지 제거
        pageWrap.querySelectorAll('[data-generated-page]').forEach(page => page.remove());

        // 최초 HTML에 작성되어 있는 첫 번째 페이지 가져오기
        const firstPaper = document.getElementById('paper');
        firstPaper.classList.add('note-paper');
        firstPaper.dataset.pageNumber = '1';
        firstPaper.dataset.pageLabel = '1 페이지';

        // 첫 번째 페이지의 캔버스와 글쓰기 영역에 페이지 번호 지정
        const firstCanvas = document.getElementById('inkLayer');
        firstCanvas.dataset.pageNumber = '1';
        document.getElementById('writingArea').dataset.pageNumber = '1';

        // 2페이지부터 지정된 페이지 수까지 복제하여 생성
        for (let page = 2; page <= pageCount; page++) {

            // 첫 번째 페이지의 HTML 구조를 복제
            const paper = firstPaper.cloneNode(true);

            paper.removeAttribute('id'); // 중복 ID 방지
            paper.dataset.generatedPage = 'true'; // JavaScript로 생성된 페이지임을 표시
            paper.dataset.pageNumber = String(page);
            paper.dataset.pageLabel = `${page} 페이지`;

            // 복제된 페이지에서는 종이 제목 제거
            paper.querySelector('.paper-title')?.remove();

            // 글쓰기 영역 초기화
            const writingArea = paper.querySelector('.writing-area');
            writingArea?.removeAttribute('id');

            if (writingArea) {
                writingArea.textContent = ''; // 기존 작성 내용 제거
                writingArea.dataset.pageNumber = String(page);
            }

            // 판서용 캔버스 초기화
            const canvas = paper.querySelector('.ink-layer');
            canvas.removeAttribute('id');
            canvas.removeAttribute('data-drawing-bound');
            canvas.dataset.pageNumber = String(page);

            // 복제한 페이지를 페이지 영역에 추가
            pageWrap.append(paper);
        }

        // 생성된 페이지의 캔버스를 다시 등록
        window.NoteDrawing.resetPages();
    }

    // 일반 노트 페이지를 초기화하는 함수
    function clearGeneralPages() {
        const pageWrap = document.getElementById('pageWrap');

        pageWrap.classList.remove('general-mode');

        // JavaScript로 추가된 페이지 모두 제거
        pageWrap.querySelectorAll('[data-generated-page]').forEach(page => page.remove());

        // 첫 번째 페이지의 일반 노트 관련 속성 제거
        document.getElementById('paper').classList.remove('note-paper');
        document.getElementById('paper').removeAttribute('data-page-number');
    }

    // 일반 노트에서 특정 페이지로 이동하는 함수
    function focusGeneralPage(page) {
        const paper = document.querySelector(`.note-paper[data-page-number="${page}"]`);

        // 해당 페이지가 존재하지 않으면 함수 종료
        if (!paper) return;

        currentPdfPage = page; // 현재 페이지 번호 변경
        window.NoteDrawing.setActivePage(page); // 판서 기능의 활성 페이지 변경

        updatePageControls(); // 페이지 정보 및 버튼 상태 갱신

        // 해당 페이지가 화면 상단에 오도록 부드럽게 스크롤
        paper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 페이지 정보와 페이지 이동 버튼 상태를 갱신하는 함수
    function updatePageControls() {

        // PDF 노트와 일반 노트에 따라 전체 페이지 수 결정
        const totalPages = activeNoteIsPdf ? pdfPageCount : activeNotePageCount;

        // 현재 페이지 / 전체 페이지 표시
        document.getElementById('pageInfo').textContent =
            `${currentPdfPage} / ${totalPages} 페이지`;

        // 첫 페이지에서는 이전 버튼 비활성화
        document.getElementById('prevPdfPage').disabled = currentPdfPage <= 1;

        // 마지막 페이지에서는 다음 버튼 비활성화
        document.getElementById('nextPdfPage').disabled = currentPdfPage >= totalPages;

        const addPageButton = document.getElementById('addPageBtn');

        // PDF 파일이 열려 있거나 PDF 노트인 경우 페이지 추가 버튼 숨김
        addPageButton.hidden = Boolean(pdfId) || activeNoteIsPdf;

        // 노트가 선택되지 않았거나 PDF 노트이거나 최대 페이지 수에 도달하면 비활성화
        addPageButton.disabled =
            !activeNoteId || activeNoteIsPdf || activeNotePageCount >= 10;
    }

    // PDF의 특정 페이지 이미지를 화면에 표시하는 함수
    function setPdfPageImage(page) {

        // PDF가 없거나 유효하지 않은 페이지 번호라면 종료
        if (!pdfId || page < 1 || page > pdfPageCount) return;

        currentPdfPage = page;

        // 판서 기능에서 현재 페이지 번호 변경
        window.NoteDrawing.setPageNumber(page);

        const image = document.getElementById('pdfPageImage');

        // 이미지의 대체 텍스트 지정
        image.alt = `PDF ${page}페이지`;

        // 서버에 PDF 페이지 이미지 요청
        image.src = `${workspace.dataset.contextPath}/note/pdf/${pdfId}/page/${page}`;

        // 종이 영역에 현재 페이지 번호 표시
        document.getElementById('paper').dataset.pageLabel = `${page} 페이지`;

        // PDF 썸네일 중 현재 페이지에 해당하는 항목에 active 클래스 적용
        document.querySelectorAll('.pdf-thumbnail').forEach(item =>
            item.classList.toggle(
                'active',
                Number(item.dataset.pdfPage) === page
            )
        );

        updatePageControls(); // 페이지 이동 버튼 상태 갱신
    }

    // 서버에서 특정 페이지의 판서 데이터를 불러오는 함수
    async function loadPageStrokes(page, noteId = activeNoteId) {

        // 노트 ID가 없으면 조회할 수 없으므로 종료
        if (!noteId) return;

        try {
            // 해당 노트의 특정 페이지 판서 데이터 조회
            const response = await fetch(
                `${notesApi}/${noteId}/pages/${page}/strokes`,
                { credentials: 'same-origin' }
            );

            // HTTP 응답이 정상적이지 않으면 오류 발생
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            // 서버 응답을 JSON으로 변환
            const data = await response.json();

            // 조회를 시작했던 노트가 여전히 현재 선택된 노트인지 확인
            if (activeNoteId === noteId) {

                // 판서 데이터를 캔버스에 적용
                // data가 배열이면 그대로 사용하고, 객체이면 data.strokes 사용
                window.NoteDrawing.setStrokes(
                    Array.isArray(data) ? data : data.strokes,
                    page
                );

                // 일반 노트인 경우 작성했던 텍스트도 복원
                if (!activeNoteIsPdf && !Array.isArray(data)) {
                    const area = document.querySelector(
                        `.writing-area[data-page-number="${page}"]`
                    );

                    if (area) area.textContent = data.text || '';
                }
            }

        } catch (error) {
            saveState.textContent = '페이지 판서를 불러오지 못했습니다';
            console.error('페이지 판서 조회 실패', error);
        }
    }

    // 노트의 모든 페이지 판서 데이터를 한 번에 불러오는 함수
    async function loadAllPageStrokes(pageCount, noteId) {

        // 각 페이지의 판서 데이터를 병렬로 조회
        // Promise.all을 사용하여 모든 요청이 완료될 때까지 대기
        await Promise.all(
            Array.from(
                { length: pageCount },
                (_, index) => loadPageStrokes(index + 1, noteId)
            )
        );
    }

    // 특정 페이지의 판서 데이터를 서버에 저장하는 함수
    async function savePageStrokes(noteId = activeNoteId, page = currentPdfPage) {

        // 저장 전에 해당 페이지에 예약된 타이머 제거
        clearPageTimer(page);

        if (!noteId) return;

        // 현재 페이지의 판서 데이터 가져오기
        const strokes = window.NoteDrawing.getStrokes(page);

        try {
            // 서버에 해당 페이지의 판서 데이터 전송
            const response = await fetch(
                `${notesApi}/${noteId}/pages/${page}/strokes`,
                {
                    method: 'PUT', // 기존 페이지 데이터 수정
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json'
                    },

                    // 서버에 전달할 데이터를 JSON 문자열로 변환
                    body: JSON.stringify({
                        strokes,

                        // PDF 노트는 텍스트를 저장하지 않음
                        // 일반 노트는 해당 페이지의 글쓰기 영역 내용 저장
                        text: activeNoteIsPdf
                            ? ''
                            : (
                                document.querySelector(
                                    `.writing-area[data-page-number="${page}"]`
                                )?.textContent || ''
                            )
                    })
                }
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            // 현재 선택된 노트의 저장이 완료된 경우 상태 표시
            if (activeNoteId === noteId) {
                saveState.textContent = '페이지 판서가 서버에 저장되었습니다';
            }

        } catch (error) {
            saveState.textContent = '페이지 판서 저장 실패';
            console.error('페이지 판서 저장 실패', error);
        }
    }

    // 이전 또는 다음 페이지로 이동하는 함수
    async function showNotePage(page) {

        // 노트 종류에 따라 전체 페이지 수 결정
        const totalPages = activeNoteIsPdf ? pdfPageCount : activeNotePageCount;

        // 노트가 없거나 페이지 번호가 유효하지 않거나
        // 이미 현재 페이지라면 이동하지 않음
        if (
            !activeNoteId ||
            page < 1 ||
            page > totalPages ||
            page === currentPdfPage
        ) return;

        // 일반 노트는 스크롤 방식으로 페이지 이동
        if (!activeNoteIsPdf) {
            focusGeneralPage(page);
            return;
        }

        // PDF 노트는 페이지 이동 전에 현재 페이지 판서 저장
        await savePageStrokes(activeNoteId, currentPdfPage);

        // 이동할 PDF 페이지 이미지 표시
        setPdfPageImage(page);

        // 이동한 페이지의 기존 판서 데이터 불러오기
        await loadPageStrokes(page);
    }

    // 현재 화면이 PDF 파일을 표시하는 경우 실행
    if (pdfId && pdfPageCount > 0) {

        const image = document.getElementById('pdfPageImage');

        // PDF 페이지 이미지가 로딩되면 실행
        image.addEventListener('load', () => {

            // 실제 PDF 이미지의 가로세로 비율에 맞게 종이 영역 조정
            document.getElementById('paper').style.aspectRatio =
                `${image.naturalWidth} / ${image.naturalHeight}`;

            // 창 크기 변경 이벤트를 발생시켜 캔버스 크기도 다시 조정
            window.dispatchEvent(new Event('resize'));
        });

        // PDF 썸네일 클릭 시 해당 페이지로 이동
        document.querySelectorAll('.pdf-thumbnail').forEach(item =>
            item.addEventListener('click', () =>
                showNotePage(Number(item.dataset.pdfPage))
            )
        );

        // PDF를 열었을 때 첫 페이지 표시
        setPdfPageImage(1);
    }

    // 이전 페이지 버튼 클릭 시 실행
    document.getElementById('prevPdfPage').addEventListener('click', () =>
        showNotePage(currentPdfPage - 1)
    );

    // 다음 페이지 버튼 클릭 시 실행
    document.getElementById('nextPdfPage').addEventListener('click', () =>
        showNotePage(currentPdfPage + 1)
    );

    // 일반 노트에 새 페이지를 추가하는 버튼
    document.getElementById('addPageBtn').addEventListener('click', async () => {

        // 노트가 없거나 PDF 노트이거나 최대 페이지 수에 도달했다면 종료
        if (!activeNoteId || activeNoteIsPdf || activeNotePageCount >= 10) return;

        const button = document.getElementById('addPageBtn');

        // 중복 클릭 방지
        button.disabled = true;

        // 새 페이지를 추가하기 전에 현재 노트의 변경 사항 저장
        await flushCurrentNote();

        try {
            // 서버에 새 페이지 생성 요청
            const response = await fetch(
                `${notesApi}/${activeNoteId}/pages`,
                {
                    method: 'POST',
                    credentials: 'same-origin'
                }
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();

            // 서버에서 반환한 페이지 번호를 전체 페이지 수로 반영
            activeNotePageCount = result.pageNumber;

            // 현재 노트 객체의 페이지 수도 갱신
            const activeNote = notes.find(note => note.noteId === activeNoteId);
            if (activeNote) activeNote.pageCount = activeNotePageCount;

            // 변경된 페이지 수만큼 화면에 페이지 생성
            renderGeneralPages(activeNotePageCount);

            // 새로 생성된 페이지의 판서 데이터 불러오기
            await loadAllPageStrokes(activeNotePageCount, activeNoteId);

            // 새로 추가된 마지막 페이지로 이동
            focusGeneralPage(activeNotePageCount);

        } catch (error) {
            saveState.textContent = '페이지를 추가하지 못했습니다';
            console.error('페이지 추가 실패', error);

            // HTTP 409 오류는 최대 페이지 수 초과로 처리
            alert(
                error.message.includes('409')
                    ? '일반 노트는 최대 10페이지까지 만들 수 있습니다.'
                    : '페이지를 추가하지 못했습니다.'
            );

        } finally {
            // 작업이 끝나면 버튼 상태 복구
            button.disabled = activeNoteIsPdf || activeNotePageCount >= 10;
        }
    });

    // 노트 목록을 화면에 출력하는 함수
    function renderNoteList() {

        // 기존 노트 목록 초기화
        noteList.replaceChildren();

        // 노트가 하나도 없는 경우 안내 문구 표시
        if (!notes.length) {
            const empty = document.createElement('p');
            empty.className = 'note-empty';
            empty.textContent = '노트가 없습니다. ＋ 버튼으로 새 노트를 만들어 보세요.';
            noteList.append(empty);
            return;
        }

        // 서버에서 불러온 노트 목록을 하나씩 화면에 추가
        notes.forEach(note => {

            const button = document.createElement('button');
            button.type = 'button';

            // 현재 선택된 노트라면 active 클래스 추가
            button.className =
                `note-item${note.noteId === activeNoteId ? ' active' : ''}`;

            // 노트 제목 표시 영역
            const noteTitle = document.createElement('span');
            noteTitle.className = 'note-item-title';
            noteTitle.textContent = note.title || '새 노트';

            // 노트 내용 미리보기 영역
            const noteMeta = document.createElement('span');
            noteMeta.className = 'note-item-meta';

            // 줄바꿈과 여러 공백을 하나의 공백으로 변경하고
            // 앞부분 48자만 미리보기로 표시
            noteMeta.textContent =
                (note.writing || '').replace(/\s+/g, ' ').slice(0, 48)
                || '내용 없음';

            button.append(noteTitle, noteMeta);

            // 노트 항목 클릭 시 해당 노트 선택
            button.addEventListener('click', () => selectNote(note));

            noteList.append(button);
        });
    }

    // 노트 목록에서 특정 노트를 선택하는 함수
    async function selectNote(note) {

        // 다른 노트로 이동하기 전에 현재 노트의 변경 사항 저장
        if (activeNoteId && activeNoteId !== note.noteId) {
            await flushCurrentNote();
        }

        // 현재 화면의 PDF 파일 ID와 선택한 노트의 PDF 파일 ID가 다른 경우
        // 해당 노트에 맞는 URL로 이동
        if (Number(note.fileId || 0) !== pdfId) {
            const target =
                `${workspace.dataset.contextPath}/note?noteId=${encodeURIComponent(note.noteId)}`;

            window.location.assign(target);
            return;
        }

        // 현재 선택한 노트 정보 갱신
        activeNoteId = note.noteId;
        activeNoteIsPdf = Boolean(note.fileId);

        // PDF 노트라면 PDF 페이지 수를 사용하고,
        // 일반 노트라면 노트에 저장된 페이지 수를 사용
        activeNotePageCount = activeNoteIsPdf
            ? pdfPageCount
            : Number(note.pageCount || 1);

        currentPdfPage = 1;

        // PDF 노트인 경우
        if (activeNoteIsPdf) {
            clearGeneralPages(); // 일반 노트 페이지 제거
            window.NoteDrawing.resetPages(); // 판서 캔버스 초기화
            setPdfPageImage(1); // PDF 첫 페이지 표시

        } else {
            // 일반 노트인 경우 저장된 페이지 수만큼 페이지 생성
            renderGeneralPages(activeNotePageCount);
        }

        updatePageControls(); // 페이지 정보 갱신

        // 삭제 버튼 활성화
        deleteNoteButton.disabled = false;

        // 선택한 노트의 기존 데이터 화면에 표시
        title.value = note.title || '새 노트';
        title.readOnly = activeNoteIsPdf; // PDF 노트는 제목 수정 제한

        writing.textContent = note.writing || '';

        // 기존 캔버스 판서 데이터 초기화
        window.NoteDrawing.clearAll();

        // 노트 종류에 따라 판서 데이터 불러오기
        if (activeNoteIsPdf) {

            // PDF 노트는 현재 페이지 데이터만 불러옴
            await loadPageStrokes(currentPdfPage, note.noteId);

        } else {

            // 일반 노트는 모든 페이지의 판서 데이터 불러오기
            await loadAllPageStrokes(activeNotePageCount, note.noteId);

            // 첫 번째 페이지로 이동
            focusGeneralPage(1);
        }

        saveState.textContent = '서버에 저장됩니다';

        // 선택 상태가 반영된 노트 목록 다시 출력
        renderNoteList();
    }

    // 노트의 기본 정보(제목, 본문 등)를 서버에 저장하는 함수
    async function saveDocument() {

        // 기존에 예약된 자동 저장 타이머 제거
        clearTimeout(saveTimer);

        // 선택된 노트가 없으면 저장하지 않음
        if (!activeNoteId) return;

        // 서버에 전송할 데이터 구성
        const payload = {
            title: title.value.trim() || '새 노트' // 제목 컬럼은 user_note.note_title 사용
        };

        saveState.textContent = '저장 중…';

        try {
            // 현재 노트 정보 수정 요청
            const response = await fetch(
                `${notesApi}/${activeNoteId}`,
                {
                    method: 'PUT',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            // 서버에서 저장된 노트 데이터 반환
            const saved = await response.json();

            // 기존 노트 목록에서 저장된 노트 정보 갱신
            notes = notes.map(note =>
                note.noteId === saved.noteId ? saved : note
            );

            saveState.textContent = '서버에 저장됨';

            // 변경된 내용으로 노트 목록 다시 출력
            renderNoteList();

        } catch (error) {
            saveState.textContent = '저장 실패';
            console.error('노트 저장 실패', error);
        }
    }

    // 현재 노트의 변경 사항을 모두 저장하는 함수
    async function flushCurrentNote() {

        // 노트 기본 정보 자동 저장 타이머 제거
        clearTimeout(saveTimer);

        // 페이지별 판서 저장 타이머도 모두 제거
        const pendingPages = [...pageSaveTimers.keys()];
        pendingPages.forEach(clearPageTimer);

        // 노트 제목과 본문 등 기본 정보 저장
        await saveDocument();

        if (!activeNoteId) return;

        // PDF 노트는 현재 페이지를 저장 대상으로 지정
        // 일반 노트는 판서 데이터가 등록된 전체 페이지를 저장 대상으로 지정
        const pages = activeNoteIsPdf
            ? [currentPdfPage]
            : window.NoteDrawing.getPageNumbers();

        // 대상 페이지들의 판서 데이터를 병렬로 저장
        await Promise.all(
            pages.map(page => savePageStrokes(activeNoteId, page))
        );
    }

    // 노트 기본 정보의 자동 저장을 예약하는 함수
    function scheduleDocumentSave() {

        if (!activeNoteId) return;

        saveState.textContent = '저장 중…';

        // 이전에 예약된 저장 작업 취소
        clearTimeout(saveTimer);

        // 마지막 입력 이후 500ms가 지나면 저장 실행
        // 입력할 때마다 서버에 요청하는 것을 방지하기 위한 디바운스 처리
        saveTimer = setTimeout(saveDocument, 500);
    }

    // 판서 데이터의 자동 저장을 예약하는 함수
    function scheduleDrawingSave(event) {

        if (!activeNoteId) return;

        // 판서 변경 이벤트에서 페이지 번호 가져오기
        const page = Number(event.detail?.pageNumber || currentPdfPage);

        // 일반 노트라면 현재 페이지 번호도 함께 갱신
        if (!activeNoteIsPdf) currentPdfPage = page;

        // 판서 기능에서 현재 활성 페이지 지정
        window.NoteDrawing.setActivePage(page);

        updatePageControls();

        saveState.textContent = '페이지 판서 저장 중…';

        // 같은 페이지에 예약된 이전 저장 작업 취소
        clearPageTimer(page);

        // 마지막 판서 변경 이후 500ms가 지나면 해당 페이지 저장
        pageSaveTimers.set(
            page,
            setTimeout(() => savePageStrokes(activeNoteId, page), 500)
        );
    }

    // 서버에서 전체 노트 목록을 불러오는 함수
    async function loadNotes() {

        try {
            // 노트 목록 조회 API 호출
            const response = await fetch(
                notesApi,
                { credentials: 'same-origin' }
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            // 서버 응답을 JSON으로 변환하여 노트 목록에 저장
            notes = await response.json();

            // 노트 목록 화면에 출력
            renderNoteList();

            // 처음 화면에 표시할 노트 찾기
            const initial = notes.find(
                note => note.noteId === initialNoteId
            );

            // 현재 PDF 파일에 연결된 노트 찾기
            const forCurrentPdf = pdfId
                ? notes.find(note => Number(note.fileId) === pdfId)
                : null;

            // 처음 선택할 노트가 존재하면 해당 노트 선택
            if (initial) {
                await selectNote(initial);

                // 현재 PDF에 연결된 노트가 있으면 해당 노트 선택
            } else if (forCurrentPdf) {
                await selectNote(forCurrentPdf);

                // PDF는 열려 있지만 연결된 노트가 없는 경우
            } else if (pdfId) {

                // 현재 PDF에 연결된 새 노트 생성
                const created = await createNote(pdfId);

                notes.unshift(created);
                await selectNote(created);

                // PDF가 없고 기존 노트가 있으면 첫 번째 노트 선택
            } else if (notes.length) {
                await selectNote(notes[0]);

                // 노트가 하나도 없는 경우 초기 화면 구성
            } else {
                clearGeneralPages();
                window.NoteDrawing.resetPages();

                title.value = '새 노트';
                title.readOnly = false;

                activeNoteIsPdf = false;

                writing.textContent = '';

                window.NoteDrawing.clear();

                deleteNoteButton.disabled = true;

                currentPdfPage = 1;
                activeNotePageCount = 1;

                updatePageControls();
            }

        } catch (error) {
            saveState.textContent = '노트 목록을 불러오지 못했습니다';
            console.error('노트 목록 조회 실패', error);
        }
    }

    // 새 노트를 서버에 생성하는 함수
    async function createNote(fileId = pdfId) {

        const response = await fetch(
            notesApi,
            {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },

                // PDF 파일 ID가 있으면 연결하고,
                // 없으면 일반 노트로 생성
                body: JSON.stringify({
                    fileId: fileId || null
                })
            }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // 서버에서 생성된 노트 정보 반환
        return response.json();
    }

    // 새 노트 생성 버튼 클릭 이벤트
    document.getElementById('newNoteBtn').addEventListener('click', async () => {

        const button = document.getElementById('newNoteBtn');

        // 중복 클릭 방지
        button.disabled = true;

        // 새 노트 생성 전에 현재 노트 저장
        await flushCurrentNote();

        try {
            // PDF와 연결되지 않은 일반 노트 생성
            const created = await createNote(null);

            // 새 노트를 목록 맨 앞에 추가
            notes.unshift(created);

            // 생성한 노트를 바로 선택
            await selectNote(created);

            // 노트 제목 입력 영역에 포커스
            title.focus();

        } catch (error) {
            saveState.textContent = '새 노트를 만들지 못했습니다';
            console.error('노트 생성 실패', error);

            alert('새 노트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');

        } finally {
            // 생성 작업이 끝나면 버튼 다시 활성화
            button.disabled = false;
        }
    });

    // 노트 삭제 버튼 클릭 이벤트
    deleteNoteButton.addEventListener('click', async () => {

        // 선택된 노트가 없거나 사용자가 삭제를 취소하면 종료
        if (!activeNoteId || !window.confirm('이 노트를 삭제할까요?')) return;

        // 삭제할 노트 ID 임시 저장
        const deletingId = activeNoteId;

        // 중복 삭제 방지
        deleteNoteButton.disabled = true;

        try {
            // 삭제 전에 현재 노트의 변경 사항 저장
            await flushCurrentNote();

            // 서버에 노트 삭제 요청
            const response = await fetch(
                `${notesApi}/${deletingId}`,
                {
                    method: 'DELETE',
                    credentials: 'same-origin'
                }
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            // 삭제된 노트를 목록에서 제거
            notes = notes.filter(note => note.noteId !== deletingId);

            activeNoteId = null;

            renderNoteList();

            // 삭제 후 다른 노트가 남아 있다면 첫 번째 노트 선택
            if (notes.length) {
                await selectNote(notes[0]);

            } else {

                // PDF가 아닌 경우 일반 노트 페이지 초기화
                if (!pdfId) {
                    clearGeneralPages();
                    window.NoteDrawing.resetPages();
                }

                // 노트가 하나도 남지 않은 경우 초기 상태로 복구
                title.value = '새 노트';
                title.readOnly = false;

                activeNoteIsPdf = false;
                activeNotePageCount = 1;
                currentPdfPage = 1;

                writing.textContent = '';

                window.NoteDrawing.clear();

                saveState.textContent = '노트가 삭제되었습니다';

                deleteNoteButton.disabled = true;

                updatePageControls();
            }

        } catch (error) {
            // 삭제 실패 시 버튼 다시 활성화
            deleteNoteButton.disabled = false;

            saveState.textContent = '노트를 삭제하지 못했습니다';
            console.error('노트 삭제 실패', error);

            alert('노트를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
    });

    // 노트 제목, 종이 제목, 본문에 입력이 발생하면 자동 저장 예약
    [title].forEach(element =>
        element.addEventListener('input', scheduleDocumentSave)
    );

    // 페이지 영역에서 발생하는 입력 이벤트 처리
    document.getElementById('pageWrap').addEventListener('input', event => {

        // 글쓰기 영역에서 발생한 입력이 아니거나 PDF 노트라면 종료
        if (!event.target.matches('.writing-area') || activeNoteIsPdf) return;

        // 입력이 발생한 페이지 번호 확인
        const page = Number(event.target.dataset.pageNumber || 1);

        // 해당 페이지의 기존 저장 타이머 제거
        clearPageTimer(page);

        // 입력이 멈춘 뒤 500ms 후 해당 페이지 저장
        pageSaveTimers.set(
            page,
            setTimeout(() => savePageStrokes(activeNoteId, page), 500)
        );
    });

    // 일반 노트의 글쓰기 영역에 포커스가 들어왔을 때 실행
    document.getElementById('pageWrap').addEventListener('focusin', event => {

        // 글쓰기 영역이 아니거나 PDF 노트라면 종료
        if (!event.target.matches('.writing-area') || activeNoteIsPdf) return;

        // 포커스가 들어온 페이지를 현재 페이지로 설정
        currentPdfPage = Number(event.target.dataset.pageNumber || 1);

        // 판서 기능에서도 해당 페이지를 활성 페이지로 지정
        window.NoteDrawing.setActivePage(currentPdfPage);

        updatePageControls();
    });

    // drawing.js에서 판서 변경 이벤트가 발생하면 자동 저장 예약
    window.addEventListener('note:drawingchange', scheduleDrawingSave);

    // 저장 버튼 클릭 시 현재 노트의 모든 변경 사항 저장
    document.getElementById('saveBtn').addEventListener('click', flushCurrentNote);

    // 인쇄 버튼 클릭 시 브라우저 인쇄 기능 실행
    document.getElementById('printBtn').addEventListener('click', () => window.print());

    // 노트 검색창 입력 이벤트
    document.getElementById('noteSearch').addEventListener('input', event => {

        // 검색어 앞뒤 공백 제거 및 소문자 변환
        const query = event.target.value.trim().toLocaleLowerCase();

        // 노트 목록을 순회하면서 검색어 포함 여부 확인
        document.querySelectorAll('#noteList .note-item').forEach(item => {

            // 검색어가 포함되지 않은 노트는 화면에서 숨김
            item.hidden = !item.textContent.toLocaleLowerCase().includes(query);
        });
    });

    // 일반 노트 화면에서 스크롤할 때 현재 페이지를 자동으로 감지
    document.querySelector('.pdf-layout').addEventListener('scroll', () => {

        // 노트가 없거나 PDF 노트인 경우 실행하지 않음
        if (!activeNoteId || activeNoteIsPdf) return;

        // 페이지 영역의 화면상 상단 위치 확인
        const layoutTop =
            document.querySelector('.pdf-layout').getBoundingClientRect().top;

        // 화면에 표시된 일반 노트 페이지들을 배열로 가져옴
        const pages = [
            ...document.querySelectorAll('.note-paper[data-page-number]')
        ];

        // 화면 상단에 가장 가까운 페이지 찾기
        const nearest = pages.reduce((best, paper) => {

            // 각 페이지 상단과 화면 상단 사이의 거리 계산
            const distance = Math.abs(
                paper.getBoundingClientRect().top - layoutTop - 24
            );

            // 현재까지 찾은 페이지보다 더 가까운 페이지라면 교체
            return !best || distance < best.distance
                ? {
                    page: Number(paper.dataset.pageNumber),
                    distance
                }
                : best;

        }, null);

        // 가장 가까운 페이지가 존재하고 현재 페이지와 다르면 갱신
        if (nearest && nearest.page !== currentPdfPage) {

            currentPdfPage = nearest.page;

            // 판서 기능의 활성 페이지도 변경
            window.NoteDrawing.setActivePage(currentPdfPage);

            updatePageControls();
        }

    }, { passive: true });


    // 페이지 로딩이 완료되면 서버에서 노트 목록 불러오기
    loadNotes();

})();
