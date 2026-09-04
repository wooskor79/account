/**
 * 2026 PERFECT 전산회계 1급 맞춤 코스 학습 메인 엔진
 */
window.LearningEngine = (function() {
    let currentSectionId = null;
    let currentStepIdx = 0;
    let currentExtraQuiz = null; // 더풀기용 추가 문제를 보관할 객체
    let loadingExcelFiles = {}; // 엑셀 파일 로딩 중복 방지를 위한 상태 맵

    function getSectionTargets(sId) {
        if (sId === 'sec_cost' || sId === 'sec_vat') {
            return { reqT: 8, reqJ: 8, desc: '필기 8문제, 분개 8문제를 완료하면 단원 마스터가 완료됩니다. (집중 심화 훈련)' };
        }
        if (sId === 'sec_closing') {
            return { reqT: 8, reqJ: 10, desc: '필기 8문제, 분개 10문제를 완료하면 결산 마스터가 완료됩니다. (수동/자동결산 집중 훈련)' };
        }
        if (sId === 'sec_account_master') {
            return { reqT: 15, reqJ: 0, desc: '금액 없이 계정과목을 3초 만에 판별하는 스피드 훈련 15문제를 완료하면 계정 마스터가 완료됩니다. (500번대/800번대/혼동계정 집중)' };
        }
        if (sId === 'sec_grade1_only') {
            return { reqT: 10, reqJ: 10, desc: '필기 10문제, 분개 10문제를 완료하면 1급 초격차 마스터가 완료됩니다. (1급 Only & 2급 사각지대 완벽 총정리)' };
        }
        return { reqT: 6, reqJ: 6, desc: '필기 6문제, 분개 6문제를 완료하면 단원이 마스터됩니다.' };
    }

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

    // --- 2. 관리자 및 학습자 대시보드 화면 ---
    let adminStatsData = null;

    async function renderAdminDashboard() {
        const container = document.getElementById('learning-content-container');
        if (!container) return;

        container.innerHTML = `
            <div class="p-12 text-center text-slate-500 font-bold">
                <i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-600 mb-3 block"></i>
                학습자 현황 및 통계 데이터를 불러오는 중입니다...
            </div>
        `;

        try {
            const res = await fetch('?action=learning_admin_stats');
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || '데이터를 불러오지 못했습니다.');
            }
            adminStatsData = data;
            drawAdminDashboardUI(container, data);
        } catch (err) {
            container.innerHTML = `
                <div class="p-8 text-center bg-rose-50 rounded-2xl border border-rose-200">
                    <div class="text-rose-600 font-black text-base mb-2">❌ 통계 로딩 실패</div>
                    <p class="text-xs text-rose-500 mb-4">${escapeHtml(err.message)}</p>
                    <button onclick="LearningEngine.renderAdminDashboard()" class="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">다시 시도</button>
                </div>
            `;
        }
    }

    function drawAdminDashboardUI(container, data) {
        const summary = data.summary || { total_users: 0, avg_progress: 0, total_solved: 0, overall_accuracy: 0 };
        const users = data.users || [];

        container.innerHTML = `
            <div class="learning-dashboard-wrapper space-y-6">
                <!-- 관리자 헤더 배너 -->
                <div class="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-xl border border-indigo-900/50">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-center gap-3.5">
                            <div class="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-2xl shadow-inner">
                                👑
                            </div>
                            <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h2 class="text-xl font-black tracking-tight text-white">
                                        전산회계 1급 학습 관리자 센터
                                    </h2>
                                    <span class="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full border border-indigo-400/30">
                                        ADMIN MODE
                                    </span>
                                </div>
                                <p class="text-xs text-indigo-200/70 font-medium mt-0.5">
                                    가입된 전체 학습자의 진도율, 문제 풀이 이력 및 오답 현황을 실시간 모니터링합니다.
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2.5">
                            <button onclick="LearningEngine.renderAdminDashboard()" class="px-3.5 py-2 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700/50 text-indigo-100 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm">
                                <span>🔄</span> <span>새로고침</span>
                            </button>
                            <button onclick="LearningEngine.showLogoutModal()" class="px-3.5 py-2 bg-rose-900/50 hover:bg-rose-800 border border-rose-700/50 text-rose-100 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm">
                                <span>🚪</span> <span>로그아웃</span>
                            </button>
                        </div>
                    </div>

                    <!-- 4대 요약 카드 그리드 -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-indigo-800/40">
                        <div class="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                            <div class="text-[11px] font-bold text-indigo-300 mb-1">👥 총 가입 학습자</div>
                            <div class="text-2xl font-black text-white">${summary.total_users}<span class="text-xs font-normal text-indigo-300 ml-1">명</span></div>
                        </div>
                        <div class="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                            <div class="text-[11px] font-bold text-indigo-300 mb-1">📈 전체 평균 진도율</div>
                            <div class="text-2xl font-black text-emerald-400">${summary.avg_progress}<span class="text-xs font-normal text-emerald-300 ml-1">%</span></div>
                        </div>
                        <div class="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                            <div class="text-[11px] font-bold text-indigo-300 mb-1">📝 총 풀이 문제 수</div>
                            <div class="text-2xl font-black text-amber-300">${summary.total_solved.toLocaleString()}<span class="text-xs font-normal text-amber-200 ml-1">문제</span></div>
                        </div>
                        <div class="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                            <div class="text-[11px] font-bold text-indigo-300 mb-1">🎯 전체 평균 정답률</div>
                            <div class="text-2xl font-black text-sky-300">${summary.overall_accuracy}<span class="text-xs font-normal text-sky-200 ml-1">%</span></div>
                        </div>
                    </div>
                </div>

                <!-- 로그아웃 확인 커스텀 모달 -->
                <div id="learning-logout-modal" class="learning-custom-modal-overlay" style="display:none;" onclick="LearningEngine.closeLogoutModal(event)">
                    <div class="learning-custom-modal-content" onclick="event.stopPropagation()">
                        <div class="modal-emoji-badge">🚪</div>
                        <h3 class="text-base font-extrabold text-slate-900 mt-2">관리자 모드에서 로그아웃할까요?</h3>
                        <div class="flex gap-2.5 justify-center mt-5">
                            <button class="btn-custom-modal-cancel" onclick="LearningEngine.closeLogoutModal()">취소</button>
                            <button class="btn-custom-modal-danger" onclick="LearningEngine.confirmLogout()">로그아웃</button>
                        </div>
                    </div>
                </div>

                <!-- 학습자 상세 진도 팝업 모달 영역 -->
                <div id="admin-user-detail-modal" class="learning-custom-modal-overlay" style="display:none;" onclick="LearningEngine.closeAdminUserDetailModal(event)">
                    <div class="learning-custom-modal-content max-w-2xl text-left bg-white p-6 sm:p-7 rounded-3xl" onclick="event.stopPropagation()">
                        <div id="admin-user-detail-content"></div>
                    </div>
                </div>

                <!-- 학습자 현황 목록 테이블 -->
                <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                        <div>
                            <h3 class="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                <span>📋</span> 학습자별 진도 및 활동 현황
                            </h3>
                            <p class="text-xs text-slate-400 mt-0.5">총 ${users.length}명의 학습자가 등록되어 있습니다.</p>
                        </div>
                        <div>
                            <input type="text" id="admin-user-search-input" placeholder="학습자 이름 검색..." 
                                class="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-60"
                                oninput="LearningEngine.filterAdminUserList()">
                        </div>
                    </div>

                    ${users.length === 0 ? `
                        <div class="py-12 text-center text-slate-400 font-bold text-sm">
                            가입된 학습자가 아직 없습니다.
                        </div>
                    ` : `
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                                        <th class="py-3 px-4">학습자명</th>
                                        <th class="py-3 px-3">가입일 / 최근접속</th>
                                        <th class="py-3 px-4 w-48">9대 단원 진도율</th>
                                        <th class="py-3 px-3 text-center">완료 단원</th>
                                        <th class="py-3 px-3 text-center">문제 풀이</th>
                                        <th class="py-3 px-3 text-center">오답노트</th>
                                        <th class="py-3 px-3 text-right">상세조회</th>
                                    </tr>
                                </thead>
                                <tbody id="admin-user-table-body" class="divide-y divide-slate-100 text-xs">
                                    ${users.map((u, idx) => `
                                        <tr class="hover:bg-indigo-50/30 transition admin-user-row" data-name="${escapeHtml(u.username).toLowerCase()}">
                                            <td class="py-3.5 px-4 font-black text-slate-900 flex items-center gap-2">
                                                <span class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">${escapeHtml(u.username.substring(0, 1))}</span>
                                                <span>${escapeHtml(u.username)}</span>
                                            </td>
                                            <td class="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                                                <div>${escapeHtml(u.created_at ? u.created_at.substring(0, 10) : '-')}</div>
                                                <div class="text-[10px] text-slate-400">${escapeHtml(u.last_login ? u.last_login.substring(11, 16) : '미접속')}</div>
                                            </td>
                                            <td class="py-3.5 px-4">
                                                <div class="flex justify-between items-center text-[11px] font-bold mb-1">
                                                    <span class="text-indigo-600 font-black">${u.total_pct}%</span>
                                                    <span class="text-[10px] text-slate-400">${u.total_pct === 100 ? '완강 🎉' : (u.total_pct > 0 ? '학습중' : '시작전')}</span>
                                                </div>
                                                <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div class="h-2 rounded-full transition-all duration-300 ${u.total_pct >= 80 ? 'bg-emerald-500' : (u.total_pct >= 40 ? 'bg-indigo-500' : 'bg-amber-500')}" style="width: ${u.total_pct}%"></div>
                                                </div>
                                            </td>
                                            <td class="py-3.5 px-3 text-center font-bold">
                                                <span class="px-2 py-0.5 rounded-full text-[11px] ${u.completed_sections > 0 ? 'bg-emerald-100 text-emerald-700 font-extrabold' : 'bg-slate-100 text-slate-500'}">
                                                    ${u.completed_sections} / 9
                                                </span>
                                            </td>
                                            <td class="py-3.5 px-3 text-center">
                                                <span class="font-bold text-slate-800 font-mono">${u.solved_count}회</span>
                                                ${u.solved_count > 0 ? `<div class="text-[10px] text-emerald-600 font-bold">정답률 ${u.accuracy}%</div>` : ''}
                                            </td>
                                            <td class="py-3.5 px-3 text-center">
                                                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${u.unresolved_wrong_count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-400'}">
                                                    ${u.unresolved_wrong_count > 0 ? `미해결 ${u.unresolved_wrong_count}개` : '없음'}
                                                </span>
                                            </td>
                                            <td class="py-3.5 px-3 text-right">
                                                <button onclick="LearningEngine.openAdminUserDetailModal(${idx})" class="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-bold transition shadow-2xs">
                                                    단원별 상세 ➜
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    function filterAdminUserList() {
        const inp = document.getElementById('admin-user-search-input');
        if (!inp) return;
        const q = inp.value.trim().toLowerCase();
        const rows = document.querySelectorAll('.admin-user-row');
        rows.forEach(r => {
            const name = r.getAttribute('data-name') || '';
            if (name.includes(q)) {
                r.style.display = '';
            } else {
                r.style.display = 'none';
            }
        });
    }

    function openAdminUserDetailModal(userIndex) {
        if (!adminStatsData || !adminStatsData.users || !adminStatsData.users[userIndex]) return;
        const u = adminStatsData.users[userIndex];
        const modal = document.getElementById('admin-user-detail-modal');
        const content = document.getElementById('admin-user-detail-content');
        if (!modal || !content) return;

        const curriculum = window.LearningCurriculum;

        content.innerHTML = `
            <div class="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <div class="flex items-center gap-2.5">
                    <span class="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center">
                        ${escapeHtml(u.username.substring(0, 1))}
                    </span>
                    <div>
                        <h3 class="text-base font-extrabold text-slate-900">${escapeHtml(u.username)}님의 단원별 학습 상세</h3>
                        <p class="text-xs text-slate-400">전체 달성률: <strong>${u.total_pct}%</strong> (완료 ${u.completed_sections}/9단원)</p>
                    </div>
                </div>
                <button onclick="LearningEngine.closeAdminUserDetailModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold flex items-center justify-center">
                    ✕
                </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                ${curriculum.sections.map(sec => {
                    const d = (u.section_details && u.section_details[sec.id]) || { pct: 0, is_complete: false, theory_count: 0, journal_count: 0 };
                    return `
                        <div class="p-3.5 rounded-2xl border ${d.is_complete ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/60 border-slate-200/80'} shadow-2xs">
                            <div class="flex items-center justify-between mb-1.5">
                                <span class="text-xs font-black text-slate-800">${escapeHtml(sec.title)}</span>
                                ${d.is_complete ? '<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full">완료 ✨</span>' : `<span class="text-xs font-extrabold text-indigo-600">${d.pct}%</span>`}
                            </div>
                            <div class="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden mb-2">
                                <div class="h-1.5 rounded-full ${d.is_complete ? 'bg-emerald-500' : 'bg-indigo-500'}" style="width: ${d.pct}%"></div>
                            </div>
                            <div class="flex justify-between text-[11px] text-slate-500 font-medium">
                                <span>📝 필기: <strong>${d.theory_count}회 정답</strong></span>
                                ${sec.id === 'sec_account_master' ? '<span>⚡ 3초 판별 전용</span>' : `<span>🧾 분개: <strong>${d.journal_count}회 정답</strong></span>`}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                <button onclick="LearningEngine.closeAdminUserDetailModal()" class="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm">
                    닫기
                </button>
            </div>
        `;

        modal.style.display = 'flex';
    }

    function closeAdminUserDetailModal(event) {
        if (event && event.target && event.target !== document.getElementById('admin-user-detail-modal')) return;
        const modal = document.getElementById('admin-user-detail-modal');
        if (modal) modal.style.display = 'none';
    }

    // --- 2. 학습자 대시보드 화면 ---
    function renderDashboard() {
        const container = document.getElementById('learning-content-container');
        if (!container) return;

        const user = window.LearningAuth.getUser();
        if (user && user.is_admin) {
            renderAdminDashboard();
            return;
        }

        const prog = window.LearningAuth.getProgress() || {};
        const curriculum = window.LearningCurriculum;

        // 마지막 학습 위치 조회
        let lastPosInfo = null;
        try {
            const saved = localStorage.getItem('last_learning_pos');
            if (saved) lastPosInfo = JSON.parse(saved);
        } catch(e) {}

        // --- 정밀 마이크로 진도율 연산 시스템 (9대 단원 체제) ---
        let totalWeightAll = 0;
        let acquiredWeightAll = 0;
        let completedSectionsCount = 0;

        curriculum.sections.forEach(sec => {
            const counts = (prog.correct_counts && prog.correct_counts[sec.id]) || { theory: 0, journal: 0 };
            const targets = getSectionTargets(sec.id);
            const reqT = targets.reqT;
            const reqJ = targets.reqJ;
            const maxSec = reqT + reqJ;

            const curT = Math.min(reqT, counts.theory || 0);
            const curJ = Math.min(reqJ, counts.journal || 0);
            const secScore = curT + curJ;

            totalWeightAll += maxSec;
            acquiredWeightAll += secScore;
            if (curT >= reqT && (reqJ === 0 || curJ >= reqJ)) {
                completedSectionsCount++;
            }
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
                                📈 전체 9대 단원 달성률: <strong>${completedSectionsCount} / 9개 단원 완료</strong>
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

                <!-- 8대 단원 커리큘럼 벤토 그리드 -->
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
                            const counts = (prog.correct_counts && prog.correct_counts[sec.id]) || { theory: 0, journal: 0 };
                            const targets = getSectionTargets(sec.id);
                            const reqT = targets.reqT;
                            const reqJ = targets.reqJ;
                            const maxScore = reqT + reqJ;

                            const curT = Math.min(reqT, counts.theory || 0);
                            const curJ = Math.min(reqJ, counts.journal || 0);
                            const remainTheoryCount = Math.max(0, reqT - curT);
                            const remainJournalCount = Math.max(0, reqJ - curJ);
                            const sPct = Math.round(((curT + curJ) / maxScore) * 100);
                            const isComplete = (curT >= reqT && (reqJ === 0 || curJ >= reqJ));

                            // 100% 미완성일 때 잔여 문제 수 명시
                            let incompleteWarning = '';
                            let btnText = '학습 시작하기 ➜';
                            if (sPct > 0) {
                                if (isComplete) {
                                    btnText = '다시 복습하기 ➜';
                                } else {
                                    btnText = '문제를 더 풀고 완수하기 ➜';
                                    let remainParts = [];
                                    if (remainTheoryCount > 0) remainParts.push(`${reqJ === 0 ? '스피드 판별' : '필기'} ${remainTheoryCount}문제`);
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
    function openSection(sectionId, stepIdx = 0, phase = 'theory') {
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

        const prog = (window.LearningAuth && window.LearningAuth.getProgress) ? window.LearningAuth.getProgress() || {} : {};
        const counts = (prog.correct_counts && prog.correct_counts[sectionId]) || { theory: 0, journal: 0 };
        const targets = getSectionTargets(sectionId);
        let hasTheory = targets.reqT > 0;
        let hasJournal = targets.reqJ > 0;
        let targetT = targets.reqT;
        let targetJ = targets.reqJ;
        
        let tCorrect = counts.theory || 0;
        let jCorrect = counts.journal || 0;
        
        const isSectionAllDone = (tCorrect >= targetT) && (targetJ === 0 || jCorrect >= targetJ);
        const isLastStep = currentStepIdx === section.steps.length - 1;

        let uiHtml = `
            <div class="learning-study-view">
        `;

        if (phase === 'theory') {
            const currentStep = section.steps[currentStepIdx] || section.steps[0];

            uiHtml += `
                <div class="mb-5 border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-black" style="background-color: ${section.color}20; color: ${section.color};">
                                ${section.badge}
                            </span>
                            <span class="text-xs font-semibold text-slate-400">${escapeHtml(section.bookPages)}</span>
                        </div>
                        <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                            ${escapeHtml(section.title)} <span class="text-blue-600 font-extrabold">요약 학습</span>
                        </h2>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="LearningEngine.openSection('${sectionId}', 0, 'quiz')" class="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 shrink-0">
                            <span>문제 바로 풀기</span> <i class="fa-solid fa-bolt text-yellow-300"></i>
                        </button>
                        <button onclick="LearningEngine.renderDashboard()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 shrink-0 shadow-2xs">
                            <span>🏠</span>
                            <span>학습홈</span>
                        </button>
                    </div>
                </div>

                <!-- 상단 스텝 이동 탭 바 -->
                <div class="flex gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar">
                    ${section.steps.map((st, sIdx) => `
                        <button onclick="LearningEngine.openSection('${sectionId}', ${sIdx}, 'theory')" class="px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition flex items-center gap-2 ${sIdx === currentStepIdx ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}">
                            <span class="w-4 h-4 rounded-full ${sIdx === currentStepIdx ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'} text-[10px] flex items-center justify-center font-black">${sIdx + 1}</span>
                            <span>${escapeHtml(st.title.replace(/^[0-9.]+\s*/, ''))}</span>
                        </button>
                    `).join('')}
                </div>

                <!-- 본문 4단 고밀도 학습 카드 -->
                <div class="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200/80 mb-6 space-y-6">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                        <h3 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                            <span class="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">${currentStepIdx + 1}</span>
                            ${escapeHtml(currentStep.title)}
                        </h3>
                        <span class="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            📖 ${escapeHtml(currentStep.bookRef || section.bookPages)}
                        </span>
                    </div>

                    ${currentStep.theory ? `
                        <!-- 1단: 핵심 개념 & 상세 포인트 -->
                        <div class="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/60">
                            <h4 class="text-xs font-black text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <i class="fa-solid fa-lightbulb text-amber-500"></i> 핵심 요약 & 원리
                            </h4>
                            <p class="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed mb-4">
                                ${currentStep.theory.summary}
                            </p>
                            <div class="space-y-2.5 border-t border-slate-200/60 pt-3">
                                ${currentStep.theory.points.map(p => `
                                    <div class="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 leading-relaxed">
                                        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                                        <div class="flex-1">${p}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- 2단: 핵심 계산 공식 및 비교표 -->
                        ${currentStep.theory.formulaTable && currentStep.theory.formulaTable.length > 0 ? `
                            <div class="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                <h4 class="text-xs font-black text-indigo-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <i class="fa-solid fa-calculator text-indigo-600"></i> 핵심 계산 공식 & 구조
                                </h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    ${currentStep.theory.formulaTable.map(f => `
                                        <div class="bg-white p-3.5 rounded-xl border border-indigo-100/80 shadow-2xs">
                                            <div class="text-[11px] font-black text-indigo-900 mb-1">${escapeHtml(f.name)}</div>
                                            <div class="text-xs font-bold text-slate-700 font-mono bg-indigo-50/40 p-2 rounded-lg leading-relaxed">${escapeHtml(f.formula)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- 3단: 실전 분개 패턴표 -->
                        ${currentStep.theory.journalPatterns && currentStep.theory.journalPatterns.length > 0 ? `
                            <div class="p-5 bg-sky-50/40 rounded-2xl border border-sky-100">
                                <h4 class="text-xs font-black text-sky-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <i class="fa-solid fa-receipt text-sky-600"></i> 시험 빈출 실전 분개 패턴
                                </h4>
                                <div class="space-y-2.5">
                                    ${currentStep.theory.journalPatterns.map(j => `
                                        <div class="bg-white p-3.5 rounded-xl border border-sky-100 shadow-2xs">
                                            <div class="text-xs font-black text-slate-900 mb-1.5 flex items-center gap-1.5">
                                                <span class="w-2 h-2 rounded-full bg-sky-500"></span> ${escapeHtml(j.title)}
                                            </div>
                                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold font-mono">
                                                <div class="p-2 bg-sky-50 rounded-lg text-sky-800 border border-sky-200/60">${escapeHtml(j.debit)}</div>
                                                <div class="p-2 bg-purple-50 rounded-lg text-purple-800 border border-purple-200/60">${escapeHtml(j.credit)}</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- 4단: 출제위원 함정 & 3초 암기 치트키 -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            ${currentStep.theory.trapNotes ? `
                                <div class="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/80">
                                    <div class="text-xs font-black text-rose-800 mb-1.5 flex items-center gap-1.5">
                                        <i class="fa-solid fa-triangle-exclamation text-rose-500"></i> 출제위원 오답 함정 주의!
                                    </div>
                                    <div class="text-xs text-rose-900/90 leading-relaxed font-medium">
                                        ${currentStep.theory.trapNotes}
                                    </div>
                                </div>
                            ` : ''}
                            ${currentStep.theory.cheatKeys ? `
                                <div class="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80">
                                    <div class="text-xs font-black text-amber-900 mb-1.5 flex items-center gap-1.5">
                                        <i class="fa-solid fa-key text-amber-500"></i> 3초 암기 치트키
                                    </div>
                                    <div class="text-xs text-amber-900 leading-relaxed font-bold">
                                        ${currentStep.theory.cheatKeys}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    ` : '<p class="text-sm text-slate-500">요약 내용이 없습니다.</p>'}
                </div>
                
                <div class="flex flex-wrap gap-2.5 justify-between items-center mt-8">
                    <button class="px-5 py-3 rounded-xl font-bold text-xs sm:text-sm ${currentStepIdx > 0 ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition' : 'opacity-0 pointer-events-none'}"
                            onclick="LearningEngine.openSection('${sectionId}', ${currentStepIdx - 1}, 'theory')">
                        <i class="fa-solid fa-arrow-left mr-1.5"></i> 이전 스텝 (${currentStepIdx > 0 ? currentStepIdx : 1})
                    </button>

                    <button class="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm text-xs sm:text-sm transition flex items-center gap-1.5"
                            onclick="LearningEngine.renderDashboard()">
                        <span>🏠</span> <span>대시보드로 가기</span>
                    </button>
                    
                    ${isLastStep ? `
                        <button class="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-md transition transform active:scale-95 flex items-center gap-2 text-xs sm:text-sm"
                                onclick="LearningEngine.openSection('${sectionId}', 0, 'quiz')">
                            <span>전 단원 문제 풀이 시작하기</span> <i class="fa-solid fa-bolt text-yellow-300"></i>
                        </button>
                    ` : `
                        <button class="px-6 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 text-xs sm:text-sm"
                                onclick="LearningEngine.openSection('${sectionId}', ${currentStepIdx + 1}, 'theory')">
                            <span>다음 스텝: ${escapeHtml(section.steps[currentStepIdx + 1]?.title.replace(/^[0-9.]+\s*/, '') || '')}</span> <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    `}
                </div>
            `;
        } else if (phase === 'quiz') {
            const targets = getSectionTargets(sectionId);
            targetT = targets.reqT;
            targetJ = targets.reqJ;

            uiHtml += `
                <div class="mb-5 border-b border-slate-200 pb-4 flex justify-between items-end">
                    <div>
                        <h2 class="text-2xl font-black text-slate-800 tracking-tight">
                            <span class="text-blue-600 mr-2">${section.title}</span> 실전 문제 풀이
                        </h2>
                        <p class="text-sm text-slate-500 mt-1 font-medium">${targets.desc}</p>
                    </div>
                    <button onclick="LearningEngine.renderDashboard()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition flex items-center gap-2 shrink-0">
                        <i class="fa-solid fa-house"></i> 학습홈 가기
                    </button>
                </div>
                
                <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 mb-6">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <i class="fa-solid fa-flag-checkered text-blue-500"></i> 현재 달성도
                        </h3>
                        
                        <div class="flex gap-2.5 font-bold flex-wrap items-center" id="step-target-board">
                            ${hasTheory ? `
                                <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${tCorrect >= targetT ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}">
                                    <span>📝 필기:</span>
                                    <strong class="text-xs font-mono">${tCorrect}/${targetT}회</strong>
                                    ${tCorrect >= targetT ? '<span class="text-[11px] font-extrabold text-emerald-600">완료</span>' : `<span class="text-[11px] font-bold text-amber-600">(${targetT - tCorrect}문제 더 필요)</span>`}
                                </span>
                            ` : ''}
                            ${hasJournal ? `
                                <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${jCorrect >= targetJ ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}">
                                    <span>🧾 분개:</span>
                                    <strong class="text-xs font-mono">${jCorrect}/${targetJ}회</strong>
                                    ${jCorrect >= targetJ ? '<span class="text-[11px] font-extrabold text-emerald-600">완료</span>' : `<span class="text-[11px] font-bold text-amber-600">(${targetJ - jCorrect}문제 더 필요)</span>`}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        ${hasTheory ? `
                            <button class="w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${tCorrect >= targetT ? 'border-emerald-200 bg-emerald-50/70 hover:border-emerald-300 hover:bg-emerald-50' : 'border-blue-100 bg-blue-50/30 hover:border-blue-300 hover:bg-blue-50'}"
                                    onclick="LearningEngine.loadMoreQuiz(null, '${sectionId}', 'theory')">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <h4 class="font-bold text-slate-800 text-base mb-1">${sectionId === 'sec_account_master' ? '⚡ 실전 계정과목 3초 판별 스피드 퀴즈' : '📝 객관식 필기 문제'}</h4>
                                        <p class="text-xs text-slate-500 font-medium">${sectionId === 'sec_account_master' ? '금액 없이 차변/대변 계정과목을 3초 만에 선택하는 무한 실전 훈련' : '단원 전체 범위에서 랜덤으로 출제됩니다. (언제든 무한 풀기 가능)'}</p>
                                    </div>
                                    <div>
                                        ${tCorrect >= targetT ? '<span class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"><i class="fa-solid fa-check mr-1"></i>마스터 완료 (복습 풀기 ➜)</span>' : '<span class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm">문제 풀기 <i class="fa-solid fa-chevron-right ml-1"></i></span>'}
                                    </div>
                                </div>
                            </button>
                        ` : ''}
                        
                        ${hasJournal ? `
                            <button class="w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${jCorrect >= targetJ ? 'border-emerald-200 bg-emerald-50/70 hover:border-emerald-300 hover:bg-emerald-50' : 'border-indigo-100 bg-indigo-50/30 hover:border-indigo-300 hover:bg-indigo-50'}"
                                    onclick="LearningEngine.loadMoreQuiz(null, '${sectionId}', 'journal')">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <h4 class="font-bold text-slate-800 text-base mb-1">🧾 실무 분개 문제</h4>
                                        <p class="text-xs text-slate-500 font-medium">단원 전체 범위에서 랜덤으로 출제됩니다. (언제든 무한 풀기 가능)</p>
                                    </div>
                                    <div>
                                        ${jCorrect >= targetJ ? '<span class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"><i class="fa-solid fa-check mr-1"></i>마스터 완료 (복습 풀기 ➜)</span>' : '<span class="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm">문제 풀기 <i class="fa-solid fa-chevron-right ml-1"></i></span>'}
                                    </div>
                                </div>
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <div id="quiz-dynamic-area" class="mt-6">
                    <!-- 동적으로 문제가 렌더링될 영역 -->
                </div>
                
                <div class="flex justify-between items-center mt-8 pt-6 border-t border-slate-200">
                    <button class="px-5 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold rounded-xl shadow-sm transition flex items-center gap-2 text-sm"
                            onclick="LearningEngine.openSection('${sectionId}', 0, 'theory')">
                        <i class="fa-solid fa-book mr-1"></i> 요약 다시보기
                    </button>
                    
                    <button class="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 text-sm"
                            onclick="LearningEngine.renderDashboard()">
                        <i class="fa-solid fa-house mr-1"></i> 학습 홈으로
                    </button>
                </div>
            `;
            
            // We need to initialize journal inputs if journal quiz is available
            if (hasJournal) {
                setTimeout(() => {
                    if (typeof resetJournalInput === 'function') resetJournalInput();
                }, 100);
            }
        }

        uiHtml += `</div>`;
        container.innerHTML = uiHtml;
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    async function loadMoreQuiz(stepId, sectionId, type) { console.log('loadMoreQuiz called', {stepId, sectionId, type});
        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);
        let step = section ? section.steps.find(st => st.id === stepId) : null;
        
        // Handle section-level quiz (stepId is null)
        if (!step && !stepId && section && section.steps.length > 0) {
            const validSteps = section.steps.filter(st => type === 'theory' ? st.quiz : st.journalQuiz);
            if(validSteps.length > 0) {
                step = validSteps[Math.floor(Math.random() * validSteps.length)];
                stepId = step.id;
            } else {
                step = section.steps[0];
                stepId = step.id;
            }
        }

        if (!step) return;

        // 1. [방안 A] 동적 회계 문제 생성기 우선 호출 (단원 전체 범위 무한 교차 변형 문제)
        if (window.LearningGenerator && typeof window.LearningGenerator.generateDynamicQuiz === 'function') {
            const dynQuiz = window.LearningGenerator.generateDynamicQuiz(null, sectionId, type);
            if (dynQuiz) {
                currentExtraQuiz = dynQuiz;
                applyExtraQuizToUI(stepId || (step ? step.id : null), sectionId, type);
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
        const dynamicArea = document.getElementById('quiz-dynamic-area');

        if (type === 'theory') {
            let qCard = document.getElementById('learning-theory-quiz-card');
            if (!qCard && dynamicArea) {
                dynamicArea.innerHTML = `
                    <div id="learning-theory-quiz-card" class="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-blue-100 transition-all">
                        <div class="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 flex-wrap">
                            <span class="px-3 py-1 bg-blue-100 text-blue-700 font-extrabold text-xs rounded-full">
                                📝 객관식 필기 실전 문제
                            </span>
                            <span id="l-theory-bookref" class="text-xs font-semibold text-slate-400">
                                ${escapeHtml(currentExtraQuiz.bookReference || '실전 연습문제')}
                            </span>
                        </div>

                        <div id="l-theory-question" class="text-slate-800 text-sm sm:text-base font-extrabold leading-relaxed mb-6">
                            ${formatTheoryQuestionHtml(currentExtraQuiz.question)}
                        </div>

                        <div id="quiz-options-group" class="quiz-options-grid space-y-2.5">
                            ${currentExtraQuiz.options.map((opt, oIdx) => `
                                <label class="quiz-option-item flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition" onclick="LearningEngine.selectOption(${oIdx + 1})">
                                    <input type="radio" name="learning_opt" value="${oIdx + 1}" class="hidden">
                                    <span class="opt-num w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center border border-slate-300 shrink-0">${oIdx + 1}</span>
                                    <span class="opt-text text-xs sm:text-sm font-bold text-slate-700 flex-1">${formatTheoryOptionHtml(opt)}</span>
                                </label>
                            `).join('')}
                        </div>

                        <div class="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                            <button id="btn-submit-theory-quiz" onclick="LearningEngine.submitExtraTheoryQuiz('${stepId}', '${sectionId}')" class="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-2">
                                <span>정답 확인 및 채점하기</span> <i class="fa-solid fa-check"></i>
                            </button>
                        </div>

                        <div id="quiz-feedback-box" class="quiz-feedback-container hidden mt-4"></div>
                    </div>
                `;
            } else if (qCard) {
                const qText = qCard.querySelector('#l-theory-question');
                if (qText) qText.innerHTML = formatTheoryQuestionHtml(currentExtraQuiz.question);

                const refText = qCard.querySelector('#l-theory-bookref');
                if (refText) refText.textContent = currentExtraQuiz.bookReference || '실전 연습문제';

                const optionsGroup = qCard.querySelector('#quiz-options-group');
                if (optionsGroup && currentExtraQuiz.options.length > 0) {
                    optionsGroup.innerHTML = currentExtraQuiz.options.map((opt, oIdx) => `
                        <label class="quiz-option-item flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition" onclick="LearningEngine.selectOption(${oIdx + 1})">
                            <input type="radio" name="learning_opt" value="${oIdx + 1}" class="hidden">
                            <span class="opt-num w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center border border-slate-300 shrink-0">${oIdx + 1}</span>
                            <span class="opt-text text-xs sm:text-sm font-bold text-slate-700 flex-1">${formatTheoryOptionHtml(opt)}</span>
                        </label>
                    `).join('');
                }

                const fbBox = document.getElementById('quiz-feedback-box');
                if (fbBox) {
                    fbBox.classList.add('hidden');
                    fbBox.innerHTML = '';
                }

                const submitBtn = qCard.querySelector('#btn-submit-theory-quiz');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span>정답 확인 및 채점하기</span> <i class="fa-solid fa-check"></i>`;
                    submitBtn.setAttribute('onclick', `LearningEngine.submitExtraTheoryQuiz('${stepId}', '${sectionId}')`);
                }
            }
        } else if (type === 'journal') {
            let qCard = document.getElementById('learning-journal-quiz-card');
            if (!qCard && dynamicArea) {
                dynamicArea.innerHTML = `
                    <div id="learning-journal-quiz-card" class="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-indigo-100 transition-all">
                        <div class="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 flex-wrap">
                            <span class="px-3 py-1 bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-full">
                                🧾 실무 분개 실전 문제
                            </span>
                            <span id="l-journal-bookref" class="text-xs font-semibold text-slate-400">
                                ${escapeHtml(currentExtraQuiz.bookReference || '실전 연습문제')}
                            </span>
                        </div>

                        <div id="l-journal-question" class="text-slate-800 text-sm sm:text-base font-extrabold leading-relaxed mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            ${escapeHtml(currentExtraQuiz.question)}
                        </div>

                        <!-- 실무 분개 입력 폼 -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <!-- 차변 -->
                            <div class="p-4 bg-sky-50/50 rounded-2xl border border-sky-200">
                                <div class="flex justify-between items-center mb-3">
                                    <span class="font-extrabold text-sky-800 text-xs sm:text-sm flex items-center gap-1.5">
                                        <span class="w-2.5 h-2.5 rounded-full bg-sky-500"></span> 차변 (Debit)
                                    </span>
                                    <button type="button" onclick="LearningEngine.addDebitRow('', '', true)" class="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1">
                                        <i class="fa-solid fa-plus text-[10px]"></i> 차변 추가
                                    </button>
                                </div>
                                <div id="j-debit-rows-container" class="space-y-2"></div>
                            </div>

                            <!-- 대변 -->
                            <div class="p-4 bg-purple-50/50 rounded-2xl border border-purple-200">
                                <div class="flex justify-between items-center mb-3">
                                    <span class="font-extrabold text-purple-800 text-xs sm:text-sm flex items-center gap-1.5">
                                        <span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span> 대변 (Credit)
                                    </span>
                                    <button type="button" onclick="LearningEngine.addCreditRow('', '', true)" class="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1">
                                        <i class="fa-solid fa-plus text-[10px]"></i> 대변 추가
                                    </button>
                                </div>
                                <div id="j-credit-rows-container" class="space-y-2"></div>
                            </div>
                        </div>

                        <!-- 대차 균형 요약 바 -->
                        <div id="j-journal-balance-summary" class="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-4 text-xs font-semibold flex justify-between items-center transition">
                            <span>차변 합계: 0원 / 대변 합계: 0원</span>
                            <span class="text-slate-400">대차일치 여부 확인 중</span>
                        </div>

                        <div class="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                            <button id="btn-submit-journal-quiz" onclick="LearningEngine.submitExtraJournalQuiz('${stepId}', '${sectionId}')" class="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm rounded-xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-2">
                                <span>분개 채점 및 검증</span> <i class="fa-solid fa-check"></i>
                            </button>
                        </div>

                        <div id="journal-feedback-box" class="quiz-feedback-container hidden mt-4"></div>
                    </div>
                `;
                resetJournalInput();
            } else if (qCard) {
                const qText = qCard.querySelector('#l-journal-question');
                if (qText) qText.innerText = currentExtraQuiz.question;

                const refText = qCard.querySelector('#l-journal-bookref');
                if (refText) refText.textContent = currentExtraQuiz.bookReference || '실전 연습문제';

                resetJournalInput();

                const fbBox = document.getElementById('journal-feedback-box');
                if (fbBox) {
                    fbBox.classList.add('hidden');
                    fbBox.innerHTML = '';
                }

                const submitBtn = qCard.querySelector('#btn-submit-journal-quiz');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span>분개 채점 및 검증</span> <i class="fa-solid fa-check"></i>`;
                    submitBtn.setAttribute('onclick', `LearningEngine.submitExtraJournalQuiz('${stepId}', '${sectionId}')`);
                }
            }
        }

        const targetCardId = type === 'theory' ? 'learning-theory-quiz-card' : 'learning-journal-quiz-card';
        setTimeout(() => {
            document.getElementById(targetCardId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
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
                            onclick="LearningEngine.loadMoreQuiz(null, '${sectionId}', 'theory')">
                        🔄 이 단원 객관식 문제 더 풀기
                    </button>
                </div>
            `;
        }

        const prog = window.LearningAuth.getProgress() || {};
        const counts = (prog.correct_counts && prog.correct_counts[sectionId]) || { theory: 0, journal: 0 };
        let theoryCorrect = counts.theory || 0;
        let journalCorrect = counts.journal || 0;

        if (isCorrect) theoryCorrect++;

        const targets = getSectionTargets(sectionId);
        const reqT = targets.reqT;
        const reqJ = targets.reqJ;
        const isSectionCompleted = (theoryCorrect >= reqT) && (reqJ === 0 || journalCorrect >= reqJ);

        await saveProgress(stepId, sectionId, isCorrect, 'theory', isSectionCompleted, {
            id: step.quiz.id,
            section_title: section.title,
            type: 'theory',
            question: step.quiz.question,
            options: step.quiz.options,
            correct_answer: `${step.quiz.correctAnswer}번 (${step.quiz.options[step.quiz.correctAnswer - 1]})`,
            explanation: step.quiz.explanation,
            book_reference: step.quiz.bookReference
        });

        if (isSectionCompleted && section) {
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
                        <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i> 정답입니다! (문제 통과)
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
                        📌 <strong>안내</strong>: 이 문제는 자동으로 오답노트에 보관되었습니다.
                    </div>
                `;
            }

            fbBox.innerHTML += `
                <div class="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                    <button class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-md transition text-xs"
                            onclick="LearningEngine.loadMoreQuiz(null, '${sectionId}', 'theory')">
                        🔄 이 단원 객관식 문제 더 풀기
                    </button>
                </div>
            `;
        }

        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);

        const prog = window.LearningAuth.getProgress() || {};
        const counts = (prog.correct_counts && prog.correct_counts[sectionId]) || { theory: 0, journal: 0 };
        let theoryCorrect = counts.theory || 0;
        let journalCorrect = counts.journal || 0;

        if (isCorrect) theoryCorrect++;

        const targets = getSectionTargets(sectionId);
        const reqT = targets.reqT;
        const reqJ = targets.reqJ;
        const isSectionCompleted = (theoryCorrect >= reqT) && (reqJ === 0 || journalCorrect >= reqJ);

        await saveProgress(stepId, sectionId, isCorrect, 'theory', isSectionCompleted, {
            id: currentExtraQuiz.id,
            section_title: section ? section.title : '객관식문제',
            type: 'theory',
            question: currentExtraQuiz.question,
            options: currentExtraQuiz.options,
            correct_answer: `${currentExtraQuiz.correctAnswer}번 (${currentExtraQuiz.options[currentExtraQuiz.correctAnswer - 1]})`,
            explanation: currentExtraQuiz.explanation,
            book_reference: currentExtraQuiz.bookReference
        });

        if (isSectionCompleted && section) {
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
                            onclick="LearningEngine.loadMoreQuiz(null, '${sectionId}', 'journal')">
                        🔄 이 단원 실무 분개문제 더 풀기
                    </button>
                </div>
            `;
        }

        const prog = window.LearningAuth.getProgress() || {};
        const counts = (prog.correct_counts && prog.correct_counts[sectionId]) || { theory: 0, journal: 0 };
        let theoryCorrect = counts.theory || 0;
        let journalCorrect = counts.journal || 0;

        if (isCorrect) journalCorrect++;

        const targets = getSectionTargets(sectionId);
        const reqT = targets.reqT;
        const reqJ = targets.reqJ;
        const isSectionCompleted = (theoryCorrect >= reqT) && (reqJ === 0 || journalCorrect >= reqJ);

        await saveProgress(stepId, sectionId, isCorrect, 'journal', isSectionCompleted, {
            id: step.journalQuiz.id,
            section_title: section.title,
            type: 'journal',
            question: step.journalQuiz.question,
            correct_answer: correctText,
            explanation: step.journalQuiz.explanation,
            book_reference: step.journalQuiz.bookReference
        });

        if (isSectionCompleted && section) {
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
                        <i class="fa-solid fa-circle-check text-emerald-600 text-base"></i> 정답입니다! (분개 통과)
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
                        📌 <strong>안내</strong>: 이 분개문제는 자동으로 오답노트에 보관되었습니다.
                    </div>
                `;
            }

            fbBox.innerHTML += `
                <div class="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                    <button class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-md transition text-xs"
                            onclick="LearningEngine.loadMoreQuiz(null, '${sectionId}', 'journal')">
                        🔄 이 단원 실무 분개문제 더 풀기
                    </button>
                </div>
            `;
        }

        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);

        const prog = window.LearningAuth.getProgress() || {};
        const counts = (prog.correct_counts && prog.correct_counts[sectionId]) || { theory: 0, journal: 0 };
        let theoryCorrect = counts.theory || 0;
        let journalCorrect = counts.journal || 0;

        if (isCorrect) journalCorrect++;

        const targets = getSectionTargets(sectionId);
        const reqT = targets.reqT;
        const reqJ = targets.reqJ;
        const isSectionCompleted = (theoryCorrect >= reqT) && (reqJ === 0 || journalCorrect >= reqJ);

        await saveProgress(stepId, sectionId, isCorrect, 'journal', isSectionCompleted, {
            id: currentExtraQuiz.id,
            section_title: section ? section.title : '실무분개',
            type: 'journal',
            question: currentExtraQuiz.question,
            correct_answer: correctText,
            explanation: currentExtraQuiz.explanation,
            book_reference: currentExtraQuiz.bookReference
        });

        if (isSectionCompleted && section) {
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
            
            const counts = (prog.correct_counts && prog.correct_counts[sectionId]) || { theory: 0, journal: 0 };
            let curT = counts.theory || 0;
            let curJ = counts.journal || 0;

            if (isCorrect) {
                if (quizType === 'theory') curT++;
                if (quizType === 'journal') curJ++;
            }

            const targets = getSectionTargets(sectionId);
            const reqT = targets.reqT;
            const reqJ = targets.reqJ;
            const maxScore = reqT + reqJ;

            const cappedT = Math.min(reqT, curT);
            const cappedJ = Math.min(reqJ, curJ);
            const sPct = maxScore > 0 ? Math.round(((cappedT + cappedJ) / maxScore) * 100) : 0;
            const isCompleted = (cappedT >= reqT) && (reqJ === 0 || cappedJ >= reqJ);

            const res = await fetch('?action=learning_save_step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step_id: sectionId,
                    section_id: sectionId,
                    quiz_type: quizType,
                    is_correct: isCorrect,
                    is_step_completed: isCompleted,
                    section_pct: sPct, 
                    wrong_data: isCorrect ? null : wrongData
                })
            });
            const data = await res.json();
            if (res.ok && data.success && data.progress) {
                window.LearningAuth.setProgress(data.progress);
                if (currentSectionId === sectionId) {
                    const latestCounts = (data.progress.correct_counts && data.progress.correct_counts[sectionId]) || { theory: curT, journal: curJ };
                    updateGoalBoardUI(sectionId, latestCounts);
                }
            }
        } catch (e) {
            console.error('진도 저장 실패:', e);
        }
    }

    function updateGoalBoardUI(sectionId, counts) {
        const curriculum = window.LearningCurriculum;
        const section = curriculum.sections.find(s => s.id === sectionId);
        if (!section) return;

        const targets = getSectionTargets(sectionId);
        const reqT = targets.reqT;
        const reqJ = targets.reqJ;
        const tCorrect = counts.theory || 0;
        const jCorrect = counts.journal || 0;

        const board = document.getElementById('step-target-board');
        if (!board) return;

        let html = '';
        if (reqT > 0) {
            html += `
                <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${tCorrect >= reqT ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}">
                    <span>📝 필기:</span>
                    <strong class="text-xs font-mono">${tCorrect}/${reqT}회</strong>
                    ${tCorrect >= reqT ? '<span class="text-[11px] font-extrabold text-emerald-600">완료</span>' : `<span class="text-[11px] font-bold text-amber-600">(${reqT - tCorrect}문제 더 필요)</span>`}
                </span>
            `;
        }
        if (reqJ > 0) {
            html += `
                <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${jCorrect >= reqJ ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}">
                    <span>🧾 분개:</span>
                    <strong class="text-xs font-mono">${jCorrect}/${reqJ}회</strong>
                    ${jCorrect >= reqJ ? '<span class="text-[11px] font-extrabold text-emerald-600">완료</span>' : `<span class="text-[11px] font-bold text-amber-600">(${reqJ - jCorrect}문제 더 필요)</span>`}
                </span>
            `;
        }
        board.innerHTML = html;
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
        
        showSectionCompleteModal,

        renderAdminDashboard,
        filterAdminUserList,
        openAdminUserDetailModal,
        closeAdminUserDetailModal
    };
})();