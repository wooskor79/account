let isAdmin = false;
let isPrivateMode = true;
let isSiteUnlocked = false;
let currentVideoFolder = '';
let currentGrade = localStorage.getItem('current_grade') || 'grade2';
let sectionTitles = {};

// --- 커스텀 모달 UI 엔진 (alert, confirm 등) ---
const CustomModal = (function() {
    function init() {
        if (document.getElementById('custom-modal-overlay')) return;
        const html = `
            <div id="custom-modal-overlay" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999999] hidden flex items-center justify-center p-4 transition-opacity opacity-0">
                <div id="custom-modal-box" class="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full transform scale-95 transition-all text-center">
                    <div id="custom-modal-icon" class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner"></div>
                    <h3 id="custom-modal-title" class="text-xl font-bold text-slate-800 mb-2">알림</h3>
                    <div id="custom-modal-msg" class="text-sm text-slate-600 mb-6 whitespace-pre-wrap leading-relaxed"></div>
                    <div id="custom-modal-input-container" class="hidden mb-6">
                        <input type="text" id="custom-modal-input" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-center" placeholder="">
                    </div>
                    <div id="custom-modal-buttons" class="flex gap-2 justify-center"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }
    
    function show({ title, msg, icon, iconBg, type = 'alert', inputPlaceholder = '', onConfirm, onCancel }) {
        init();
        const overlay = document.getElementById('custom-modal-overlay');
        const box = document.getElementById('custom-modal-box');
        const titleEl = document.getElementById('custom-modal-title');
        const msgEl = document.getElementById('custom-modal-msg');
        const iconEl = document.getElementById('custom-modal-icon');
        const inputContainer = document.getElementById('custom-modal-input-container');
        const inputEl = document.getElementById('custom-modal-input');
        const btnContainer = document.getElementById('custom-modal-buttons');
        
        titleEl.textContent = title || '알림';
        msgEl.textContent = msg || '';
        iconEl.innerHTML = icon || '💡';
        iconEl.className = `w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner ${iconBg || 'bg-blue-50 text-blue-500'}`;
        
        inputContainer.classList.add('hidden');
        inputEl.value = '';
        btnContainer.innerHTML = '';
        
        const close = (result = null) => {
            overlay.classList.remove('opacity-100');
            box.classList.remove('scale-100');
            box.classList.add('scale-95');
            setTimeout(() => { overlay.classList.add('hidden'); }, 200);
            if (result !== null && onConfirm) onConfirm(result);
            else if (result === null && onCancel) onCancel();
        };

        if (type === 'alert') {
            const btn = document.createElement('button');
            btn.className = 'flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition';
            btn.textContent = '확인';
            btn.onclick = () => close(true);
            btnContainer.appendChild(btn);
        } else if (type === 'confirm' || type === 'prompt') {
            const btnCancel = document.createElement('button');
            btnCancel.className = 'flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition';
            btnCancel.textContent = '취소';
            btnCancel.onclick = () => close(null);
            
            const btnConfirm = document.createElement('button');
            btnConfirm.className = 'flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition';
            btnConfirm.textContent = '확인';
            
            if (type === 'prompt') {
                inputContainer.classList.remove('hidden');
                inputEl.placeholder = inputPlaceholder;
                inputEl.focus();
                btnConfirm.onclick = () => close(inputEl.value);
            } else {
                btnConfirm.onclick = () => close(true);
            }
            
            btnContainer.appendChild(btnCancel);
            btnContainer.appendChild(btnConfirm);
        }
        
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.add('opacity-100');
            box.classList.remove('scale-95');
            box.classList.add('scale-100');
            if(type === 'prompt') inputEl.focus();
        }, 10);
    }

    return {
        alert: (msg, title="알림") => new Promise(res => show({ msg, title, type: 'alert', onConfirm: res, onCancel: res })),
        confirm: (msg, title="확인") => new Promise(res => show({ msg, title, icon: '❓', iconBg: 'bg-amber-50 text-amber-500', type: 'confirm', onConfirm: () => res(true), onCancel: () => res(false) })),
        prompt: (msg, title="입력", placeholder="") => new Promise(res => show({ msg, title, icon: '✏️', iconBg: 'bg-emerald-50 text-emerald-500', type: 'prompt', inputPlaceholder: placeholder, onConfirm: res, onCancel: () => res(null) }))
    };
})();

// 기본 alert, confirm 오버라이딩(주의: async 처리위해 await 필요)
window.showAlert = CustomModal.alert;
window.showConfirm = CustomModal.confirm;
window.showPrompt = CustomModal.prompt;
// ----------------------------------------------------


function toggleGrade() {
    switchGrade(currentGrade === 'grade2' ? 'grade1' : 'grade2');
}

async function switchGrade(grade) {
    if (grade !== 'grade1' && grade !== 'grade2') grade = 'grade2';
    currentGrade = grade;
    localStorage.setItem('current_grade', grade);

    // 만약 초급이동(grade2)을 눌렀는데 1급 맞춤학습이 켜져있다면 메인으로 전환
    if (grade === 'grade2' && document.body.classList.contains('learning-app-active')) {
        closeLearningCourseApp();
    }

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

    const learningBtn = document.getElementById('learning-course-nav-btn');

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
    if (learningBtn) {
        if (currentGrade === 'grade1') {
            learningBtn.classList.remove('hidden');
        } else {
            learningBtn.classList.add('hidden');
        }
    }
    if (quizBtn) {
        if (currentGrade === 'grade1') {
            quizBtn.innerHTML = '⭐ <span id="quiz-menu-text">1급문제풀이</span> <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
            quizBtn.style.color = '#eab308';
        } else {
            quizBtn.innerHTML = '✨ <span id="quiz-menu-text">2급문제풀이</span> <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
            quizBtn.style.color = 'var(--accounting-point)';
        }
    }
    const videoBtn = document.getElementById('video-menu-btn');
    const videoBtnText = document.getElementById('video-btn-text');
    if (videoBtnText) {
        videoBtnText.textContent = currentGrade === 'grade1' ? '1급영상보기' : '2급영상보기';
    }
    if (videoBtn) {
        videoBtn.style.color = currentGrade === 'grade1' ? '#3b82f6' : '#6366f1';
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
    if (typeof updateModalCategoryOptions === 'function') {
        updateModalCategoryOptions();
    }
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

let isAppInitialized = false;

function loadMainAppData() {
    if (isAppInitialized) return;
    isAppInitialized = true;
    
    // 메인 스레드 부담을 없애기 위해 50ms 후 비동기 로드
    setTimeout(async () => {
        try {
            await fetchSectionTitles();
            await fetchFiles();
            setupCardDragAndDrop();
            
            // 엑셀 프리페치는 300ms 후 여유 있을 때 백그라운드에서 로드
            setTimeout(() => {
                if (typeof fetchExcelFile === 'function') fetchExcelFile('2급_기출문제_분개.xlsx');
                if (typeof fetchTheoryExcelFile === 'function') fetchTheoryExcelFile('2급_기출문제_필기.xlsx');
            }, 300);
        } catch(e) {
            console.error('loadMainAppData error:', e);
        }
    }, 50);
}
window.loadMainAppData = loadMainAppData;

async function init() {
    updateViewToggleButton();
    updateGradeUI();
    initializeViews(); 
    await checkLoginStatus();
    // 페이지 로드/새로고침 시 PHP 세션에서 로그인 상태 복원
    await restoreSessionFromServer();
    if (localStorage.getItem('active_view') === 'learning') {
        openLearningCourseApp();
    }
    
    // 로그인된 상태인지 확인 (관리자 또는 일반 회원)
    const hasLoggedIn = !!(isCurrentAdminCheck() || window.sessionStorage.getItem('learning_username') || (window.currentUser && window.currentUser.username));
    
    // 15분 idle 자동 로그아웃 타이머 시작
    startIdleTimer();
    initResizer('resizer1', 'col1-sub-grid', 'card-drawing', 'col1-wrapper');
    initResizer('resizer2', 'card-seohee', 'card-heera', 'col2-wrapper');
    initModalDrag();

    if (hasLoggedIn) {
        // 이미 로그인된 사용자는 백그라운드에서 부드럽게 데이터 로드
        loadMainAppData();
    }
    // 비로그인 상태(게이트 표시 중)일 때는 무거운 엑셀 다운로드 및 파일 조회를 지연하여 아이디 타이핑 렉 방지

    if (window.innerWidth <= 1024) {
        setTimeout(() => {
            if (typeof openQuizApp === 'function' && document.getElementById('journal-quiz-container').classList.contains('hidden') && document.getElementById('theory-quiz-container').classList.contains('hidden')) {
                openQuizApp('journal', '2급');
            }
        }, 500);
    }
}

function setupCardDragAndDrop() {
    const categories = ['accounting', 'general', 'drawing', 'seohee', 'heera'];
    categories.forEach(cat => {
        const card = document.getElementById(`card-${cat}`);
        if (!card) return;

        ['dragenter', 'dragover'].forEach(eventName => {
            card.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                card.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            card.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                card.classList.remove('drag-over');
            }, false);
        });

        card.addEventListener('drop', async (e) => {
            const dt = e.dataTransfer;
            const files = dt ? dt.files : null;
            if (files && files.length > 0) {
                await uploadDroppedFiles(Array.from(files), cat);
            }
        }, false);
    });
}

async function uploadDroppedFiles(files, category) {
    if (!isAdmin && !isCurrentAdminCheck()) {
        alert('자료 업로드는 관리자 권한이 필요합니다.');
        return;
    }
    
    if (typeof window.showAlert === 'function') {
        window.showAlert(`총 ${files.length}개 파일 업로드를 시작합니다...`, '업로드 시작');
    }
    
    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const chunkSize = 5 * 1024 * 1024;
            const totalChunks = Math.ceil(file.size / chunkSize);
            
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
                
                const res = await fetch(`?action=upload&grade=${encodeURIComponent(currentGrade)}`, {
                    method: 'POST',
                    body: formData
                });
                if (!res.ok) throw new Error(`${file.name} 업로드 실패 (HTTP ${res.status})`);
            }
        }
        await fetchFiles();
        if (typeof window.showAlert === 'function') {
            window.showAlert(`🎉 파일이 성공적으로 업로드되었습니다! (${files.length}건)`, '업로드 성공');
        } else {
            alert(`🎉 파일 업로드 완료 (${files.length}건)`);
        }
    } catch (err) {
        console.error(err);
        alert('업로드 오류: ' + err.message);
    }
}

async function checkLoginStatus() {
    try {
        const res = await fetch('?action=status');
        const data = await res.json();
        if (data.is_admin) isAdmin = true;
        isSiteUnlocked = !!data.is_unlocked;
        isPrivateMode = !!data.is_private;

        // 사이트 잠금 게이트 화면 동기화
        const lockGate = document.getElementById('site-lock-gate');
        const hasLocalUser = isCurrentAdminCheck() || !!window.sessionStorage.getItem('learning_username');
        
        if (lockGate) {
            if (!hasLocalUser) {
                // 비로그인 상태는 무조건 로그인 게이트 표시
                lockGate.classList.remove('hidden');
                lockGate.style.display = 'flex';
                const closeBtn = document.getElementById('site-lock-close-btn');
                if (closeBtn) closeBtn.classList.add('hidden');
                if (window.AuthEngine && typeof window.AuthEngine.switchTab === 'function') {
                    window.AuthEngine.switchTab('login');
                }
            } else {
                lockGate.classList.add('hidden');
                lockGate.style.display = 'none';
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

function isCurrentAdminCheck() {
    if (isAdmin) return true;
    if (window.currentUser && (window.currentUser.is_admin || window.currentUser.username === '이우성' || window.currentUser.username === 'admin')) return true;
    const sessUser = window.sessionStorage.getItem('learning_username');
    if (sessUser === '이우성' || sessUser === 'admin') return true;
    try {
        const raw = localStorage.getItem('learning_user_info');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.is_admin || parsed.username === '이우성' || parsed.username === 'admin')) return true;
        }
    } catch(e) {}
    return false;
}

function openSiteLoginModal(tab = 'login') {
    const gate = document.getElementById('site-lock-gate');
    if (gate) {
        gate.classList.remove('hidden');
        gate.style.display = 'flex';
        const closeBtn = document.getElementById('site-lock-close-btn');
        if (closeBtn) closeBtn.classList.remove('hidden');
    }
    if (window.AuthEngine && typeof window.AuthEngine.switchTab === 'function') {
        window.AuthEngine.switchTab(tab);
    }
}

function closeSiteLoginModal() {
    const gate = document.getElementById('site-lock-gate');
    if (gate) {
        gate.classList.add('hidden');
        gate.style.display = 'none';
    }
}

let modalUploadGrade = 'grade2';

function createAdminUploadModalElement() {
    if (document.getElementById('admin-upload-modal')) return;
    const div = document.createElement('div');
    div.id = 'admin-upload-modal';
    div.className = 'fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs px-4 hidden';
    div.innerHTML = `
        <div class="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-w-md w-full border border-slate-100 transition-all">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">📁</span>
                    <div>
                        <h3 class="text-lg font-bold text-slate-800">자료 올리기 (업로드)</h3>
                        <p class="text-[11px] text-slate-400">급수와 카테고리를 확인 후 업로드하세요</p>
                    </div>
                </div>
                <button type="button" onclick="closeAdminUploadModal()" class="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1 leading-none">&times;</button>
            </div>
            <div class="space-y-4 text-left">
                <!-- 급수 선택 탭 (초급 2급 / 중급 1급) -->
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span>🎯 자료실 구분 (급수 선택)</span>
                        <span id="modal-grade-indicator" class="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">초급(2급) 선택됨</span>
                    </label>
                    <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                        <button type="button" id="modal-grade-btn-grade2" onclick="setModalUploadGrade('grade2')" class="py-2.5 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs bg-white text-blue-600 border border-blue-200">
                            <span>🌱</span> 초급 (2급) 자료실
                        </button>
                        <button type="button" id="modal-grade-btn-grade1" onclick="setModalUploadGrade('grade1')" class="py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700">
                            <span>🌿</span> 중급 (1급) 자료실
                        </button>
                    </div>
                </div>

                <!-- 올릴 카테고리 선택 (사용자가 수정한 최신 이름 반영) -->
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>📂 올릴 카테고리 (수정한 섹션명 반영)</span>
                        <span class="text-[10px] text-slate-400">✏️ 수정한 제목 실시간 동기화</span>
                    </label>
                    <select id="admin-upload-category" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm">
                        <!-- updateModalCategoryOptions() 로 동적 생성 -->
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">업로드할 파일 선택 (다중 선택 가능)</label>
                    <input type="file" id="admin-upload-files" multiple class="w-full text-xs text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50">
                    <p class="text-[11px] text-slate-400 mt-1">💡 PDF, 한글(HWP/HWPX), 엑셀, 이미지 등 모든 학습자료 업로드 지원</p>
                </div>
                <div id="admin-upload-status" class="text-xs mt-2 hidden font-bold text-center"></div>
                <div class="flex gap-2 pt-2">
                    <button type="button" onclick="closeAdminUploadModal()" class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs sm:text-sm font-bold rounded-xl transition">
                        닫기
                    </button>
                    <button type="button" id="admin-upload-submit-btn" onclick="submitAdminUpload()" class="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5">
                        <span>📤</span> 업로드 시작
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
    div.addEventListener('click', (e) => {
        if (e.target === div) closeAdminUploadModal();
    });
}

function setModalUploadGrade(grade, keepCategory = null) {
    modalUploadGrade = (grade === 'grade1') ? 'grade1' : 'grade2';
    const btn2 = document.getElementById('modal-grade-btn-grade2');
    const btn1 = document.getElementById('modal-grade-btn-grade1');
    const indicator = document.getElementById('modal-grade-indicator');
    
    if (btn2 && btn1) {
        if (modalUploadGrade === 'grade2') {
            btn2.className = 'py-2.5 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs bg-white text-blue-600 border border-blue-200';
            btn1.className = 'py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 border border-transparent';
            if (indicator) {
                indicator.textContent = '초급(2급) 선택됨';
                indicator.className = 'text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full';
            }
        } else {
            btn1.className = 'py-2.5 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs bg-white text-indigo-600 border border-indigo-200';
            btn2.className = 'py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 border border-transparent';
            if (indicator) {
                indicator.textContent = '중급(1급) 선택됨';
                indicator.className = 'text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full';
            }
        }
    }
    updateModalCategoryOptions(keepCategory);
}

function updateModalCategoryOptions(preferredCategory = null) {
    const catSelect = document.getElementById('admin-upload-category');
    if (!catSelect) return;
    
    const currentCat = preferredCategory || catSelect.value || 'accounting';
    const titles = (sectionTitles && sectionTitles[modalUploadGrade]) ? sectionTitles[modalUploadGrade] : {};
    
    const catConfigs = [
        { key: 'accounting', icon: '📘', defaultTitle: '전산회계 자료' },
        { key: 'general', icon: '📁', defaultTitle: '일반 자료' },
        { key: 'drawing', icon: '🎨', defaultTitle: '그림 자료' },
        { key: 'seohee', icon: '👩‍🏫', defaultTitle: modalUploadGrade === 'grade1' ? '1급 전용자료' : '이서희선생님 자료' },
        { key: 'heera', icon: '👨‍🏫', defaultTitle: modalUploadGrade === 'grade1' ? '1급 심화자료' : '우승현선생님 자료 (희라쌤자료)' }
    ];
    
    catSelect.innerHTML = catConfigs.map(c => {
        const title = (titles[c.key] && titles[c.key].trim() !== '') ? titles[c.key] : c.defaultTitle;
        const selected = (c.key === currentCat) ? 'selected' : '';
        return `<option value="${c.key}" ${selected}>${c.icon} ${title}</option>`;
    }).join('');
}

function openAdminUploadModal(defaultCategory = 'accounting', targetGrade = null) {
    let modal = document.getElementById('admin-upload-modal');
    if (!modal) {
        createAdminUploadModalElement();
        modal = document.getElementById('admin-upload-modal');
    }
    if (modal) {
        const gradeToUse = targetGrade || currentGrade || 'grade2';
        setModalUploadGrade(gradeToUse, defaultCategory);
        
        const fileInput = document.getElementById('admin-upload-files');
        if (fileInput) fileInput.value = '';
        const statusEl = document.getElementById('admin-upload-status');
        if (statusEl) { statusEl.innerText = ''; statusEl.className = 'text-xs mt-2 hidden font-bold text-center'; }
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function closeAdminUploadModal() {
    const modal = document.getElementById('admin-upload-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

async function submitAdminUpload() {
    const catSelect = document.getElementById('admin-upload-category');
    const fileInput = document.getElementById('admin-upload-files');
    const statusEl = document.getElementById('admin-upload-status');
    const submitBtn = document.getElementById('admin-upload-submit-btn');
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('업로드할 파일을 선택해주세요.');
        return;
    }
    
    const category = catSelect.value;
    const files = Array.from(fileInput.files);
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '업로드 진행 중... ⏳';
    statusEl.classList.remove('hidden');
    statusEl.className = 'text-xs mt-2 font-bold text-center text-blue-600 block';
    
    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            statusEl.innerText = `[${i + 1}/${files.length}] ${file.name} 업로드 중...`;
            
            const chunkSize = 5 * 1024 * 1024;
            const totalChunks = Math.ceil(file.size / chunkSize);
            
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const chunk = file.slice(start, end);
                
                const formData = new FormData();
                formData.append('file', chunk);
                formData.append('filename', file.name);
                formData.append('category', category);
                formData.append('grade', modalUploadGrade);
                formData.append('chunk_index', chunkIndex);
                formData.append('total_chunks', totalChunks);
                
                const res = await fetch(`?action=upload&grade=${encodeURIComponent(modalUploadGrade)}`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || `파일 ${file.name} 업로드 실패 (HTTP ${res.status})`);
                }
            }
        }
        
        const gradeText = modalUploadGrade === 'grade1' ? '중급(1급)' : '초급(2급)';
        const catLabel = catSelect.options[catSelect.selectedIndex] ? catSelect.options[catSelect.selectedIndex].text : category;
        
        statusEl.className = 'text-xs mt-2 font-bold text-center text-emerald-600 block';
        statusEl.innerText = `🎉 [${gradeText} - ${catLabel}] 총 ${files.length}개 업로드 완료!`;
        
        // 업로드한 급수와 현재 웹 화면의 급수 동기화
        if (currentGrade !== modalUploadGrade) {
            if (typeof switchGrade === 'function') {
                await switchGrade(modalUploadGrade);
            } else {
                currentGrade = modalUploadGrade;
                await fetchFiles();
            }
        } else {
            await fetchFiles();
        }
        
        setTimeout(() => {
            closeAdminUploadModal();
            window.showAlert(`자료가 성공적으로 등록되었습니다!\n[${gradeText}] ${catLabel} (${files.length}건)`);
        }, 800);
        
    } catch (err) {
        console.error(err);
        statusEl.className = 'text-xs mt-2 font-bold text-center text-rose-500 block';
        statusEl.innerText = '❌ 오류: ' + (err.message || '업로드 중 문제가 발생했습니다.');
        alert('업로드 오류: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>📤</span> 업로드 시작';
    }
}

function renderLoginSection() {
    const sec = document.getElementById('login-section');
    if (!sec) return;
    
    let loggedUser = window.sessionStorage.getItem('learning_username');
    if (!loggedUser) {
        try {
            const raw = localStorage.getItem('learning_user_info');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.username && (Date.now() - (parsed.last_active || 0) < 15 * 60 * 1000)) {
                    loggedUser = parsed.username;
                }
            }
        } catch(e) {}
    }
    
    const displayName = window.currentUser ? window.currentUser.username : loggedUser;
    const adminActive = isCurrentAdminCheck();
    if (adminActive) isAdmin = true;
    
    if (displayName) {
        // 로그인 상태
        let adminHtml = '';
        if (adminActive) {
            adminHtml = `
                <button class="btn btn-upload-modal" onclick="openAdminUploadModal()" style="background:#2563eb; color:#ffffff; font-weight:700; border-radius:10px; padding:6px 13px; margin-right:4px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem; box-shadow:0 1px 2px rgba(0,0,0,0.1); transition:0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'" title="자료 올리기 (전산회계, 일반, 그림, 선생님 자료)">
                    📁 파일 올리기
                </button>
                <button class="btn btn-member-manage" onclick="openMemberAdminModal()" style="background:#4f46e5; color:#ffffff; font-weight:700; border-radius:10px; padding:6px 13px; margin-right:4px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem; transition:0.2s;" onmouseover="this.style.background='#4338ca'" onmouseout="this.style.background='#4f46e5'" title="회원 관리 대시보드">
                    ⚙️ 관리자
                </button>
                <button class="btn btn-problem-report-manage" onclick="openProblemReportsAdminModal()" style="background:#dc2626; color:#ffffff; font-weight:700; border-radius:10px; padding:6px 13px; margin-right:6px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem; transition:0.2s;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'" title="오류 문제 관리 대시보드">
                    <span>🚨 오류관리</span><span id="nav-reports-count-badge" class="hidden text-[10px] bg-white text-rose-600 font-black px-1.5 py-0.2 rounded-full shadow-2xs"></span>
                </button>
            `;
            setTimeout(checkPendingProblemReportsCount, 100);
        }
        
        sec.innerHTML = `
            <div style="display:flex; align-items:center; gap: 8px;">
                ${adminHtml}
                <div style="font-size: 0.9rem; font-weight: 700; color: #475569;">
                    반갑습니다, <span style="color: #6366f1;">${escapeHtml(displayName)}</span>님 🌿
                </div>
                <button onclick="openMyStatsModal()" style="background:#fffbeb; color:#d97706; font-weight:700; border-radius:8px; padding:6px 12px; border:1px solid #fde68a; cursor:pointer; font-size:0.8rem; transition:0.2s;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='#fffbeb'">
                    📊 내 학습 현황
                </button>
                <button class="btn btn-logout" onclick="globalLogout()" style="background:#f1f5f9; color:#64748b; font-weight:700; border-radius:8px; padding:6px 12px; border:1px solid #e2e8f0; cursor:pointer; font-size:0.8rem; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                    로그아웃
                </button>
            </div>
        `;
    } else {
        // 비로그인 상태 (회원가입/로그인 버튼 클릭 시 메인 모달 열기)
        sec.innerHTML = `
            <div style="display:flex; align-items:center; gap: 8px;">
                <button onclick="openSiteLoginModal('login')" style="background:#6366f1; color:#fff; font-weight:700; border-radius:8px; padding:6px 14px; border:none; cursor:pointer; font-size:0.85rem; transition:0.2s;" onmouseover="this.style.background='#4f46e5'" onmouseout="this.style.background='#6366f1'">
                    🔑 로그인
                </button>
                <button onclick="openSiteLoginModal('register')" style="background:#f1f5f9; color:#475569; font-weight:700; border-radius:8px; padding:6px 14px; border:1px solid #cbd5e1; cursor:pointer; font-size:0.85rem; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                    ✨ 간편가입
                </button>
            </div>
        `;
    }
    toggleUploadSections();
}

async function globalLogout() {
    const confirmed = await window.showConfirm('로그아웃 하시겠습니까?', '로그아웃');
    if (!confirmed) return;

    try {
        await fetch('api.php?action=learning_logout');
        await fetch('api.php?action=logout');
    } catch(e) {}

    window.currentUser = null;
    isAdmin = false;
    try {
        localStorage.clear();
        sessionStorage.clear();
    } catch(e) {}

    renderLoginSection();
    toggleUploadSections();
    
    // 로그아웃 즉시 로그인 게이트 전면 표시
    const gate = document.getElementById('site-lock-gate');
    if (gate) {
        gate.classList.remove('hidden');
        gate.style.display = 'flex';
        const closeBtn = document.getElementById('site-lock-close-btn');
        if (closeBtn) closeBtn.classList.add('hidden');
    }
    location.reload();
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
    const adminActive = isCurrentAdminCheck();
    if (adminActive) isAdmin = true;
    
    const sections = document.querySelectorAll('.upload-section');
    sections.forEach(sec => {
        if (adminActive) sec.classList.add('active');
        else sec.classList.remove('active');
    });
    const deleteBtns = document.querySelectorAll('.btn-delete');
    deleteBtns.forEach(btn => {
        if (adminActive) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    const editBtns = document.querySelectorAll('.btn-edit-title');
    editBtns.forEach(btn => {
        if (adminActive) btn.classList.remove('hidden');
        else btn.classList.add('hidden');
    });
    const quickUploadBtns = document.querySelectorAll('.btn-quick-upload');
    quickUploadBtns.forEach(btn => {
        if (adminActive) {
            btn.classList.add('active');
            btn.classList.remove('hidden');
            btn.style.display = 'inline-flex';
        } else {
            btn.classList.remove('active');
            btn.classList.add('hidden');
            btn.style.display = 'none';
        }
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
            const res = await fetch(`?action=upload&grade=${encodeURIComponent(currentGrade)}`, {
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
    const confirmed = await window.showConfirm('정말 삭제하시겠습니까?', '삭제 확인');
    if (!confirmed) return;
    const res = await fetch(`?action=delete&id=${encodeURIComponent(id)}&grade=${encodeURIComponent(currentGrade)}`);
    if (res.ok) {
        await fetchFiles();
    } else {
        await window.showAlert('삭제 실패', '오류');
    }
}

async function deleteVideo(path) {
    const confirmed = await window.showConfirm('정말 동영상을 삭제하시겠습니까?', '삭제 확인');
    if (!confirmed) return;
    let decodedPath = path;
    try { decodedPath = decodeURIComponent(path); } catch(e){}
    const res = await fetch(`?action=delete_video&path=${encodeURIComponent(decodedPath)}&grade=${encodeURIComponent(currentGrade)}`);
    if (res.ok) {
        await fetchVideos(currentVideoFolder);
    } else {
        await window.showAlert('삭제 실패', '오류');
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
    if (!pastedImageData) {
        alert('저장할 이미지 데이터가 없습니다.');
        return;
    }

    const filenameInput = document.getElementById('paste-filename');
    let filename = filenameInput ? filenameInput.value.trim() : '';

    if (!filename) {
        alert('저장할 파일명을 입력해주세요.');
        if (filenameInput) filenameInput.focus();
        return;
    }

    // 파일명에 이미지 확장자가 없으면 기본으로 .png 추가
    if (!/\.(png|jpe?g|gif|webp|bmp)$/i.test(filename)) {
        filename += '.png';
    }

    const saveBtn = document.querySelector('#paste-modal .btn-save');
    const origBtnText = saveBtn ? saveBtn.textContent : '저장';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';
    }

    try {
        // Base64 DataURL -> Blob 변환
        const parts = pastedImageData.split(',');
        const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png';
        const byteString = atob(parts[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([uint8Array], { type: mime });

        const formData = new FormData();
        formData.append('file', blob, filename);
        formData.append('filename', filename);
        formData.append('category', 'drawing');
        formData.append('chunk_index', '0');
        formData.append('total_chunks', '1');

        const res = await fetch(`?action=upload&grade=${currentGrade}`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (res.ok && data.success) {
            cancelPaste();
            await fetchFiles();
        } else {
            alert('이미지 저장 실패: ' + (data.error || '서버 오류'));
        }
    } catch (err) {
        console.error('savePastedImage error:', err);
        alert('이미지 저장 중 오류가 발생했습니다: ' + err.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = origBtnText;
        }
    }
}

// --- 1급 맞춤 코스 학습 (Learning Course) 뷰 전환 라우팅 ---
function openLearningCourseApp() {
    try { localStorage.setItem('active_view', 'learning'); } catch(e) {}
    const mainView = document.getElementById('main-content-view');
    const quizView = document.getElementById('quiz-content-view');
    const learningView = document.getElementById('learning-course-view');

    document.body.classList.add('learning-app-active');

    if (mainView) {
        mainView.classList.add('hidden');
        mainView.style.display = 'none';
    }
    if (quizView) {
        quizView.classList.add('hidden');
        quizView.style.display = 'none';
    }
    if (learningView) {
        learningView.classList.remove('hidden');
        learningView.style.display = 'block';
    }

    if (window.LearningEngine && typeof window.LearningEngine.initLearningApp === 'function') {
        window.LearningEngine.initLearningApp();
    }
}

function closeLearningCourseApp() {
    try { localStorage.removeItem('active_view'); } catch(e) {}
    document.body.classList.remove('learning-app-active');
    const mainView = document.getElementById('main-content-view');
    const learningView = document.getElementById('learning-course-view');
    if (learningView) {
        learningView.classList.add('hidden');
        learningView.style.display = 'none';
    }
    if (mainView) {
        mainView.classList.remove('hidden');
        mainView.style.display = ''; // 인라인 display 스타일 제거하여 CSS 레이아웃 복원
    }
}

// --- 1급 / 2급 영상 강의실 (Video Course) 라우팅 ---
function toggleVideoMenu() {
    const dropdown = document.getElementById('video-menu-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function openVideoAppView(grade = null, path = '') {
    const targetGrade = grade || currentGrade || 'grade2';
    const dropdown = document.getElementById('video-menu-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    if (window.VideoEngine && typeof window.VideoEngine.checkAuthAndOpenView === 'function') {
        window.VideoEngine.checkAuthAndOpenView(targetGrade, path);
    } else if (window.VideoEngine && typeof window.VideoEngine.openVideoAppView === 'function') {
        window.VideoEngine.openVideoAppView(targetGrade, path);
    }
}

function closeVideoAppView() {
    if (window.VideoEngine && typeof window.VideoEngine.closeVideoAppView === 'function') {
        window.VideoEngine.closeVideoAppView();
    }
}

document.addEventListener('click', function(event) {
    const wrapper = document.getElementById('video-dropdown-wrapper');
    const dropdown = document.getElementById('video-menu-dropdown');
    if (wrapper && dropdown && !wrapper.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

// goHome 글로벌 확장 (학습 뷰 및 영상 뷰도 함께 닫고 메인으로)
const origGoHome = window.goHome;
window.goHome = function() {
    document.body.classList.remove('learning-app-active');
    document.body.classList.remove('video-app-active');

    const learningView = document.getElementById('learning-course-view');
    if (learningView) {
        learningView.classList.add('hidden');
        learningView.style.display = 'none';
    }

    const videoView = document.getElementById('video-course-view');
    if (videoView) {
        videoView.classList.add('hidden');
        videoView.style.display = 'none';
    }

    if (window.VideoEngine && typeof window.VideoEngine.closeVideoPlayerModal === 'function') {
        window.VideoEngine.closeVideoPlayerModal();
    }

    const mainView = document.getElementById('main-content-view');
    if (mainView) {
        mainView.style.display = ''; // 인라인 display 스타일 제거!
        mainView.classList.remove('hidden');
    }

    if (typeof origGoHome === 'function') {
        origGoHome();
    } else {
        const quizView = document.getElementById('quiz-content-view');
        if (quizView) {
            quizView.classList.add('hidden');
            quizView.style.display = 'none';
        }
    }
};

// =========================================================================
// 관리자 전용 회원관리 및 학습/영상 통계 통합 모달 로직
// =========================================================================
let memberAdminData = null;
let currentAdminTab = 'overview';

function openMemberAdminModal() {
    const modal = document.getElementById('member-admin-modal');
    if (modal) modal.style.display = 'flex';
    fetchAndRenderMemberAdmin();
}

function closeMemberAdminModal(e) {
    if (e && e.target && e.target.closest && e.target.closest('#member-admin-container')) return;
    const modal = document.getElementById('member-admin-modal');
    if (modal) modal.style.display = 'none';
}

async function switchMemberAdminTab(tab) {
    currentAdminTab = tab;
    const btnOverview = document.getElementById('admin-tab-btn-overview');
    const btnVideos = document.getElementById('admin-tab-btn-videos');
    const btnDownloads = document.getElementById('admin-tab-btn-downloads');

    [btnOverview, btnVideos, btnDownloads].forEach(btn => {
        if(btn) {
            btn.classList.remove('bg-indigo-600', 'text-white');
            btn.classList.add('text-slate-400');
        }
    });

    let activeBtn = null;
    if (tab === 'overview') activeBtn = btnOverview;
    else if (tab === 'videos') activeBtn = btnVideos;
    else if (tab === 'downloads') activeBtn = btnDownloads;
    
    if (activeBtn) {
        activeBtn.classList.add('bg-indigo-600', 'text-white');
        activeBtn.classList.remove('text-slate-400');
    }

    if (tab === 'downloads') {
        renderDownloadLogs();
    } else if (memberAdminData) {
        renderMemberAdminBody(memberAdminData);
    }
}

async function fetchAndRenderMemberAdmin() {
    const body = document.getElementById('member-admin-body');
    if (!body) return;

    body.innerHTML = `
        <div class="py-16 text-center text-slate-400">
            <div class="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p class="font-bold text-xs text-slate-300">회원 현황 데이터를 불러오는 중입니다...</p>
        </div>
    `;

    try {
        const res = await fetch('?action=learning_admin_stats');
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || '데이터를 불러오지 못했습니다.');
        }
        memberAdminData = data;
        renderMemberAdminBody(data);
    } catch(err) {
        body.innerHTML = `
            <div class="p-8 text-center bg-rose-950/60 rounded-2xl border border-rose-800/60 text-white">
                <div class="text-rose-400 font-bold text-sm mb-2">❌ 회원 데이터 로딩 실패</div>
                <p class="text-xs text-rose-300 mb-4">${err.message}</p>
                <button onclick="fetchAndRenderMemberAdmin()" class="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow">다시 시도</button>
            </div>
        `;
    }
}

function renderMemberAdminBody(data) {
    const body = document.getElementById('member-admin-body');
    if (!body) return;

    const summary = data.summary || {};
    const users = data.users || [];

    // 상단 4대 요약 카드
    const summaryHtml = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div class="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div class="text-[11px] font-bold text-slate-400 mb-1">👥 총 가입 학습자</div>
                <div class="text-2xl font-black text-white">${summary.total_users || 0}<span class="text-xs font-normal text-slate-400 ml-1">명</span></div>
            </div>
            <div class="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div class="text-[11px] font-bold text-slate-400 mb-1">📈 맞춤학습 평균 진도율</div>
                <div class="text-2xl font-black text-emerald-400">${summary.avg_progress || 0}<span class="text-xs font-normal text-emerald-300 ml-1">%</span></div>
            </div>
            <div class="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div class="text-[11px] font-bold text-slate-400 mb-1">📝 퀴즈 풀이 / 정답률</div>
                <div class="text-2xl font-black text-amber-400">${(summary.total_solved || 0).toLocaleString()}<span class="text-xs font-bold text-sky-400 ml-1.5">(${summary.overall_accuracy || 0}%)</span></div>
            </div>
            <div class="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div class="text-[11px] font-bold text-slate-400 mb-1">🎬 영상 시청 / 완료 건수</div>
                <div class="text-2xl font-black text-indigo-400">${summary.total_video_watched || 0}<span class="text-xs font-bold text-emerald-400 ml-1.5">(${summary.total_video_completed || 0}건 완료)</span></div>
            </div>
        </div>
    `;

    if (currentAdminTab === 'overview') {
        // 1. 학습자별 종합 현황 테이블
        body.innerHTML = `
            ${summaryHtml}
            <div class="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden">
                <div class="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h4 class="font-extrabold text-sm text-white flex items-center gap-2">
                        <span>📋</span> 회원별 학습 진도 및 활동 현황 (${users.length}명)
                    </h4>
                    <span class="text-[11px] text-slate-400">행을 클릭하면 단원별 상세 내역을 확인합니다.</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800">
                                <th class="p-3">#</th>
                                <th class="p-3">학습자명</th>
                                <th class="p-3">가입일 / 최근접속</th>
                                <th class="p-3">맞춤학습 진도율</th>
                                <th class="p-3">푼 문제 (정답률)</th>
                                <th class="p-3">영상 시청수</th>
                                <th class="p-3">오답노트</th>
                                <th class="p-3 text-right">상세조회</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60" id="member-admin-table-body">
                            ${users.length === 0 ? `
                                <tr><td colspan="8" class="p-8 text-center text-slate-500 font-bold">등록된 회원이 없습니다.</td></tr>
                            ` : users.map((u, idx) => `
                                <tr class="hover:bg-slate-800/50 transition cursor-pointer member-row" data-username="${u.username}" onclick="openUserDetailPopup('${u.id}')">
                                    <td class="p-3 text-slate-400 font-mono">${idx + 1}</td>
                                    <td class="p-3 font-extrabold text-white flex items-center gap-1.5">
                                        <span>👤</span> <span>${u.username}</span>
                                        ${u.is_blocked ? `<span class="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] rounded" title="${u.block_reason}">차단됨</span>` : ''}
                                    </td>
                                    <td class="p-3 text-slate-400">
                                        <div class="text-[11px] text-slate-300">${u.created_at ? u.created_at.split('T')[0] : '-'}</div>
                                        <div class="text-[10px] text-slate-500">최근: ${u.last_login ? u.last_login.split('T')[0] : '-'}</div>
                                    </td>
                                    <td class="p-3">
                                        <div class="flex items-center gap-2">
                                            <div class="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                                                <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" style="width: ${u.total_pct}%"></div>
                                            </div>
                                            <span class="font-extrabold text-emerald-400 font-mono">${u.total_pct}%</span>
                                        </div>
                                    </td>
                                    <td class="p-3 font-mono">
                                        <span class="font-bold text-white">${u.solved_count}</span>
                                        <span class="text-[11px] text-sky-400 font-bold ml-1">(${u.accuracy}%)</span>
                                    </td>
                                    <td class="p-3">
                                        <span class="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-md font-bold text-[11px]">
                                            🎬 ${u.video_stats ? u.video_stats.watched_count : 0}강 (${u.video_stats ? u.video_stats.completed_count : 0}완료)
                                        </span>
                                    </td>
                                    <td class="p-3">
                                        ${u.unresolved_wrong_count > 0 ? `
                                            <span class="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded-md font-bold text-[11px]">
                                                🚨 ${u.unresolved_wrong_count}개
                                            </span>
                                        ` : `
                                            <span class="text-emerald-400 text-[11px] font-bold">완료됨</span>
                                        `}
                                    </td>
                                    <td class="p-3 text-right">
                                        <div class="flex items-center justify-end gap-1">
                                            <button class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-[11px] transition" onclick="event.stopPropagation(); toggleUserBlock('${u.id}', ${u.is_blocked})">
                                                ${u.is_blocked ? '차단해제' : '차단 🚫'}
                                            </button>
                                            <button class="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg font-bold text-[11px] transition" onclick="event.stopPropagation(); openUserDetailPopup('${u.id}')">
                                                상세 ➜
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else {
        // 2. 영상 시청 상세 기록 뷰
        body.innerHTML = `
            ${summaryHtml}
            <div class="space-y-4">
                <div class="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <h4 class="font-extrabold text-sm text-white flex items-center gap-2">
                        <span>🎬</span> 회원별 영상 시청 및 북마크 상세 기록
                    </h4>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${users.map(u => {
                        const vItems = u.video_items || [];
                        return `
                            <div class="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 member-video-card" data-username="${u.username}">
                                <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                                    <div class="flex items-center gap-2">
                                        <span class="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">👤</span>
                                        <span class="font-black text-sm text-white">${u.username}</span>
                                    </div>
                                    <span class="text-xs text-slate-400 font-bold">
                                        시청 ${vItems.length}편 / 완료 ${u.video_stats ? u.video_stats.completed_count : 0}편
                                    </span>
                                </div>

                                ${vItems.length === 0 ? `
                                    <div class="py-6 text-center text-slate-500 text-xs font-medium">아직 시청한 영상 기록이 없습니다.</div>
                                ` : `
                                    <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        ${vItems.map(v => {
                                            const pct = v.duration > 0 ? Math.min(100, Math.round((v.position / v.duration) * 100)) : 0;
                                            const formatT = (sec) => {
                                                const s = Math.floor(sec || 0);
                                                const m = Math.floor(s / 60);
                                                const remS = s % 60;
                                                return `${m < 10 ? '0' : ''}${m}:${remS < 10 ? '0' : ''}${remS}`;
                                            };
                                            return `
                                                <div class="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800/80 text-xs">
                                                    <div class="flex items-start justify-between gap-2">
                                                        <div class="font-extrabold text-slate-200 truncate flex-1" title="${v.title}">
                                                            ${v.title}
                                                        </div>
                                                        <span class="px-1.5 py-0.5 ${v.completed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'} text-[10px] font-bold rounded shrink-0">
                                                            ${v.completed ? '✅ 수강완료' : `${pct}% 시청`}
                                                        </span>
                                                    </div>
                                                    <div class="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                                                        <span>⏱️ ${formatT(v.position)} / ${formatT(v.duration)}</span>
                                                        ${v.bookmarks && v.bookmarks.length > 0 ? `
                                                            <span class="text-amber-400 font-bold">📌 북마크 ${v.bookmarks.length}개</span>
                                                        ` : ''}
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
}

function filterMemberAdminList(keyword) {
    const q = (keyword || '').trim().toLowerCase();
    const rows = document.querySelectorAll('.member-row, .member-video-card');
    rows.forEach(el => {
        const name = (el.getAttribute('data-username') || '').toLowerCase();
        if (!q || name.includes(q)) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });
}

let selectedAdminUser = null;
let currentDetailSubTab = 'sections';

function openUserDetailPopup(userId) {
    if (!memberAdminData || !memberAdminData.users) return;
    const user = memberAdminData.users.find(u => String(u.id) === String(userId));
    if (!user) return;

    selectedAdminUser = user;
    currentDetailSubTab = 'sections';

    const modal = document.getElementById('member-detail-modal');
    const header = document.getElementById('member-detail-header');
    if (!modal || !header) return;

    header.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-sm">
                👤
            </span>
            <div>
                <div class="flex items-center gap-2">
                    <h3 class="text-base font-extrabold text-white">${escapeHtml(user.username)}님의 맞춤학습 & 영상 상세 기록</h3>
                    <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
                        달성률 ${user.total_pct}%
                    </span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">
                    가입일: ${user.created_at ? user.created_at.split('T')[0] : '-'} | 푼 문제: <strong>${user.solved_count}개</strong> (정답률 ${user.accuracy}%) | 오답: <strong>${user.wrong_count}개</strong> | 영상: <strong>${user.video_stats ? user.video_stats.watched_count : 0}편</strong>
                </p>
            </div>
        </div>
        <button class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition font-bold" onclick="closeUserDetailPopup()">
            &times;
        </button>
    `;

    switchUserDetailSubTab('sections');
    modal.style.display = 'flex';
}

function closeUserDetailPopup(e) {
    if (e && e.target && e.target.closest && e.target.closest('#member-detail-container')) return;
    const modal = document.getElementById('member-detail-modal');
    if (modal) modal.style.display = 'none';
}

function switchUserDetailSubTab(subtab) {
    currentDetailSubTab = subtab;
    const btnSec = document.getElementById('user-subtab-btn-sections');
    const btnWrong = document.getElementById('user-subtab-btn-wrong');
    const btnVid = document.getElementById('user-subtab-btn-videos');

    [btnSec, btnWrong, btnVid].forEach(b => {
        if (b) { b.classList.remove('bg-indigo-600', 'text-white'); b.classList.add('text-slate-400'); }
    });

    if (subtab === 'sections' && btnSec) { btnSec.classList.add('bg-indigo-600', 'text-white'); btnSec.classList.remove('text-slate-400'); }
    else if (subtab === 'wrong' && btnWrong) { btnWrong.classList.add('bg-indigo-600', 'text-white'); btnWrong.classList.remove('text-slate-400'); }
    else if (subtab === 'videos' && btnVid) { btnVid.classList.add('bg-indigo-600', 'text-white'); btnVid.classList.remove('text-slate-400'); }

    renderUserDetailSubTabContent();
}

function renderUserDetailSubTabContent() {
    const body = document.getElementById('member-detail-body');
    if (!body || !selectedAdminUser) return;
    const user = selectedAdminUser;

    if (currentDetailSubTab === 'sections') {
        // 1. 9대 단원별 진도율 카드
        const curriculum = window.LearningCurriculum ? window.LearningCurriculum.sections : [];
        const details = user.section_details || {};

        body.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                ${curriculum.map(sec => {
                    const d = details[sec.id] || { pct: 0, is_complete: false, theory_count: 0, journal_count: 0 };
                    return `
                        <div class="p-3.5 rounded-2xl border ${d.is_complete ? 'bg-emerald-950/40 border-emerald-700/60' : 'bg-slate-950/80 border-slate-800'} text-xs">
                            <div class="flex items-center justify-between mb-1.5">
                                <span class="font-extrabold text-white truncate flex-1" title="${sec.title}">${sec.title}</span>
                                ${d.is_complete ? '<span class="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded">완료 ✨</span>' : `<span class="font-extrabold text-indigo-400">${d.pct}%</span>`}
                            </div>
                            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                                <div class="h-full rounded-full ${d.is_complete ? 'bg-emerald-400' : 'bg-indigo-500'}" style="width: ${d.pct}%"></div>
                            </div>
                            <div class="flex items-center justify-between text-[11px] text-slate-400">
                                <span>📝 필기: <strong>${d.theory_count}회</strong></span>
                                ${sec.id === 'sec_account_master' ? '<span>⚡ 3초 판별</span>' : `<span>🧾 분개: <strong>${d.journal_count}회</strong></span>`}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else if (currentDetailSubTab === 'wrong') {
        // 2. 오답노트 상세 이력
        const wrongs = user.wrong_notes || [];
        if (wrongs.length === 0) {
            body.innerHTML = `
                <div class="py-12 text-center text-slate-500 text-xs font-bold">
                    🎉 등록된 오답이 없습니다. 모든 문제를 완벽히 맞혔거나 오답을 모두 해결했습니다!
                </div>
            `;
            return;
        }

        body.innerHTML = `
            <div class="space-y-3">
                <div class="text-xs font-bold text-slate-400 flex items-center justify-between px-1">
                    <span>총 ${wrongs.length}개의 오답 기록</span>
                    <span class="text-rose-400 font-bold">미해결: ${user.unresolved_wrong_count}개</span>
                </div>
                ${wrongs.map((wn, idx) => `
                    <div class="p-4 bg-slate-950/80 rounded-2xl border ${wn.resolved ? 'border-slate-800 opacity-60' : 'border-rose-900/60'} text-xs space-y-2">
                        <div class="flex items-center justify-between gap-2">
                            <span class="px-2 py-0.5 ${wn.type === 'journal' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'} text-[10px] font-extrabold rounded">
                                ${wn.type === 'journal' ? '분개문제' : '필기문제'}
                            </span>
                            <span class="text-[11px] font-bold ${wn.resolved ? 'text-emerald-400' : 'text-rose-400'}">
                                ${wn.resolved ? '✅ 해결완료' : '🚨 미해결 오답'}
                            </span>
                        </div>
                        <div class="font-bold text-slate-200 leading-relaxed">
                            ${escapeHtml(wn.question || wn.prompt || '문제 내용')}
                        </div>
                        ${wn.explanation ? `
                            <div class="p-2.5 bg-slate-900 rounded-xl text-[11px] text-slate-300 border border-slate-800 leading-relaxed">
                                <span class="font-bold text-indigo-400">💡 해설:</span> ${escapeHtml(wn.explanation)}
                            </div>
                        ` : ''}
                        <div class="text-[10px] text-slate-500 text-right">
                            오답 등록일: ${wn.created_at ? wn.created_at.split('T')[0] : '-'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        // 3. 영상 시청 상세 목록
        const videos = user.video_items || [];
        if (videos.length === 0) {
            body.innerHTML = `
                <div class="py-12 text-center text-slate-500 text-xs font-bold">
                    🎬 아직 시청한 영상 기록이 없습니다.
                </div>
            `;
            return;
        }

        const formatT = (sec) => {
            const s = Math.floor(sec || 0);
            const m = Math.floor(s / 60);
            const remS = s % 60;
            return `${m < 10 ? '0' : ''}${m}:${remS < 10 ? '0' : ''}${remS}`;
        };

        body.innerHTML = `
            <div class="space-y-3">
                <div class="text-xs font-bold text-slate-400 px-1">
                    총 ${videos.length}편의 강의 시청 (완료 ${user.video_stats ? user.video_stats.completed_count : 0}편)
                </div>
                ${videos.map(v => {
                    const pct = v.duration > 0 ? Math.min(100, Math.round((v.position / v.duration) * 100)) : 0;
                    return `
                        <div class="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-2">
                            <div class="flex items-center justify-between gap-2">
                                <div class="font-black text-sm text-white truncate flex-1" title="${v.title}">
                                    ${v.title}
                                </div>
                                <span class="px-2 py-0.5 ${v.completed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'} text-[10px] font-bold rounded shrink-0">
                                    ${v.completed ? '✅ 수강완료' : `${pct}% 시청`}
                                </span>
                            </div>
                            <div class="flex items-center justify-between text-[11px] text-slate-400">
                                <span>⏱️ 시청 위치: <strong>${formatT(v.position)}</strong> / ${formatT(v.duration)}</span>
                                <span>최근 시청: ${v.updated_at ? v.updated_at.split('T')[0] : '-'}</span>
                            </div>
                            <!-- 북마크 메모 리스트 -->
                            ${v.bookmarks && v.bookmarks.length > 0 ? `
                                <div class="mt-2 pt-2 border-t border-slate-900 space-y-1">
                                    <div class="text-[10px] font-extrabold text-amber-400">📌 타임스탬프 북마크 메모 (${v.bookmarks.length}개):</div>
                                    ${v.bookmarks.map(bm => `
                                        <div class="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg">
                                            <span class="font-mono text-indigo-400 font-bold">${formatT(bm.time)}</span>
                                            <span class="truncate">${escapeHtml(bm.note)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
}


// --- 내 학습 현황 모달 로직 ---
async function openMyStatsModal() {
    const modal = document.getElementById('my-stats-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('opacity-100');
        modal.querySelector('div').classList.remove('scale-95');
        modal.querySelector('div').classList.add('scale-100');
    }, 10);
    
    const loggedUser = window.sessionStorage.getItem('learning_username');
    const displayName = window.currentUser ? window.currentUser.username : loggedUser;
    if (!displayName) {
        document.getElementById('my-stats-content').innerHTML = '<div class="text-center py-8 text-rose-500 font-bold text-sm">로그인이 필요합니다.</div>';
        return;
    }
    
    document.getElementById('my-stats-username-display').textContent = displayName + ' 님의 통계';
    
    let progressHtml = '';
    try {
        const res = await fetch('api.php?action=learning_status');
        const data = await res.json();
        if (data.is_logged_in && data.progress) {
            const prg = data.progress;
            const solved = prg.stats ? prg.stats.solved_count : 0;
            const correct = prg.stats ? prg.stats.correct_count : 0;
            const acc = solved > 0 ? Math.round((correct / solved) * 100) : 0;
            const steps = prg.completed_steps ? prg.completed_steps.length : 0;
            progressHtml = `
                <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                        <div class="text-xs font-bold text-indigo-400 mb-1">맞춤 코스 학습 진도</div>
                        <div class="text-lg font-extrabold text-indigo-700">총 ${steps}개 스텝 완료</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs font-bold text-indigo-400 mb-1">정답률</div>
                        <div class="text-lg font-extrabold text-indigo-700">${acc}% <span class="text-xs font-semibold text-indigo-500">(${correct}/${solved})</span></div>
                    </div>
                </div>
            `;
        }
    } catch(e) {}
    
    let localHtml = '';
    if (window.allHighScores) {
        let itemsHtml = '';
        for (const [key, val] of Object.entries(window.allHighScores)) {
            if (val.name === displayName || val.name === '도전자') {
                const label = key.replace('grade1', '1급').replace('grade2', '2급').replace('theory', '필기').replace('journal', '분개');
                itemsHtml += `
                    <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 mt-2">
                        <span class="text-sm font-bold text-slate-700">${label}</span>
                        <span class="text-sm font-extrabold text-blue-600">${val.score}점</span>
                    </div>
                `;
            }
        }
        if (itemsHtml) {
            localHtml = `
                <div class="mt-4">
                    <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">기출문제 최고 기록</h3>
                    ${itemsHtml}
                </div>
            `;
        }
    }
    
    const content = document.getElementById('my-stats-content');
    if (!progressHtml && !localHtml) {
        content.innerHTML = '<div class="text-center py-8 text-slate-500 font-semibold text-sm">아직 학습 기록이 없습니다.</div>';
    } else {
        content.innerHTML = progressHtml + localHtml;
    }
}

function closeMyStatsModal() {
    const modal = document.getElementById('my-stats-modal');
    if (!modal) return;
    modal.classList.remove('opacity-100');
    modal.querySelector('div').classList.remove('scale-100');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 200);
}

async function toggleUserBlock(userId, isBlocked) {
    let reason = "";
    if (!isBlocked) {
        reason = await window.showPrompt("해당 사용자를 차단하시겠습니까?\n사유를 입력해주세요:", "계정 차단", "예: 부적절한 접근");
        if (reason === null) return;
    } else {
        const confirmUnblock = await window.showConfirm("차단을 해제하시겠습니까?", "차단 해제");
        if (!confirmUnblock) return;
    }
    
    try {
        const res = await fetch("?action=admin_block_user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target_id: userId, is_blocked: isBlocked ? 0 : 1, block_reason: reason })
        });
        const data = await res.json();
        if (data.success) {
            await window.showAlert("처리되었습니다.", "성공");
            fetchAndRenderMemberAdmin();
        } else {
            await window.showAlert("오류: " + data.message, "실패");
        }
    } catch(err) {
        await window.showAlert("서버 통신 오류", "에러");
    }
}

async function renderDownloadLogs() {
    const body = document.getElementById('member-admin-body');
    if (!body) return;
    
    body.innerHTML = `
        <div class="py-16 text-center text-slate-400">
            <div class="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p class="font-bold text-xs text-slate-300">다운로드 이력을 불러오는 중입니다...</p>
        </div>
    `;
    
    try {
        const res = await fetch('?action=admin_download_logs');
        const data = await res.json();
        if (!data.success) throw new Error(data.message || '오류 발생');
        
        const logs = data.logs || [];
        
        body.innerHTML = `
            <div class="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden mt-4">
                <div class="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h4 class="font-extrabold text-sm text-white flex items-center gap-2">
                        <span>📥</span> 시스템 파일 다운로드 추적 로그
                    </h4>
                </div>
                <div class="overflow-x-auto max-h-[600px]">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead class="sticky top-0 z-10 bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800">
                            <tr>
                                <th class="p-3">#</th>
                                <th class="p-3">다운로드 일시</th>
                                <th class="p-3">사용자명</th>
                                <th class="p-3">파일명</th>
                                <th class="p-3">접속 IP</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60">
                            ${logs.length === 0 ? '<tr><td colspan="5" class="p-8 text-center text-slate-500 font-bold">기록이 없습니다.</td></tr>' : logs.map((log, i) => `
                                <tr class="hover:bg-slate-800/50 transition">
                                    <td class="p-3 text-slate-500 font-mono">${logs.length - i}</td>
                                    <td class="p-3 text-slate-300">${log.downloaded_at}</td>
                                    <td class="p-3 font-extrabold text-indigo-400">${log.username || '비회원'}</td>
                                    <td class="p-3 text-emerald-300 font-mono truncate max-w-xs" title="${log.file_path}">${log.file_path.split('/').pop()}</td>
                                    <td class="p-3 text-slate-500 font-mono">${log.ip_address}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch(err) {
        body.innerHTML = `<div class="p-8 text-center text-rose-500 font-bold">${err.message}</div>`;
    }
}

// --- 세션 복원 (새로고침 시 PHP 세션 기반으로 자동 로그인 유지) ---
async function restoreSessionFromServer() {
    try {
        const storedUser = window.sessionStorage.getItem('learning_username');
        const res = await fetch('api.php?action=learning_status');
        if (res.ok) {
            const data = await res.json();
            if (data.is_logged_in && data.user) {
                const username = data.user.username;
                window.currentUser = data.user;
                window.sessionStorage.setItem('learning_username', username);
                renderLoginSection();
                if (typeof syncUserName === 'function') syncUserName(username);
                if (typeof loadMainAppData === 'function') loadMainAppData();
                return;
            }
        }
        // PHP 세션 조회 지연/실패 시에도 sessionStorage에 로그인 정보가 남아있으면 로그인 상태 복원
        if (storedUser) {
            window.currentUser = { username: storedUser, is_admin: (storedUser === '이우성' || storedUser === 'admin') };
            renderLoginSection();
            if (typeof syncUserName === 'function') syncUserName(storedUser);
            if (typeof loadMainAppData === 'function') loadMainAppData();
        }
    } catch(e) {
        console.warn('세션 복원 시 경고:', e);
        const storedUser = window.sessionStorage.getItem('learning_username');
        if (storedUser) {
            window.currentUser = { username: storedUser, is_admin: (storedUser === '이우성' || storedUser === 'admin') };
            renderLoginSection();
            if (typeof loadMainAppData === 'function') loadMainAppData();
        }
    }
}

// =========================================================================
// 문제 오류 신고 및 관리자 격리/수정완료 시스템
// =========================================================================
let currentReportingTarget = null;
let currentAdminReports = [];
let currentAdminReportFilter = 'reported';

function openProblemReportModal(quizType) {
    let targetExcel = '';
    let targetProblemId = '';
    let targetTitle = '';

    if (quizType === 'journal') {
        targetExcel = (typeof currentLoadingJournalFile !== 'undefined' && currentLoadingJournalFile ? currentLoadingJournalFile : '2급_기출문제_분개.xlsx').replace(/^excels\//, '');
        targetProblemId = (typeof currentProblemId !== 'undefined' && currentProblemId !== null ? currentProblemId : '');
        if (typeof problemsMap !== 'undefined' && targetProblemId) {
            const p = problemsMap.get(targetProblemId);
            targetTitle = (p && typeof p === 'object' ? p.text : (p || '')) + '';
        }
    } else {
        targetExcel = (typeof currentLoadingTheoryFile !== 'undefined' && currentLoadingTheoryFile ? currentLoadingTheoryFile : '2급_기출문제_필기.xlsx').replace(/^excels\//, '');
        targetProblemId = (typeof currentTheoryId !== 'undefined' && currentTheoryId !== null ? currentTheoryId : '');
        if (typeof theoryProblemsMap !== 'undefined' && targetProblemId) {
            const p = theoryProblemsMap.get(targetProblemId);
            targetTitle = (p && typeof p === 'object' ? (p.question || p.text || '') : (p || '')) + '';
        }
    }

    if (!targetProblemId) {
        alert('현재 선택된 문제 정보를 찾을 수 없습니다.');
        return;
    }

    currentReportingTarget = {
        quiz_type: quizType,
        excel_file: targetExcel,
        problem_id: targetProblemId,
        problem_title: targetTitle
    };

    const modal = document.getElementById('problem-report-modal');
    const infoEl = document.getElementById('report-target-info');
    const detailEl = document.getElementById('report-reason-detail');
    if (infoEl) {
        infoEl.innerHTML = `<span class="text-indigo-600 font-bold">[${escapeHtml(targetExcel)}]</span> <span class="text-rose-600 font-black">#${escapeHtml(String(targetProblemId))}</span>: ${escapeHtml(targetTitle.slice(0, 100))}${targetTitle.length > 100 ? '...' : ''}`;
    }
    if (detailEl) detailEl.value = '';

    const radios = document.querySelectorAll('input[name="report-reason-type"]');
    if (radios.length > 0) radios[0].checked = true;

    if (modal) modal.classList.remove('hidden');
}

function closeProblemReportModal() {
    const modal = document.getElementById('problem-report-modal');
    if (modal) modal.classList.add('hidden');
    currentReportingTarget = null;
}

async function submitProblemReport() {
    if (!currentReportingTarget) return;

    const radios = document.querySelectorAll('input[name="report-reason-type"]');
    let reasonType = '기타 오류';
    radios.forEach(r => { if (r.checked) reasonType = r.value; });

    const detail = (document.getElementById('report-reason-detail')?.value || '').trim();
    const btn = document.getElementById('submit-problem-report-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerText = '제출 중...';
    }

    try {
        const username = window.currentUser ? window.currentUser.username : (sessionStorage.getItem('learning_username') || '익명학습자');
        const res = await fetch('api.php?action=problem_report_submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                excel_file: currentReportingTarget.excel_file,
                quiz_type: currentReportingTarget.quiz_type,
                problem_id: currentReportingTarget.problem_id,
                problem_title: currentReportingTarget.problem_title,
                reason_type: reasonType,
                reason_detail: detail,
                reporter: username
            })
        });
        const result = await res.json();
        if (result.success) {
            const pId = String(currentReportingTarget.problem_id);
            if (currentReportingTarget.quiz_type === 'journal') {
                if (typeof problemIds !== 'undefined') problemIds = problemIds.filter(id => String(id) !== pId);
                if (typeof unusedProblemIds !== 'undefined') unusedProblemIds = unusedProblemIds.filter(id => String(id) !== pId);
            } else {
                if (typeof theoryProblemIds !== 'undefined') theoryProblemIds = theoryProblemIds.filter(id => String(id) !== pId);
                if (typeof unusedTheoryIds !== 'undefined') unusedTheoryIds = unusedTheoryIds.filter(id => String(id) !== pId);
            }

            closeProblemReportModal();
            alert('🚨 오류 신고가 접수되었습니다!\n관리자 검토 및 수정 완료 시까지 본 문제는 출제 대상에서 즉시 제외(격리)됩니다. 소중한 제보 감사합니다.');
            checkPendingProblemReportsCount();
        } else {
            alert('신고 접수 실패: ' + (result.message || '서버 오류'));
        }
    } catch(e) {
        alert('신고 접수 통신 오류: ' + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>🚨</span><span>신고 제출하기</span>';
        }
    }
}

async function openProblemReportsAdminModal() {
    const modal = document.getElementById('admin-problem-reports-modal');
    if (modal) modal.classList.remove('hidden');
    await loadAdminProblemReports();
}

function closeAdminProblemReportsModal() {
    const modal = document.getElementById('admin-problem-reports-modal');
    if (modal) modal.classList.add('hidden');
}

async function loadAdminProblemReports() {
    const container = document.getElementById('admin-reports-table-container');
    const badgeStatus = document.getElementById('admin-reports-badge-status');
    if (container) container.innerHTML = '<div class="p-6 text-center text-slate-400 text-xs font-semibold">오류 신고 내역을 불러오는 중입니다...</div>';

    try {
        const res = await fetch('api.php?action=problem_reports_get');
        const data = await res.json();
        if (data.success) {
            currentAdminReports = data.reports || [];
            if (badgeStatus) {
                badgeStatus.innerText = `미해결: ${data.pending_count || 0}건`;
            }
            renderAdminReportsList();
            updateAdminReportsBadgeInNav(data.pending_count || 0);
        } else {
            if (container) container.innerHTML = `<div class="p-6 text-center text-rose-500 text-xs font-bold">${escapeHtml(data.message || '목록을 불러오지 못했습니다.')}</div>`;
        }
    } catch(e) {
        if (container) container.innerHTML = `<div class="p-6 text-center text-rose-500 text-xs font-bold">오류: ${escapeHtml(e.message)}</div>`;
    }
}

function filterAdminReports(filterType) {
    currentAdminReportFilter = filterType;
    ['all', 'reported', 'resolved'].forEach(t => {
        const btn = document.getElementById(`btn-rep-filter-${t}`);
        if (btn) {
            if (t === filterType) {
                btn.className = 'px-3 py-1 rounded-lg bg-rose-500 text-white transition';
            } else {
                btn.className = 'px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
            }
        }
    });
    renderAdminReportsList();
}

function renderAdminReportsList() {
    const container = document.getElementById('admin-reports-table-container');
    if (!container) return;

    let list = currentAdminReports.slice();
    if (currentAdminReportFilter !== 'all') {
        list = list.filter(r => r.status === currentAdminReportFilter);
    }

    if (list.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs font-semibold">해당 조건의 신고 내역이 없습니다. 🌿</div>';
        return;
    }

    list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    let html = '';
    list.forEach(item => {
        const isPending = item.status === 'reported';
        const statusBadge = isPending 
            ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-100 text-rose-700">격리중 (미해결)</span>'
            : '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-100 text-emerald-700">수정완료 (출제정상)</span>';

        html += `
            <div class="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                <div class="space-y-1.5 flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        ${statusBadge}
                        <span class="font-bold text-slate-700">${escapeHtml(item.excel_file || '')}</span>
                        <span class="font-extrabold text-indigo-600">#${escapeHtml(String(item.problem_id || ''))}</span>
                        <span class="text-slate-400 text-[11px]">${escapeHtml(item.created_at || '')}</span>
                        <span class="text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">제보: ${escapeHtml(item.reporter || '익명')}</span>
                    </div>
                    <div class="font-bold text-slate-800 text-sm truncate" title="${escapeHtml(item.problem_title || '')}">
                        ${escapeHtml(item.problem_title || '(제목 없음)')}
                    </div>
                    <div class="bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl text-slate-700 space-y-1">
                        <div class="font-bold text-amber-900 flex items-center gap-1.5">
                            <span>⚠️ 신고 유형:</span>
                            <span class="text-rose-600 font-extrabold">${escapeHtml(item.reason_type || '')}</span>
                        </div>
                        ${item.reason_detail ? `<div class="text-slate-600 whitespace-pre-wrap mt-1">${escapeHtml(item.reason_detail)}</div>` : '<div class="text-slate-400 italic mt-1">상세 내용 없음</div>'}
                    </div>
                    ${item.resolved_at ? `<div class="text-[11px] text-emerald-600 font-semibold">✓ 수정완료 시각: ${escapeHtml(item.resolved_at)}</div>` : ''}
                </div>
                <div class="flex sm:flex-col gap-2 flex-shrink-0 items-end justify-end pt-1 sm:pt-0">
                    ${isPending ? `
                        <button onclick="resolveProblemReport('${escapeHtml(item.id)}')" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1 whitespace-nowrap">
                            <span>✅</span><span>수정 완료(출제 재개)</span>
                        </button>
                    ` : `
                        <span class="text-[11px] text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded-lg">정상 출제 중</span>
                    `}
                    <button onclick="deleteProblemReport('${escapeHtml(item.id)}')" class="px-2.5 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition text-[11px] whitespace-nowrap">
                        삭제
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function resolveProblemReport(reportId) {
    if (!confirm('이 문제를 수정 완료 처리하시겠습니까?\\n처리 시 격리가 해제되어 학생들의 랜덤 출제 풀에 다시 복귀합니다.')) return;

    try {
        const res = await fetch('api.php?action=problem_report_resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ report_id: reportId })
        });
        const data = await res.json();
        if (data.success) {
            alert('수정 완료 처리되었습니다. 문제가 다시 정상 출제 풀에 복귀합니다.');
            await loadAdminProblemReports();
        } else {
            alert('처리 실패: ' + (data.message || '오류 발생'));
        }
    } catch(e) {
        alert('통신 오류: ' + e.message);
    }
}

async function deleteProblemReport(reportId) {
    if (!confirm('신고 내역을 완전히 삭제하시겠습니까?')) return;

    try {
        const res = await fetch('api.php?action=problem_report_delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ report_id: reportId })
        });
        const data = await res.json();
        if (data.success) {
            await loadAdminProblemReports();
        } else {
            alert('삭제 실패');
        }
    } catch(e) {
        alert('통신 오류: ' + e.message);
    }
}

async function checkPendingProblemReportsCount() {
    try {
        const res = await fetch('api.php?action=problem_reports_get');
        const data = await res.json();
        if (data.success) {
            updateAdminReportsBadgeInNav(data.pending_count || 0);
        }
    } catch(e) {}
}

function updateAdminReportsBadgeInNav(pendingCount) {
    const badge = document.getElementById('nav-reports-count-badge');
    if (badge) {
        if (pendingCount > 0) {
            badge.innerText = pendingCount + '건';
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// --- 15분 idle 자동 로그아웃 & 1분전 커스텀 모달 경고 타이머 ---
let _idleWarnTimer = null;
let _idleLogoutTimer = null;
let _idleCountdownInterval = null;
let _idleRemainingSec = 60;

const IDLE_WARN_TIME_MS = 14 * 60 * 1000; // 14분 (1분 전 경고)
const IDLE_LOGOUT_TIME_MS = 15 * 60 * 1000; // 15분 (최종 자동 로그아웃)

function resetIdleTimer() {
    clearTimeout(_idleWarnTimer);
    clearTimeout(_idleLogoutTimer);
    clearInterval(_idleCountdownInterval);

    const username = window.sessionStorage.getItem('learning_username');
    if (!username && !window.currentUser) return;

    // 14분 후 1분전 경고 커스텀 모달 노출
    _idleWarnTimer = setTimeout(() => {
        showIdleWarningModal();
    }, IDLE_WARN_TIME_MS);

    // 15분 후 최종 자동 로그아웃
    _idleLogoutTimer = setTimeout(async () => {
        await executeIdleLogout();
    }, IDLE_LOGOUT_TIME_MS);
}

function showIdleWarningModal() {
    const modal = document.getElementById('idle-warning-modal');
    if (!modal) return;
    _idleRemainingSec = 60;
    const countEl = document.getElementById('idle-countdown-seconds');
    if (countEl) countEl.textContent = '60초 후';

    modal.style.display = 'flex';

    clearInterval(_idleCountdownInterval);
    _idleCountdownInterval = setInterval(() => {
        _idleRemainingSec--;
        if (countEl) countEl.textContent = `${_idleRemainingSec}초 후`;
        if (_idleRemainingSec <= 0) {
            clearInterval(_idleCountdownInterval);
        }
    }, 1000);
}

async function extendUserSession() {
    clearTimeout(_idleWarnTimer);
    clearTimeout(_idleLogoutTimer);
    clearInterval(_idleCountdownInterval);

    const modal = document.getElementById('idle-warning-modal');
    if (modal) modal.style.display = 'none';

    try {
        await fetch('api.php?action=learning_status');
    } catch(e) {}

    resetIdleTimer();
}

async function executeIdleLogout() {
    clearTimeout(_idleWarnTimer);
    clearTimeout(_idleLogoutTimer);
    clearInterval(_idleCountdownInterval);

    const modal = document.getElementById('idle-warning-modal');
    if (modal) modal.style.display = 'none';

    try {
        await fetch('api.php?action=learning_logout');
    } catch (e) {}

    window.currentUser = null;
    window.sessionStorage.removeItem('learning_username');
    try {
        localStorage.removeItem('learning_user_info');
        localStorage.removeItem('active_view');
    } catch(e) {}

    renderLoginSection();
    if (window.LearningEngine && typeof window.LearningEngine.renderAuthView === 'function') {
        window.LearningEngine.renderAuthView('login');
    }

    if (typeof window.showAlert === 'function') {
        await window.showAlert('15분간 비활동 상태가 유지되어 안전하게 자동 로그아웃되었습니다.', '자동 로그아웃 완료');
    }
}

function startIdleTimer() {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(evt => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer();
}
// -----------------------------------------------

window.onload = init;

