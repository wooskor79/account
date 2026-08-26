/**
 * 전산회계 학습자료실 - 문서 미리보기 & 모달 뷰어 엔진
 * (PDF, XLSX, HWPX, HWP, TXT, 이미지 다단 뷰어 및 모달 제어)
 */

let currentPreviewWorkbook = null;
let isLandscapeMode = true;
let currentDocColumns = 3; // 기본 가로 3단 뷰

async function openDocumentPreview(fileId, encodedFilename, category) {
    const filename = decodeURIComponent(encodedFilename);
    const ext = filename.split('.').pop().toLowerCase();
    
    const modal = document.getElementById('doc-preview-modal');
    const badgeEl = document.getElementById('preview-file-badge');
    const titleEl = document.getElementById('preview-file-title');
    const downloadBtn = document.getElementById('preview-btn-download');
    const sheetTabs = document.getElementById('preview-sheet-tabs');
    const loadingEl = document.getElementById('preview-loading');
    
    const pdfFrame = document.getElementById('preview-pdf-frame');
    const imgContainer = document.getElementById('preview-img-container');
    const imgElement = document.getElementById('preview-img-element');
    const xlsxContainer = document.getElementById('preview-xlsx-container');
    const docContainer = document.getElementById('preview-doc-container');
    
    if (!modal) return;
    
    // 리셋
    badgeEl.className = 'badge-ext ' + (getFileBadge(ext).match(/badge-[a-z]+/)?.[0] || 'badge-default');
    badgeEl.textContent = ext.toUpperCase();
    titleEl.textContent = filename;
    downloadBtn.href = `?action=download&id=${fileId}&grade=${encodeURIComponent(currentGrade)}`;
    
    sheetTabs.style.display = 'none';
    sheetTabs.innerHTML = '';
    pdfFrame.style.display = 'none';
    pdfFrame.src = '';
    imgContainer.style.display = 'none';
    imgElement.src = '';
    xlsxContainer.style.display = 'none';
    xlsxContainer.innerHTML = '';
    docContainer.style.display = 'none';
    docContainer.innerHTML = '';
    
    loadingEl.style.display = 'flex';
    modal.style.display = 'flex';
    
    const streamUrl = `?action=view_file&id=${fileId}&grade=${encodeURIComponent(currentGrade)}`;
    
    try {
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
            imgElement.src = streamUrl;
            imgElement.onload = () => {
                loadingEl.style.display = 'none';
                imgContainer.style.display = 'flex';
            };
            imgElement.onerror = () => {
                loadingEl.style.display = 'none';
                docContainer.innerHTML = `<div class="p-8 text-center text-slate-500">이미지를 불러올 수 없습니다.</div>`;
                docContainer.style.display = 'block';
            };
        } else if (ext === 'pdf') {
            pdfFrame.src = streamUrl;
            loadingEl.style.display = 'none';
            pdfFrame.style.display = 'block';
        } else if (ext === 'xlsx' || ext === 'xls') {
            const res = await fetch(streamUrl);
            const arrayBuf = await res.arrayBuffer();
            renderXlsxPreview(arrayBuf);
            loadingEl.style.display = 'none';
        } else if (ext === 'hwpx') {
            const res = await fetch(streamUrl);
            const arrayBuf = await res.arrayBuffer();
            await renderHwpxPreview(arrayBuf);
            loadingEl.style.display = 'none';
        } else if (ext === 'hwp') {
            renderHwpPreview(filename, downloadBtn.href);
            loadingEl.style.display = 'none';
        } else if (ext === 'txt') {
            const res = await fetch(streamUrl);
            const text = await res.text();
            docContainer.innerHTML = `<pre class="p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-800">${escapeHtml(text)}</pre>`;
            docContainer.style.display = 'block';
            loadingEl.style.display = 'none';
        } else {
            // 기타 파일 지원 안내
            loadingEl.style.display = 'none';
            docContainer.innerHTML = `
                <div class="p-12 text-center text-slate-600">
                    <div class="text-4xl mb-3">📁</div>
                    <h4 class="font-bold text-lg text-slate-800 mb-2">${escapeHtml(filename)}</h4>
                    <p class="text-sm text-slate-500 mb-4">해당 파일은 직접 다운로드하여 열람하실 수 있습니다.</p>
                    <a href="${downloadBtn.href}" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow transition">
                        ⬇ 파일 다운로드하기
                    </a>
                </div>
            `;
            docContainer.style.display = 'block';
        }
    } catch (err) {
        console.error("미리보기 렌더링 실패:", err);
        loadingEl.style.display = 'none';
        docContainer.innerHTML = `
            <div class="p-8 text-center text-rose-500">
                <p class="font-bold">미리보기를 불러오는 중 오류가 발생했습니다.</p>
                <p class="text-xs text-slate-400 mt-1">${escapeHtml(err.message)}</p>
            </div>
        `;
        docContainer.style.display = 'block';
    }
}

function renderXlsxPreview(arrayBuffer) {
    if (typeof XLSX === 'undefined') throw new Error("XLSX 라이브러리를 찾을 수 없습니다.");
    currentPreviewWorkbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const sheetTabs = document.getElementById('preview-sheet-tabs');
    const xlsxContainer = document.getElementById('preview-xlsx-container');
    
    sheetTabs.innerHTML = '';
    sheetTabs.style.display = 'flex';
    
    // 시트 탭 표시
    currentPreviewWorkbook.SheetNames.forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.className = `sheet-tab-btn ${idx === 0 ? 'active' : ''}`;
        btn.textContent = name;
        btn.onclick = () => {
            document.querySelectorAll('.sheet-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            displayXlsxSheet(name);
        };
        sheetTabs.appendChild(btn);
    });
    
    if (currentPreviewWorkbook.SheetNames.length > 0) {
        displayXlsxSheet(currentPreviewWorkbook.SheetNames[0]);
    }
    xlsxContainer.style.display = 'block';
}

function displayXlsxSheet(sheetName) {
    if (!currentPreviewWorkbook) return;
    const xlsxContainer = document.getElementById('preview-xlsx-container');
    const sheet = currentPreviewWorkbook.Sheets[sheetName];
    
    if (!sheet || !sheet['!ref']) {
        xlsxContainer.innerHTML = `
            <div class="p-16 text-center text-slate-400">
                <div class="text-3xl mb-2">📑</div>
                <p class="font-medium text-slate-600">[${escapeHtml(sheetName)}] 시트에 작성된 데이터가 없습니다.</p>
                <p class="text-xs text-slate-400 mt-1">상단 다른 시트 탭을 클릭하여 확인해 보세요.</p>
            </div>
        `;
        return;
    }
    
    try {
        const htmlTable = XLSX.utils.sheet_to_html(sheet, { id: 'preview-excel-table', editable: false });
        xlsxContainer.innerHTML = `<div class="excel-table-scroll-wrapper">${htmlTable}</div>`;
    } catch(err) {
        console.error("시트 렌더링 에러:", err);
        xlsxContainer.innerHTML = `
            <div class="p-8 text-center text-slate-500">
                <p class="font-bold text-amber-600">해당 시트 렌더링 중 서식 호환성 문제가 발생했습니다.</p>
                <p class="text-xs text-slate-400 mt-1">${escapeHtml(err.message)}</p>
            </div>
        `;
    }
}

function setDocColumns(cols, btn) {
    currentDocColumns = cols;
    const papers = document.querySelectorAll('.doc-paper');
    
    document.querySelectorAll('.btn-col-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    papers.forEach(p => {
        p.classList.remove('doc-cols-1', 'doc-cols-2', 'doc-cols-3');
        p.classList.add(`doc-cols-${cols}`);
        if (cols > 1) {
            p.classList.remove('doc-portrait');
            p.classList.add('doc-landscape');
            isLandscapeMode = true;
        } else {
            p.classList.remove('doc-landscape');
            p.classList.add('doc-portrait');
            isLandscapeMode = false;
        }
    });
    
    const textEl = document.getElementById('orientation-text');
    if (textEl) {
        textEl.textContent = isLandscapeMode ? '세로 1단보기' : '가로 3단보기';
    }
}

function toggleDocOrientation() {
    if (isLandscapeMode) {
        const btn1 = document.querySelectorAll('.btn-col-btn')[0];
        setDocColumns(1, btn1);
    } else {
        const btn3 = document.querySelectorAll('.btn-col-btn')[2];
        setDocColumns(3, btn3);
    }
}

async function renderHwpxPreview(arrayBuffer) {
    if (typeof JSZip === 'undefined') throw new Error("JSZip 라이브러리를 찾을 수 없습니다.");
    const docContainer = document.getElementById('preview-doc-container');
    const orientBtn = document.getElementById('preview-btn-orientation');
    
    const zip = await JSZip.loadAsync(arrayBuffer);
    const sectionFiles = Object.keys(zip.files).filter(k => k.startsWith('Contents/section') && k.endsWith('.xml'));
    
    if (sectionFiles.length === 0) {
        docContainer.innerHTML = `<div class="p-8 text-center text-slate-500">HWPX 본문 데이터를 찾을 수 없습니다.</div>`;
        docContainer.style.display = 'block';
        return;
    }
    
    let htmlOutput = `<div class="hwpx-rendered-content doc-paper ${isLandscapeMode ? 'doc-landscape' : 'doc-portrait'}">`;
    
    for (const sectionPath of sectionFiles) {
        const xmlText = await zip.files[sectionPath].async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        
        const paragraphs = xmlDoc.querySelectorAll('p, hp\\:p');
        paragraphs.forEach(p => {
            const table = p.querySelector('tbl, hp\\:tbl');
            if (table) {
                let tableHtml = '<table class="hwpx-table my-3 w-full border-collapse border border-slate-300 text-sm">';
                const rows = table.querySelectorAll('tr, hp\\:tr');
                rows.forEach(tr => {
                    tableHtml += '<tr>';
                    const cells = tr.querySelectorAll('tc, hp\\:tc');
                    cells.forEach(tc => {
                        const cellText = tc.textContent || '';
                        tableHtml += `<td class="border border-slate-300 p-2 text-slate-800">${escapeHtml(cellText.trim())}</td>`;
                    });
                    tableHtml += '</tr>';
                });
                tableHtml += '</table>';
                htmlOutput += tableHtml;
            } else {
                const text = p.textContent ? p.textContent.trim() : '';
                if (text) {
                    if (text.startsWith('[') || text.startsWith('<') || text.startsWith('■') || text.startsWith('●')) {
                        htmlOutput += `<h4 class="font-bold text-slate-900 text-base sm:text-lg mt-3 mb-1">${escapeHtml(text)}</h4>`;
                    } else {
                        htmlOutput += `<p class="hwpx-p text-slate-800 leading-relaxed text-sm sm:text-base mb-1.5">${escapeHtml(text)}</p>`;
                    }
                } else {
                    htmlOutput += `<div class="h-2"></div>`;
                }
            }
        });
    }
    
    htmlOutput += '</div>';
    docContainer.innerHTML = htmlOutput;
    docContainer.style.display = 'block';
    if (orientBtn) orientBtn.style.display = 'inline-flex';
    const colControls = document.getElementById('preview-col-controls');
    if (colControls) colControls.style.display = 'inline-flex';
}

function parseHwpDecompressedSection(bytes) {
    let offset = 0;
    let paragraphs = [];
    const len = bytes.length;
    
    while (offset < len) {
        if (offset + 4 > len) break;
        
        const header = bytes[offset] | (bytes[offset+1] << 8) | (bytes[offset+2] << 16) | (bytes[offset+3] << 24);
        offset += 4;
        
        const tagId = header & 0x3FF;
        const level = (header >> 10) & 0x3FF;
        let size = (header >> 20) & 0xFFF;
        
        if (size === 0xFFF) {
            if (offset + 4 > len) break;
            size = bytes[offset] | (bytes[offset+1] << 8) | (bytes[offset+2] << 16) | (bytes[offset+3] << 24);
            offset += 4;
        }
        
        if (offset + size > len) {
            size = len - offset;
        }
        
        if (tagId === 51) {
            const recordBytes = bytes.subarray(offset, offset + size);
            let paraText = '';
            for (let i = 0; i < recordBytes.length - 1; i += 2) {
                const code = recordBytes[i] | (recordBytes[i+1] << 8);
                if (code === 0) continue;
                if (code === 10 || code === 13) {
                    paraText += '\n';
                } else if (code >= 32 && code !== 0x7F) {
                    paraText += String.fromCharCode(code);
                } else if (code >= 1 && code <= 31) {
                    if (code === 9) paraText += '    ';
                    else if (code === 11 || code === 12) paraText += '\n';
                }
            }
            if (paraText.trim()) {
                paragraphs.push(paraText.trim());
            }
        }
        
        offset += size;
    }
    
    if (paragraphs.length === 0) return '';
    
    let html = '';
    paragraphs.forEach(p => {
        const lines = p.split('\n');
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                html += '<div class="h-2"></div>';
            } else if (trimmed.startsWith('[') || trimmed.startsWith('<') || trimmed.startsWith('■') || trimmed.startsWith('●') || trimmed.startsWith('※')) {
                html += `<h4 class="font-bold text-slate-900 text-base sm:text-lg mt-4 mb-2 border-b border-slate-100 pb-1">${escapeHtml(trimmed)}</h4>`;
            } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('1.') || trimmed.startsWith('2.') || trimmed.startsWith('3.') || trimmed.startsWith('4.')) {
                html += `<p class="font-bold text-slate-800 text-sm sm:text-base pl-2 my-1 leading-relaxed">${escapeHtml(trimmed)}</p>`;
            } else if (trimmed.includes('차)') || trimmed.includes('대)')) {
                html += `<div class="bg-amber-50/70 border-l-4 border-amber-400 p-2.5 my-2 rounded-r-lg font-mono text-sm font-semibold text-slate-800 shadow-2xs">${escapeHtml(trimmed)}</div>`;
            } else {
                html += `<p class="text-slate-700 text-sm sm:text-base pl-2 my-1 leading-relaxed font-sans">${escapeHtml(trimmed)}</p>`;
            }
        });
    });
    
    return html;
}

function renderHwpPreview(filename, downloadUrl) {
    const docContainer = document.getElementById('preview-doc-container');
    const orientBtn = document.getElementById('preview-btn-orientation');
    const colControls = document.getElementById('preview-col-controls');
    
    if (orientBtn) orientBtn.style.display = 'none';
    if (colControls) colControls.style.display = 'none';
    
    docContainer.innerHTML = `
        <div class="hwp-notice-card max-w-xl mx-auto my-12 p-8 sm:p-10 bg-white rounded-2xl shadow-md border border-slate-200 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 text-3xl mb-5 shadow-inner">
                📑
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">${escapeHtml(filename)}</h3>
            <span class="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200 mb-5">한글(HWP) 구형 문서</span>
            
            <p class="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                구형 한글(HWP) 파일은 전용 서식 보호로 인해 웹 미리보기가 지원되지 않습니다.<br>
                정확한 원본 문서 서식과 표는 아래 <strong>[다운로드]</strong> 버튼을 눌러 확인해 주세요.
            </p>
            
            <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <a href="${downloadUrl}" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition text-sm">
                    ⬇ 원본 HWP 다운로드하기
                </a>
            </div>
            
            <div class="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400">
                💡 TIP: 문서를 <strong>HWPX</strong> 또는 <strong>PDF</strong>로 저장하여 업로드하시면 웹에서 바로 미리보기가 가능합니다.
            </div>
        </div>
    `;
    docContainer.style.display = 'block';
}

function closePreviewModal(e) {
    const modal = document.getElementById('doc-preview-modal');
    const pdfFrame = document.getElementById('preview-pdf-frame');
    const imgElement = document.getElementById('preview-img-element');
    const orientBtn = document.getElementById('preview-btn-orientation');
    const colControls = document.getElementById('preview-col-controls');
    if (pdfFrame) pdfFrame.src = '';
    if (imgElement) imgElement.src = '';
    if (orientBtn) orientBtn.style.display = 'none';
    if (colControls) colControls.style.display = 'none';
    if (modal) modal.style.display = 'none';
}

function openMediaModal(path, title, type) {
    openDocumentPreview(path, title, type);
}

function closeVideoModal(e) {
    closePreviewModal(e);
}

function initModalDrag() {
    const modalHeader = document.getElementById('modal-header');
    const modalContent = document.getElementById('modal-content');
    
    if (!modalHeader || !modalContent) return;
    
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;
    
    modalHeader.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = modalContent.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        modalContent.style.transform = 'none';
        modalContent.style.left = initialLeft + 'px';
        modalContent.style.top = initialTop + 'px';
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    });
    
    function onDrag(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        modalContent.style.left = (initialLeft + dx) + 'px';
        modalContent.style.top = (initialTop + dy) + 'px';
    }
    
    function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }
}
