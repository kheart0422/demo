(() => {
    // 노트 페이지들을 감싸는 최상위 요소
    const paperWrap = document.getElementById('pageWrap');
    // 현재 도구 모드, 펜 색상과 굵기, 지우개 크기
    let mode = 'pen', color = '#202633', width = 3, eraserSize = 24;
    // 현재 페이지, 캔버스, 그리기 상태 및 진행 중인 획 정보
    let activePageNumber = 1, activeCanvas = null, drawing = false, lastPoint = null, activeStroke = null;
    // 페이지 번호별 캔버스 요소 관리
    const canvases = new Map();
    // 페이지 번호별 필기 데이터 관리
    const strokesByPage = new Map();
    // 페이지 번호별 붙여넣기 이미지 관리
    const imagesByPage = new Map();
    const imageCache = new Map();
    let selectedImage = null;
    let imageInteraction = null;

    // 필기 데이터가 변경되었음을 다른 스크립트에 알리는 함수
    function notifyChange(pageNumber) {
        window.dispatchEvent(new CustomEvent('note:drawingchange', { detail: { pageNumber } }));
    }

    function setImageCursor(paper, canvas, cursor) {
        const defaultCursor = mode === 'eraser' ? 'cell' : mode === 'text' ? 'text' : 'crosshair';
        paper.style.cursor = cursor || '';
        canvas.style.cursor = cursor || defaultCursor;
        paper.querySelectorAll('.writing-area').forEach(area => { area.style.cursor = cursor || ''; });
    }

    function constrainImages(pageNumber, pageWidth, pageHeight) {
        (imagesByPage.get(pageNumber) || []).forEach(item => {
            const scale = Math.min(1, pageWidth / item.width, pageHeight / item.height);
            item.width *= scale;
            item.height *= scale;
            item.x = Math.max(0, Math.min(pageWidth - item.width, item.x));
            item.y = Math.max(0, Math.min(pageHeight - item.height, item.y));
        });
    }

    // 저장된 필기 데이터를 이용해 캔버스를 다시 그리는 함수
    function redrawCanvas(canvas, pageNumber) {
        if (!canvas) return;
        // 캔버스에 그림을 그리기 위한 2D 컨텍스트 가져오기
        const ctx = canvas.getContext('2d');
        // 캔버스의 실제 화면 크기 가져오기
        const rect = canvas.getBoundingClientRect();
        // 기존 그림 지우기
        ctx.clearRect(0, 0, rect.width, rect.height);
        (imagesByPage.get(pageNumber) || []).forEach(item => {
            let image = imageCache.get(item.dataUrl);
            if (!image) {
                image = new Image();
                imageCache.set(item.dataUrl, image);
                image.onload = () => redrawCanvas(canvas, pageNumber);
                image.src = item.dataUrl;
            }
            if (image.complete && image.naturalWidth) {
                ctx.drawImage(image, item.x, item.y, item.width, item.height);
            }
        });
        // 해당 페이지에 저장된 모든 필기 데이터를 순회
        (strokesByPage.get(pageNumber) || []).forEach(stroke => {
            if (!stroke.points.length) return;
            // 해당 페이지에 저장된 모든 필기 데이터를 순회
            ctx.save();
            // 펜이면 기존 그림 위에 그리고, 지우개면 기존 그림을 지움
            ctx.globalCompositeOperation = stroke.type === 'eraser' ? 'destination-out' : 'source-over';
            // 새로운 선 그리기 시작
            ctx.beginPath();
            // 선 색상 설정
            ctx.strokeStyle = stroke.color || '#202633';
            // 선 굵기 설정
            ctx.lineWidth = stroke.width;
            // 선의 양 끝을 둥글게 설정
            ctx.lineCap = 'round';
            // 선이 연결되는 부분을 둥글게 설정
            ctx.lineJoin = 'round';
            // 첫 번째 좌표로 이동
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            // 나머지 좌표들을 연결하여 선 그리기
            stroke.points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
            // 좌표가 하나뿐인 경우에도 점이 표시되도록 짧은 선 추가
            if (stroke.points.length === 1) ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y + 0.1);
            // 실제 선 그리기
            ctx.stroke();
            // 이전 캔버스 설정 복원
            ctx.restore();
        });
        if (selectedImage?.pageNumber === pageNumber) {
            const item = (imagesByPage.get(pageNumber) || [])[selectedImage.index];
            if (item) {
                const handleSize = 10;
                ctx.save();
                ctx.strokeStyle = '#5368df';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 3]);
                ctx.strokeRect(item.x, item.y, item.width, item.height);
                ctx.setLineDash([]);
                [
                    [item.x, item.y],
                    [item.x + item.width, item.y],
                    [item.x, item.y + item.height],
                    [item.x + item.width, item.y + item.height]
                ].forEach(([x, y]) => {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
                    ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
                });
                ctx.restore();
            }
        }
    }

    // 페이지 크기에 맞춰 캔버스 크기를 조정하는 함수
    function resizeCanvas(canvas) {
        // 문서에 연결되지 않은 캔버스라면 종료
        if (!canvas.isConnected) return;
        // 캔버스를 포함하는 종이 영역의 크기 가져오기
        const rect = canvas.closest('.paper').getBoundingClientRect();
        const pageNumber = Number(canvas.dataset.pageNumber);
        constrainImages(pageNumber, rect.width, rect.height);
        // 고해상도 화면을 위한 배율 설정
        const ratio = window.devicePixelRatio || 1;
        // 캔버스 내부 해상도 설정
        canvas.width = Math.round(rect.width * ratio);
        canvas.height = Math.round(rect.height * ratio);
        // 화면에 표시되는 캔버스 크기 설정
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        // 화면 배율에 맞게 그리기 좌표 조정
        canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
        // 크기 조정 후 기존 필기 다시 그리기
        redrawCanvas(canvas, pageNumber);
    }

    // 포인터 위치를 캔버스 기준 좌표로 변환하는 함수
    function pagePoint(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        // x, y 좌표와 펜 압력 정보 반환
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            pressure: event.pressure || 0.5
        };
    }

    async function addImageBlob(blob, options = {}) {
        const pageNumber = Number(options.pageNumber ?? activePageNumber);
        const canvas = canvases.get(pageNumber);
        if (!canvas || !blob) return false;
        const bitmap = await createImageBitmap(blob);
        const paper = canvas.closest('.paper');
        const rect = paper.getBoundingClientRect();
        const fixedSize = Number(options.fixedSize || 0);
        const scale = fixedSize
            ? 1
            : Math.min(1, (rect.width * 0.6) / bitmap.width, (rect.height * 0.5) / bitmap.height);
        const width = fixedSize || Math.max(1, Math.round(bitmap.width * scale));
        const height = fixedSize || Math.max(1, Math.round(bitmap.height * scale));
        const imageCanvas = document.createElement('canvas');
        imageCanvas.width = width;
        imageCanvas.height = height;
        const context = imageCanvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, width, height);
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();

        if (!imagesByPage.has(pageNumber)) imagesByPage.set(pageNumber, []);
        const x = Number.isFinite(options.x) ? options.x - width / 2 : (rect.width - width) / 2;
        const y = Number.isFinite(options.y) ? options.y - height / 2 : (rect.height - height) / 2;
        imagesByPage.get(pageNumber).push({
            dataUrl: imageCanvas.toDataURL('image/jpeg', 0.82),
            x: Math.max(0, Math.min(rect.width - width, Math.round(x))),
            y: Math.max(0, Math.min(rect.height - height, Math.round(y))),
            width,
            height
        });
        activePageNumber = pageNumber;
        selectedImage = { pageNumber, index: imagesByPage.get(pageNumber).length - 1 };
        redrawCanvas(canvas, pageNumber);
        notifyChange(pageNumber);
        return true;
    }

    const addClipboardImage = blob => addImageBlob(blob);
    const addLibraryImage = (blob, pageNumber, x, y) => addImageBlob(blob, { pageNumber, x, y, fixedSize: 45 });

    // 캔버스를 등록하고 필기 이벤트를 연결하는 함수
    function registerCanvas(canvas) {
        // 캔버스에 지정된 페이지 번호 가져오기
        const pageNumber = Number(canvas.dataset.pageNumber || 1);
        // 페이지 번호와 캔버스 연결
        canvases.set(pageNumber, canvas);
        // 해당 페이지의 필기 데이터가 없으면 빈 배열로 초기화
        if (!strokesByPage.has(pageNumber)) strokesByPage.set(pageNumber, []);
        const paper = canvas.closest('.paper');
        if (paper.dataset.imageInteractionBound !== 'true') {
            paper.dataset.imageInteractionBound = 'true';
            paper.addEventListener('pointerdown', event => {
                const page = Number(canvas.dataset.pageNumber || 1);
                const bounds = paper.getBoundingClientRect();
                const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
                const images = imagesByPage.get(page) || [];
                let hit = null;
                for (let index = images.length - 1; index >= 0 && !hit; index--) {
                    const item = images[index];
                    const corners = [
                        ['nw', item.x, item.y], ['ne', item.x + item.width, item.y],
                        ['sw', item.x, item.y + item.height], ['se', item.x + item.width, item.y + item.height]
                    ];
                    const corner = corners.find(([, x, y]) => Math.abs(point.x - x) <= 10 && Math.abs(point.y - y) <= 10);
                    if (corner) hit = { index, action: 'resize', handle: corner[0] };
                    else if (point.x >= item.x && point.x <= item.x + item.width && point.y >= item.y && point.y <= item.y + item.height) {
                        hit = { index, action: 'move' };
                    }
                }

                activePageNumber = page;
                if (!hit) {
                    const previous = selectedImage;
                    selectedImage = null;
                    if (previous) redrawCanvas(canvases.get(previous.pageNumber), previous.pageNumber);
                    return;
                }

                event.preventDefault();
                event.stopImmediatePropagation();
                selectedImage = { pageNumber: page, index: hit.index };
                const item = images[hit.index];
                imageInteraction = {
                    pointerId: event.pointerId,
                    pageNumber: page,
                    index: hit.index,
                    action: hit.action,
                    handle: hit.handle,
                    startX: point.x,
                    startY: point.y,
                    original: { x: item.x, y: item.y, width: item.width, height: item.height }
                };
                paper.setPointerCapture(event.pointerId);
                window.NoteDrawing?.setActivePage(page);
                redrawCanvas(canvas, page);
            }, true);

            paper.addEventListener('pointermove', event => {
                if (!imageInteraction) {
                    const bounds = paper.getBoundingClientRect();
                    const x = event.clientX - bounds.left;
                    const y = event.clientY - bounds.top;
                    const images = imagesByPage.get(Number(canvas.dataset.pageNumber || 1)) || [];
                    let cursor = '';
                    for (let index = images.length - 1; index >= 0 && !cursor; index--) {
                        const item = images[index];
                        const corners = [
                            ['nwse-resize', item.x, item.y], ['nesw-resize', item.x + item.width, item.y],
                            ['nesw-resize', item.x, item.y + item.height], ['nwse-resize', item.x + item.width, item.y + item.height]
                        ];
                        const corner = corners.find(([, cx, cy]) => Math.abs(x - cx) <= 10 && Math.abs(y - cy) <= 10);
                        if (corner) cursor = corner[0];
                        else if (x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height) cursor = 'move';
                    }
                    setImageCursor(paper, canvas, cursor);
                    return;
                }
                if (event.pointerId !== imageInteraction.pointerId) return;
                event.preventDefault();
                const bounds = paper.getBoundingClientRect();
                const dx = event.clientX - bounds.left - imageInteraction.startX;
                const dy = event.clientY - bounds.top - imageInteraction.startY;
                const item = (imagesByPage.get(imageInteraction.pageNumber) || [])[imageInteraction.index];
                if (!item) return;
                const original = imageInteraction.original;
                if (imageInteraction.action === 'move') {
                    item.x = Math.max(0, Math.min(bounds.width - original.width, original.x + dx));
                    item.y = Math.max(0, Math.min(bounds.height - original.height, original.y + dy));
                } else {
                    const handle = imageInteraction.handle;
                    const sx = handle.includes('w') ? -1 : 1;
                    const sy = handle.includes('n') ? -1 : 1;
                    let factor = Math.max(40 / original.width, 1 + ((dx * sx / original.width) + (dy * sy / original.height)) / 2);
                    const maxWidth = sx < 0 ? original.x + original.width : bounds.width - original.x;
                    const maxHeight = sy < 0 ? original.y + original.height : bounds.height - original.y;
                    factor = Math.min(factor, maxWidth / original.width, maxHeight / original.height);
                    item.width = original.width * factor;
                    item.height = original.height * factor;
                    item.x = sx < 0 ? original.x + original.width - item.width : original.x;
                    item.y = sy < 0 ? original.y + original.height - item.height : original.y;
                }
                redrawCanvas(canvas, imageInteraction.pageNumber);
            }, true);

            const endImageInteraction = event => {
                if (!imageInteraction || event.pointerId !== imageInteraction.pointerId) return;
                const page = imageInteraction.pageNumber;
                imageInteraction = null;
                notifyChange(page);
            };
            paper.addEventListener('pointerup', endImageInteraction, true);
            paper.addEventListener('pointercancel', endImageInteraction, true);
            paper.addEventListener('pointerleave', () => {
                if (!imageInteraction) setImageCursor(paper, canvas, '');
            });
        }
        // 이벤트가 중복 등록되지 않은 경우에만 실행
        if (canvas.dataset.drawingBound !== 'true') {
            canvas.dataset.drawingBound = 'true';
            // 마우스나 펜을 누르면 필기 시작
            canvas.addEventListener('pointerdown', event => {
                // 텍스트 모드에서는 필기하지 않음
                if (mode === 'text') return;
                event.preventDefault();
                // 현재 페이지와 캔버스 설정
                activePageNumber = Number(canvas.dataset.pageNumber);
                activeCanvas = canvas;
                // 포인터가 캔버스 밖으로 나가도 입력 이벤트 유지
                canvas.setPointerCapture(event.pointerId);
                // 필기 시작 상태로 변경
                drawing = true;
                // 필기를 시작한 좌표 저장
                lastPoint = pagePoint(event, canvas);
                // 선택한 도구에 따라 펜 또는 지우개 데이터 생성
                activeStroke = mode === 'eraser'
                    ? { type: 'eraser', width: eraserSize, points: [lastPoint] }
                    : { type: 'pen', color, width, points: [lastPoint] };
                // 현재 페이지의 필기 목록에 새로운 획 추가
                strokesByPage.get(activePageNumber).push(activeStroke);
                // 캔버스 갱신
                redrawCanvas(canvas, activePageNumber);
                // 필기 변경 이벤트 전달
                notifyChange(activePageNumber);
            });
            // 마우스나 펜을 움직이면 필기 좌표 추가
            canvas.addEventListener('pointermove', event => {
                // 필기 중이 아니거나 현재 캔버스가 아니면 종료
                if (!drawing || activeCanvas !== canvas) return;
                // 현재 포인터 좌표 가져오기
                const point = pagePoint(event, canvas);
                // 현재 필기 데이터에 좌표 추가
                activeStroke.points.push(point);
                // 펜 모드인 경우
                if (mode !== 'eraser') {
                    const ctx = canvas.getContext('2d');
                    // 선 그리기 시작
                    ctx.beginPath();
                    // 펜 색상 설정
                    ctx.strokeStyle = activeStroke.color;
                    // 펜 압력에 따라 선 굵기 조절
                    ctx.lineWidth = activeStroke.width * (0.65 + point.pressure * 0.7);
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    // 이전 좌표에서 현재 좌표까지 선 연결
                    ctx.moveTo(lastPoint.x, lastPoint.y);
                    ctx.lineTo(point.x, point.y);
                    // 선 그리기
                    ctx.stroke();
                } else {
                    // 지우개 모드라면 캔버스 다시 그리기
                    redrawCanvas(canvas, Number(canvas.dataset.pageNumber));
                }
                // 현재 좌표를 다음 선의 시작점으로 저장
                lastPoint = point;
            });
            // 필기가 끝났을 때 실행하는 함수
            const endStroke = () => {
                if (!drawing || activeCanvas !== canvas) return;
                // 필기 종료
                drawing = false;
                // 진행 중인 필기 데이터 초기화
                activeStroke = null;
                // 변경 이벤트 전달
                notifyChange(Number(canvas.dataset.pageNumber));
            };
            // 포인터를 놓으면 필기 종료
            canvas.addEventListener('pointerup', endStroke);
            // 포인터 입력이 취소되어도 필기 종료
            canvas.addEventListener('pointercancel', endStroke);
        }
        // 캔버스 크기 조정
        resizeCanvas(canvas);
    }

    // 펜, 지우개, 텍스트 모드를 변경하는 함수
    function setMode(next) {
        mode = next;
        // 모든 페이지에 현재 도구에 맞는 CSS 클래스 적용
        document.querySelectorAll('.paper').forEach(paper => {
            paper.classList.toggle('text-mode', mode === 'text');
            paper.classList.toggle('eraser-mode', mode === 'eraser');
        });
        // 선택된 도구 버튼에 활성화 표시
        document.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
        // 텍스트 모드라면 현재 페이지의 입력 영역에 포커스
        if (mode === 'text') document.querySelector(`.writing-area[data-page-number="${activePageNumber}"]`)?.focus();
    }

    // 도구 버튼 클릭 시 해당 모드로 변경
    document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
    // 색상 버튼 클릭 시 펜 색상 변경
    document.querySelectorAll('.color').forEach(button => button.addEventListener('click', () => {
        color = button.dataset.color;
        // 선택한 색상 버튼에 선택 표시
        document.querySelectorAll('.color').forEach(item => item.classList.toggle('selected', item === button));
    }));
    // 펜 굵기 조절
    document.getElementById('penSize').addEventListener('input', event => {
        width = Number(event.target.value);
        // 화면에 현재 펜 굵기 표시
        document.getElementById('sizeValue').textContent = width;
    });
    // 지우개 크기 조절
    document.getElementById('eraserSize').addEventListener('input', event => {
        eraserSize = Number(event.target.value);
        // 화면에 현재 지우개 크기 표시
        document.getElementById('eraserSizeValue').textContent = `${eraserSize}px`;
    });
    // 실행 취소 버튼
    document.getElementById('undoBtn').addEventListener('click', () => {
        // 현재 페이지의 필기 목록 가져오기
        const strokes = strokesByPage.get(activePageNumber) || [];
        if (strokes.length) {
            // 가장 최근에 그린 획 삭제
            strokes.pop();
            // 삭제된 결과를 캔버스에 반영
            redrawCanvas(canvases.get(activePageNumber), activePageNumber);
            notifyChange(activePageNumber);
        } else {
            // 필기 데이터가 없다면 브라우저 기본 실행 취소 실행
            document.execCommand('undo');
        }
    });
    // 전체 지우기 버튼
    document.getElementById('clearBtn').addEventListener('click', () => {
        const strokes = strokesByPage.get(activePageNumber) || [];
        // 필기 데이터가 있고 사용자가 확인한 경우에만 삭제
        if (strokes.length && window.confirm('이 페이지의 판서를 모두 지울까요?')) {
            // 현재 페이지의 필기 데이터 초기화
            strokesByPage.set(activePageNumber, []);
            // 캔버스 다시 그리기
            redrawCanvas(canvases.get(activePageNumber), activePageNumber);
            notifyChange(activePageNumber);
        }
    });

    document.addEventListener('keydown', event => {
        if (!selectedImage || (event.key !== 'Delete' && event.key !== 'Backspace')) return;
        if (event.target instanceof Element && event.target.closest('input, textarea, select')) return;
        const { pageNumber, index } = selectedImage;
        const images = imagesByPage.get(pageNumber) || [];
        if (!images[index]) return;
        event.preventDefault();
        images.splice(index, 1);
        selectedImage = null;
        redrawCanvas(canvases.get(pageNumber), pageNumber);
        notifyChange(pageNumber);
    });

    // 브라우저 창 크기가 변경되면 모든 캔버스 크기 조정
    window.addEventListener('resize', () => canvases.forEach(resizeCanvas));
    // 다른 JavaScript 파일에서도 사용할 수 있도록 NoteDrawing 객체 공개
    window.NoteDrawing = {
        // 페이지 정보와 필기 데이터를 초기화하고 캔버스 재등록
        resetPages: () => {
            canvases.clear();
            strokesByPage.clear();
            imagesByPage.clear();
            selectedImage = null;
            imageInteraction = null;
            // 활성 페이지를 1페이지로 초기화
            activePageNumber = 1;
            // 모든 필기 캔버스 등록
            paperWrap.querySelectorAll('.ink-layer').forEach(registerCanvas);
            // 현재 도구 모드 다시 적용
            setMode(mode);
        },
        // 외부에서 캔버스를 등록할 수 있도록 공개
        registerCanvas,
        // 현재 캔버스의 페이지 번호 변경
        setPageNumber: pageNumber => {
            const canvas = canvases.get(activePageNumber)
                || (canvases.size === 1 ? canvases.values().next().value : null);
            selectedImage = null;
            imageInteraction = null;
            if (canvas) {
                for (const [registeredPage, registeredCanvas] of canvases) {
                    if (registeredCanvas === canvas) canvases.delete(registeredPage);
                }
                // 캔버스의 페이지 번호 변경
                canvas.dataset.pageNumber = String(pageNumber);
                // 새로운 페이지 번호로 캔버스 등록
                canvases.set(pageNumber, canvas);
            }
            // 해당 페이지의 필기 데이터가 없으면 초기화
            if (!strokesByPage.has(pageNumber)) strokesByPage.set(pageNumber, []);
            activePageNumber = pageNumber;
            // 해당 페이지의 필기 데이터 다시 표시
            if (canvas) redrawCanvas(canvas, pageNumber);
        },
        // 등록된 페이지라면 해당 페이지를 활성 페이지로 변경
        setActivePage: pageNumber => { if (canvases.has(pageNumber)) activePageNumber = pageNumber; },
        // 지정한 페이지의 필기 데이터 반환
        // 페이지 번호를 생략하면 현재 페이지의 데이터 반환
        getStrokes: pageNumber => strokesByPage.get(pageNumber ?? activePageNumber) || [],
        getImages: pageNumber => imagesByPage.get(pageNumber ?? activePageNumber) || [],
        // 필기 데이터가 등록된 페이지 번호 목록 반환
        getPageNumbers: () => [...strokesByPage.keys()],
        // 외부에서 전달받은 필기 데이터로 페이지 데이터 교체
        setStrokes: (value, pageNumber = activePageNumber) => {
            // 전달값이 배열이면 저장하고, 아니면 빈 배열 저장
            strokesByPage.set(pageNumber, Array.isArray(value) ? value : []);
            const canvas = canvases.get(pageNumber);
            // 변경된 필기 데이터를 캔버스에 반영
            if (canvas) redrawCanvas(canvas, pageNumber);
        },
        setImages: (value, pageNumber = activePageNumber) => {
            imagesByPage.set(pageNumber, Array.isArray(value) ? value : []);
            if (selectedImage?.pageNumber === pageNumber) selectedImage = null;
            const canvas = canvases.get(pageNumber);
            if (canvas) {
                const bounds = canvas.closest('.paper').getBoundingClientRect();
                constrainImages(pageNumber, bounds.width, bounds.height);
            }
            if (canvas) redrawCanvas(canvas, pageNumber);
        },
        addClipboardImage,
        addLibraryImage,
        // 지정한 페이지의 필기 데이터 전체 삭제
        // 페이지 번호를 생략하면 현재 페이지 삭제
        clear: (pageNumber = activePageNumber) => {
            strokesByPage.set(pageNumber, []);
            const canvas = canvases.get(pageNumber);
            if (canvas) redrawCanvas(canvas, pageNumber);
            notifyChange(pageNumber);
        },
        // 모든 페이지의 필기 데이터를 전체 삭제
        clearAll: () => {
            selectedImage = null;
            imageInteraction = null;
            strokesByPage.forEach((_, pageNumber) => {
                strokesByPage.set(pageNumber, []);
                imagesByPage.set(pageNumber, []);
                redrawCanvas(canvases.get(pageNumber), pageNumber);
            });
        },
        // 등록된 모든 페이지의 필기 데이터를 캔버스에 다시 표시
        redraw: () => canvases.forEach((canvas, pageNumber) => redrawCanvas(canvas, pageNumber))
    };

    // 브라우저의 다음 화면 갱신 시점에 페이지와 캔버스 초기화
    requestAnimationFrame(() => window.NoteDrawing.resetPages());
})();
