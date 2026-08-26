let isAdmin = false;
let isPrivateMode = true;
let isSiteUnlocked = false;
let currentVideoFolder = '';
let currentGrade = localStorage.getItem('current_grade') || 'grade2';
let sectionTitles = {};

function toggleGrade() {
    switchGrade(currentGrade === 'grade2' ? 'grade1' : 'grade2');
}

async function switchGrade(grade) {
    if (grade !== 'grade1' && grade !== 'grade2') grade = 'grade2';
    currentGrade = grade;
    localStorage.setItem('current_grade', grade);
    updateGradeUI();
    await fetchSectionTitles();
    await fetchFiles();
}

function updateGradeUI() {
    const logoBadge = document.getElementById('logo-level-badge');
    const gradeBtn = document.getElementById('grade-toggle-btn');
    const quizBtn = document.getElementById('quiz-menu-btn');
    const itemsGrade2 = document.getElementById('quiz-menu-items-grade2');
    const itemsGrade1 = document.getElementById('quiz-menu-items-grade1');

    if (logoBadge) {
        logoBadge.textContent = currentGrade === 'grade1' ? '중급' : '기초';
    }
    if (gradeBtn) {
        if (currentGrade === 'grade1') {
            gradeBtn.textContent = '초급이동';
            gradeBtn.style.color = '#10b981';
        } else {
            gradeBtn.textContent = '중급이동';
            gradeBtn.style.color = 'var(--accounting-point)';
        }
    }
    if (quizBtn) {
        if (currentGrade === 'grade1') {
            quizBtn.innerHTML = '⭐ 1급문제풀이 <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
            quizBtn.style.color = '#eab308';
        } else {
            quizBtn.innerHTML = '✨ 2급문제풀이 <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
            quizBtn.style.color = 'var(--accounting-point)';
        }
    }
    if (itemsGrade2 && itemsGrade1) {
        if (currentGrade === 'grade1') {
            itemsGrade2.classList.add('hidden');
            itemsGrade1.classList.remove('hidden');
        } else {
            itemsGrade1.classList.add('hidden');
            itemsGrade2.classList.remove('hidden');
        }
    }
}

async function fetchSectionTitles() {
    try {
        const res = await fetch(`?action=section_titles_get&grade=${encodeURIComponent(currentGrade)}`);
        const data = await res.json();
        if (data.success && data.titles) {
            sectionTitles = data.titles;
            renderSectionTitles();
        }
    } catch (e) { console.error('섹션 제목 로드 실패:', e); }
}

function renderSectionTitles() {
    const categories = ['accounting', 'general', 'seohee', 'drawing', 'heera'];
    categories.forEach(cat => {
        const el = document.querySelector(`#card-title-${cat} .title-text`);
        if (el && sectionTitles[cat]) {
            el.textContent = sectionTitles[cat];
        }
    });
}

async function editSectionTitle(category) {
    const cur = sectionTitles[category] || '';
    const newTitle = prompt('수정할 섹션 제목을 입력하세요:', cur);
    if (newTitle === null || newTitle.trim() === '' || newTitle.trim() === cur) return;
    try {
        const res = await fetch('?action=section_titles_update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grade: currentGrade, category: category, title: newTitle.trim() })
        });
        if (res.ok) {
            await fetchSectionTitles();
        } else {
            alert('제목 수정 실패');
        }
    } catch (e) { console.error(e); alert('서버 통신 오류'); }
}

function initializeViews() {
    // 2단 보기 디폴트 적용 (v3 플래그)
    const hasMigratedV3 = localStorage.getItem('viewPref_migrated_v3');
    if (!hasMigratedV3) {
        localStorage.setItem('viewPref_drawing', 'view-2');
        localStorage.setItem('viewPref_seohee', 'view-2');
        localStorage.setItem('viewPref_heera', 'view-2');
        localStorage.setItem('viewPref_migrated_v3', 'true');
    }

    const categories = ['accounting', 'general', 'seohee', 'heera', 'drawing'];
    categories.forEach(cat => {
        const defaultView = (cat === 'drawing' || cat === 'seohee' || cat === 'heera') ? 'view-2' : 'view-1';
        let savedView = localStorage.getItem(`viewPref_${cat}`) || defaultView;
        
        const listEl = document.getElementById(`list-${cat}`);
        if (listEl) {
            listEl.classList.remove('view-1', 'view-2', 'view-3', 'view-icon');
            listEl.classList.add(savedView);
        }
        const btn = document.querySelector(`.card.${cat} .btn-view[data-view="${savedView}"]`);
        if (btn) {
            const controls = btn.parentElement.querySelectorAll('.btn-view');
            controls.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    });
}

function changeView(category, viewName, btnElement) {
    const listEl = document.getElementById(`list-${category}`);
    listEl.classList.remove('view-1', 'view-2', 'view-3', 'view-icon');
    listEl.classList.add(viewName);
    
    const controls = btnElement.parentElement.querySelectorAll('.btn-view');
    controls.forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    localStorage.setItem(`viewPref_${category}`, viewName);
}

window.currentViewMode = window.innerWidth <= 1024 ? 'mobile' : 'pc';

function updateViewToggleButton() {
    const btn = document.getElementById('view-toggle-btn');
    if (!btn) return;
    if (window.currentViewMode === 'pc') {
        btn.innerHTML = '📱 모바일화면';
    } else {
        btn.innerHTML = '💻 PC화면';
    }
}

function toggleViewMode() {
    window.currentViewMode = window.currentViewMode === 'pc' ? 'mobile' : 'pc';
    updateViewToggleButton();

    if (window.currentViewMode === 'pc') {
        const meta = document.querySelector("meta[name=viewport]");
        if (meta) meta.setAttribute('content', 'width=1200');
        
        document.getElementById('quiz-content-view').classList.add('hidden');
        document.getElementById('main-content-view').classList.remove('hidden');
    } else {
        const meta = document.querySelector("meta[name=viewport]");
        if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
        
        document.getElementById('main-content-view').classList.add('hidden');
        document.getElementById('quiz-content-view').classList.remove('hidden');
        
        const journal = document.getElementById('journal-quiz-container');
        const theory = document.getElementById('theory-quiz-container');
        if (journal && theory && journal.classList.contains('hidden') && theory.classList.contains('hidden')) {
            if (typeof openQuizApp === 'function') openQuizApp('journal', '2급');
        }
    }
}

async function init() {
    updateViewToggleButton();
    updateGradeUI();
    initializeViews(); 
    await checkLoginStatus();
    await fetchSectionTitles();
    await fetchFiles();
    initResizer('resizer1', 'col1-sub-grid', 'card-drawing', 'col1-wrapper');
    initResizer('resizer2', 'card-seohee', 'card-heera', 'col2-wrapper');
    initModalDrag();
    
    if (typeof fetchExcelFile === 'function') fetchExcelFile('2급_분개문제(AI).xlsx');
    if (typeof fetchTheoryExcelFile === 'function') fetchTheoryExcelFile('2급_필기문제(AI).xlsx');

    if (window.innerWidth <= 1024) {
        setTimeout(() => {
            if (typeof openQuizApp === 'function' && document.getElementById('journal-quiz-container').classList.contains('hidden') && document.getElementById('theory-quiz-container').classList.contains('hidden')) {
                openQuizApp('journal', '2급');
            }
        }, 500);
    }

}

async function checkLoginStatus() {
    try {
        const res = await fetch('?action=status');
        const data = await res.json();
        isAdmin = !!data.is_admin;
        isSiteUnlocked = !!data.is_unlocked;
        isPrivateMode = !!data.is_private;

        // 사이트 잠금 게이트 화면 동기화
        const lockGate = document.getElementById('site-lock-gate');
        if (lockGate) {
            if (isPrivateMode && !isSiteUnlocked) {
                lockGate.classList.remove('hidden');
            } else {
                lockGate.classList.add('hidden');
            }
        }

        renderLoginSection();
        toggleUploadSections();
    } catch (e) { console.error('상태 확인 실패:', e); }
}

async function unlockSite(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('gate-password-input');
    const errMsg = document.getElementById('gate-error-message');
    const submitBtn = document.getElementById('gate-submit-btn');
    if (!input) return;

    const pass = input.value;
    if (!pass) {
        if (errMsg) {
            errMsg.textContent = '❌ 비밀번호를 입력해주세요.';
            errMsg.classList.remove('hidden');
        }
        input.focus();
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '확인 중... ⏳';
    }

    try {
        const res = await fetch('?action=unlock_site', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pass })
        });
        const resData = await res.json();

        if (res.ok && resData.success) {
            isSiteUnlocked = true;
            isAdmin = !!resData.is_admin;
            isPrivateMode = !!resData.is_private;

            const lockGate = document.getElementById('site-lock-gate');
            if (lockGate) lockGate.classList.add('hidden');
            if (errMsg) errMsg.classList.add('hidden');
            input.value = '';

            renderLoginSection();
            toggleUploadSections();
            await fetchFiles();
        } else {
            if (errMsg) {
                errMsg.textContent = resData.message || '❌ 비밀번호가 올바르지 않습니다.';
                errMsg.classList.remove('hidden');
            }
            input.select();
            input.focus();
        }
    } catch (err) {
        console.error('사이트 잠금 해제 통신 오류:', err);
        if (errMsg) {
            errMsg.textContent = '❌ 서버 통신 오류가 발생했습니다.';
            errMsg.classList.remove('hidden');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '확인 및 입장 ➜';
        }
    }
}

function renderLoginSection() {
    const sec = document.getElementById('login-section');
    if (!sec) return;
    if (isAdmin) {
        const privateBtnHtml = isPrivateMode
            ? `<button class="btn btn-status-private" onclick="togglePrivateMode()" title="클릭 시 '공개' 모드로 전환됩니다.">🔒 비공개 모드</button>`
            : `<button class="btn btn-status-public" onclick="togglePrivateMode()" title="클릭 시 '비공개' 모드로 전환됩니다.">🌐 공개 모드</button>`;

        sec.innerHTML = `
            ${privateBtnHtml}
            <button class="btn btn-logout" onclick="logout()">로그아웃</button>
        `;
    } else {
        sec.innerHTML = `
            <input type="password" id="admin-pass" placeholder="관리자 비밀번호" onkeypress="if(event.key==='Enter') login()">
            <button class="btn btn-primary" onclick="login()">관리자 로그인</button>
        `;
    }
}

async function togglePrivateMode() {
    if (!isAdmin) return;
    const targetStatus = !isPrivateMode;
    const msg = targetStatus
        ? '사이트를 [비공개] 상태로 전환하시겠습니까?\n(접속 시 비밀번호를 입력해야 사이트가 보입니다.)'
        : '사이트를 [공개] 상태로 전환하시겠습니까?\n(누구나 비밀번호 없이 바로 접속할 수 있습니다.)';

    if (!confirm(msg)) return;

    try {
        const res = await fetch('?action=toggle_private', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_private: targetStatus })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            isPrivateMode = data.is_private;
            renderLoginSection();
            alert(isPrivateMode ? '🔒 사이트가 [비공개 모드]로 설정되었습니다.' : '🌐 사이트가 [공개 모드]로 설정되었습니다.');
        } else {
            alert('설정 변경에 실패했습니다: ' + (data.error || '오류'));
        }
    } catch (e) {
        console.error(e);
        alert('서버 통신 중 오류가 발생했습니다.');
    }
}

function toggleUploadSections() {
    const sections = document.querySelectorAll('.upload-section');
    sections.forEach(sec => {
        if (isAdmin) sec.classList.add('active');
        else sec.classList.remove('active');
    });
    const deleteBtns = document.querySelectorAll('.btn-delete');
    deleteBtns.forEach(btn => {
        if (isAdmin) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    const editBtns = document.querySelectorAll('.btn-edit-title');
    editBtns.forEach(btn => {
        if (isAdmin) btn.classList.remove('hidden');
        else btn.classList.add('hidden');
    });
}

async function login() {
    const pass = document.getElementById('admin-pass')?.value || '';
    if (!pass) {
        alert('비밀번호를 입력해주세요.');
        return;
    }
    const res = await fetch('?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
    });
    const resData = await res.json();
    if (res.ok && resData.success) {
        isAdmin = true;
        isSiteUnlocked = true;
        if (resData.is_private !== undefined) isPrivateMode = !!resData.is_private;

        const lockGate = document.getElementById('site-lock-gate');
        if (lockGate) lockGate.classList.add('hidden');

        renderLoginSection();
        toggleUploadSections();
        await fetchFiles();
    } else {
        alert(resData.message || '비밀번호가 올바르지 않습니다.');
    }
}

async function logout() {
    await fetch('?action=logout');
    isAdmin = false;
    // 사이트 잠금 해제 상태는 유지하여 첫 화면으로 튕기지 않고 기본 화면 표시
    renderLoginSection();
    toggleUploadSections();
    await fetchFiles();
}

function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i === 0) return bytes + ' B';
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

function getFileBadge(ext) {
    ext = (ext || '').toUpperCase();
    if (ext === 'HWP' || ext === 'HWPX') return `<span class="badge-ext badge-hwp">HWP</span>`;
    if (ext === 'PDF') return `<span class="badge-ext badge-pdf">PDF</span>`;
    if (ext === 'XLS' || ext === 'XLSX') return `<span class="badge-ext badge-xls">XLS</span>`;
    if (ext === 'ZIP' || ext === 'RAR' || ext === '7Z') return `<span class="badge-ext badge-zip">ZIP</span>`;
    if (['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(ext)) return `<span class="badge-ext badge-img">IMG</span>`;
    return `<span class="badge-ext badge-default">${escapeHtml(ext || 'FILE')}</span>`;
}

async function fetchFiles() {
    try {
        const res = await fetch(`?action=files&grade=${encodeURIComponent(currentGrade)}`);
        const files = await res.json();
        
        const categories = ['accounting', 'general', 'seohee', 'heera', 'drawing'];
        categories.forEach(cat => {
            const list = document.getElementById(`list-${cat}`);
            if (!list) return;
            list.innerHTML = '';
            
            const filtered = files.filter(f => f.category === cat);
            if (filtered.length > 0) {
                filtered.forEach(file => {
                    const li = document.createElement('li');
                    li.className = 'file-item';
                    const sizeFormatted = formatFileSize(file.size);
                    
                    const ext = file.filename.split('.').pop().toLowerCase();
                    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
                    const badgeHtml = getFileBadge(ext);
                    const encName = encodeURIComponent(file.filename);
                    
                    if (cat === 'drawing' || isImage) {
                        li.innerHTML = `
                            <div class="file-info-row">
                                ${badgeHtml}
                                <span class="file-name" onclick="openDocumentPreview('${file.id}', '${encName}', '${cat}')" title="${escapeHtml(file.filename)}">
                                    <span class="file-name-text">${escapeHtml(file.filename)}</span>
                                    <span class="file-size-tag">${sizeFormatted}</span>
                                </span>
                            </div>
                            <div class="action-container">
                                <button class="btn-view-preview" onclick="openDocumentPreview('${file.id}', '${encName}', '${cat}')" title="크게 보기">
                                    보기
                                </button>
                                <button class="btn-delete ${isAdmin ? 'active' : ''}" onclick="deleteFile('${file.id}')">삭제</button>
                            </div>
                        `;
                    } else {
                        li.innerHTML = `
                            <div class="file-info-row">
                                ${badgeHtml}
                                <a class="file-name" href="?action=download&id=${file.id}&grade=${encodeURIComponent(currentGrade)}" title="클릭하여 다운로드: ${escapeHtml(file.filename)}">
                                    <span class="file-name-text">${escapeHtml(file.filename)}</span>
                                    <span class="file-size-tag">${sizeFormatted}</span>
                                </a>
                            </div>
                            <div class="action-container">
                                <button class="btn-view-preview" onclick="openDocumentPreview('${file.id}', '${encName}', '${cat}')" title="문서 미리보기">
                                    미리보기
                                </button>
                                <a class="btn-download" href="?action=download&id=${file.id}&grade=${encodeURIComponent(currentGrade)}" title="다운로드">
                                    다운로드
                                </a>
                                <button class="btn-delete ${isAdmin ? 'active' : ''}" onclick="deleteFile('${file.id}')">삭제</button>
                            </div>
                        `;
                    }
                    list.appendChild(li);
                });
            } else {
                list.innerHTML = `<li class="empty-message">등록된 자료가 없습니다.</li>`;
            }
        });
    } catch (err) { console.error("파일 로드 실패:", err); }
}

async function fetchVideos(path = '') {
    try {
        const pathSpan = document.getElementById('current-video-path');
        const backBtn = document.getElementById('btn-back-folder');
        
        const res = await fetch(`?action=videos&path=${encodeURIComponent(path)}&grade=${encodeURIComponent(currentGrade)}`);
        const data = await res.json();
        if (data.error) return;

        currentVideoFolder = data.current_path;
        if (pathSpan) pathSpan.textContent = currentVideoFolder ? `/ ${currentVideoFolder}` : '';
        if (backBtn) backBtn.style.display = currentVideoFolder ? 'inline-flex' : 'none';

        const list = document.getElementById('list-videos');
        list.innerHTML = '';
        
        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                const li = document.createElement('li');
                li.className = 'file-item video-item';
                
                const encPath = encodeURIComponent(item.path);
                const encName = encodeURIComponent(item.name);
                if (item.type === 'folder') {
                    li.innerHTML = `
                        <div class="icon">📁</div>
                        <div class="file-info">
                            <span class="file-name" onclick="fetchVideos(decodeURIComponent('${encPath}'))">${escapeHtml(item.name)} (폴더)</span>
                        </div>
                    `;
                } else {
                    const sizeFormatted = formatFileSize(item.size);
                    li.innerHTML = `
                        <div class="icon">🎬</div>
                        <div class="file-info">
                            <span class="file-name" onclick="openMediaModal('${encPath}', '${encName}', 'video')">${escapeHtml(item.name)} (${sizeFormatted})</span>
                        </div>
                        <div class="action-container">
                            <button class="btn-delete ${isAdmin ? 'active' : ''}" onclick="deleteVideo('${encPath}')">삭제</button>
                        </div>
                    `;
                }
                list.appendChild(li);
            });
        } else {
            list.innerHTML = `<li class="empty-message">등록된 영상이 없습니다.</li>`;
        }
    } catch (err) { console.error("영상 목록 로드 실패:", err); }
}

function goBackVideoFolder() {
    if (!currentVideoFolder) return;
    const parts = currentVideoFolder.split('/');
    parts.pop();
    fetchVideos(parts.join('/'));
}

async function uploadFile(category) {
    const input = document.getElementById(`file-${category}`);
    if (!input.files[0]) { alert('파일을 선택하세요.'); return; }
    
    const file = input.files[0];
    const chunkSize = 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    // Add simple progress UI
    const progressId = `progress-${category}`;
    let progressEl = document.getElementById(progressId);
    if (!progressEl) {
        progressEl = document.createElement('div');
        progressEl.id = progressId;
        progressEl.className = 'text-xs text-indigo-600 font-bold mt-2';
        input.parentNode.appendChild(progressEl);
    }
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('filename', file.name);
        formData.append('category', category);
        formData.append('grade', currentGrade);
        formData.append('chunk_index', chunkIndex);
        formData.append('total_chunks', totalChunks);
        
        progressEl.innerText = `업로드 중... ${Math.round((chunkIndex / totalChunks) * 100)}%`;
        
        try {
            const res = await fetch('?action=upload', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) {
                throw new Error('Upload failed at chunk ' + chunkIndex);
            }
            const data = await res.json();
            if (data.complete) {
                progressEl.innerText = '업로드 완료!';
                setTimeout(() => progressEl.remove(), 2000);
                input.value = '';
                await fetchFiles();
                return;
            }
        } catch (err) {
            alert('업로드 실패: ' + err.message);
            progressEl.remove();
            return;
        }
    }
}


async function deleteFile(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const res = await fetch(`?action=delete&id=${encodeURIComponent(id)}&grade=${encodeURIComponent(currentGrade)}`);
    if (res.ok) {
        await fetchFiles();
    } else {
        alert('삭제 실패');
    }
}

async function deleteVideo(path) {
    if (!confirm('정말 동영상을 삭제하시겠습니까?')) return;
    let decodedPath = path;
    try { decodedPath = decodeURIComponent(path); } catch(e){}
    const res = await fetch(`?action=delete_video&path=${encodeURIComponent(decodedPath)}&grade=${encodeURIComponent(currentGrade)}`);
    if (res.ok) {
        await fetchVideos(currentVideoFolder);
    } else {
        alert('삭제 실패');
    }
}

let currentPreviewWorkbook = null;

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
    
    // 시트가 1개뿐이어도 깔끔하게 탭 표시
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
    
    // 첫 번째 시트 또는 내용이 있는 시트 표시
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

let isLandscapeMode = true;
let currentDocColumns = 3; // 기본 가로 3단 뷰

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
        
        const tagId = header & 0x3FF; // 10 bits
        const level = (header >> 10) & 0x3FF; // 10 bits
        let size = (header >> 20) & 0xFFF; // 12 bits
        
        if (size === 0xFFF) {
            if (offset + 4 > len) break;
            size = bytes[offset] | (bytes[offset+1] << 8) | (bytes[offset+2] << 16) | (bytes[offset+3] << 24);
            offset += 4;
        }
        
        if (offset + size > len) {
            size = len - offset;
        }
        
        // HWPTAG_PARA_TEXT (51)
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

function initResizer(resizerId, topCardId, bottomCardId, wrapperId) {
    const resizer = document.getElementById(resizerId);
    const topCard = document.getElementById(topCardId);
    const bottomCard = document.getElementById(bottomCardId);
    const wrapper = document.getElementById(wrapperId);

    if (!resizer || !topCard || !bottomCard || !wrapper) return;

    let startY = 0;
    let startTopHeight = 0;
    let startBottomHeight = 0;

    resizer.addEventListener('mousedown', (e) => {
        startY = e.clientY;
        startTopHeight = topCard.offsetHeight;
        startBottomHeight = bottomCard.offsetHeight;

        resizer.classList.add('dragging');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    });

    function onMouseMove(e) {
        const dy = e.clientY - startY;
        const totalHeight = startTopHeight + startBottomHeight;
        
        let newTopHeight = startTopHeight + dy;
        let newBottomHeight = startBottomHeight - dy;

        const minHeight = 80;
        if (newTopHeight < minHeight) { 
            newTopHeight = minHeight; 
            newBottomHeight = totalHeight - minHeight; 
        }
        if (newBottomHeight < minHeight) { 
            newBottomHeight = minHeight; 
            newTopHeight = totalHeight - minHeight; 
        }

        topCard.style.flex = `0 0 ${newTopHeight}px`;
        topCard.style.height = `${newTopHeight}px`;
        bottomCard.style.flex = `0 0 ${newBottomHeight}px`;
        bottomCard.style.height = `${newBottomHeight}px`;
    }

    function onMouseUp() {
        resizer.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

let pastedImageData = null;
document.addEventListener('paste', (e) => {
    if (!isAdmin) return;
    const item = e.clipboardData.items[0];
    if (item && item.type.startsWith('image')) {
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
            pastedImageData = event.target.result;
            document.getElementById('paste-preview').src = pastedImageData;
            document.getElementById('paste-filename').value = '';
            document.getElementById('paste-modal').style.display = 'flex';
            document.getElementById('paste-filename').focus();
        };
        reader.readAsDataURL(file);
    }
});

function cancelPaste() {
    document.getElementById('paste-modal').style.display = 'none';
    pastedImageData = null;
}

async function savePastedImage() {
    const filename = document.getElementById('paste-filename').value.trim();
    if (!filename) { alert('저장할 파일명을 입력하세요.'); return; }
    try {
        const res = await fetch('?action=upload_drawing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: pastedImageData, filename: filename, grade: currentGrade })
        });
        if (res.ok) { cancelPaste(); await fetchFiles(); }
        else alert('그림 저장 실패');
    } catch (err) { console.error(err); alert('서버 통신 오류'); }
}

window.onload = init;
