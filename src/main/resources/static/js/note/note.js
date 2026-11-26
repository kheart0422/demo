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
    // pdf 다운로드
    const downloadPdfButton = document.getElementById('downloadPdfBtn');
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
            paper.removeAttribute('data-image-interaction-bound'); // 첨부한 이미지 파일 삭제
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
                // NoteDrawing 전역 객체에 현재 페이지의 이미지 데이터를 설정합니다.
                window.NoteDrawing.setImages(
                    // data가 배열이면 빈 배열을 넘기고, 객체 형태라면 data.images를 전달합니다.
                    Array.isArray(data) ? [] : data.images,
                    // 이미지를 적용할 대상 페이지 번호입니다.
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
        const images = window.NoteDrawing.getImages(page);

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
                        images,

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
        // pdf 다운로드 버튼 활성화
        downloadPdfButton.disabled = false;

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

    // JPEG 이미지 배열을 받아 PDF 1.4 바이너리(Uint8Array)를 직접 생성합니다.
    function createPdfFromJpegs(images, width) {
        // 문자열을 UTF-8 바이트 배열로 변환하기 위한 인코더와 바이트 조각 저장 배열입니다.
        const encoder = new TextEncoder();
        const chunks = [];
        let byteLength = 0;

        // 문자열 또는 Uint8Array를 chunks에 추가하고 누적 바이트 길이를 갱신합니다.
        const append = value => {
            const bytes = typeof value === 'string' ? encoder.encode(value) : value;
            chunks.push(bytes);
            byteLength += bytes.length;
        };

        // PDF 교차 참조 테이블(xref)에서 사용할 객체별 시작 바이트 오프셋 배열입니다(0번은 더미).
        const offsets = [0];

        // PDF 헤더 및 이진 데이터 포함을 알리는 주석 마커를 기록합니다.
        append('%PDF-1.4\n%âãÏÓ\n');

        // 일반 PDF 객체를 기록하고 해당 객체의 바이트 오프셋을 저장합니다.
        const object = (id, body) => {
            offsets[id] = byteLength;
            append(`${id} 0 obj\n${body}\nendobj\n`);
        };

        // 각 이미지마다 페이지(3+3n), 이미지 XObject(4+3n), 콘텐츠 스트림(5+3n) ID를 할당합니다.
        const pageIds = images.map((_, index) => 3 + index * 3);

        // 1번 객체: 문서 루트 카탈로그, 2번 객체: 전체 페이지 트리 노드를 생성합니다.
        object(1, '<< /Type /Catalog /Pages 2 0 R >>');
        object(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${images.length} >>`);

        // 각 페이지 이미지를 PDF 페이지 객체, JPEG XObject, 그리기 명령 스트림으로 구성합니다.
        images.forEach((image, index) => {
            const pageId = pageIds[index];
            const imageId = pageId + 1;
            const contentId = pageId + 2;

            // 지정된 PDF 페이지 폭(width)에 맞춰 원본 비율대로 페이지 높이를 계산합니다.
            const pageHeight = width * image.height / image.width;

            // 좌표 변환 행렬(cm)로 페이지 전체 영역에 /ImN 이미지를 그리는 PDF 콘텐츠 스트림입니다.
            const content = `q\n${width} 0 0 ${pageHeight} 0 0 cm\n/Im${index + 1} Do\nQ\n`;
            const contentBytes = encoder.encode(content);

            // 페이지 객체: 크기(MediaBox), 이미지 리소스 참조, 콘텐츠 스트림을 연결합니다.
            object(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${pageHeight}] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);

            // JPEG(/DCTDecode) 원본 바이트를 담은 이미지 XObject 스트림 객체를 기록합니다.
            offsets[imageId] = byteLength;
            append(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
            append(image.bytes);
            append('\nendstream\nendobj\n');

            // 페이지 그리기 명령이 담긴 콘텐츠 스트림 객체를 기록합니다.
            offsets[contentId] = byteLength;
            append(`${contentId} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
            append(contentBytes);
            append('endstream\nendobj\n');
        });

        // 객체 위치 색인표(xref)와 트레일러, 파일 끝 마커(%%EOF)를 작성합니다.
        const xrefOffset = byteLength;
        append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
        for (let id = 1; id < offsets.length; id++) append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
        append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

        // 모든 바이트 조각을 하나의 연속된 Uint8Array로 합쳐 반환합니다.
        const result = new Uint8Array(byteLength);
        let cursor = 0;
        chunks.forEach(chunk => { result.set(chunk, cursor); cursor += chunk.length; });
        return result;
    }

// HTMLImageElement가 이미 로드되었는지 확인하고, 아니면 로드 완료 또는 오류를 기다리는 프로미스를 반환합니다.
    const waitForImage = image => image.complete && image.naturalWidth
        ? Promise.resolve()
        : new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(new Error('페이지 이미지를 불러오지 못했습니다.'));
        });

// 현재 활성 노트의 모든 페이지를 렌더링해 JPEG로 변환한 뒤 PDF 파일로 다운로드합니다.
    async function exportPdf() {
        // 활성화된 노트가 없으면 내보내기를 중단합니다.
        if (!activeNoteId) return;

        // 중복 클릭 방지를 위해 다운로드 버튼을 비활성화하고 진행 상태를 표시합니다.
        downloadPdfButton.disabled = true;
        saveState.textContent = 'PDF를 준비하는 중…';

        // 작업 완료 후 원래 보던 PDF 페이지로 복구하기 위해 현재 페이지 번호를 보관합니다.
        const restorePage = currentPdfPage;

        try {
            // 내보내기 전 현재 노트의 변경 사항을 먼저 저장합니다.
            await flushCurrentNote();

            // PDF 기반 노트인지 일반 노트인지에 따라 총 페이지 수와 기준 해상도를 설정합니다.
            const pageCount = activeNoteIsPdf ? pdfPageCount : activeNotePageCount;
            const outputWidth = 1190;
            const jpegPages = [];

            // 1페이지부터 마지막 페이지까지 순차적으로 캔버스에 그린 뒤 JPEG 바이트로 수집합니다.
            for (let page = 1; page <= pageCount; page++) {
                if (activeNoteIsPdf) {
                    // PDF 노트인 경우 해당 페이지로 전환하고 배경 이미지, 필기 스트로크, 삽입 이미지를 모두 불러옵니다.
                    currentPdfPage = page;
                    window.NoteDrawing.setPageNumber(page);
                    setPdfPageImage(page);
                    await waitForImage(document.getElementById('pdfPageImage'));
                    await loadPageStrokes(page, activeNoteId);

                    // 페이지에 포함된 이미지들의 디코딩이 끝날 때까지 대기합니다.
                    const images = window.NoteDrawing.getImages(page);
                    await Promise.all(images.map(item => {
                        const image = new Image();
                        image.src = item.dataUrl;
                        return image.decode();
                    }));

                    // 캔버스 다시 그리기 및 두 번의 requestAnimationFrame으로 렌더링 반영을 기다립니다.
                    window.NoteDrawing.redraw();
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                }

                // 현재 페이지에 해당하는 DOM 요소(.paper 또는 .note-paper)를 찾습니다.
                const paper = activeNoteIsPdf
                    ? document.getElementById('paper')
                    : document.querySelector(`.note-paper[data-page-number="${page}"]`);
                if (!paper) throw new Error(`${page}페이지를 찾을 수 없습니다.`);

                // 출력 캔버스 높이를 계산합니다(PDF 노트는 원본 비율 유지, 일반 노트는 A4 비율 근사치 1684px).
                const pdfImage = activeNoteIsPdf ? document.getElementById('pdfPageImage') : null;
                const outputHeight = activeNoteIsPdf
                    ? Math.round(outputWidth * pdfImage.naturalHeight / pdfImage.naturalWidth)
                    : 1684;

                // 오프스크린 캔버스를 생성하고 흰색 배경을 채웁니다.
                const canvas = document.createElement('canvas');
                canvas.width = outputWidth;
                canvas.height = outputHeight;
                const context = canvas.getContext('2d');
                context.fillStyle = '#fff';
                context.fillRect(0, 0, outputWidth, outputHeight);

                if (activeNoteIsPdf) {
                    // PDF 노트: 원본 PDF 페이지 이미지를 캔버스 전체에 그립니다.
                    context.drawImage(pdfImage, 0, 0, outputWidth, outputHeight);
                } else {
                    // 일반 노트: 가로 줄눈선과 왼쪽 세로 여백선을 그립니다.
                    context.strokeStyle = '#e8edf5';
                    context.lineWidth = 1;
                    for (let y = 60; y < outputHeight; y += 60) {
                        context.beginPath(); context.moveTo(0, y); context.lineTo(outputWidth, y); context.stroke();
                    }
                    context.strokeStyle = '#f1d9dc';
                    context.beginPath(); context.moveTo(94, 0); context.lineTo(94, outputHeight); context.stroke();

                    // 첫 페이지 상단에 노트 제목을 출력합니다.
                    context.fillStyle = '#202633';
                    context.font = 'bold 36px sans-serif';
                    context.fillText(page === 1 ? (document.getElementById('paperTitle').textContent || '') : '', 123, 118, outputWidth - 180);

                    // 텍스트 영역(.writing-area)의 내용을 줄바꿈 너비를 고려해 캔버스에 그립니다.
                    const text = paper.querySelector('.writing-area')?.textContent || '';
                    context.font = '20px sans-serif';
                    context.textBaseline = 'top';
                    const maxWidth = outputWidth - 210;
                    let y = 170;
                    text.split('\n').forEach(line => {
                        let row = '';
                        for (const character of line) {
                            const next = row + character;
                            if (row && context.measureText(next).width > maxWidth) {
                                context.fillText(row, 123, y); row = character; y += 60;
                            } else row = next;
                        }
                        context.fillText(row, 123, y); y += 60;
                    });
                }

                // 필기/드로잉 레이어(.ink-layer)가 있으면 배경 위에 합성합니다.
                const ink = paper.querySelector('.ink-layer');
                if (ink) context.drawImage(ink, 0, 0, outputWidth, outputHeight);

                // 완성된 페이지 캔버스를 품질 0.92의 JPEG Blob으로 변환해 바이트 배열로 저장합니다.
                const data = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
                if (!data) throw new Error('PDF 페이지 변환에 실패했습니다.');
                jpegPages.push({ width: outputWidth, height: outputHeight, bytes: new Uint8Array(await data.arrayBuffer()) });
            }

            // 수집된 JPEG 페이지들로 A4 폭(595.28pt) 기준 PDF 파일을 생성하고 브라우저 다운로드를 실행합니다.
            const pdf = createPdfFromJpegs(jpegPages, 595.28);
            const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `${(title.value.trim() || '새 노트').replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
            link.click();

            // 다운로드 트리거 후 1초 뒤 임시 Blob URL을 해제해 메모리를 정리합니다.
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            saveState.textContent = 'PDF 다운로드가 시작되었습니다';
        } catch (error) {
            // 내보내기 과정 중 오류가 발생하면 로그와 상태 메시지를 남기고 알림을 표시합니다.
            console.error('PDF 내보내기 실패', error);
            saveState.textContent = 'PDF 다운로드 실패';
            alert('PDF를 만들지 못했습니다. 저장 상태와 페이지 이미지를 확인해 주세요.');
        } finally {
            // PDF 노트였을 경우 사용자가 원래 보던 페이지 상태로 복구합니다.
            if (activeNoteIsPdf && restorePage !== currentPdfPage) {
                setPdfPageImage(restorePage);
                await loadPageStrokes(restorePage, activeNoteId);
            }
            // 노트 활성화 상태에 맞춰 다운로드 버튼 활성 여부를 복원합니다.
            downloadPdfButton.disabled = !activeNoteId;
        }
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
                downloadPdfButton.disabled = true;

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
                downloadPdfButton.disabled = true;

                updatePageControls();
            }

        } catch (error) {
            // 삭제 실패 시 버튼 다시 활성화
            deleteNoteButton.disabled = false;
            downloadPdfButton.disabled = false;

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

    // 문서 전체에 클립보드 붙여넣기 이벤트를 등록합니다.
    document.addEventListener('paste', event => {
        // 활성화된 노트가 없으면 붙여넣기 처리를 중단
        if (!activeNoteId) return;
        // 붙여넣기 발생 대상 요소를 확인하고, 입력 필드(input, textarea, select) 내부라면 기본 동작을 유지
        const target = event.target;
        if (target instanceof Element && target.closest('input, textarea, select')) return;
        // 클립보드 항목 중 이미지 타입('image/') 항목
        const clipboardItems = [...(event.clipboardData?.items || [])];
        const imageItem = clipboardItems.find(item => item.type.startsWith('image/'));
        if (!imageItem) return;
        // 클립보드 이미지 항목을 파일 객체로 변환하고, 없으면 중단합니다.
        const imageFile = imageItem.getAsFile();
        if (!imageFile) return;
        event.preventDefault();
        // 붙여넣은 위치가 특정 페이지(.paper)의 드로잉 레이어(.ink-layer) 내부인지 확인
        const targetCanvas = target instanceof Element
            ? target.closest('.paper')?.querySelector('.ink-layer')
            : null;
        // 대상 캔버스가 있으면 해당 페이지 번호를 활성 페이지로 설정합니다.
        if (targetCanvas) window.NoteDrawing.setActivePage(Number(targetCanvas.dataset.pageNumber || 1));
        // 클립보드 이미지를 노드에 추가하고, 실패 시 상태 메시지와 콘솔 에러를 출력
        window.NoteDrawing.addClipboardImage(imageFile).catch(error => {
            saveState.textContent = '이미지를 붙여넣지 못했습니다';
            console.error('클립보드 이미지 붙여넣기 실패', error);
        });
    });

    // // 노트 이미지 드래그 앤 드롭을 식별하기 위한 커스텀 MIME 타입과 페이지 래퍼 요소를 지정
    const imageDragType = 'application/x-web-note-image';
    const pageWrap = document.getElementById('pageWrap');
    // 페이지 영역 위로 드래그 중일 때의 동작을 처리합니다.
    pageWrap.addEventListener('dragover', event => {
        // 드래그 중인 데이터 타입에 커스텀 이미지 타입이 포함되어 있는지 확인
        const types = [...(event.dataTransfer?.types || [])];
        if (!types.includes(imageDragType)) return;
        // 현재 마우스가 위치한 페이지(.paper) 요소를 찾고, 없으면 중단
        const paper = event.target instanceof Element ? event.target.closest('.paper') : null;
        if (!paper) return;
        // 드롭을 허용하기 위해 기본 동작을 막고 복사 효과를 지정
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        // 드롭 대상 페이지임을 시각적으로 표시하기 위해 클래스를 추가
        paper.classList.add('note-drop-target');
    });
    // 드래그가 페이지 영역을 벗어날 때 드롭 대상 강조 스타일을 제거
    pageWrap.addEventListener('dragleave', event => {
        const paper = event.target instanceof Element ? event.target.closest('.paper') : null;
        // relatedTarget이 현재 paper 내부가 아닐 때만 강조 클래스를 제거
        if (paper && !paper.contains(event.relatedTarget)) paper.classList.remove('note-drop-target');
    });

    // 페이지 영역에 파일을 드롭했을 때의 비동기 처리
    pageWrap.addEventListener('drop', async event => {
        const transfer = event.dataTransfer;
        // 커스텀 타입 또는 'web-note-image:' 접두사가 붙은 일반 텍스트에서 파일 ID를 추출
        const customFileId = transfer?.getData(imageDragType);
        const plainText = transfer?.getData('text/plain') || '';
        const fileId = customFileId || (plainText.startsWith('web-note-image:') ? plainText.slice('web-note-image:'.length) : '');
        if (!fileId) return;
        // 드롭된 위치의 페이지 요소와 활성 노트 존재 여부를 확인합니다.
        const paper = event.target instanceof Element ? event.target.closest('.paper') : null;
        if (!paper || !activeNoteId) return;
        // 기본 드롭 동작을 막고 드롭 대상 강조 클래스를 제거
        event.preventDefault();
        paper.classList.remove('note-drop-target');
        // 대상 페이지 번호와 페이지 요소의 화면상 좌표 범위를 계산
        const canvas = paper.querySelector('.ink-layer');
        const pageNumber = Number(canvas?.dataset.pageNumber || currentPdfPage || 1);
        const bounds = paper.getBoundingClientRect();
        // 드롭된 페이지를 활성 페이지로 전환합니다.
        window.NoteDrawing.setActivePage(pageNumber);
        try {
            // 서버에서 해당 파일 ID의 이미지 리소스를 요청
            const response = await fetch(
                `${workspace.dataset.contextPath}/main/image/${encodeURIComponent(fileId)}`,
                { credentials: 'same-origin' }
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            // 응답 데이터를 Blob으로 변환하고 이미지 MIME 타입인지 검증
            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) throw new Error('파일이 이미지 형식이 아닙니다.');
            // 페이지 좌상단 기준 상대 좌표(event.clientX - bounds.left, event.clientY - bounds.top)에 이미지를 삽입
            await window.NoteDrawing.addLibraryImage(
                blob,
                pageNumber,
                event.clientX - bounds.left,
                event.clientY - bounds.top
            );
        } catch (error) {
            // 요청 실패, 잘못된 형식, 삽입 오류 발생
            saveState.textContent = '파일함 이미지를 삽입하지 못했습니다';
            console.error('파일함 이미지 드롭 실패', error);
            alert('파일함 이미지를 노트에 삽입하지 못했습니다. 이미지 파일인지 확인해 주세요.');
        }
    });

    // drawing.js에서 판서 변경 이벤트가 발생하면 자동 저장 예약
    window.addEventListener('note:drawingchange', scheduleDrawingSave);

    // 저장 버튼 클릭 시 현재 노트의 모든 변경 사항 저장
    document.getElementById('saveBtn').addEventListener('click', flushCurrentNote);

    // 현재 노트의 모든 페이지를 PDF 파일로 내려받기
    downloadPdfButton.addEventListener('click', exportPdf);

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
