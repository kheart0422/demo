
(() => {
    const paper = document.getElementById('paper');
    const canvas = document.getElementById('inkLayer');
    const ctx = canvas.getContext('2d');
    let mode = 'pen', color = '#202633', width = 3, eraserSize = 24, drawing = false, lastPoint = null;
    let strokes = [], activeStroke = null;

    function notifyChange() { window.dispatchEvent(new Event('note:drawingchange')); }

    function resizeCanvas() {
        const rect = paper.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.round(rect.width * ratio);
        canvas.height = Math.round(rect.height * ratio);
        canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        redraw();
    }
    function redraw() {
        const rect = paper.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        strokes.forEach(stroke => {
            if (!stroke.points.length) return;
            ctx.save();
            ctx.globalCompositeOperation = stroke.type === 'eraser' ? 'destination-out' : 'source-over';
            ctx.beginPath(); ctx.strokeStyle = stroke.color || '#202633'; ctx.lineWidth = stroke.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            stroke.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            if (stroke.points.length === 1) { ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y + 0.1); }
            ctx.stroke();
            ctx.restore();
        });
    }
    function pointFromEvent(event) {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top, pressure: event.pressure || 0.5 };
    }
    function startStroke(event) {
        if (mode === 'text') return;
        event.preventDefault(); canvas.setPointerCapture(event.pointerId); drawing = true; lastPoint = pointFromEvent(event);
        if (mode === 'eraser') {
            activeStroke = { type: 'eraser', width: eraserSize, points: [lastPoint] };
            strokes.push(activeStroke);
            redraw();
            return;
        }
        activeStroke = { type: 'pen', color, width, points: [lastPoint] }; strokes.push(activeStroke); redraw();
    }
    function moveStroke(event) {
        if (!drawing) return;
        const p = pointFromEvent(event);
        if (mode === 'eraser') {
            activeStroke.points.push(p);
            redraw();
            lastPoint = p;
            return;
        }
        activeStroke.points.push(p);
        ctx.beginPath(); ctx.strokeStyle = activeStroke.color; ctx.lineWidth = activeStroke.width * (0.65 + p.pressure * 0.7); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.moveTo(lastPoint.x, lastPoint.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        lastPoint = p;
    }
    function endStroke() { if (!drawing) return; drawing = false; activeStroke = null; notifyChange(); }
    canvas.addEventListener('pointerdown', startStroke);
    canvas.addEventListener('pointermove', moveStroke);
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);
    window.addEventListener('resize', resizeCanvas);
    function setMode(next) {
        mode = next; paper.classList.toggle('text-mode', mode === 'text'); paper.classList.toggle('eraser-mode', mode === 'eraser');
        document.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
        if (mode === 'text') document.getElementById('writingArea').focus();
    }
    document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
    document.querySelectorAll('.color').forEach(button => button.addEventListener('click', () => {
        color = button.dataset.color; document.querySelectorAll('.color').forEach(item => item.classList.toggle('selected', item === button));
    }));
    document.getElementById('penSize').addEventListener('input', event => { width = Number(event.target.value); document.getElementById('sizeValue').textContent = width; });
    document.getElementById('eraserSize').addEventListener('input', event => {
        eraserSize = Number(event.target.value);
        document.getElementById('eraserSizeValue').textContent = eraserSize + 'px';
    });
    document.getElementById('undoBtn').addEventListener('click', () => {
        if (strokes.length) { strokes.pop(); redraw(); notifyChange(); }
        else document.execCommand('undo');
    });
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (strokes.length && window.confirm('이 페이지의 판서를 모두 지울까요?')) { strokes = []; redraw(); notifyChange(); }
    });

    window.NoteDrawing = {
        getStrokes: () => strokes,
        setStrokes: value => { strokes = Array.isArray(value) ? value : []; redraw(); },
        clear: () => { strokes = []; redraw(); notifyChange(); },
        redraw
    };
    requestAnimationFrame(resizeCanvas);
})();
