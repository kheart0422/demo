(() => {
    const title = document.getElementById('docTitle');
    const paperTitle = document.getElementById('paperTitle');
    const writing = document.getElementById('writingArea');
    const saveState = document.getElementById('saveState');
    const storageKey = 'webnote.document.v1';
    const workspace = document.getElementById('noteWorkspace');
    const pdfId = Number(workspace.dataset.pdfId || 0);
    const pdfPageCount = Number(workspace.dataset.pdfPageCount || 0);
    let currentPdfPage = 1;
    let saveTimer;

    function showPdfPage(page) {
        if (!pdfId || page < 1 || page > pdfPageCount) return;
        currentPdfPage = page;
        const image = document.getElementById('pdfPageImage');
        image.alt = `PDF ${page}페이지`;
        image.src = `${workspace.dataset.contextPath}/note/pdf/${pdfId}/page/${page}`;
        document.getElementById('pageInfo').textContent = `${page} / ${pdfPageCount} 페이지`;
        document.querySelectorAll('.pdf-thumbnail').forEach(item => item.classList.toggle('active', Number(item.dataset.pdfPage) === page));
        document.getElementById('prevPdfPage').disabled = page === 1;
        document.getElementById('nextPdfPage').disabled = page === pdfPageCount;
    }

    if (pdfId && pdfPageCount > 0) {
        const image = document.getElementById('pdfPageImage');
        image.addEventListener('load', () => {
            document.getElementById('paper').style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
            window.dispatchEvent(new Event('resize'));
        });
        document.querySelectorAll('.pdf-thumbnail').forEach(item => item.addEventListener('click', () => showPdfPage(Number(item.dataset.pdfPage))));
        document.getElementById('prevPdfPage').addEventListener('click', () => showPdfPage(currentPdfPage - 1));
        document.getElementById('nextPdfPage').addEventListener('click', () => showPdfPage(currentPdfPage + 1));
        showPdfPage(1);
    }

    function saveDocument() {
        const data = {
            title: title.value,
            paperTitle: paperTitle.innerHTML,
            writing: writing.innerHTML,
            strokes: window.NoteDrawing.getStrokes()
        };
        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
            saveState.textContent = '저장됨';
        } catch (error) {
            saveState.textContent = '저장 공간을 사용할 수 없습니다';
        }
    }

    function scheduleSave() {
        saveState.textContent = '저장 중…';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveDocument, 450);
    }

    function loadDocument() {
        try {
            const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
            if (!data) return;
            title.value = data.title || '새 노트';
            paperTitle.innerHTML = data.paperTitle || '오늘의 노트';
            writing.innerHTML = data.writing || '';
            window.NoteDrawing.setStrokes(data.strokes);
        } catch (error) {
            localStorage.removeItem(storageKey);
        }
    }

    [title, paperTitle, writing].forEach(element => element.addEventListener('input', scheduleSave));
    window.addEventListener('note:drawingchange', scheduleSave);
    document.getElementById('saveBtn').addEventListener('click', saveDocument);
    document.getElementById('printBtn').addEventListener('click', () => window.print());

    document.querySelectorAll('#noteList .note-item[data-note-title]').forEach(item => item.addEventListener('click', () => {
        saveDocument();
        document.querySelectorAll('#noteList .note-item').forEach(note => note.classList.toggle('active', note === item));
        title.value = item.dataset.noteTitle;
        paperTitle.textContent = item.dataset.noteTitle;
        writing.textContent = item.dataset.noteContent;
        window.NoteDrawing.clear();
        saveDocument();
    }));

    document.getElementById('noteSearch').addEventListener('input', event => {
        const query = event.target.value.trim().toLocaleLowerCase();
        document.querySelectorAll('#noteList .note-item').forEach(item => {
            const label = item.dataset.noteTitle || item.querySelector('.note-item-title').textContent;
            item.hidden = !label.toLocaleLowerCase().includes(query);
        });
    });

    loadDocument();
})();
