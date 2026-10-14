(() => {
    const title = document.getElementById('docTitle');
    const paperTitle = document.getElementById('paperTitle');
    const writing = document.getElementById('writingArea');
    const saveState = document.getElementById('saveState');
    const storageKey = 'webnote.document.v1';
    let saveTimer;

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

    document.querySelectorAll('#noteList .note-item').forEach(item => item.addEventListener('click', () => {
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
            item.hidden = !item.dataset.noteTitle.toLocaleLowerCase().includes(query);
        });
    });

    loadDocument();
})();
