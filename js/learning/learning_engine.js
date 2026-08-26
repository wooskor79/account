/**
 * 2026 PERFECT 전산회계 1급 맞춤 코스 학습 메인 엔진
 */
window.LearningEngine = (function() {
    let currentSectionId = null;
    let currentStepIdx = 0;

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
        if (e && e.target && e.target.id !== 'learning-logout-modal' && !e.target.classList.contains('btn-modal-cancel')) return;
        const modal = document.getElementById('learning-logout-modal');
        if (modal) modal.style.display = 'none';
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

        // 저장된 위치가 없으면 첫 번째 미완료 단계 찾기
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

        // 전체 진도율 계산
        let totalSteps = 0;
        let completedStepsCount = 0;
        curriculum.sections.forEach(sec => {
            sec.steps.forEach(st => {
                totalSteps++;
                if ((prog.completed_steps || []).includes(st.id)) {
                    completedStepsCount++;
                }
            });
        });
        const totalPct = totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 0;
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
                                    <!-- 마지막 학습한 곳으로 이동 버튼 -->
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
                            <!-- 명확한 텍스트 로그아웃 버튼 -->
                            <button class="btn-learning-logout-text" onclick="LearningEngine.showLogoutModal()" title="학습 종료 및 로그아웃">
                                <span>🚪</span>
                                <span>로그아웃</span>
                            </button>
                        </div>
                    </div>

                    <!-- 전체 진도율 게이지 바 -->
                    <div class="mt-5 pt-4 border-t border-slate-200/80">
                        <div class="flex justify-between items-center mb-1.5">
                            <span class="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                                📈 전체 코스 달성률
                            </span>
                            <span class="text-xs font-extrabold text-blue-600">
                                ${completedStepsCount} / ${totalSteps} 단계 (${totalPct}%)
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
                            // 섹션별 진도 계산
                            let sTotal = sec.steps.length;
                            let sDone = sec.steps.filter(st => (prog.completed_steps || []).includes(st.id)).length;
                            let sPct = sTotal > 0 ? Math.round((sDone / sTotal) * 100) : 0;
                            let isComplete = sPct === 100;

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

                                    <div class="section-progress-wrapper mt-3 pt-3 border-t border-slate-100">
                                        <div class="flex justify-between items-center text-[11px] font-bold mb-1">
                                            <span class="text-slate-500">진행률</span>
                                            <span class="text-slate-800">${sPct}%</span>
                                        </div>
                                        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div class="h-2 rounded-full transition-all duration-300" style="width: ${sPct}%; background-color: ${sec.color};"></div>
                                        </div>
                                    </div>

                                    <button class="btn-section-enter mt-3.5" style="border-color: ${sec.color}40;">
                                        ${sPct > 0 ? (sPct === 100 ? '다시 복습하기 ➜' : '이어서 학습하기 ➜') : '학습 시작하기 ➜'}
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

        const container = document.getElementById('learning-content-container');
        if (!container) return;

        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);
        if (!section) return;

        const currentStep = section.steps[currentStepIdx] || section.steps[0];
        const prog = window.LearningAuth.getProgress() || {};
        const isStepCompleted = (prog.completed_steps || []).includes(currentStep.id);

        // 마지막 학습 위치 로컬에 저장
        try {
            localStorage.setItem('last_learning_pos', JSON.stringify({
                sectionId: sectionId,
                stepIdx: stepIdx,
                sectionTitle: section.title,
                stepTitle: currentStep.title
            }));
        } catch(e) {}

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

                <!-- 학습 본문 카드 (이론 ➔ 실전 퀴즈) -->
                <div class="study-card-container mt-4">
                    <!-- 1. 핵심 이론 카드 -->
                    <div class="theory-study-card">
                        <div class="theory-card-header">
                            <div class="flex items-center gap-2">
                                <span class="text-lg">📖</span>
                                <h3 class="text-base font-extrabold text-slate-900">${escapeHtml(currentStep.title)}</h3>
                            </div>
                            <!-- 교재 페이지 참조 뱃지 -->
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
                        <div class="practice-quiz-card mt-5">
                            <div class="quiz-card-header">
                                <span class="badge-quiz-type theory">실전 필기 체크</span>
                                <h4 class="text-sm font-extrabold text-slate-800">이론 확인 문제</h4>
                            </div>

                            <div class="quiz-question-text mt-3">
                                ${escapeHtml(currentStep.quiz.question).replace(/\n/g, '<br>')}
                            </div>

                            <div class="quiz-options-list mt-3" id="quiz-options-group">
                                ${currentStep.quiz.options.map((opt, oIdx) => `
                                    <label class="quiz-option-item" onclick="LearningEngine.selectOption(${oIdx + 1})">
                                        <input type="radio" name="learning_opt" value="${oIdx + 1}">
                                        <span class="opt-num">${oIdx + 1}</span>
                                        <span class="opt-text">${escapeHtml(opt)}</span>
                                    </label>
                                `).join('')}
                            </div>

                            <div id="quiz-feedback-box" class="quiz-feedback-container hidden mt-4"></div>

                            <div class="flex justify-end mt-4">
                                <button id="btn-submit-theory-quiz" class="btn-quiz-submit" onclick="LearningEngine.submitTheoryQuiz('${currentStep.id}', '${section.id}')">
                                    정답 확인 및 채점 ➜
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 3. 실전 분개 퀴즈 (분개형 문제) -->
                    ${currentStep.journalQuiz ? `
                        <div class="practice-quiz-card mt-5 journal-type">
                            <div class="quiz-card-header">
                                <span class="badge-quiz-type journal">실전 분개 체크</span>
                                <h4 class="text-sm font-extrabold text-slate-800">실무 분개 연습</h4>
                            </div>

                            <div class="quiz-question-text mt-3">
                                ${escapeHtml(currentStep.journalQuiz.question)}
                            </div>

                            <!-- 분개 입력 폼 -->
                            <div class="journal-input-section mt-4">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <!-- 차변 입력 박스 -->
                                    <div class="journal-box debit-box">
                                        <div class="box-title">【 차 변 (Dr.) 】</div>
                                        <div class="flex gap-2 mt-2">
                                            <input type="text" id="j-debit-acc" class="form-input text-xs" placeholder="차변 계정과목 (예: ${currentStep.journalQuiz.debit[0].account})">
                                            <input type="text" id="j-debit-amt" class="form-input text-xs w-32" placeholder="차변 금액 (원)" oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')">
                                        </div>
                                    </div>
                                    <!-- 대변 입력 박스 -->
                                    <div class="journal-box credit-box">
                                        <div class="box-title">【 대 변 (Cr.) 】</div>
                                        <div class="flex gap-2 mt-2">
                                            <input type="text" id="j-credit-acc" class="form-input text-xs" placeholder="대변 계정과목 (예: ${currentStep.journalQuiz.credit[0].account})">
                                            <input type="text" id="j-credit-amt" class="form-input text-xs w-32" placeholder="대변 금액 (원)" oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div id="journal-feedback-box" class="quiz-feedback-container hidden mt-4"></div>

                            <div class="flex justify-end mt-4">
                                <button id="btn-submit-journal-quiz" class="btn-quiz-submit" onclick="LearningEngine.submitJournalQuiz('${currentStep.id}', '${section.id}')">
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
                            <button class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5" onclick="LearningEngine.renderDashboard()">
                                🎉 단원 학습 완료 (대시보드로)
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
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

    // --- 4. 채점 및 피드백 (핵심: 교재 가이드 & 오답노트 연계) ---
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
            if (isCorrect) {
                fbBox.className = 'quiz-feedback-container correct mt-4';
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-emerald-800 text-sm">
                        <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i> 정답입니다! 완벽하게 이해하셨네요.
                    </div>
                    <div class="text-xs text-emerald-700 mt-1.5 leading-relaxed">
                        ${escapeHtml(step.quiz.explanation)}
                    </div>
                `;
            } else {
                fbBox.className = 'quiz-feedback-container wrong mt-4';
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-rose-800 text-sm">
                        <i class="fa-solid fa-circle-xmark text-rose-600 text-base"></i> 아쉽습니다! 오답입니다. (정답: ${step.quiz.correctAnswer}번)
                    </div>
                    <div class="text-xs text-rose-700 mt-1.5 leading-relaxed">
                        <strong>해설:</strong> ${escapeHtml(step.quiz.explanation)}
                    </div>
                    <!-- 교재 위치 안내 배너 (핵심 요구사항!) -->
                    <div class="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2">
                        <span class="text-amber-700 text-base">📖</span>
                        <div>
                            <div class="text-xs font-extrabold text-amber-900">교재 복습 가이드</div>
                            <div class="text-xs font-semibold text-amber-800 mt-0.5">${escapeHtml(step.quiz.bookReference)}</div>
                            <div class="text-[11px] text-amber-700 mt-0.5">이 문제는 자동으로 <strong>[오답노트]</strong>에 기록되었습니다. 언제든 다시 풀어보실 수 있습니다.</div>
                        </div>
                    </div>
                `;
            }
        }

        // 서버 진도율 및 오답노트 저장
        await saveProgress(stepId, sectionId, isCorrect, {
            id: step.quiz.id,
            section_title: section.title,
            type: 'theory',
            question: step.quiz.question,
            options: step.quiz.options,
            correct_answer: `${step.quiz.correctAnswer}번 (${step.quiz.options[step.quiz.correctAnswer - 1]})`,
            explanation: step.quiz.explanation,
            book_reference: step.quiz.bookReference
        });
    }

    async function submitJournalQuiz(stepId, sectionId) {
        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);
        const step = section ? section.steps.find(st => st.id === stepId) : null;
        if (!step || !step.journalQuiz) return;

        const dAcc = (document.getElementById('j-debit-acc')?.value || '').trim();
        const dAmtStr = (document.getElementById('j-debit-amt')?.value || '').replace(/[^0-9]/g, '');
        const cAcc = (document.getElementById('j-credit-acc')?.value || '').trim();
        const cAmtStr = (document.getElementById('j-credit-amt')?.value || '').replace(/[^0-9]/g, '');

        if (!dAcc || !dAmtStr || !cAcc || !cAmtStr) {
            alert('차변과 대변의 계정과목 및 금액을 모두 입력해주세요!');
            return;
        }

        const dAmt = parseInt(dAmtStr, 10);
        const cAmt = parseInt(cAmtStr, 10);
        const targetDebit = step.journalQuiz.debit[0];
        const targetCredit = step.journalQuiz.credit[0];

        const isDebitMatch = (dAcc === targetDebit.account || dAcc.includes(targetDebit.account)) && dAmt === targetDebit.amount;
        const isCreditMatch = (cAcc === targetCredit.account || cAcc.includes(targetCredit.account)) && cAmt === targetCredit.amount;
        const isCorrect = isDebitMatch && isCreditMatch;

        const fbBox = document.getElementById('journal-feedback-box');
        const submitBtn = document.getElementById('btn-submit-journal-quiz');
        if (submitBtn) submitBtn.disabled = true;

        const correctText = `(차) ${targetDebit.account} ${targetDebit.amount.toLocaleString()}원 / (대) ${targetCredit.account} ${targetCredit.amount.toLocaleString()}원`;

        if (fbBox) {
            fbBox.classList.remove('hidden');
            if (isCorrect) {
                fbBox.className = 'quiz-feedback-container correct mt-4';
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-emerald-800 text-sm">
                        <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i> 정확한 분개입니다! 완벽합니다.
                    </div>
                    <div class="text-xs text-emerald-700 mt-1.5 leading-relaxed">
                        ${escapeHtml(step.journalQuiz.explanation)}
                    </div>
                `;
            } else {
                fbBox.className = 'quiz-feedback-container wrong mt-4';
                fbBox.innerHTML = `
                    <div class="flex items-center gap-2 font-extrabold text-rose-800 text-sm">
                        <i class="fa-solid fa-circle-xmark text-rose-600 text-base"></i> 분개가 일치하지 않습니다.
                    </div>
                    <div class="text-xs text-rose-700 mt-1.5 leading-relaxed">
                        <strong>정답 분개:</strong> <span class="font-bold underline">${escapeHtml(correctText)}</span><br>
                        <strong>해설:</strong> ${escapeHtml(step.journalQuiz.explanation)}
                    </div>
                    <!-- 교재 복습 가이드 -->
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
        }

        await saveProgress(stepId, sectionId, isCorrect, {
            id: step.journalQuiz.id,
            section_title: section.title,
            type: 'journal',
            question: step.journalQuiz.question,
            correct_answer: correctText,
            explanation: step.journalQuiz.explanation,
            book_reference: step.journalQuiz.bookReference
        });
    }

    async function saveProgress(stepId, sectionId, isCorrect, wrongData) {
        try {
            const curriculum = window.LearningCurriculum;
            const section = curriculum.sections.find(s => s.id === sectionId);
            const prog = window.LearningAuth.getProgress() || {};
            
            let completedList = prog.completed_steps || [];
            if (!completedList.includes(stepId)) {
                completedList.push(stepId);
            }
            let sTotal = section ? section.steps.length : 1;
            let sDone = section ? section.steps.filter(st => completedList.includes(st.id)).length : 1;
            let sPct = Math.round((sDone / sTotal) * 100);

            const res = await fetch('?action=learning_save_step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step_id: stepId,
                    section_id: sectionId,
                    section_pct: sPct,
                    is_correct: isCorrect,
                    wrong_data: isCorrect ? null : wrongData
                })
            });
            const data = await res.json();
            if (res.ok && data.success && data.progress) {
                window.LearningAuth.setProgress(data.progress);
            }
        } catch (e) {
            console.error('진도 저장 실패:', e);
        }
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
        submitJournalQuiz
    };
})();