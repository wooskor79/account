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

// 문서 미리보기 및 뷰어 관련 로직은 js/doc_preview.js 모듈로 분리되었습니다.



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
