/**
 * 2026 PERFECT 전산회계 1급 맞춤 코스 학습 메인 엔진
 */
window.LearningEngine = (function() {
    let currentSectionId = null;
    let currentStepIdx = 0;
    let currentExtraQuiz = null; // 더풀기용 추가 문제를 보관할 객체
    let loadingExcelFiles = {}; // 엑셀 파일 로딩 중복 방지를 위한 상태 맵

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatTheoryOptionHtml(rawText) {
        if (!rawText) return '';
        let text = String(rawText).trim();

        // 1. (차) / (대) 분개가 포함된 경우
        if (/\(차\)/.test(text) && /\(대\)/.test(text)) {
            const parts = text.split(/(?=\(대\))/);
            if (parts.length >= 2) {
                const debitPart = parts[0].trim();
                const creditPart = parts.slice(1).join(' ').trim();
                return `
                    <div class="flex flex-wrap items-center gap-1.5 w-full">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-bold text-xs border border-sky-200">${escapeHtml(debitPart)}</span>
                        <span class="text-slate-300 font-bold text-xs">/</span>
                        <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-bold text-xs border border-purple-200">${escapeHtml(creditPart)}</span>
                    </div>
                `;
            }
        }

        // 2. 표 형식의 다중 컬럼 데이터 (금액, 회계처리 등이 공백/구분자로 나열된 경우)
        if (/(\d+[,0-9]*원|\(차\)|\(대\)|회계처리)/.test(text)) {
            const segments = text.split(/\s{2,}|\t|(?<=원)\s+(?=\d|\(|회|[가-힣])/).map(s => s.trim()).filter(Boolean);
            if (segments.length >= 2) {
                return `
                    <div class="flex flex-wrap items-center gap-2 w-full text-xs font-semibold text-slate-800">
                        ${segments.map((seg, idx) => {
                            let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                            if (seg.includes('(차)')) badgeStyle = "bg-sky-50 text-sky-800 border-sky-200 font-bold";
                            else if (seg.includes('(대)')) badgeStyle = "bg-purple-50 text-purple-800 border-purple-200 font-bold";
                            else if (seg.includes('원')) badgeStyle = "bg-amber-50 text-amber-900 border-amber-200 font-mono font-bold";
                            else if (seg.includes('회계처리')) badgeStyle = "bg-slate-100 text-slate-500 border-slate-200";
                            
                            return `
                                <span class="inline-flex items-center px-2.5 py-1 rounded-lg border ${badgeStyle}">
                                    ${escapeHtml(seg)}
                                </span>
                                ${idx < segments.length - 1 ? `<span class="text-slate-300 font-bold">|</span>` : ''}
                            `;
                        }).join('')}
                    </div>
                `;
            }
        }

        return escapeHtml(text);
    }

    function formatTheoryQuestionHtml(rawText) {
        if (!rawText) return '';
        let text = String(rawText).trim();

        // 지문 뒤에 표 헤더나 자료 목록이 붙은 경우 분리
        const splitMatch = text.match(/^(.*?(\?|\.|\:))\s*(\n+|(?<=\?)\s+)(.+)$/s);
        if (splitMatch && splitMatch[4] && splitMatch[4].trim().length > 5) {
            const qMain = splitMatch[1].trim();
            const subData = splitMatch[4].trim();

            const subCols = subData.split(/\s{2,}|\t|\n|(?<=잔액)\s+|(?<=\%)\s+|(?<=\))\s+/).map(s => s.trim()).filter(Boolean);

            if (subCols.length >= 2) {
                return `
                    <div class="theory-question-main mb-2.5 font-bold text-slate-800 leading-relaxed">
                        ${escapeHtml(qMain).replace(/\n/g, '<br>')}
                    </div>
                    <div class="theory-question-data-box p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <div class="flex items-center gap-1.5 font-extrabold text-slate-700 border-b border-slate-200/80 pb-1.5 mb-2">
                            <span class="text-indigo-600">📋</span>
                            <span>보기 표 헤더 / 문제 자료</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-2 font-bold text-slate-700">
                            ${subCols.map((col, cIdx) => `
                                <span class="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs text-slate-800">${escapeHtml(col)}</span>
                                ${cIdx < subCols.length - 1 ? '<span class="text-slate-300 font-bold">|</span>' : ''}
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }

        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    async function initLearningApp() {
        const container = document.getElementById('learning-content-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-16 text-center text-slate-500 font-bold">
                <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-blue-600"></i>
                <div>학습자 정보를 확인하는 중입니다...</div>
            </div>
        `;

        const authState = await window.LearningAuth.checkStatus();
        if (authState.loggedIn) {
            renderDashboard();
        } else {
            renderAuthView();
        }
    }

    // --- 1. 로그인 / 간편 회원가입 화면 ---
    function renderAuthView(defaultTab = 'login') {
        const container = document.getElementById('learning-content-container');
        if (!container) return;

        container.innerHTML = `
            <div class="learning-auth-wrapper">
                <div class="learning-auth-card">
                    <div class="learning-auth-header">
                        <div class="auth-icon-badge">📖</div>
                        <h2 class="text-xl font-extrabold text-slate-900 mt-2">2026 PERFECT 전산회계 1급</h2>
                        <p class="text-xs text-slate-500 font-medium mt-1">교재 기반 맞춤형 코스 학습 & 개인 오답노트</p>
                    </div>

                    <!-- 탭 전환 -->
                    <div class="auth-tabs">
                        <button class="auth-tab-btn ${defaultTab === 'login' ? 'active' : ''}" onclick="LearningEngine.switchAuthTab('login')">
                            로그인
                        </button>
                        <button class="auth-tab-btn ${defaultTab === 'register' ? 'active' : ''}" onclick="LearningEngine.switchAuthTab('register')">
                            간편 회원가입 (3초)
                        </button>
                    </div>

                    <!-- 로그인 폼 -->
                    <div id="auth-login-form" class="${defaultTab === 'login' ? '' : 'hidden'} auth-form-body">
                        <div class="form-group">
                            <label class="form-label">학습자 이름(아이디)</label>
                            <input type="text" id="login-username" class="form-input" placeholder="이름을 입력하세요 (예: 이우성)" onkeypress="if(event.key==='Enter') LearningEngine.submitLogin()">
                        </div>
                        <div class="form-group mt-3">
                            <label class="form-label">비밀번호</label>
                            <input type="password" id="login-password" class="form-input" placeholder="비밀번호를 입력하세요 (숫자 4자리 이상)" onkeypress="if(event.key==='Enter') LearningEngine.submitLogin()">
                        </div>
                        <div id="login-error-msg" class="auth-error-msg hidden"></div>
                        <button class="btn-auth-submit mt-5" onclick="LearningEngine.submitLogin()">
                            학습 시작하기 ➜
                        </button>
                        <div class="text-center mt-3">
                            <span class="text-xs text-slate-400">처음이신가요? </span>
                            <a href="javascript:void(0)" class="text-xs font-bold text-blue-600 hover:underline" onclick="LearningEngine.switchAuthTab('register')">간편 회원가입하기</a>
                        </div>
                    </div>

                    <!-- 회원가입 폼 -->
                    <div id="auth-register-form" class="${defaultTab === 'register' ? '' : 'hidden'} auth-form-body">
                        <div class="form-group">
                            <label class="form-label">학습자 이름(아이디)</label>
                            <input type="text" id="reg-username" class="form-input" placeholder="사용할 이름을 입력하세요 (예: 홍길동)">
                        </div>
                        <div class="form-group mt-3">
                            <label class="form-label">비밀번호 (숫자 4자리 이상)</label>
                            <input type="password" id="reg-password" class="form-input" placeholder="비밀번호 (숫자 4자리 이상, 영문 불필요)">
                        </div>
                        <div class="form-group mt-3">
                            <label class="form-label">비밀번호 확인</label>
                            <input type="password" id="reg-password-confirm" class="form-input" placeholder="비밀번호를 한번 더 입력하세요" onkeypress="if(event.key==='Enter') LearningEngine.submitRegister()">
                        </div>
                        <div class="text-[11px] text-slate-400 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                            💡 <strong>안내</strong>: 복잡한 영문이나 특수문자 없이 <strong>숫자 4자리</strong>만으로 빠르고 간편하게 가입하실 수 있습니다!
                        </div>
                        <div id="reg-error-msg" class="auth-error-msg hidden"></div>
                        <button class="btn-auth-submit mt-4" onclick="LearningEngine.submitRegister()">
                            회원가입 완료 및 입장 ➜
                        </button>
                        <div class="text-center mt-3">
                            <span class="text-xs text-slate-400">이미 계정이 있으신가요? </span>
                            <a href="javascript:void(0)" class="text-xs font-bold text-blue-600 hover:underline" onclick="LearningEngine.switchAuthTab('login')">로그인하기</a>
                        </div>
                    </div>

                </div>
            </div>
        `;
    }

    function switchAuthTab(tab) {
        const loginForm = document.getElementById('auth-login-form');
        const regForm = document.getElementById('auth-register-form');
        const tabBtns = document.querySelectorAll('.auth-tab-btn');

        tabBtns.forEach(btn => btn.classList.remove('active'));
        if (tab === 'login') {
            if (loginForm) loginForm.classList.remove('hidden');
            if (regForm) regForm.classList.add('hidden');
            if (tabBtns[0]) tabBtns[0].classList.add('active');
            setTimeout(() => document.getElementById('login-username')?.focus(), 50);
        } else {
            if (loginForm) loginForm.classList.add('hidden');
            if (regForm) regForm.classList.remove('hidden');
            if (tabBtns[1]) tabBtns[1].classList.add('active');
            setTimeout(() => document.getElementById('reg-username')?.focus(), 50);
        }
    }

    async function submitLogin() {
        const userInp = document.getElementById('login-username');
        const passInp = document.getElementById('login-password');
        const errMsg = document.getElementById('login-error-msg');
        if (!userInp || !passInp) return;

        const username = userInp.value.trim();
        const password = passInp.value;
        if (errMsg) errMsg.classList.add('hidden');

        try {
            await window.LearningAuth.login(username, password);
            renderDashboard();
        } catch (err) {
            if (errMsg) {
                errMsg.textContent = '❌ ' + err.message;
                errMsg.classList.remove('hidden');
            }
        }
    }

    async function submitRegister() {
        const userInp = document.getElementById('reg-username');
        const passInp = document.getElementById('reg-password');
        const passConfInp = document.getElementById('reg-password-confirm');
        const errMsg = document.getElementById('reg-error-msg');
        if (!userInp || !passInp || !passConfInp) return;

        const username = userInp.value.trim();
        const password = passInp.value;
        const passConf = passConfInp.value;
        if (errMsg) errMsg.classList.add('hidden');

        try {
            await window.LearningAuth.register(username, password, passConf);
            alert(`🎉 ${username}님, 회원가입을 축하합니다!\n맞춤 학습을 시작합니다.`);
            renderDashboard();
        } catch (err) {
            if (errMsg) {
                errMsg.textContent = '❌ ' + err.message;
                errMsg.classList.remove('hidden');
            }
        }
    }

    function showLogoutModal() {
        const modal = document.getElementById('learning-logout-modal');
        if (modal) modal.style.display = 'flex';
    }

    function closeLogoutModal(e) {
        if (e && e.target && e.target.id !== 'learning-logout-modal' && !e.target.classList.contains('btn-custom-modal-cancel')) return;
        const modal = document.getElementById('learning-logout-modal');
        if (modal) modal.style.display = 'none';
    }

    async function confirmLogout() {
        const modal = document.getElementById('learning-logout-modal');
        if (modal) modal.style.display = 'none';
        await window.LearningAuth.logout();
        renderAuthView('login');
    }

    function resumeLastLearning() {
        const saved = localStorage.getItem('last_learning_pos');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.sectionId) {
                    openSection(data.sectionId, data.stepIdx || 0);
                    return;
                }
            } catch(e) {}
        }

        const prog = window.LearningAuth.getProgress() || {};
        const curriculum = window.LearningCurriculum;
        for (let sec of curriculum.sections) {
            for (let idx = 0; idx < sec.steps.length; idx++) {
                if (!(prog.completed_steps || []).includes(sec.steps[idx].id)) {
                    openSection(sec.id, idx);
                    return;
                }
            }
        }
        openSection(curriculum.sections[0].id, 0);
    }

    // --- 2. 학습자 대시보드 화면 ---
    function renderDashboard() {
        const container = document.getElementById('learning-content-container');
        if (!container) return;

        const user = window.LearningAuth.getUser();
        const prog = window.LearningAuth.getProgress() || {};
        const curriculum = window.LearningCurriculum;

        // 마지막 학습 위치 조회
        let lastPosInfo = null;
        try {
            const saved = localStorage.getItem('last_learning_pos');
            if (saved) lastPosInfo = JSON.parse(saved);
        } catch(e) {}

        // --- 정밀 마이크로 진도율 연산 시스템 도입 ---
        let totalWeightAll = 0;
        let acquiredWeightAll = 0;
        let completedSectionsCount = 0;

        curriculum.sections.forEach(sec => {
            let totalWeight = 0;
            let acquiredWeight = 0;
            let isSectionAllDone = true;

            sec.steps.forEach(st => {
                const isDone = (prog.completed_steps || []).includes(st.id);
                if (!isDone) isSectionAllDone = false;

                const counts = (prog.correct_counts && prog.correct_counts[st.id]) || { theory: 0, journal: 0 };
                const reqT = st.quiz ? 3 : 0;
                const reqJ = st.journalQuiz ? 3 : 0;
                const maxScore = reqT + reqJ;

                if (maxScore > 0) {
                    const curT = Math.min(reqT, counts.theory || 0);
                    const curJ = Math.min(reqJ, counts.journal || 0);
                    acquiredWeight += (curT + curJ);
                    totalWeight += maxScore;
                }
            });

            if (isSectionAllDone && sec.steps.length > 0) {
                completedSectionsCount++;
            }

            totalWeightAll += totalWeight;
            acquiredWeightAll += acquiredWeight;
        });

        const totalPct = totalWeightAll > 0 ? Math.round((acquiredWeightAll / totalWeightAll) * 100) : 0;
        const wrongCount = (prog.wrong_notes || []).filter(n => !n.resolved).length;

        container.innerHTML = `
            <div class="learning-dashboard-wrapper">
                <!-- 상단 프로필 & 진도율 요약 배너 -->
                <div class="learning-profile-banner">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-center gap-3.5">
                            <div class="profile-avatar-circle">
                                🎓
                            </div>
                            <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h2 class="text-xl font-extrabold text-slate-800">
                                        ${escapeHtml(user ? user.username : '학습자')}님의 학습 공간
                                    </h2>
                                    <span class="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                                        전산회계 1급
                                    </span>
                                    <button class="btn-resume-last-learning" onclick="LearningEngine.resumeLastLearning()" title="마지막으로 공부하던 위치로 즉시 이동합니다">
                                        <span class="pulse-dot"></span>
                                        <span>🚀 마지막 학습한 곳으로 이동</span>
                                        ${lastPosInfo && lastPosInfo.stepTitle ? `<span class="last-step-name">(${escapeHtml(lastPosInfo.stepTitle.replace(/^[0-9.]+\s*/, ''))})</span>` : ''}
                                    </button>
                                </div>
                                <p class="text-xs text-slate-500 font-medium mt-0.5">
                                    📖 기반 교재: <strong>${escapeHtml(curriculum.bookTitle)}</strong>
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2.5">
                            <button class="btn-learning-wrong-notes" onclick="LearningWrongNotes.renderWrongNotesView(document.getElementById('learning-content-container'))">
                                <span class="text-rose-500">📝</span>
                                <span>오답노트</span>
                                <span class="badge-wrong-pill ${wrongCount > 0 ? 'active' : ''}">${wrongCount}</span>
                            </button>
                            <button class="btn-learning-logout-text" onclick="LearningEngine.showLogoutModal()" title="학습 종료 및 로그아웃">
                                <span>🚪</span>
                                <span>로그아웃</span>
                            </button>
                        </div>
                    </div>

                    <!-- 전체 진도율 게이지 바 -->
                    <div class="mt-5 pt-4 border-t border-slate-200/80">
                        <div class="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                            <span class="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                                📈 전체 7대 단원 달성률: <strong>${completedSectionsCount} / 7개 단원 완료</strong>
                            </span>
                            <span class="text-xs font-extrabold text-blue-600">
                                정밀 학습 달성률 (${totalPct}%)
                            </span>
                        </div>
                        <div class="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden shadow-inner">
                            <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500" style="width: ${totalPct}%"></div>
                        </div>
                    </div>
                </div>

                <!-- 로그아웃 확인 커스텀 모달 팝업 -->
                <div id="learning-logout-modal" class="learning-custom-modal-overlay" style="display:none;" onclick="LearningEngine.closeLogoutModal(event)">
                    <div class="learning-custom-modal-content" onclick="event.stopPropagation()">
                        <div class="modal-emoji-badge">🚪</div>
                        <h3 class="text-base font-extrabold text-slate-900 mt-2">학습을 종료하고 로그아웃할까요?</h3>
                        <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                            현재까지 완료한 학습 진도와 오답노트는 안전하게 저장되었습니다.<br>언제든 다시 로그인하여 이어서 공부하실 수 있습니다.
                        </p>
                        <div class="flex gap-2.5 justify-center mt-5">
                            <button class="btn-custom-modal-cancel" onclick="LearningEngine.closeLogoutModal()">
                                계속 공부하기
                            </button>
                            <button class="btn-custom-modal-danger" onclick="LearningEngine.confirmLogout()">
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 7대 단원 커리큘럼 벤토 그리드 -->
                <div class="mt-6">
                    <div class="flex items-center justify-between mb-3.5">
                        <h3 class="text-base font-extrabold text-slate-800 flex items-center gap-2">
                            <span>📚</span> 단원별 맞춤 학습 로드맵
                        </h3>
                        <span class="text-xs text-slate-400 font-medium">원하는 단원을 선택하여 바로 학습할 수 있습니다</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${curriculum.sections.map((sec, idx) => {
                            // 섹션별 마이크로 진도율 정밀 계산
                            let totalWeight = 0;
                            let acquiredWeight = 0;
                            let isSectionAllDone = true;
                            let remainTheoryCount = 0;
                            let remainJournalCount = 0;

                            sec.steps.forEach(st => {
                                const isDone = (prog.completed_steps || []).includes(st.id);
                                if (!isDone) isSectionAllDone = false;

                                const counts = (prog.correct_counts && prog.correct_counts[st.id]) || { theory: 0, journal: 0 };
                                const reqT = st.quiz ? 3 : 0;
                                const reqJ = st.journalQuiz ? 3 : 0;
                                const maxScore = reqT + reqJ;

                                if (maxScore > 0) {
                                    const curT = Math.min(reqT, counts.theory || 0);
                                    const curJ = Math.min(reqJ, counts.journal || 0);
                                    acquiredWeight += (curT + curJ);
                                    totalWeight += maxScore;
                                    remainTheoryCount += Math.max(0, reqT - curT);
                                    remainJournalCount += Math.max(0, reqJ - curJ);
                                }
                            });

                            let sPct = totalWeight > 0 ? Math.round((acquiredWeight / totalWeight) * 100) : 0;
                            let isComplete = isSectionAllDone && sPct === 100;

                            // 100% 미완성일 때 잔여 문제 수 명시
                            let incompleteWarning = '';
                            let btnText = '학습 시작하기 ➜';
                            if (sPct > 0) {
                                if (isComplete) {
                                    btnText = '다시 복습하기 ➜';
                                } else {
                                    btnText = '문제를 더 풀고 완수하기 ➜';
                                    let remainParts = [];
                                    if (remainTheoryCount > 0) remainParts.push(`필기 ${remainTheoryCount}문제`);
                                    if (remainJournalCount > 0) remainParts.push(`분개 ${remainJournalCount}문제`);
                                    let remainStr = remainParts.join(', ');

                                    incompleteWarning = `
                                        <div class="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200/80 rounded-lg py-1.5 px-2.5 mt-2 flex items-center gap-1.5 shadow-2xs">
                                            <span class="text-amber-500 text-xs">⚠️</span>
                                            <span>완료까지 <strong>${remainStr}</strong> 남음 (${sPct}%)</span>
                                        </div>
                                    `;
                                }
                            }

                            return `
                                <div class="curriculum-section-card" onclick="LearningEngine.openSection('${sec.id}')">
                                    <div class="flex items-start justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <div class="section-icon-box" style="background-color: ${sec.color}15; color: ${sec.color};">
                                                ${sec.icon}
                                            </div>
                                            <div>
                                                <span class="section-badge" style="background-color: ${sec.color}20; color: ${sec.color};">
                                                    ${sec.badge}
                                                </span>
                                                <h4 class="text-sm font-extrabold text-slate-900 mt-1">
                                                    ${escapeHtml(sec.title)}
                                                </h4>
                                            </div>
                                        </div>
                                        ${isComplete ? `
                                            <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200">
                                                완료 ✨
                                            </span>
                                        ` : ''}
                                    </div>

                                    <p class="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                                        ${escapeHtml(sec.description)}
                                    </p>

                                    <div class="section-book-page mt-3">
                                        📖 ${escapeHtml(sec.bookPages)}
                                    </div>

                                    ${incompleteWarning}

                                    <div class="section-progress-wrapper mt-3 pt-3 border-t border-slate-100">
                                        <div class="flex justify-between items-center text-[11px] font-bold mb-1">
                                            <span class="text-slate-500">진행률</span>
                                            <span class="text-slate-800">${sPct}%</span>
                                        </div>
                                        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div class="h-2 rounded-full transition-all duration-300" style="width: ${sPct}%; background-color: ${sec.color};"></div>
                                        </div>
                                    </div>

                                    <button class="btn-section-enter mt-3.5" style="border-color: ${sec.color}40; color: ${sPct > 0 && !isComplete ? '#d97706' : ''}; background-color: ${sPct > 0 && !isComplete ? '#fffbeb' : ''};">
                                        ${btnText}
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // --- 3. 단원 상세 학습 뷰 (이론 ➜ 퀴즈 ➜ 피드백) ---
    function openSection(sectionId, stepIdx = 0) {
        currentSectionId = sectionId;
        currentStepIdx = stepIdx;
        currentExtraQuiz = null;

        if (typeof ACCOUNT_LIST_1 !== 'undefined') {
            window.dynamicAccounts = new Set(ACCOUNT_LIST_1);
        }

        const container = document.getElementById('learning-content-container');
        if (!container) return;

        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);
        if (!section) return;

        const currentStep = section.steps[currentStepIdx] || section.steps[0];
        const prog = window.LearningAuth.getProgress() || {};
        const isStepCompleted = (prog.completed_steps || []).includes(currentStep.id);

        try {
            localStorage.setItem('last_learning_pos', JSON.stringify({
                sectionId: sectionId,
                stepIdx: stepIdx,
                sectionTitle: section.title,
                stepTitle: currentStep.title
            }));
        } catch(e) {}

        const counts = (prog.correct_counts && prog.correct_counts[currentStep.id]) || { theory: 0, journal: 0 };
        const tCorrect = counts.theory || 0;
        const jCorrect = counts.journal || 0;

        container.innerHTML = `
            <div class="learning-study-view">
                <!-- 상단 네비 바 -->
                <div class="study-nav-bar">
                    <button class="btn-learning-back" onclick="LearningEngine.renderDashboard()">
                        <i class="fa-solid fa-arrow-left"></i> 대시보드로
                    </button>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-500">${escapeHtml(section.title)}</span>
                        <span class="text-xs text-slate-300">/</span>
                        <span class="text-xs font-extrabold text-blue-600">${currentStepIdx + 1}단계 (총 ${section.steps.length}단계)</span>
                    </div>
                    <button class="btn-learning-wrong-notes text-xs" onclick="LearningWrongNotes.renderWrongNotesView(document.getElementById('learning-content-container'))">
                        오답노트
                    </button>
                </div>

                <!-- 단계별 탭 네비게이터 -->
                <div class="step-nav-tabs mt-3">
                    ${section.steps.map((st, sIdx) => {
                        const isDone = (prog.completed_steps || []).includes(st.id);
                        const isCur = sIdx === currentStepIdx;
                        return `
                            <button class="step-tab-btn ${isCur ? 'active' : ''} ${isDone ? 'done' : ''}" onclick="LearningEngine.openSection('${section.id}', ${sIdx})">
                                <span class="step-num">${isDone ? '✓' : (sIdx + 1)}</span>
                                <span class="step-title-text">${escapeHtml(st.title)}</span>
                            </button>
                        `;
                    }).join('')}
                </div>

                <!-- 완수 목표 현황 보드 -->
                <div class="mt-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                    <div class="flex items-start sm:items-center gap-1.5">
                        <span class="font-extrabold text-slate-800 flex items-center gap-1 flex-shrink-0">🎯 단계 완수 조건:</span>
                        <span class="text-slate-500 font-semibold leading-relaxed">각 유형별로 최소 3문제를 맞추면 이 단계가 완수됩니다.</span>
                    </div>
                    <div class="flex gap-2.5 font-bold flex-wrap items-center mt-1 sm:mt-0" id="step-target-board">
                        ${currentStep.quiz ? `
                            <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${tCorrect >= 3 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}">
                                <span>📝 필기:</span>
                                <strong class="text-xs font-mono">${tCorrect}/3회</strong>
                                ${tCorrect >= 3 ? '<span class="text-[11px] font-extrabold text-emerald-600">✅ 완료</span>' : `<span class="text-[11px] font-bold text-amber-600">(${3 - tCorrect}문제 더 필요)</span>`}
                            </span>
                        ` : ''}
                        ${currentStep.journalQuiz ? `
                            <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${jCorrect >= 3 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}">
                                <span>⚖️ 분개:</span>
                                <strong class="text-xs font-mono">${jCorrect}/3회</strong>
                                ${jCorrect >= 3 ? '<span class="text-[11px] font-extrabold text-emerald-600">✅ 완료</span>' : `<span class="text-[11px] font-bold text-amber-600">(${3 - jCorrect}문제 더 필요)</span>`}
                            </span>
                        ` : ''}
                    </div>
                </div>

                <!-- 학습 본문 카드 -->
                <div class="study-card-container mt-4">
                    <!-- 1. 핵심 이론 카드 -->
                    <div class="theory-study-card">
                        <div class="theory-card-header">
                            <div class="flex items-center gap-2">
                                <span class="text-lg">📖</span>
                                <h3 class="text-base font-extrabold text-slate-900">${escapeHtml(currentStep.title)}</h3>
                            </div>
                            <div class="book-ref-tag">
                                📚 ${escapeHtml(currentStep.bookRef)}
                            </div>
                        </div>

                        <div class="theory-card-content mt-3">
                            <p class="text-xs font-bold text-slate-700 leading-relaxed bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                                ${currentStep.theory.summary}
                            </p>

                            <ul class="theory-points-list mt-3">
                                ${currentStep.theory.points.map(pt => `
                                    <li class="theory-point-item text-xs text-slate-600 leading-relaxed">
                                        <i class="fa-solid fa-circle-check text-blue-500 mt-1 flex-shrink-0"></i>
                                        <div>${pt}</div>
                                    </li>
                                `).join('')}
                            </ul>

                            ${currentStep.theory.tip ? `
                                <div class="theory-tip-box mt-3">
                                    ${currentStep.theory.tip}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- 2. 실전 체크 퀴즈 (객관식 필기) -->
                    ${currentStep.quiz ? `
                        <div class="practice-quiz-card mt-5" id="learning-theory-quiz-card">
                            <div class="quiz-card-header">
                                <span class="badge-quiz-type theory">실전 필기 체크</span>
                                <h4 class="text-sm font-extrabold text-slate-800">이론 확인 문제</h4>
                            </div>

                            <div class="quiz-question-text mt-3" id="l-theory-question">
                                ${formatTheoryQuestionHtml(currentStep.quiz.question)}
                            </div>

                            <div class="quiz-options-list mt-3" id="quiz-options-group">
                                ${currentStep.quiz.options.map((opt, oIdx) => `
                                    <label class="quiz-option-item" onclick="LearningEngine.selectOption(${oIdx + 1})">
                                        <input type="radio" name="learning_opt" value="${oIdx + 1}">
                                        <span class="opt-num">${oIdx + 1}</span>
                                        <span class="opt-text">${formatTheoryOptionHtml(opt)}</span>
                                    </label>
                                `).join('')}
                            </div>

                            <div id="quiz-feedback-box" class="quiz-feedback-container hidden mt-4"></div>

                            <div class="flex justify-end mt-4">
                                <button id="btn-submit-theory-quiz" class="btn-quiz-submit font-bold" onclick="LearningEngine.submitTheoryQuiz('${currentStep.id}', '${section.id}')">
                                    정답 확인 및 채점 ➜
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 3. 실전 분개 퀴즈 -->
                    ${currentStep.journalQuiz ? `
                        <div class="practice-quiz-card mt-5 journal-type" id="learning-journal-quiz-card">
                            <div class="quiz-card-header">
                                <span class="badge-quiz-type journal">실전 분개 체크</span>
                                <h4 class="text-sm font-extrabold text-slate-800">실무 분개 연습</h4>
                            </div>

                            <div class="quiz-question-text mt-3" id="l-journal-question">
                                ${escapeHtml(currentStep.journalQuiz.question)}
                            </div>

                            <!-- 분개 입력 폼 -->
                            <div class="journal-input-section mt-4">
                                <div id="j-journal-balance-summary" class="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-4 text-xs font-semibold flex justify-between items-center transition">
                                    <span>차변합계: 0원 / 대변합계: 0원 / 차액: 0원</span>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="journal-box debit-box">
                                        <div class="flex justify-between items-center mb-1">
                                            <div class="box-title">【 차 변 (Dr.) 】</div>
                                            <button class="text-[11px] font-extrabold text-sky-600 hover:underline" onclick="LearningEngine.addDebitRow('', '', true)">+ 줄 추가</button>
                                        </div>
                                        <div id="j-debit-rows-container" class="space-y-2"></div>
                                    </div>
                                    <div class="journal-box credit-box">
                                        <div class="flex justify-between items-center mb-1">
                                            <div class="box-title">【 대 변 (Cr.) 】</div>
                                            <button class="text-[11px] font-extrabold text-purple-600 hover:underline" onclick="LearningEngine.addCreditRow('', '', true)">+ 줄 추가</button>
                                        </div>
                                        <div id="j-credit-rows-container" class="space-y-2"></div>
                                    </div>
                                </div>
                            </div>

                            <div id="journal-feedback-box" class="quiz-feedback-container hidden mt-4"></div>

                            <div class="flex justify-end mt-4">
                                <button id="btn-submit-journal-quiz" class="btn-quiz-submit font-bold" onclick="LearningEngine.submitJournalQuiz('${currentStep.id}', '${section.id}')">
                                    분개 채점하기 ➜
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 다음 단계 이동 버튼 -->
                    <div class="step-bottom-nav mt-6 flex justify-between items-center pt-4 border-t border-slate-200">
                        ${currentStepIdx > 0 ? `
                            <button class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition" onclick="LearningEngine.openSection('${section.id}', ${currentStepIdx - 1})">
                                ◀ 이전 단계
                            </button>
                        ` : `<div></div>`}

                        ${currentStepIdx < section.steps.length - 1 ? `
                            <button class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5" onclick="LearningEngine.openSection('${section.id}', ${currentStepIdx + 1})">
                                다음 단계 ➜
                            </button>
                        ` : `
                            <button class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5" onclick="LearningEngine.showSectionCompleteModal('${section.id}')">
                                🎉 단원 학습 완료
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;

        if (currentStep.journalQuiz) {
            resetJournalInput();
        }
    }

    function selectOption(optNum) {
        document.querySelectorAll('.quiz-option-item').forEach((item, idx) => {
            if (idx + 1 === optNum) {
                item.classList.add('selected');
                const radio = item.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // --- 4. 복수분개 관련 다중 행 및 자동완성 입력 구현 ---
    function resetJournalInput() {
        const dContainer = document.getElementById('j-debit-rows-container');
        const cContainer = document.getElementById('j-credit-rows-container');
        if (dContainer) dContainer.innerHTML = '';
        if (cContainer) cContainer.innerHTML = '';

        addDebitRow('', '', false);
        addCreditRow('', '', false);
        updateJournalBalanceSummary();
    }

    function addDebitRow(acc = '', amt = '', autoFocus = false) {
        const container = document.getElementById('j-debit-rows-container');
        if (!container) return;
        const rowId = 'j-debit-row-' + Date.now() + Math.random();
        const div = document.createElement('div');
        div.className = 'flex gap-2 items-center';
        div.id = rowId;
        let displayAmt = amt !== '' ? Number(amt).toLocaleString() : '';
        div.innerHTML = `
            <div class="relative flex-1 flex items-center min-w-0 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-sky-400">
                <input type="text" lang="ko" style="ime-mode:active; -ms-ime-mode:active;" onchange="if(typeof convertToKoreanIfNeeded==='function') convertToKoreanIfNeeded(this)" onfocus="this.style.imeMode='active'" placeholder="계정과목 (예: 보통예금)" value="${acc}" class="j-debit-acc w-full px-3.5 py-2.5 bg-transparent relative z-10 text-xs text-slate-800 focus:outline-none font-bold">
                <div class="suggest-popup hidden absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-[100] flex flex-col gap-1 max-h-48 overflow-y-auto"></div>
            </div>
            <input type="text" inputmode="numeric" oninput="LearningEngine.formatNumberInput(this)" placeholder="금액" value="${displayAmt}" class="j-debit-amt w-28 sm:w-32 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 text-right font-bold">
            <button onclick="LearningEngine.removeRow('${rowId}')" class="text-slate-400 hover:text-rose-500 p-2 font-bold transition">×</button>
        `;
        container.appendChild(div);
        const accInput = div.querySelector('.j-debit-acc');
        if (typeof attachKoreanInputEvents === 'function') {
            attachKoreanInputEvents(accInput);
        }
        attachLearningAutoCompleteEvents(div, 'debit');
        if (autoFocus && accInput) {
            setTimeout(() => { accInput.focus(); accInput.select(); }, 100);
        }
        updateJournalBalanceSummary();
    }

    function addCreditRow(acc = '', amt = '', autoFocus = false) {
        const container = document.getElementById('j-credit-rows-container');
        if (!container) return;
        const rowId = 'j-credit-row-' + Date.now() + Math.random();
        const div = document.createElement('div');
        div.className = 'flex gap-2 items-center';
        div.id = rowId;
        let displayAmt = amt !== '' ? Number(amt).toLocaleString() : '';
        div.innerHTML = `
            <div class="relative flex-1 flex items-center min-w-0 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-purple-400">
                <input type="text" lang="ko" style="ime-mode:active; -ms-ime-mode:active;" onchange="if(typeof convertToKoreanIfNeeded==='function') convertToKoreanIfNeeded(this)" onfocus="this.style.imeMode='active'" placeholder="계정과목 (예: 외상매출금)" value="${acc}" class="j-credit-acc w-full px-3.5 py-2.5 bg-transparent relative z-10 text-xs text-slate-800 focus:outline-none font-bold">
                <div class="suggest-popup hidden absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-[100] flex flex-col gap-1 max-h-48 overflow-y-auto"></div>
            </div>
            <input type="text" inputmode="numeric" oninput="LearningEngine.formatNumberInput(this)" placeholder="금액" value="${displayAmt}" class="j-credit-amt w-28 sm:w-32 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 text-right font-bold">
            <button onclick="LearningEngine.removeRow('${rowId}')" class="text-slate-400 hover:text-rose-500 p-2 font-bold transition">×</button>
        `;
        container.appendChild(div);
        const accInput = div.querySelector('.j-credit-acc');
        if (typeof attachKoreanInputEvents === 'function') {
            attachKoreanInputEvents(accInput);
        }
        attachLearningAutoCompleteEvents(div, 'credit');
        if (autoFocus && accInput) {
            setTimeout(() => { accInput.focus(); accInput.select(); }, 100);
        }
        updateJournalBalanceSummary();
    }

    function removeRow(rowId) {
        const row = document.getElementById(rowId);
        if (row) {
            const parent = row.parentNode;
            if (parent.children.length > 1) {
                row.remove();
            } else {
                const inputs = row.querySelectorAll('input');
                if (inputs[0]) inputs[0].value = '';
                if (inputs[1]) inputs[1].value = '';
            }
            updateJournalBalanceSummary();
        }
    }

    function formatNumberInput(el) {
        let raw = el.value;
        if (raw.includes('+')) {
            raw = raw.replace(/\+/g, '000');
        }
        let val = raw.replace(/[^0-9]/g, '');
        el.value = (val !== '') ? Number(val).toLocaleString() : '';
        updateJournalBalanceSummary();
    }

    function updateJournalBalanceSummary() {
        const summaryBox = document.getElementById('j-journal-balance-summary');
        if (!summaryBox) return;

        let debitSum = 0;
        document.querySelectorAll('#j-debit-rows-container .j-debit-amt').forEach(input => {
            debitSum += Number(input.value.replace(/[^0-9]/g, '')) || 0;
        });

        let creditSum = 0;
        document.querySelectorAll('#j-credit-rows-container .j-credit-amt').forEach(input => {
            creditSum += Number(input.value.replace(/[^0-9]/g, '')) || 0;
        });

        let diff = Math.abs(debitSum - creditSum);
        let operator = '=';
        if (debitSum < creditSum) operator = '<';
        else if (debitSum > creditSum) operator = '>';

        const isBalanced = (debitSum === creditSum && debitSum > 0);
        let diffBadge = '';
        if (debitSum === creditSum) {
            diffBadge = debitSum > 0 
                ? `<span class="bg-emerald-600 text-white font-extrabold px-2.5 py-0.5 rounded-lg shadow-sm text-[11px]">0원 (일치 ✨)</span>`
                : `<span class="bg-slate-400 text-white font-bold px-2.5 py-0.5 rounded-lg text-[11px]">0원</span>`;
        } else {
            diffBadge = `<span class="bg-amber-500 text-white font-extrabold px-2.5 py-0.5 rounded-lg shadow-sm text-[11px] animate-pulse">${diff.toLocaleString()}원</span>`;
        }

        if (isBalanced) {
            summaryBox.className = "bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4 text-xs font-semibold flex justify-between items-center transition shadow-xs";
        } else {
            summaryBox.className = "bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-4 text-xs font-semibold flex justify-between items-center transition";
        }

        summaryBox.innerHTML = `
            <div class="flex items-center gap-1 w-full flex-wrap">
                <span>차변합계 (<strong class="text-sky-700 font-bold">${debitSum.toLocaleString()}원</strong>)</span>
                <span class="text-amber-600 font-bold px-1">${operator}</span>
                <span>대변합계 (<strong class="text-purple-700 font-bold">${creditSum.toLocaleString()}원</strong>)</span>
                <span class="ml-auto flex items-center gap-1.5">
                    <span>차액</span>
                    ${diffBadge}
                </span>
            </div>
        `;

        document.querySelectorAll('#j-debit-rows-container .j-debit-amt, #j-credit-rows-container .j-credit-amt').forEach(input => {
            const val = Number(input.value.replace(/[^0-9]/g, '')) || 0;
            if (isBalanced && val > 0) {
                input.classList.add('border-emerald-400', 'bg-emerald-50/20', 'text-emerald-950');
                input.classList.remove('border-slate-200', 'bg-white');
            } else {
                input.classList.remove('border-emerald-400', 'bg-emerald-50/20', 'text-emerald-950');
                input.classList.add('border-slate-200', 'bg-white');
            }
        });
    }

    function fillAutoBalance(targetInput) {
        let activeRow = targetInput ? targetInput.closest('#j-debit-rows-container > div, #j-credit-rows-container > div') : null;
        if (!activeRow) {
            const emptyAmt = Array.from(document.querySelectorAll('.j-debit-amt, .j-credit-amt')).find(inp => !inp.value || inp.value === '0');
            if (emptyAmt) {
                activeRow = emptyAmt.closest('#j-debit-rows-container > div, #j-credit-rows-container > div');
                targetInput = emptyAmt;
            } else {
                let debitSum = 0;
                document.querySelectorAll('#j-debit-rows-container .j-debit-amt').forEach(i => debitSum += (Number(i.value.replace(/[^0-9]/g, '')) || 0));
                let creditSum = 0;
                document.querySelectorAll('#j-credit-rows-container .j-credit-amt').forEach(i => creditSum += (Number(i.value.replace(/[^0-9]/g, '')) || 0));

                if (debitSum > creditSum) {
                    const creditRows = document.querySelectorAll('#j-credit-rows-container > div');
                    if (creditRows.length > 0) {
                        activeRow = creditRows[creditRows.length - 1];
                        targetInput = activeRow.querySelector('.j-credit-amt');
                    }
                } else if (creditSum > debitSum) {
                    const debitRows = document.querySelectorAll('#j-debit-rows-container > div');
                    if (debitRows.length > 0) {
                        activeRow = debitRows[debitRows.length - 1];
                        targetInput = activeRow.querySelector('.j-debit-amt');
                    }
                }
            }
        }

        if (!activeRow) return;

        const container = activeRow.parentElement;
        const isDebit = container.id === 'j-debit-rows-container';
        const amtInput = activeRow.querySelector('.j-debit-amt, .j-credit-amt');
        if (!amtInput) return;

        let oppositeSum = 0;
        document.querySelectorAll(isDebit ? '#j-credit-rows-container .j-credit-amt' : '#j-debit-rows-container .j-debit-amt').forEach(input => {
            oppositeSum += (Number(input.value.replace(/[^0-9]/g, '')) || 0);
        });

        let otherSameSum = 0;
        container.querySelectorAll('.j-debit-amt, .j-credit-amt').forEach(input => {
            if (input !== amtInput) {
                otherSameSum += (Number(input.value.replace(/[^0-9]/g, '')) || 0);
            }
        });

        if (oppositeSum > 0) {
            const fillAmt = Math.max(0, oppositeSum - otherSameSum);
            amtInput.value = fillAmt.toLocaleString();
            updateJournalBalanceSummary();
            setTimeout(() => { amtInput.focus(); amtInput.select(); }, 20);
        }
    }

    function attachLearningAutoCompleteEvents(rowDiv, type) {
        const inputEl = rowDiv.querySelector('.j-debit-acc, .j-credit-acc');
        const popupEl = rowDiv.querySelector('.suggest-popup');
        const amtInput = rowDiv.querySelector('.j-debit-amt, .j-credit-amt');

        if (!inputEl || !popupEl) return;

        let activeIndex = -1;
        let currentMatches = [];

        function renderPopup() {
            if (currentMatches.length === 0) {
                popupEl.innerHTML = '';
                popupEl.classList.add('hidden');
                activeIndex = -1;
                return;
            }
            
            let html = '';
            currentMatches.forEach((m, idx) => {
                const isActive = idx === activeIndex;
                const bgClass = isActive ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-400' : 'text-slate-600 hover:bg-slate-50';
                html += `<div class="cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-lg transition ${bgClass}" data-val="${m}">${m}</div>`;
            });
            popupEl.innerHTML = html;
            popupEl.classList.remove('hidden');

            popupEl.querySelectorAll('div').forEach((div, idx) => {
                div.addEventListener('mousedown', (e) => {
                    e.preventDefault(); 
                    selectMatch(currentMatches[idx]);
                });
                div.addEventListener('mouseenter', () => {
                    activeIndex = idx;
                    renderPopup();
                });
            });
        }

        function selectMatch(val) {
            inputEl.value = val;
            currentMatches = [];
            renderPopup();
            if (amtInput) {
                setTimeout(() => { amtInput.focus(); amtInput.select(); }, 20);
            }
        }

        function updateMatches() {
            const val = inputEl.value;
            const trimmed = val.trim();
            
            if (!trimmed) {
                currentMatches = [];
                renderPopup();
                return;
            }

            const searchList = (typeof ACCOUNT_LIST_1 !== 'undefined') ? ACCOUNT_LIST_1 : [];
            currentMatches = [];
            for (let acc of searchList) {
                if (acc.startsWith(trimmed)) {
                    currentMatches.push(acc);
                    if (currentMatches.length >= 8) break;
                }
            }
            
            activeIndex = currentMatches.length > 0 ? 0 : -1;
            renderPopup();
        }

        inputEl.addEventListener('input', updateMatches);
        inputEl.addEventListener('focus', updateMatches);
        
        inputEl.addEventListener('keydown', (e) => {
            if (e.isComposing || e.keyCode === 229) return;

            if (!popupEl.classList.contains('hidden') && currentMatches.length > 0) {
                if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
                    e.preventDefault();
                    activeIndex++;
                    if (activeIndex >= currentMatches.length) activeIndex = 0;
                    renderPopup();
                    return;
                } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
                    e.preventDefault();
                    activeIndex--;
                    if (activeIndex < 0) activeIndex = currentMatches.length - 1;
                    renderPopup();
                    return;
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (activeIndex >= 0 && activeIndex < currentMatches.length) {
                        selectMatch(currentMatches[activeIndex]);
                    } else {
                        if (amtInput) {
                            currentMatches = [];
                            renderPopup();
                            setTimeout(() => { amtInput.focus(); amtInput.select(); }, 20);
                        }
                    }
                    return;
                } else if (e.key === 'Escape') {
                    currentMatches = [];
                    renderPopup();
                    return;
                }
            } else {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (amtInput) {
                        setTimeout(() => { amtInput.focus(); amtInput.select(); }, 20);
                    }
                }
            }
        });

        inputEl.addEventListener('blur', () => {
            setTimeout(() => {
                currentMatches = [];
                renderPopup();
            }, 150);
        });

        if (amtInput) {
            amtInput.addEventListener('keydown', (e) => {
                if (e.isComposing || e.keyCode === 229) return;
                
                if (e.key === '+' || e.key === 'Add' || e.code === 'NumpadAdd') {
                    e.preventDefault();
                    let raw = amtInput.value.replace(/[^0-9]/g, '');
                    if (raw !== '') {
                        let newVal = raw + '000';
                        amtInput.value = Number(newVal).toLocaleString();
                        updateJournalBalanceSummary();
                    }
                    return;
                }

                if (e.key === '-' || e.key === 'Subtract' || e.code === 'NumpadSubtract') {
                    e.preventDefault();
                    fillAutoBalance(amtInput);
                    return;
                }

                if (e.key === 'Enter') {
                    e.preventDefault();
                    
                    const currentWrapper = rowDiv;
                    const nextRow = currentWrapper.nextElementSibling;

                    if (type === 'debit') {
                        if (nextRow && nextRow.querySelector('.j-debit-acc')) {
                            const nextAcc = nextRow.querySelector('.j-debit-acc');
                            setTimeout(() => { nextAcc.focus(); nextAcc.select(); }, 20);
                            return;
                        }

                        const firstCreditRow = document.querySelector('#j-credit-rows-container > div');
                        if (firstCreditRow) {
                            const creditAmtInput = firstCreditRow.querySelector('.j-credit-amt');
                            const creditAccInput = firstCreditRow.querySelector('.j-credit-acc');

                            if (creditAmtInput && (!creditAmtInput.value || creditAmtInput.value === '0')) {
                                let debitSum = 0;
                                document.querySelectorAll('#j-debit-rows-container .j-debit-amt').forEach(inp => {
                                    debitSum += (Number(inp.value.replace(/[^0-9]/g, '')) || 0);
                                });
                                if (debitSum > 0) {
                                    creditAmtInput.value = debitSum.toLocaleString();
                                    updateJournalBalanceSummary();
                                }
                            }

                            if (creditAccInput) {
                                setTimeout(() => { creditAccInput.focus(); creditAccInput.select(); }, 20);
                                return;
                            }
                        }
                    } else if (type === 'credit') {
                        if (nextRow && nextRow.querySelector('.j-credit-acc')) {
                            const nextAcc = nextRow.querySelector('.j-credit-acc');
                            setTimeout(() => { nextAcc.focus(); nextAcc.select(); }, 20);
                            return;
                        }

                        const firstDebitRow = document.querySelector('#j-debit-rows-container > div');
                        if (firstDebitRow) {
                            const debitAmtInput = firstDebitRow.querySelector('.j-debit-amt');
                            const debitAccInput = firstDebitRow.querySelector('.j-debit-acc');

                            if (debitAmtInput && (!debitAmtInput.value || debitAmtInput.value === '0')) {
                                let creditSum = 0;
                                document.querySelectorAll('#j-credit-rows-container .j-credit-amt').forEach(inp => {
                                    creditSum += (Number(inp.value.replace(/[^0-9]/g, '')) || 0);
                                });
                                if (creditSum > 0) {
                                    debitAmtInput.value = creditSum.toLocaleString();
                                    updateJournalBalanceSummary();
                                }
                            }

                            if (debitAccInput && !debitAccInput.value.trim()) {
                                setTimeout(() => { debitAccInput.focus(); debitAccInput.select(); }, 20);
                                return;
                            }
                        }
                        
                        const submitBtn = document.getElementById('btn-submit-journal-quiz');
                        if (submitBtn) submitBtn.click();
                    }
                }
            });
        }
    }

    // --- 5. 비동기 엑셀 로딩 및 유사 문제 더풀기 코어 로직 구현 ---
    function loadExcelFileDirectly(fileName, type) {
        return new Promise((resolve, reject) => {
            if (window.quizDataCache && window.quizDataCache[fileName]) {
                resolve(window.quizDataCache[fileName]);
                return;
            }

            if (loadingExcelFiles[fileName]) {
                const onMessage = function(e) {
                    if (e.data && e.data.fileKey === fileName) {
                        excelWorker.removeEventListener('message', onMessage);
                        resolve(e.data);
                    }
                };
                excelWorker.addEventListener('message', onMessage);
                return;
            }

            loadingExcelFiles[fileName] = true;

            const cleanUrl = fileName.replace(/^excels\//, '');
            const urlsToTry = [
                'excels/' + encodeURI(cleanUrl),
                'excels/' + cleanUrl,
                encodeURI(cleanUrl),
                cleanUrl
            ];

            function tryFetch(index) {
                if (index >= urlsToTry.length) {
                    delete loadingExcelFiles[fileName];
                    reject(new Error(`'${fileName}' 파일을 불러오지 못했습니다.`));
                    return;
                }

                const targetUrl = urlsToTry[index];
                fetch(targetUrl)
                    .then(res => {
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        return res.arrayBuffer();
                    })
                    .then(buffer => {
                        if (typeof excelWorker !== 'undefined') {
                            const onMessage = function(e) {
                                if (e.data && e.data.fileKey === fileName) {
                                    excelWorker.removeEventListener('message', onMessage);
                                    delete loadingExcelFiles[fileName];
                                    resolve(e.data);
                                }
                            };
                            excelWorker.addEventListener('message', onMessage);
                            excelWorker.postMessage({ data: buffer, type: type, fileKey: fileName });
                        } else {
                            delete loadingExcelFiles[fileName];
                            reject(new Error('excelWorker가 정의되어 있지 않습니다.'));
                        }
                    })
                    .catch(err => {
                        console.warn(`[${targetUrl}] 직접 로드 시도 중 오류, 다음 시도...`, err);
                        tryFetch(index + 1);
                    });
            }

            tryFetch(0);
        });
    }

    async function loadMoreQuiz(stepId, sectionId, type) {
        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);
        const step = section ? section.steps.find(st => st.id === stepId) : null;
        if (!step) return;

        // 1. [방안 A] 동적 회계 문제 생성기 우선 호출 (실시간 무한 변형 문제)
        if (window.LearningGenerator && typeof window.LearningGenerator.generateDynamicQuiz === 'function') {
            const dynQuiz = window.LearningGenerator.generateDynamicQuiz(stepId, sectionId, type);
            if (dynQuiz) {
                currentExtraQuiz = dynQuiz;
                applyExtraQuizToUI(stepId, sectionId, type);
                return;
            }
        }

        // 2. 폴백: 엑셀 파일셋 비동기 로딩 및 1:1 파싱
        const keywords = step.keywords || [];
        if (keywords.length === 0) {
            alert('이 단원은 유사문제용 검색 키워드가 준비되지 않았습니다.');
            return;
        }

        let targetExcelFiles = [];
        if (type === 'journal') {
            targetExcelFiles = [
                { name: '1급_전산회계책_분개.xlsx', type: 'journal' },
                { name: '1급_기출문제_분개.xlsx', type: 'journal' },
                { name: '1급_분개문제(AI).xlsx', type: 'journal' }
            ];
        } else {
            targetExcelFiles = [
                { name: '1급_전산회계책_필기.xlsx', type: 'theory' },
                { name: '1급_기출문제_필기.xlsx', type: 'theory' },
                { name: '1급_필기문제(AI).xlsx', type: 'theory' }
            ];
        }

        const feedbackBoxId = type === 'theory' ? 'quiz-feedback-box' : 'journal-feedback-box';
        const fbBox = document.getElementById(feedbackBoxId);
        if (fbBox) {
            fbBox.classList.remove('hidden');
            fbBox.className = 'quiz-feedback-container mt-4 text-center py-6 text-slate-500 font-bold';
            fbBox.innerHTML = `
                <div class="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                <div class="text-xs">유사 기출문제를 로딩하는 중입니다... 잠시만 기다려주세요 ⏳</div>
            `;
        }

        try {
            const loadPromises = targetExcelFiles.map(file => loadExcelFileDirectly(file.name, file.type));
            await Promise.all(loadPromises);
        } catch (e) {
            alert('유사문제를 불러오는 도중 오류가 발생했습니다: ' + e.message);
            if (fbBox) fbBox.classList.add('hidden');
            return;
        }

        let allProblemsWithAnswers = [];

        targetExcelFiles.forEach(file => {
            const cache = window.quizDataCache && window.quizDataCache[file.name];
            if (cache) {
                if (type === 'journal') {
                    const probMap = new Map(cache.problemsMapArr || []);
                    const ansMap = new Map(cache.answersMapArr || []);
                    probMap.forEach((probObj, id) => {
                        const ansObj = ansMap.get(id);
                        if (ansObj) {
                            allProblemsWithAnswers.push({
                                fileSource: file.name,
                                id: `${file.name}_${id}`,
                                originalId: id,
                                prob: probObj,
                                ans: ansObj
                            });
                        }
                    });
                } else {
                    const probMap = new Map(cache.theoryProblemsMapArr || []);
                    const ansMap = new Map(cache.theoryAnswersMapArr || []);
                    probMap.forEach((probObj, id) => {
                        const ansObj = ansMap.get(id);
                        if (ansObj) {
                            allProblemsWithAnswers.push({
                                fileSource: file.name,
                                id: `${file.name}_${id}`,
                                originalId: id,
                                prob: probObj,
                                ans: ansObj
                            });
                        }
                    });
                }
            }
        });

        if (allProblemsWithAnswers.length === 0) {
            alert('문제를 불러왔으나 파싱된 데이터가 존재하지 않습니다.');
            if (fbBox) fbBox.classList.add('hidden');
            return;
        }

        const filtered = allProblemsWithAnswers.filter(item => {
            const probObj = item.prob;
            const text = (probObj.text || '').replace(/\s+/g, '');
            const category = (probObj.category || '').replace(/\s+/g, '');
            return keywords.some(k => text.includes(k) || category.includes(k));
        });

        if (filtered.length === 0) {
            alert('현재 스텝의 키워드에 상응하는 유사문제를 엑셀 파일셋에서 찾지 못했습니다.');
            if (fbBox) fbBox.classList.add('hidden');
            return;
        }

        const chosen = filtered[Math.floor(Math.random() * filtered.length)];
        const chosenProb = chosen.prob;
        const chosenAns = chosen.ans;

        let sourceLabel = chosen.fileSource.replace('.xlsx', '').replace(/_/g, ' ');
        let bookRefText = `[${sourceLabel} #${chosen.originalId}] ${chosenProb.category || ''}`.trim();

        currentExtraQuiz = {
            id: chosen.id,
            originalId: chosen.originalId,
            fileSource: chosen.fileSource,
            type: type,
            question: chosenProb.text,
            options: chosenProb.choices || [],
            correctAnswer: chosenAns.answer !== undefined ? parseInt(chosenAns.answer, 10) : null,
            debit: chosenAns.debit || [],
            credit: chosenAns.credit || [],
            explanation: chosenAns.explanation || '추가 해설이 없습니다.',
            bookReference: bookRefText
        };

        applyExtraQuizToUI(stepId, sectionId, type);
    }

    function applyExtraQuizToUI(stepId, sectionId, type) {
        if (!currentExtraQuiz) return;
        const feedbackBoxId = type === 'theory' ? 'quiz-feedback-box' : 'journal-feedback-box';
        const fbBox = document.getElementById(feedbackBoxId);

        if (type === 'theory') {
            const qCard = document.getElementById('learning-theory-quiz-card');
            if (qCard) {
                const qText = qCard.querySelector('#l-theory-question');
                if (qText) qText.innerHTML = formatTheoryQuestionHtml(currentExtraQuiz.question);

                const optionsGroup = qCard.querySelector('#quiz-options-group');
                if (optionsGroup && currentExtraQuiz.options.length > 0) {
                    optionsGroup.innerHTML = currentExtraQuiz.options.map((opt, oIdx) => `
                        <label class="quiz-option-item" onclick="LearningEngine.selectOption(${oIdx + 1})">
                            <input type="radio" name="learning_opt" value="${oIdx + 1}">
                            <span class="opt-num">${oIdx + 1}</span>
                            <span class="opt-text">${formatTheoryOptionHtml(opt)}</span>
                        </label>
                    `).join('');
                }

                if (fbBox) {
                    fbBox.classList.add('hidden');
                    fbBox.innerHTML = '';
                }

                const submitBtn = qCard.querySelector('#btn-submit-theory-quiz');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = '유사문제 채점 및 확인 ➜';
                    submitBtn.setAttribute('onclick', `LearningEngine.submitExtraTheoryQuiz('${stepId}', '${sectionId}')`);
                }
            }
        } else if (type === 'journal') {
            const qCard = document.getElementById('learning-journal-quiz-card');
            if (qCard) {
                const qText = qCard.querySelector('#l-journal-question');
                if (qText) qText.innerText = currentExtraQuiz.question;

                resetJournalInput();

                if (fbBox) {
                    fbBox.classList.add('hidden');
                    fbBox.innerHTML = '';
                }

                const submitBtn = qCard.querySelector('#btn-submit-journal-quiz');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = '유사분개 채점 및 확인 ➜';
                    submitBtn.setAttribute('onclick', `LearningEngine.submitExtraJournalQuiz('${stepId}', '${sectionId}')`);
                }
            }
        }

        const targetCardId = type === 'theory' ? 'learning-theory-quiz-card' : 'learning-journal-quiz-card';
        document.getElementById(targetCardId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // --- 6. 채점 연동 및 피드백 (유사문제용 포함) ---
    async function submitTheoryQuiz(stepId, sectionId) {
        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);
        const step = section ? section.steps.find(st => st.id === stepId) : null;
        if (!step || !step.quiz) return;

        const selectedRadio = document.querySelector('input[name="learning_opt"]:checked');
        if (!selectedRadio) {
            alert('보기를 선택해주세요!');
            return;
        }

        const chosenVal = parseInt(selectedRadio.value, 10);
        const isCorrect = chosenVal === step.quiz.correctAnswer;
        const fbBox = document.getElementById('quiz-feedback-box');
        const submitBtn = document.getElementById('btn-submit-theory-quiz');
        if (submitBtn) submitBtn.disabled = true;

        if (fbBox) {
            fbBox.classList.remove('hidden');
            fbBox.className = isCorrect ? 'quiz-feedback-container correct mt-4' : 'quiz-feedback-container wrong mt-4';
            if (isCorrect) {
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-emerald-800 text-sm">
                        <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i> 정답입니다! 완벽하게 이해하셨네요.
                    </div>
                    <div class="text-xs text-emerald-700 mt-1.5 leading-relaxed">
                        ${escapeHtml(step.quiz.explanation)}
                    </div>
                `;
            } else {
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-rose-800 text-sm">
                        <i class="fa-solid fa-circle-xmark text-rose-600 text-base"></i> 아쉽습니다! 오답입니다. (정답: ${step.quiz.correctAnswer}번)
                    </div>
                    <div class="text-xs text-rose-700 mt-1.5 leading-relaxed">
                        <strong>해설:</strong> ${escapeHtml(step.quiz.explanation)}
                    </div>
                    <div class="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2">
                        <span class="text-amber-700 text-base">📖</span>
                        <div>
                            <div class="text-xs font-extrabold text-amber-900">교재 복습 가이드</div>
                            <div class="text-xs font-semibold text-amber-800 mt-0.5">${escapeHtml(step.quiz.bookReference)}</div>
                            <div class="text-[11px] text-amber-700 mt-0.5">이 문제는 자동으로 <strong>[오답노트]</strong>에 기록되었습니다.</div>
                        </div>
                    </div>
                `;
            }

            fbBox.innerHTML += `
                <div class="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                    <button class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-md transition text-xs"
                            onclick="LearningEngine.loadMoreQuiz('${stepId}', '${sectionId}', 'theory')">
                        🔄 이 단원 유사 필기문제 더 풀기
                    </button>
                </div>
            `;
        }

        const prog = window.LearningAuth.getProgress() || {};
        const counts = (prog.correct_counts && prog.correct_counts[stepId]) || { theory: 0, journal: 0 };
        let theoryCorrect = counts.theory || 0;
        let journalCorrect = counts.journal || 0;

        if (isCorrect) theoryCorrect++;

        const targetTheoryNeed = step.quiz ? 3 : 0;
        const targetJournalNeed = step.journalQuiz ? 3 : 0;
        const isStepCompleted = (theoryCorrect >= targetTheoryNeed) && (journalCorrect >= targetJournalNeed);

        await saveProgress(stepId, sectionId, isCorrect, 'theory', isStepCompleted, {
            id: step.quiz.id,
            section_title: section.title,
            type: 'theory',
            question: step.quiz.question,
            options: step.quiz.options,
            correct_answer: `${step.quiz.correctAnswer}번 (${step.quiz.options[step.quiz.correctAnswer - 1]})`,
            explanation: step.quiz.explanation,
            book_reference: step.quiz.bookReference
        });

        if (isStepCompleted && section && currentStepIdx === section.steps.length - 1) {
            setTimeout(() => {
                showSectionCompleteModal(sectionId);
            }, 1200);
        }
    }

    async function submitExtraTheoryQuiz(stepId, sectionId) {
        if (!currentExtraQuiz) return;

        const selectedRadio = document.querySelector('input[name="learning_opt"]:checked');
        if (!selectedRadio) {
            alert('보기를 선택해주세요!');
            return;
        }

        const chosenVal = parseInt(selectedRadio.value, 10);
        const isCorrect = chosenVal === currentExtraQuiz.correctAnswer;
        const fbBox = document.getElementById('quiz-feedback-box');
        const submitBtn = document.getElementById('btn-submit-theory-quiz');
        if (submitBtn) submitBtn.disabled = true;

        if (fbBox) {
            fbBox.classList.remove('hidden');
            fbBox.className = isCorrect ? 'quiz-feedback-container correct mt-4' : 'quiz-feedback-container wrong mt-4';
            if (isCorrect) {
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-emerald-800 text-sm">
                        <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i> 정답입니다! (유사문제 통과)
                    </div>
                    <div class="text-xs text-emerald-700 mt-1.5 leading-relaxed">
                        ${escapeHtml(currentExtraQuiz.explanation)}
                    </div>
                `;
            } else {
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-rose-800 text-sm">
                        <i class="fa-solid fa-circle-xmark text-rose-600 text-base"></i> 아쉽습니다! 오답입니다. (정답: ${currentExtraQuiz.correctAnswer}번)
                    </div>
                    <div class="text-xs text-rose-700 mt-1.5 leading-relaxed">
                        <strong>해설:</strong> ${escapeHtml(currentExtraQuiz.explanation)}
                    </div>
                    <div class="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2 text-xs">
                        📌 <strong>안내</strong>: 이 유사문제는 자동으로 오답노트에 보관되었습니다.
                    </div>
                `;
            }

            fbBox.innerHTML += `
                <div class="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                    <button class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-md transition text-xs"
                            onclick="LearningEngine.loadMoreQuiz('${stepId}', '${sectionId}', 'theory')">
                        🔄 유사 필기문제 한번 더 풀기
                    </button>
                </div>
            `;
        }

        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);

        const prog = window.LearningAuth.getProgress() || {};
        const counts = (prog.correct_counts && prog.correct_counts[stepId]) || { theory: 0, journal: 0 };
        let theoryCorrect = counts.theory || 0;
        let journalCorrect = counts.journal || 0;

        if (isCorrect) theoryCorrect++;

        const step = section ? section.steps.find(st => st.id === stepId) : null;
        const targetTheoryNeed = step && step.quiz ? 3 : 0;
        const targetJournalNeed = step && step.journalQuiz ? 3 : 0;
        const isStepCompleted = (theoryCorrect >= targetTheoryNeed) && (journalCorrect >= targetJournalNeed);

        await saveProgress(stepId, sectionId, isCorrect, 'theory', isStepCompleted, {
            id: currentExtraQuiz.id,
            section_title: section ? section.title : '유사문제',
            type: 'theory',
            question: currentExtraQuiz.question,
            options: currentExtraQuiz.options,
            correct_answer: `${currentExtraQuiz.correctAnswer}번 (${currentExtraQuiz.options[currentExtraQuiz.correctAnswer - 1]})`,
            explanation: currentExtraQuiz.explanation,
            book_reference: currentExtraQuiz.bookReference
        });

        if (isStepCompleted && section && currentStepIdx === section.steps.length - 1) {
            setTimeout(() => {
                showSectionCompleteModal(sectionId);
            }, 1200);
        }
    }

    async function submitJournalQuiz(stepId, sectionId) {
        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);
        const step = section ? section.steps.find(st => st.id === stepId) : null;
        if (!step || !step.journalQuiz) return;

        const userDebits = [];
        document.querySelectorAll('#j-debit-rows-container > div').forEach(row => {
            const acc = (row.querySelector('.j-debit-acc')?.value || '').trim();
            const amt = Number((row.querySelector('.j-debit-amt')?.value || '').replace(/,/g, '')) || 0;
            if (acc || amt > 0) userDebits.push({ account: acc, amount: amt });
        });

        const userCredits = [];
        document.querySelectorAll('#j-credit-rows-container > div').forEach(row => {
            const acc = (row.querySelector('.j-credit-acc')?.value || '').trim();
            const amt = Number((row.querySelector('.j-credit-amt')?.value || '').replace(/,/g, '')) || 0;
            if (acc || amt > 0) userCredits.push({ account: acc, amount: amt });
        });

        if (userDebits.length === 0 && userCredits.length === 0) {
            alert('차변과 대변에 계정과 금액을 입력해주세요!');
            return;
        }

        const targetDebit = step.journalQuiz.debit;
        const targetCredit = step.journalQuiz.credit;

        let isCorrect = false;
        if (typeof compareEntries === 'function') {
            isCorrect = compareEntries(userDebits, targetDebit) && compareEntries(userCredits, targetCredit);
        } else {
            const dMatch = userDebits[0] && userDebits[0].account === targetDebit[0].account && userDebits[0].amount === targetDebit[0].amount;
            const cMatch = userCredits[0] && userCredits[0].account === targetCredit[0].account && userCredits[0].amount === targetCredit[0].amount;
            isCorrect = dMatch && cMatch;
        }

        const fbBox = document.getElementById('journal-feedback-box');
        const submitBtn = document.getElementById('btn-submit-journal-quiz');
        if (submitBtn) submitBtn.disabled = true;

        let correctText = '';
        targetDebit.forEach(d => correctText += `(차) ${d.account} ${d.amount.toLocaleString()}원 `);
        correctText += ` / `;
        targetCredit.forEach(c => correctText += `(대) ${c.account} ${c.amount.toLocaleString()}원 `);

        if (fbBox) {
            fbBox.classList.remove('hidden');
            fbBox.className = isCorrect ? 'quiz-feedback-container correct mt-4' : 'quiz-feedback-container wrong mt-4';
            if (isCorrect) {
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-emerald-800 text-sm">
                        <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i> 정확한 분개입니다! 완벽합니다.
                    </div>
                    <div class="text-xs text-emerald-700 mt-1.5 leading-relaxed">
                        ${escapeHtml(step.journalQuiz.explanation)}
                    </div>
                `;
            } else {
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-rose-800 text-sm">
                        <i class="fa-solid fa-circle-xmark text-rose-600 text-base"></i> 분개가 일치하지 않습니다.
                    </div>
                    <div class="text-xs text-rose-700 mt-1.5 leading-relaxed">
                        <strong>정답 분개:</strong> <span class="font-bold underline">${escapeHtml(correctText)}</span><br>
                        <strong>해설:</strong> ${escapeHtml(step.journalQuiz.explanation)}
                    </div>
                    <div class="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2">
                        <span class="text-amber-700 text-base">📖</span>
                        <div>
                            <div class="text-xs font-extrabold text-amber-900">교재 복습 가이드</div>
                            <div class="text-xs font-semibold text-amber-800 mt-0.5">${escapeHtml(step.journalQuiz.bookReference)}</div>
                            <div class="text-[11px] text-amber-700 mt-0.5">이 분개 문제는 자동으로 <strong>[오답노트]</strong>에 저장되었습니다.</div>
                        </div>
                    </div>
                `;
            }

            fbBox.innerHTML += `
                <div class="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                    <button class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-md transition text-xs"
                            onclick="LearningEngine.loadMoreQuiz('${stepId}', '${sectionId}', 'journal')">
                        🔄 이 단원 유사 분개문제 더 풀기
                    </button>
                </div>
            `;
        }

        const prog = window.LearningAuth.getProgress() || {};
        const counts = (prog.correct_counts && prog.correct_counts[stepId]) || { theory: 0, journal: 0 };
        let theoryCorrect = counts.theory || 0;
        let journalCorrect = counts.journal || 0;

        if (isCorrect) journalCorrect++;

        const targetTheoryNeed = step.quiz ? 3 : 0;
        const targetJournalNeed = step.journalQuiz ? 3 : 0;
        const isStepCompleted = (theoryCorrect >= targetTheoryNeed) && (journalCorrect >= targetJournalNeed);

        await saveProgress(stepId, sectionId, isCorrect, 'journal', isStepCompleted, {
            id: step.journalQuiz.id,
            section_title: section.title,
            type: 'journal',
            question: step.journalQuiz.question,
            correct_answer: correctText,
            explanation: step.journalQuiz.explanation,
            book_reference: step.journalQuiz.bookReference
        });

        if (isStepCompleted && section && currentStepIdx === section.steps.length - 1) {
            setTimeout(() => {
                showSectionCompleteModal(sectionId);
            }, 1200);
        }
    }

    async function submitExtraJournalQuiz(stepId, sectionId) {
        if (!currentExtraQuiz) return;

        const userDebits = [];
        document.querySelectorAll('#j-debit-rows-container > div').forEach(row => {
            const acc = (row.querySelector('.j-debit-acc')?.value || '').trim();
            const amt = Number((row.querySelector('.j-debit-amt')?.value || '').replace(/,/g, '')) || 0;
            if (acc || amt > 0) userDebits.push({ account: acc, amount: amt });
        });

        const userCredits = [];
        document.querySelectorAll('#j-credit-rows-container > div').forEach(row => {
            const acc = (row.querySelector('.j-credit-acc')?.value || '').trim();
            const amt = Number((row.querySelector('.j-credit-amt')?.value || '').replace(/,/g, '')) || 0;
            if (acc || amt > 0) userCredits.push({ account: acc, amount: amt });
        });

        if (userDebits.length === 0 && userCredits.length === 0) {
            alert('차변과 대변에 계정과 금액을 입력해주세요!');
            return;
        }

        let isCorrect = false;
        if (typeof compareEntries === 'function') {
            isCorrect = compareEntries(userDebits, currentExtraQuiz.debit) && compareEntries(userCredits, currentExtraQuiz.credit);
        }

        const fbBox = document.getElementById('journal-feedback-box');
        const submitBtn = document.getElementById('btn-submit-journal-quiz');
        if (submitBtn) submitBtn.disabled = true;

        let correctText = '';
        currentExtraQuiz.debit.forEach(d => correctText += `(차) ${d.account} ${d.amount.toLocaleString()}원 `);
        correctText += ` / `;
        currentExtraQuiz.credit.forEach(c => correctText += `(대) ${c.account} ${c.amount.toLocaleString()}원 `);

        if (fbBox) {
            fbBox.classList.remove('hidden');
            fbBox.className = isCorrect ? 'quiz-feedback-container correct mt-4' : 'quiz-feedback-container wrong mt-4';
            if (isCorrect) {
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-emerald-800 text-sm">
                        <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i> 정답입니다! (유사분개 통과)
                    </div>
                    <div class="text-xs text-emerald-700 mt-1.5 leading-relaxed">
                        ${escapeHtml(currentExtraQuiz.explanation)}
                    </div>
                `;
            } else {
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-rose-800 text-sm">
                        <i class="fa-solid fa-circle-xmark text-rose-600 text-base"></i> 분개가 일치하지 않습니다.
                    </div>
                    <div class="text-xs text-rose-700 mt-1.5 leading-relaxed">
                        <strong>정답 분개:</strong> <span class="font-bold underline">${escapeHtml(correctText)}</span><br>
                        <strong>해설:</strong> ${escapeHtml(currentExtraQuiz.explanation)}
                    </div>
                    <div class="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2 text-xs">
                        📌 <strong>안내</strong>: 이 유사문제는 자동으로 오답노트에 보관되었습니다.
                    </div>
                `;
            }

            fbBox.innerHTML += `
                <div class="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                    <button class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-md transition text-xs"
                            onclick="LearningEngine.loadMoreQuiz('${stepId}', '${sectionId}', 'journal')">
                        🔄 유사 분개문제 한번 더 풀기
                    </button>
                </div>
            `;
        }

        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);

        const prog = window.LearningAuth.getProgress() || {};
        const counts = (prog.correct_counts && prog.correct_counts[stepId]) || { theory: 0, journal: 0 };
        let theoryCorrect = counts.theory || 0;
        let journalCorrect = counts.journal || 0;

        if (isCorrect) journalCorrect++;

        const step = section ? section.steps.find(st => st.id === stepId) : null;
        const targetTheoryNeed = step && step.quiz ? 3 : 0;
        const targetJournalNeed = step && step.journalQuiz ? 3 : 0;
        const isStepCompleted = (theoryCorrect >= targetTheoryNeed) && (journalCorrect >= targetJournalNeed);

        await saveProgress(stepId, sectionId, isCorrect, 'journal', isStepCompleted, {
            id: currentExtraQuiz.id,
            section_title: section ? section.title : '유사문제',
            type: 'journal',
            question: currentExtraQuiz.question,
            correct_answer: correctText,
            explanation: currentExtraQuiz.explanation,
            book_reference: currentExtraQuiz.bookReference
        });

        if (isStepCompleted && section && currentStepIdx === section.steps.length - 1) {
            setTimeout(() => {
                showSectionCompleteModal(sectionId);
            }, 1200);
        }
    }

    async function saveProgress(stepId, sectionId, isCorrect, quizType, isStepCompleted, wrongData) {
        try {
            const curriculum = window.LearningCurriculum;
            const section = curriculum.sections.find(s => s.id === sectionId);
            const prog = window.LearningAuth.getProgress() || {};
            
            let completedList = [...(prog.completed_steps || [])];
            if (isStepCompleted && stepId && !completedList.includes(stepId)) {
                completedList.push(stepId);
            }
            
            // --- 정밀 마이크로 진도율 전송값 계산 ---
            let totalWeight = 0;
            let acquiredWeight = 0;

            section.steps.forEach(st => {
                const counts = (prog.correct_counts && prog.correct_counts[st.id]) || { theory: 0, journal: 0 };
                let curT = counts.theory || 0;
                let curJ = counts.journal || 0;

                // 이번 저장 요청의 변동분 반영
                if (st.id === stepId && isCorrect) {
                    if (quizType === 'theory') curT++;
                    if (quizType === 'journal') curJ++;
                }

                const reqT = st.quiz ? 3 : 0;
                const reqJ = st.journalQuiz ? 3 : 0;
                const maxScore = reqT + reqJ;

                if (maxScore > 0) {
                    const finalT = Math.min(reqT, curT);
                    const finalJ = Math.min(reqJ, curJ);
                    acquiredWeight += (finalT + finalJ);
                    totalWeight += maxScore;
                }
            });

            let sPct = totalWeight > 0 ? Math.round((acquiredWeight / totalWeight) * 100) : 0;

            const res = await fetch('?action=learning_save_step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step_id: stepId,
                    section_id: sectionId,
                    quiz_type: quizType,
                    is_correct: isCorrect,
                    is_step_completed: isStepCompleted,
                    section_pct: stepId ? sPct : null, 
                    wrong_data: isCorrect ? null : wrongData
                })
            });
            const data = await res.json();
            if (res.ok && data.success && data.progress) {
                window.LearningAuth.setProgress(data.progress);
                if (currentSectionId === sectionId && stepId) {
                    const counts = (data.progress.correct_counts && data.progress.correct_counts[stepId]) || { theory: 0, journal: 0 };
                    updateGoalBoardUI(stepId, counts);
                }
            }
        } catch (e) {
            console.error('진도 저장 실패:', e);
        }
    }

    function updateGoalBoardUI(stepId, counts) {
        const curriculum = window.LearningCurriculum;
        const section = window.LearningCurriculum.sections.find(s => s.id === currentSectionId);
        const currentStep = section ? section.steps.find(st => st.id === stepId) : null;
        if (!currentStep) return;

        const tCorrect = counts.theory || 0;
        const jCorrect = counts.journal || 0;

        const board = document.querySelector('.learning-study-view > div.bg-slate-50');
        if (board) {
            board.innerHTML = `
                <div class="flex items-start sm:items-center gap-1.5">
                    <span class="font-extrabold text-slate-800 flex items-center gap-1 flex-shrink-0">🎯 단계 완수 조건:</span>
                    <span class="text-slate-500 font-semibold leading-relaxed">각 유형별로 최소 3문제를 맞추면 이 단계가 완수됩니다.</span>
                </div>
                <div class="flex gap-2.5 font-bold flex-wrap items-center mt-1 sm:mt-0" id="step-target-board">
                    ${currentStep.quiz ? `
                        <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${tCorrect >= 3 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}">
                            <span>📝 필기:</span>
                            <strong class="text-xs font-mono">${tCorrect}/3회</strong>
                            ${tCorrect >= 3 ? '<span class="text-[11px] font-extrabold text-emerald-600">✅ 완료</span>' : `<span class="text-[11px] font-bold text-amber-600">(${3 - tCorrect}문제 더 필요)</span>`}
                        </span>
                    ` : ''}
                    ${currentStep.journalQuiz ? `
                        <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${jCorrect >= 3 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}">
                            <span>⚖️ 분개:</span>
                            <strong class="text-xs font-mono">${jCorrect}/3회</strong>
                            ${jCorrect >= 3 ? '<span class="text-[11px] font-extrabold text-emerald-600">✅ 완료</span>' : `<span class="text-[11px] font-bold text-amber-600">(${3 - jCorrect}문제 더 필요)</span>`}
                        </span>
                    ` : ''}
                </div>
            `;
        }

        const stepTabs = document.querySelectorAll('.step-nav-tabs > button');
        if (stepTabs && section) {
            const sIdx = section.steps.findIndex(st => st.id === stepId);
            const targetNeedT = currentStep.quiz ? 3 : 0;
            const targetNeedJ = currentStep.journalQuiz ? 3 : 0;
            if (sIdx !== -1 && stepTabs[sIdx]) {
                const isStepDone = (tCorrect >= targetNeedT) && (jCorrect >= targetNeedJ);
                const numSpan = stepTabs[sIdx].querySelector('.step-num');
                if (numSpan) {
                    if (isStepDone) {
                        stepTabs[sIdx].classList.add('done');
                        numSpan.innerText = '✓';
                    } else {
                        stepTabs[sIdx].classList.remove('done');
                        numSpan.innerText = (sIdx + 1);
                    }
                }
            }
        }
    }

    // --- 7. 단원 완료 가이드 선택지 모달 팝업 ---
    function showSectionCompleteModal(sectionId) {
        const curriculum = window.LearningCurriculum;
        const sections = curriculum.sections;
        const curIdx = sections.findIndex(s => s.id === sectionId);
        const section = sections[curIdx];
        const nextSection = sections[curIdx + 1];
        
        let modal = document.getElementById('learning-section-complete-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'learning-section-complete-modal';
            modal.className = 'fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs px-4 opacity-0 pointer-events-none transition-all duration-200 ease-out';
            document.body.appendChild(modal);
        }

        const lastStep = section && section.steps ? section.steps[section.steps.length - 1] : null;
        const type = lastStep && lastStep.journalQuiz ? 'journal' : 'theory';
        const typeKo = type === 'journal' ? '실무 분개' : '이론 필기';

        modal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full text-center border border-slate-100 transform scale-95 transition-all duration-200 ease-out" id="section-complete-card">
                <div class="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
                    🎉
                </div>
                <h3 class="text-base sm:text-lg font-extrabold text-slate-800">${escapeHtml(section ? section.title : '단원 완료')}</h3>
                <p class="text-xs sm:text-sm text-slate-500 mt-2.5 leading-relaxed font-semibold">
                    이 단원의 모든 학습 단계를 통과하셨습니다!<br>이어서 어떤 공부를 진행할까요?
                </p>
                
                <div class="mt-6 flex flex-col gap-2.5">
                    ${nextSection ? `
                        <button id="btn-next-sec" class="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md hover:shadow-lg transition transform active:scale-95 flex items-center justify-center gap-1.5">
                            <span>➡️ 다음 단원으로 넘어가기</span>
                            <span class="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">${escapeHtml(nextSection.badge)}</span>
                        </button>
                    ` : `
                        <div class="text-xs font-bold text-slate-400 py-2">💡 마지막 단원까지 완주하셨습니다! 대단하십니다. 🏆</div>
                    `}
                    
                    <button id="btn-more-practice" class="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-extrabold rounded-xl shadow-xs transition transform active:scale-95 flex items-center justify-center gap-1.5">
                        🔄 이 단원 유사 연습문제 더 풀기 (${typeKo})
                    </button>
                    
                    <button id="btn-go-dashboard" class="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition transform active:scale-95">
                        🏠 대시보드로 돌아가기
                    </button>
                </div>
            </div>
        `;

        if (nextSection) {
            modal.querySelector('#btn-next-sec').onclick = () => {
                closeModal();
                openSection(nextSection.id, 0);
            };
        }
        modal.querySelector('#btn-more-practice').onclick = () => {
            closeModal();
            if (lastStep) {
                loadMoreQuiz(lastStep.id, sectionId, type);
            }
        };
        modal.querySelector('#btn-go-dashboard').onclick = () => {
            closeModal();
            renderDashboard();
        };

        function closeModal() {
            modal.classList.add('opacity-0', 'pointer-events-none');
            const card = modal.querySelector('#section-complete-card');
            if (card) {
                card.classList.remove('scale-100');
                card.classList.add('scale-95');
            }
        }

        modal.classList.remove('opacity-0', 'pointer-events-none');
        const card = modal.querySelector('#section-complete-card');
        setTimeout(() => {
            if (card) {
                card.classList.remove('scale-95');
                card.classList.add('scale-100');
            }
        }, 20);
    }

    return {
        initLearningApp,
        renderAuthView,
        switchAuthTab,
        submitLogin,
        submitRegister,
        showLogoutModal,
        closeLogoutModal,
        confirmLogout,
        resumeLastLearning,
        renderDashboard,
        openSection,
        selectOption,
        submitTheoryQuiz,
        submitJournalQuiz,

        addDebitRow,
        addCreditRow,
        removeRow,
        formatNumberInput,
        loadMoreQuiz,
        submitExtraTheoryQuiz,
        submitExtraJournalQuiz,
        
        showSectionCompleteModal
    };
})();