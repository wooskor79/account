/**
 * 2026 전산회계 1급 / 2급 영상 강의실 & 스마트 학습 플레이어 엔진
 */
window.VideoEngine = (function() {
    let currentGrade = 'grade2';
    let currentPath = '';
    let currentItems = [];
    let videoProgress = {}; // { video_key: { position, duration, completed, bookmarks, updated_at } }
    let currentVideo = null;
    let progressSaveInterval = null;
    let autoPlayNext = true;
    let nextVideoTimer = null;
    let isInitialized = false;
    let isTheaterMode = false;

    // 로그인 게이트용 대기 변수
    let pendingGateGrade = 'grade2';
    let pendingGatePath = '';

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
        const s = Math.floor(seconds);
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;

        if (hrs > 0) {
            return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function getVideoKey(grade, path) {
        return `${grade}_${path}`.replace(/[^a-zA-Z0-9_\-\.\/]/g, '_');
    }

    // --- 진도 동기화 (서버 + LocalStorage) ---
    async function loadProgress() {
        // 1. 로컬스토리지 우선 로드
        try {
            const localData = localStorage.getItem(`video_progress_${currentGrade}`);
            if (localData) {
                videoProgress = Object.assign(videoProgress, JSON.parse(localData));
            }
        } catch(e) {}

        // 2. 서버 진도 동기화 (로그인 상태인 경우)
        try {
            const res = await fetch('?action=get_video_progress');
            const data = await res.json();
            if (data.success && data.video_progress) {
                videoProgress = Object.assign(videoProgress, data.video_progress);
                localStorage.setItem(`video_progress_${currentGrade}`, JSON.stringify(videoProgress));
            }
        } catch(e) {
            console.warn('영상 진도 서버 로드 실패 (로컬 사용):', e);
        }
    }

    async function saveCurrentProgress(videoPath, pos, dur, isCompleted, bookmarks = null) {
        if (!videoPath) return;
        const vKey = getVideoKey(currentGrade, videoPath);
        
        const existing = videoProgress[vKey] || {};
        const bMarks = bookmarks !== null ? bookmarks : (existing.bookmarks || []);
        const completed = isCompleted || existing.completed || (dur > 0 && (pos / dur) >= 0.85);

        const record = {
            video_key: vKey,
            path: videoPath,
            grade: currentGrade,
            position: pos,
            duration: dur,
            completed: completed,
            bookmarks: bMarks,
            updated_at: new Date().toISOString()
        };

        videoProgress[vKey] = record;

        // 최근 시청 목록 갱신
        updateRecentVideos(record);

        // 로컬 저장
        try {
            localStorage.setItem(`video_progress_${currentGrade}`, JSON.stringify(videoProgress));
        } catch(e) {}

        // 서버 비동기 전송
        try {
            fetch('?action=save_video_progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            }).catch(() => {});
        } catch(e) {}
    }

    function updateRecentVideos(record) {
        try {
            let recents = JSON.parse(localStorage.getItem('recent_watched_videos') || '[]');
            recents = recents.filter(r => r.video_key !== record.video_key);
            recents.unshift(record);
            if (recents.length > 5) recents.pop();
            localStorage.setItem('recent_watched_videos', JSON.stringify(recents));
        } catch(e) {}
    }

    function getRecentVideos() {
        try {
            return JSON.parse(localStorage.getItem('recent_watched_videos') || '[]');
        } catch(e) {
            return [];
        }
    }

    // --- 영상 로그인 / 회원가입 게이트 모달 제어 ---
    async function checkAuthAndOpenView(grade = 'grade2', path = '', bypassLoginGate = false) {
        // 학습 로그인 상태 확인
        let isLoggedIn = false;
        if (window.LearningAuth) {
            if (window.LearningAuth.getUser()) {
                isLoggedIn = true;
            } else {
                const status = await window.LearningAuth.checkStatus();
                if (status && status.loggedIn) {
                    isLoggedIn = true;
                }
            }
        }

        if (!isLoggedIn && !bypassLoginGate) {
            openLoginGateModal(grade, path);
            return;
        }

        openVideoAppView(grade, path);
    }

    function openLoginGateModal(grade, path) {
        pendingGateGrade = grade;
        pendingGatePath = path;

        const modal = document.getElementById('video-login-gate-modal');
        const titleEl = document.getElementById('video-gate-title');

        if (titleEl) {
            titleEl.textContent = `2026 전산회계 ${grade === 'grade1' ? '1급' : '2급'} 영상 강의실`;
        }

        switchGateTab('login');

        // 입력 폼 초기화
        const lUser = document.getElementById('video-login-username');
        const lPass = document.getElementById('video-login-password');
        const rUser = document.getElementById('video-reg-username');
        const rPass = document.getElementById('video-reg-password');
        const rPassC = document.getElementById('video-reg-password-confirm');
        const lErr = document.getElementById('video-login-error');
        const rErr = document.getElementById('video-reg-error');

        if (lUser) lUser.value = '';
        if (lPass) lPass.value = '';
        if (rUser) rUser.value = '';
        if (rPass) rPass.value = '';
        if (rPassC) rPassC.value = '';
        if (lErr) { lErr.textContent = ''; lErr.classList.add('hidden'); }
        if (rErr) { rErr.textContent = ''; rErr.classList.add('hidden'); }

        if (modal) modal.style.display = 'flex';
        setTimeout(() => lUser?.focus(), 100);
    }

    function closeLoginGateModal(e) {
        if (e && e.target && e.target.closest && e.target.closest('#video-gate-container')) return;
        const modal = document.getElementById('video-login-gate-modal');
        if (modal) modal.style.display = 'none';
    }

    function switchGateTab(tab) {
        const loginForm = document.getElementById('video-gate-login-form');
        const regForm = document.getElementById('video-gate-register-form');
        const btnLogin = document.getElementById('video-tab-btn-login');
        const btnReg = document.getElementById('video-tab-btn-register');

        if (tab === 'login') {
            if (loginForm) loginForm.classList.remove('hidden');
            if (regForm) regForm.classList.add('hidden');
            if (btnLogin) btnLogin.classList.add('active');
            if (btnReg) btnReg.classList.remove('active');
            setTimeout(() => document.getElementById('video-login-username')?.focus(), 50);
        } else {
            if (loginForm) loginForm.classList.add('hidden');
            if (regForm) regForm.classList.remove('hidden');
            if (btnLogin) btnLogin.classList.remove('active');
            if (btnReg) btnReg.classList.add('active');
            setTimeout(() => document.getElementById('video-reg-username')?.focus(), 50);
        }
    }

    async function submitGateLogin(e) {
        if (e) e.preventDefault();
        const userInp = document.getElementById('video-login-username');
        const passInp = document.getElementById('video-login-password');
        const errEl = document.getElementById('video-login-error');
        const btn = document.getElementById('btn-video-submit-login');

        const username = userInp ? userInp.value.trim() : '';
        const password = passInp ? passInp.value : '';

        if (!username || !password) {
            if (errEl) {
                errEl.textContent = '이름과 비밀번호를 입력해주세요.';
                errEl.classList.remove('hidden');
            }
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> 로그인 중...`;
        }

        try {
            if (window.LearningAuth && typeof window.LearningAuth.login === 'function') {
                await window.LearningAuth.login(username, password);
                closeLoginGateModal();
                openVideoAppView(pendingGateGrade, pendingGatePath);
            } else {
                throw new Error('인증 모듈을 찾을 수 없습니다.');
            }
        } catch(err) {
            if (errEl) {
                errEl.textContent = err.message || '로그인에 실패했습니다. 이름과 비밀번호를 확인해주세요.';
                errEl.classList.remove('hidden');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `학습 시작하기 ➜`;
            }
        }
    }

    async function submitGateRegister(e) {
        if (e) e.preventDefault();
        const userInp = document.getElementById('video-reg-username');
        const passInp = document.getElementById('video-reg-password');
        const passCInp = document.getElementById('video-reg-password-confirm');
        const errEl = document.getElementById('video-reg-error');
        const btn = document.getElementById('btn-video-submit-register');

        const username = userInp ? userInp.value.trim() : '';
        const password = passInp ? passInp.value : '';
        const passwordConfirm = passCInp ? passCInp.value : '';

        if (!username) {
            if (errEl) {
                errEl.textContent = '학습자 이름을 입력해주세요.';
                errEl.classList.remove('hidden');
            }
            return;
        }
        if (!password || password.length < 4) {
            if (errEl) {
                errEl.textContent = '비밀번호는 숫자 4자리 이상으로 입력해주세요.';
                errEl.classList.remove('hidden');
            }
            return;
        }
        if (password !== passwordConfirm) {
            if (errEl) {
                errEl.textContent = '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
                errEl.classList.remove('hidden');
            }
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> 가입 처리 중...`;
        }

        try {
            if (window.LearningAuth && typeof window.LearningAuth.register === 'function') {
                await window.LearningAuth.register(username, password, passwordConfirm);
                closeLoginGateModal();
                openVideoAppView(pendingGateGrade, pendingGatePath);
            } else {
                throw new Error('인증 모듈을 찾을 수 없습니다.');
            }
        } catch(err) {
            if (errEl) {
                errEl.textContent = err.message || '회원가입에 실패했습니다.';
                errEl.classList.remove('hidden');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `회원가입 완료 및 입장 ➜`;
            }
        }
    }

    function continueWithoutLogin() {
        closeLoginGateModal();
        openVideoAppView(pendingGateGrade, pendingGatePath);
    }

    // --- 영상 강의실 메인 뷰 열기 / 닫기 ---
    async function openVideoAppView(grade = 'grade2', path = '') {
        currentGrade = grade;
        currentPath = path;

        // 다른 뷰 숨기기
        const mainView = document.getElementById('main-content-view');
        const quizView = document.getElementById('quiz-content-view');
        const learningView = document.getElementById('learning-course-view');
        const videoView = document.getElementById('video-course-view');

        document.body.classList.add('video-app-active');

        if (mainView) { mainView.classList.add('hidden'); mainView.style.display = 'none'; }
        if (quizView) { quizView.classList.add('hidden'); quizView.style.display = 'none'; }
        if (learningView) { learningView.classList.add('hidden'); learningView.style.display = 'none'; }

        if (videoView) {
            videoView.classList.remove('hidden');
            videoView.style.display = 'block';
        }

        // 로그인 상태 및 진도 로드
        await loadProgress();

        // 뷰 렌더링
        await fetchAndRenderVideos(currentGrade, currentPath);
    }

    function closeVideoAppView() {
        document.body.classList.remove('video-app-active');
        const mainView = document.getElementById('main-content-view');
        const videoView = document.getElementById('video-course-view');

        if (videoView) {
            videoView.classList.add('hidden');
            videoView.style.display = 'none';
        }
        if (mainView) {
            mainView.classList.remove('hidden');
            mainView.style.display = '';
        }
        closeVideoPlayerModal();
    }

    // --- 영상 목록 및 폴더 데이터 fetch & 렌더링 ---
    async function fetchAndRenderVideos(grade, path) {
        const container = document.getElementById('video-content-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-16 text-center text-slate-400">
                <div class="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="font-bold text-sm text-slate-600">영상 강의실을 불러오는 중입니다...</p>
            </div>
        `;

        try {
            const res = await fetch(`?action=videos&grade=${encodeURIComponent(grade)}&path=${encodeURIComponent(path)}`);
            const data = await res.json();

            currentGrade = grade;
            currentPath = data.current_path || '';
            currentItems = data.items || [];

            renderVideoView(container, data);
        } catch(err) {
            console.error('영상 로드 오류:', err);
            container.innerHTML = `
                <div class="p-8 text-center bg-rose-50 rounded-2xl border border-rose-200">
                    <p class="font-bold text-rose-700">영상 목록을 불러올 수 없습니다.</p>
                    <p class="text-xs text-rose-500 mt-1">${escapeHtml(err.message)}</p>
                    <button class="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl shadow" onclick="VideoEngine.openVideoAppView('${grade}', '${path}')">다시 시도</button>
                </div>
            `;
        }
    }

    function renderVideoView(container, data) {
        const items = data.items || [];
        const isGrade1 = currentGrade === 'grade1';
        const user = window.LearningAuth ? window.LearningAuth.getUser() : null;
        const recentVideos = getRecentVideos().filter(r => r.grade === currentGrade);

        // 빵가루(Breadcrumbs) 생성
        const pathSegments = currentPath ? currentPath.split('/').filter(Boolean) : [];
        let breadcrumbHtml = `
            <span class="breadcrumb-item cursor-pointer text-indigo-600 hover:underline font-bold" onclick="VideoEngine.openFolder('')">
                🏠 루트 강의실
            </span>
        `;
        let accPath = '';
        pathSegments.forEach((seg, idx) => {
            accPath += (accPath ? '/' : '') + seg;
            const isLast = idx === pathSegments.length - 1;
            breadcrumbHtml += `
                <span class="text-slate-400 mx-1.5">/</span>
                <span class="breadcrumb-item ${isLast ? 'font-extrabold text-slate-800' : 'text-indigo-600 hover:underline cursor-pointer font-bold'}"
                      ${!isLast ? `onclick="VideoEngine.openFolder('${encodeURIComponent(accPath)}')"` : ''}>
                    ${escapeHtml(seg)}
                </span>
            `;
        });

        // 폴더와 영상 분리
        const folders = items.filter(it => it.type === 'folder');
        const videos = items.filter(it => it.type === 'file');

        container.innerHTML = `
            <!-- 상단 헤더 & 컨트롤 바 -->
            <div class="video-app-header bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 mb-6">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-2xl ${isGrade1 ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white' : 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white'} flex items-center justify-center text-2xl shadow-md flex-shrink-0">
                            🎬
                        </div>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <h1 class="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                                    ${isGrade1 ? '전산회계 1급' : '전산회계 2급'} 영상 강의실
                                </h1>
                                <span class="px-2.5 py-0.5 ${isGrade1 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200'} text-xs font-bold rounded-full border">
                                    ${isGrade1 ? '중급 마스터' : '기초 입문'}
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 mt-1 font-medium">
                                단원별 고화질 강의를 배속 조절, 스마트 이어보기 및 북마크로 편리하게 수강하세요.
                            </p>
                        </div>
                    </div>

                    <!-- 우측 상단 액션 버튼들 -->
                    <div class="flex items-center gap-2 flex-wrap">
                        <!-- 급수 전환 탭 -->
                        <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                            <button class="px-3 py-1.5 rounded-lg transition ${!isGrade1 ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
                                    onclick="VideoEngine.switchGrade('grade2')">
                                📘 2급 영상
                            </button>
                            <button class="px-3 py-1.5 rounded-lg transition ${isGrade1 ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
                                    onclick="VideoEngine.switchGrade('grade1')">
                                🎓 1급 영상
                            </button>
                        </div>

                        <!-- 홈으로 / 영상 그만보기 버튼 -->
                        <button onclick="VideoEngine.closeVideoAppView()" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5">
                            <i class="fa-solid fa-house"></i> <span>홈으로 돌아가기</span>
                        </button>
                    </div>
                </div>

                <!-- 학습자 연동 알림 배너 -->
                <div class="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div class="flex items-center gap-2 text-slate-600">
                        ${user ? `
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200">
                                👤 <strong>${escapeHtml(user.username)}</strong>님 계정 연동 중 (시청 진도 자동 저장)
                            </span>
                        ` : `
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 font-medium rounded-lg border border-amber-200">
                                💡 <strong>비로그인 상태</strong>: 현재 브라우저에 이어보기가 저장됩니다. (
                                <button onclick="VideoEngine.openLoginGateModal('${currentGrade}', '${encodeURIComponent(currentPath)}')" class="font-bold underline text-indigo-600 hover:text-indigo-800">
                                    로그인하기
                                </button>)
                            </span>
                        `}
                    </div>

                    <!-- 실시간 검색창 -->
                    <div class="relative w-full sm:w-64">
                        <input type="text" id="video-search-input" placeholder="강의 제목 또는 폴더 검색..." 
                               class="w-full px-3 py-1.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                               oninput="VideoEngine.filterVideos(this.value)">
                        <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                    </div>
                </div>
            </div>

            <!-- 최근 본 강의 (Recent Videos) 슬라이드 -->
            ${recentVideos.length > 0 && !currentPath ? `
                <div class="mb-6">
                    <div class="flex items-center justify-between mb-2.5 px-1">
                        <h3 class="text-sm font-extrabold text-slate-700 flex items-center gap-1.5">
                            <span>⏱️ 최근 시청한 강의</span>
                        </h3>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        ${recentVideos.slice(0, 3).map(rec => renderRecentVideoCard(rec)).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 빵가루 및 상위 폴더 이동 바 -->
            <div class="flex items-center justify-between gap-3 bg-white/70 backdrop-blur rounded-2xl px-4 py-3 border border-slate-200 shadow-2xs mb-4">
                <div class="flex items-center text-xs text-slate-700 overflow-x-auto whitespace-nowrap py-0.5">
                    ${breadcrumbHtml}
                </div>
                ${currentPath ? `
                    <button onclick="VideoEngine.goUpFolder()" class="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1 shrink-0">
                        <i class="fa-solid fa-arrow-up"></i> 상위 폴더
                    </button>
                ` : ''}
            </div>

            <!-- 폴더 & 영상 목록 컨테이너 -->
            <div id="video-cards-grid" class="space-y-6">
                <!-- 1. 폴더 목록 (있는 경우) -->
                ${folders.length > 0 ? `
                    <div>
                        <div class="text-xs font-bold text-slate-500 mb-2.5 px-1 flex items-center gap-1.5">
                            <span>📁 폴더 (${folders.length}개)</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                            ${folders.map(f => `
                                <div class="video-folder-card group p-4 bg-white hover:bg-indigo-50/50 rounded-2xl border border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-md transition cursor-pointer flex items-center gap-3.5"
                                     onclick="VideoEngine.openFolder('${encodeURIComponent(f.path)}')">
                                    <div class="w-10 h-10 rounded-xl bg-amber-50 group-hover:bg-indigo-100 text-amber-600 group-hover:text-indigo-600 flex items-center justify-center text-xl transition flex-shrink-0">
                                        📁
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div class="font-extrabold text-sm text-slate-800 group-hover:text-indigo-900 truncate card-title-text">
                                            ${escapeHtml(f.name)}
                                        </div>
                                        <div class="text-[11px] text-slate-400 font-medium mt-0.5">폴더 열기 ➜</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 2. 동영상 파일 목록 -->
                <div>
                    <div class="text-xs font-bold text-slate-500 mb-2.5 px-1 flex items-center justify-between">
                        <span>🎬 강의 영상 (${videos.length}개)</span>
                        <span class="text-[11px] text-slate-400">클릭 시 고화질 플레이어로 즉시 시청</span>
                    </div>

                    ${videos.length === 0 && folders.length === 0 ? `
                        <div class="py-16 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
                            <div class="text-4xl mb-3">📭</div>
                            <h4 class="font-bold text-base text-slate-700">현재 폴더에 등록된 영상이 없습니다.</h4>
                            <p class="text-xs text-slate-400 mt-1">상위 폴더로 이동하거나 다른 단원을 확인해 보세요.</p>
                            ${currentPath ? `
                                <button class="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow" onclick="VideoEngine.goUpFolder()">
                                    ⬆ 상위 폴더로 이동
                                </button>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${videos.map((v, idx) => renderVideoCard(v, idx)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    function renderRecentVideoCard(rec) {
        const vName = rec.path ? rec.path.split('/').pop() : rec.video_key;
        const vKey = rec.video_key;
        const prog = videoProgress[vKey] || rec;
        const isCompleted = !!prog.completed;
        const pos = prog.position || 0;
        const dur = prog.duration || 0;
        const pct = dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0;

        return `
            <div class="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                 onclick="VideoEngine.playVideoFromRecent('${encodeURIComponent(rec.path)}')">
                <div class="flex items-start gap-3">
                    <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0">
                        ▶️
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="text-xs font-extrabold text-slate-800 truncate" title="${escapeHtml(vName)}">
                            ${escapeHtml(vName)}
                        </div>
                        <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span>⏱️ ${formatTime(pos)} / ${formatTime(dur)}</span>
                            ${isCompleted ? '<span class="text-emerald-600 font-bold">✅ 수강완료</span>' : `<span class="text-indigo-600 font-bold">${pct}% 시청</span>`}
                        </div>
                    </div>
                </div>
                <!-- 프로그레스 바 -->
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2.5">
                    <div class="bg-indigo-600 h-full rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }

    function renderVideoCard(v, idx) {
        const vKey = getVideoKey(currentGrade, v.path);
        const prog = videoProgress[vKey] || {};
        const isCompleted = !!prog.completed;
        const pos = prog.position || 0;
        const dur = prog.duration || 0;
        const pct = dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0;
        const bookmarkCount = (prog.bookmarks && prog.bookmarks.length) || 0;

        return `
            <div class="video-item-card group bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-lg transition flex flex-col justify-between overflow-hidden"
                 data-video-path="${escapeHtml(v.path)}">
                
                <!-- 카드 상단 (썸네일 영역 & 뱃지) -->
                <div class="relative bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-t-2xl text-white flex flex-col justify-between min-h-[95px] cursor-pointer"
                     onclick="VideoEngine.playVideo('${encodeURIComponent(v.path)}', '${encodeURIComponent(v.name)}')">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2 py-0.5 bg-black/40 backdrop-blur text-[11px] font-bold rounded-lg text-slate-200">
                            #${idx + 1}강
                        </span>
                        <div class="flex items-center gap-1.5">
                            ${isCompleted ? `
                                <span class="px-2 py-0.5 bg-emerald-500/90 text-white text-[10px] font-extrabold rounded-md shadow-xs">
                                    <i class="fa-solid fa-check"></i> 수강완료
                                </span>
                            ` : pos > 10 ? `
                                <span class="px-2 py-0.5 bg-indigo-500/90 text-white text-[10px] font-bold rounded-md shadow-xs">
                                    ⏱️ ${formatTime(pos)}
                                </span>
                            ` : ''}
                            ${bookmarkCount > 0 ? `
                                <span class="px-1.5 py-0.5 bg-amber-500/80 text-white text-[10px] font-bold rounded-md">
                                    📌 ${bookmarkCount}
                                </span>
                            ` : ''}
                        </div>
                    </div>

                    <div class="flex items-center justify-between mt-2">
                        <span class="text-xs text-slate-300 font-mono">${formatFileSize(v.size)}</span>
                        <div class="w-8 h-8 rounded-full bg-white/20 group-hover:bg-indigo-600 group-hover:scale-110 flex items-center justify-center text-white text-xs transition transform">
                            <i class="fa-solid fa-play ml-0.5"></i>
                        </div>
                    </div>

                    <!-- 하단 진행도 바 -->
                    ${pct > 0 ? `
                        <div class="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                            <div class="h-full bg-gradient-to-r from-indigo-500 to-emerald-400" style="width: ${pct}%"></div>
                        </div>
                    ` : ''}
                </div>

                <!-- 카드 본문 (제목 & 정보) -->
                <div class="p-4 flex flex-col justify-between flex-1">
                    <div>
                        <h4 class="font-extrabold text-sm text-slate-800 group-hover:text-indigo-900 leading-snug line-clamp-2 card-title-text cursor-pointer"
                            onclick="VideoEngine.playVideo('${encodeURIComponent(v.path)}', '${encodeURIComponent(v.name)}')">
                            ${escapeHtml(v.name.replace(/\.[^/.]+$/, ''))}
                        </h4>
                    </div>

                    <!-- 하단 액션 버튼들 -->
                    <div class="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button class="font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1"
                                onclick="VideoEngine.playVideo('${encodeURIComponent(v.path)}', '${encodeURIComponent(v.name)}')">
                            <span>시청하기</span> <i class="fa-solid fa-chevron-right text-[10px]"></i>
                        </button>
                        
                        <a href="?action=stream_video&path=${encodeURIComponent(v.path)}&grade=${encodeURIComponent(currentGrade)}" 
                           download="${escapeHtml(v.name)}" 
                           class="text-slate-400 hover:text-slate-600 text-[11px] font-medium transition" 
                           title="영상 다운로드">
                            ⬇ 다운로드
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    function openFolder(encodedPath) {
        const path = decodeURIComponent(encodedPath);
        fetchAndRenderVideos(currentGrade, path);
    }

    function goUpFolder() {
        if (!currentPath) return;
        const parts = currentPath.split('/');
        parts.pop();
        fetchAndRenderVideos(currentGrade, parts.join('/'));
    }

    function switchGrade(targetGrade) {
        if (currentGrade === targetGrade) return;
        fetchAndRenderVideos(targetGrade, '');
    }

    function filterVideos(keyword) {
        const q = (keyword || '').trim().toLowerCase();
        const cards = document.querySelectorAll('.video-item-card, .video-folder-card');
        
        cards.forEach(card => {
            const titleEl = card.querySelector('.card-title-text');
            if (!titleEl) return;
            const originalText = titleEl.getAttribute('data-orig-text') || titleEl.textContent;
            if (!titleEl.hasAttribute('data-orig-text')) {
                titleEl.setAttribute('data-orig-text', originalText);
            }

            if (!q) {
                card.style.display = '';
                titleEl.innerHTML = escapeHtml(originalText);
                return;
            }

            if (originalText.toLowerCase().includes(q)) {
                card.style.display = '';
                // 하이라이트
                const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                titleEl.innerHTML = escapeHtml(originalText).replace(regex, '<mark class="bg-amber-200 text-slate-900 rounded-xs px-0.5 font-bold">$1</mark>');
            } else {
                card.style.display = 'none';
            }
        });
    }

    // --- 비디오 플레이어 모달 제어 ---
    function playVideo(encodedPath, encodedName) {
        const path = decodeURIComponent(encodedPath);
        const name = encodedName ? decodeURIComponent(encodedName) : path.split('/').pop();
        const vKey = getVideoKey(currentGrade, path);
        const prog = videoProgress[vKey] || {};

        currentVideo = {
            path: path,
            name: name,
            key: vKey
        };

        const modal = document.getElementById('video-player-modal');
        const videoEl = document.getElementById('video-main-player');
        const titleEl = document.getElementById('video-modal-title');
        const resumeBanner = document.getElementById('video-resume-banner');

        if (!modal || !videoEl) return;

        titleEl.textContent = name;
        const streamUrl = `?action=stream_video&path=${encodeURIComponent(path)}&grade=${encodeURIComponent(currentGrade)}`;
        
        videoEl.src = streamUrl;
        videoEl.playbackRate = 1.0;

        // 에러 핸들러
        videoEl.onerror = () => {
            console.error('비디오 재생 실패:', streamUrl);
            if (resumeBanner) {
                resumeBanner.classList.remove('hidden');
                resumeBanner.innerHTML = `
                    <div class="p-3 bg-rose-900/90 border border-rose-500/50 text-white rounded-xl text-xs backdrop-blur-md">
                        ⚠️ 영상 스트리밍 연결에 실패했습니다. <a href="${streamUrl}" download class="underline font-bold ml-2 text-amber-300">직접 다운로드하여 시청하기</a>
                    </div>
                `;
            }
        };

        // 배속 셀렉트 리셋
        const speedSel = document.getElementById('video-speed-select');
        if (speedSel) speedSel.value = '1';

        // 이어보기 배너 설정
        const lastPos = prog.position || 0;
        if (lastPos > 10 && (!prog.completed || lastPos < (prog.duration - 15))) {
            if (resumeBanner) {
                resumeBanner.classList.remove('hidden');
                resumeBanner.innerHTML = `
                    <div class="flex items-center justify-between gap-3 px-4 py-2.5 bg-indigo-900/90 border border-indigo-500/50 text-white rounded-xl text-xs backdrop-blur-md shadow-lg">
                        <div class="flex items-center gap-2">
                            <span>⏱️</span>
                            <span>이전에 <strong>${formatTime(lastPos)}</strong>까지 시청하셨습니다.</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button class="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg transition" onclick="VideoEngine.resumePlayback(${lastPos})">
                                이어보기
                            </button>
                            <button class="px-2 py-1 text-slate-300 hover:text-white font-medium transition" onclick="VideoEngine.dismissResumeBanner()">
                                처음부터
                            </button>
                        </div>
                    </div>
                `;
            }
        } else {
            if (resumeBanner) resumeBanner.classList.add('hidden');
        }

        // 북마크 리스트 렌더링
        renderBookmarkList(prog.bookmarks || []);

        // 같은 폴더 내 다음 강의 목록 렌더링
        renderNextPlaylist(path);

        modal.style.display = 'flex';
        videoEl.play().catch(e => {
            console.warn('비디오 자동재생 차단 또는 지연:', e);
        });

        // 5초 주기 진도 저장 타이머 가동
        clearInterval(progressSaveInterval);
        progressSaveInterval = setInterval(() => {
            if (videoEl && !videoEl.paused && videoEl.duration > 0) {
                saveCurrentProgress(currentVideo.path, videoEl.currentTime, videoEl.duration, false);
            }
        }, 5000);

        // 이벤트 리스너 등록
        videoEl.onended = onVideoEnded;
        videoEl.onpause = () => {
            if (videoEl.duration > 0) {
                saveCurrentProgress(currentVideo.path, videoEl.currentTime, videoEl.duration, false);
            }
        };
    }

    function playVideoFromRecent(encodedPath) {
        const path = decodeURIComponent(encodedPath);
        playVideo(encodedPath, encodeURIComponent(path.split('/').pop()));
    }

    function resumePlayback(seconds) {
        const videoEl = document.getElementById('video-main-player');
        if (videoEl) {
            videoEl.currentTime = seconds;
            videoEl.play().catch(() => {});
        }
        dismissResumeBanner();
    }

    function dismissResumeBanner() {
        const resumeBanner = document.getElementById('video-resume-banner');
        if (resumeBanner) resumeBanner.classList.add('hidden');
    }

    function changePlaybackSpeed(speed) {
        const videoEl = document.getElementById('video-main-player');
        if (videoEl) {
            videoEl.playbackRate = parseFloat(speed);
        }
    }

    let isSidebarHidden = false;
    let dragPos = { startX: 0, startY: 0, initialLeft: 0, initialTop: 0, isDragging: false };
    let resizePos = { startX: 0, startY: 0, initialWidth: 0, initialHeight: 0, isResizing: false };

    // --- 우측 재생목록 / 북마크 사이드바 숨기기/보기 토글 ---
    function toggleSidebar() {
        const bodyEl = document.getElementById('video-modal-body');
        const textEl = document.getElementById('sidebar-toggle-text');
        if (!bodyEl) return;

        isSidebarHidden = !isSidebarHidden;
        if (isSidebarHidden) {
            bodyEl.classList.add('sidebar-collapsed');
            if (textEl) textEl.textContent = '목록보기';
        } else {
            bodyEl.classList.remove('sidebar-collapsed');
            if (textEl) textEl.textContent = '목록숨기기';
        }
    }

    // --- 극장 모드 (크기 조절) 토글 ---
    function toggleTheaterMode() {
        const container = document.getElementById('video-modal-container');
        const textEl = document.getElementById('theater-mode-text');
        if (!container) return;

        isTheaterMode = !isTheaterMode;
        if (isTheaterMode) {
            // 드래그/리사이즈 인라인 스타일 초기화 후 극장모드 적용
            container.style.position = '';
            container.style.left = '';
            container.style.top = '';
            container.style.width = '';
            container.style.height = '';
            container.style.margin = '';
            container.classList.remove('max-w-5xl');
            container.classList.add('theater-mode', 'max-w-[96vw]', 'w-[96vw]', 'max-h-[96vh]');
            if (textEl) textEl.textContent = '기본화면';
        } else {
            container.classList.remove('theater-mode', 'max-w-[96vw]', 'w-[96vw]', 'max-h-[96vh]');
            container.classList.add('max-w-5xl');
            container.style.position = '';
            container.style.left = '';
            container.style.top = '';
            container.style.width = '';
            container.style.height = '';
            container.style.margin = '';
            if (textEl) textEl.textContent = '극장모드';
        }
    }

    // --- 비디오 모달 창 드래그 이동 시작 (인라인 / 이벤트 리스너 공용) ---
    function startDrag(e) {
        if (!e) return;
        // 버튼, 셀렉트, 인풋 등 대화형 요소 클릭 시 드래그 방지
        if (e.target && e.target.closest && e.target.closest('button, select, input, a, .btn-video-modal-close')) return;
        if (isTheaterMode) return; // 극장모드일 때는 이동 잠금

        const container = document.getElementById('video-modal-container');
        const header = document.getElementById('video-modal-header');
        if (!container || !header) return;

        e.preventDefault();
        const rect = container.getBoundingClientRect();
        
        // fixed 좌표계로 전환
        container.style.position = 'fixed';
        container.style.left = `${rect.left}px`;
        container.style.top = `${rect.top}px`;
        container.style.margin = '0';

        dragPos.startX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        dragPos.startY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        dragPos.initialLeft = rect.left;
        dragPos.initialTop = rect.top;
        dragPos.isDragging = true;
        header.classList.add('is-dragging');

        const onMouseMove = (moveEvent) => {
            if (!dragPos.isDragging) return;
            moveEvent.preventDefault();
            const clientX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientX : 0);
            const clientY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientY : 0);
            const deltaX = clientX - dragPos.startX;
            const deltaY = clientY - dragPos.startY;

            let nextLeft = dragPos.initialLeft + deltaX;
            let nextTop = dragPos.initialTop + deltaY;

            // 뷰포트 안전 경계 (화면 밖 이탈 방지)
            const minLeft = 10;
            const maxLeft = window.innerWidth - container.offsetWidth - 10;
            const minTop = 10;
            const maxTop = window.innerHeight - container.offsetHeight - 10;

            nextLeft = Math.max(minLeft, Math.min(maxLeft, nextLeft));
            nextTop = Math.max(minTop, Math.min(maxTop, nextTop));

            container.style.left = `${nextLeft}px`;
            container.style.top = `${nextTop}px`;
        };

        const onMouseUp = () => {
            dragPos.isDragging = false;
            header.classList.remove('is-dragging');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onMouseMove);
            document.removeEventListener('touchend', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onMouseMove, { passive: false });
        document.addEventListener('touchend', onMouseUp);
    }

    // --- 우하단 핸들 창 크기 조절 시작 (인라인 / 이벤트 리스너 공용) ---
    function startResize(e) {
        if (!e) return;
        const container = document.getElementById('video-modal-container');
        if (!container) return;

        e.preventDefault();
        e.stopPropagation();

        const rect = container.getBoundingClientRect();
        container.style.position = 'fixed';
        container.style.left = `${rect.left}px`;
        container.style.top = `${rect.top}px`;
        container.style.margin = '0';

        resizePos.startX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        resizePos.startY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        resizePos.initialWidth = rect.width;
        resizePos.initialHeight = rect.height;
        resizePos.isResizing = true;

        // 극장모드 클래스 해제하여 인라인 사이즈 적용 가능하게 함
        if (isTheaterMode) {
            isTheaterMode = false;
            container.classList.remove('theater-mode');
            const textEl = document.getElementById('theater-mode-text');
            if (textEl) textEl.textContent = '극장모드';
        }

        const onResizeMove = (moveEvent) => {
            if (!resizePos.isResizing) return;
            moveEvent.preventDefault();
            const clientX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientX : 0);
            const clientY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientY : 0);
            const deltaX = clientX - resizePos.startX;
            const deltaY = clientY - resizePos.startY;

            let newW = resizePos.initialWidth + deltaX;
            let newH = resizePos.initialHeight + deltaY;

            // 최소/최대 크기 제한
            newW = Math.max(360, Math.min(window.innerWidth - rect.left - 10, newW));
            newH = Math.max(260, Math.min(window.innerHeight - rect.top - 10, newH));

            container.style.width = `${newW}px`;
            container.style.maxWidth = '98vw';
            container.style.height = `${newH}px`;
            container.style.maxHeight = '98vh';
        };

        const onResizeUp = () => {
            resizePos.isResizing = false;
            document.removeEventListener('mousemove', onResizeMove);
            document.removeEventListener('mouseup', onResizeUp);
            document.removeEventListener('touchmove', onResizeMove);
            document.removeEventListener('touchend', onResizeUp);
        };

        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', onResizeUp);
        document.addEventListener('touchmove', onResizeMove, { passive: false });
        document.addEventListener('touchend', onResizeUp);
    }

    // --- PiP (화면 속 화면) ---
    async function togglePiP() {
        const videoEl = document.getElementById('video-main-player');
        if (!videoEl) return;

        if (!document.pictureInPictureEnabled) {
            alert('현재 브라우저에서는 PiP(화면 속 화면) 기능이 지원되지 않습니다.');
            return;
        }

        if (videoEl.readyState === 0) {
            alert('영상이 준비된 후 PiP 버튼을 눌러주세요.');
            return;
        }

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoEl.requestPictureInPicture();
            }
        } catch(e) {
            console.warn('PiP 실행 실패:', e);
            alert('PiP 전환 실패: ' + e.message);
        }
    }

    function addBookmark() {
        if (!currentVideo) return;
        const videoEl = document.getElementById('video-main-player');
        const input = document.getElementById('video-bookmark-input');
        if (!videoEl || !input) return;

        const note = (input.value || '').trim() || '학습 체크포인트';
        const currentTime = videoEl.currentTime;

        const vKey = currentVideo.key;
        const prog = videoProgress[vKey] || {};
        const bMarks = prog.bookmarks || [];

        bMarks.push({
            id: 'bm_' + Date.now(),
            time: currentTime,
            note: note,
            created_at: new Date().toISOString()
        });

        // 시간순 정렬
        bMarks.sort((a, b) => a.time - b.time);

        saveCurrentProgress(currentVideo.path, currentTime, videoEl.duration, false, bMarks);
        renderBookmarkList(bMarks);
        input.value = '';
    }

    function seekBookmark(seconds) {
        const videoEl = document.getElementById('video-main-player');
        if (videoEl) {
            videoEl.currentTime = seconds;
            videoEl.play().catch(() => {});
        }
    }

    function deleteBookmark(bmId) {
        if (!currentVideo) return;
        const vKey = currentVideo.key;
        const prog = videoProgress[vKey] || {};
        let bMarks = prog.bookmarks || [];
        bMarks = bMarks.filter(b => b.id !== bmId);

        const videoEl = document.getElementById('video-main-player');
        saveCurrentProgress(currentVideo.path, videoEl ? videoEl.currentTime : 0, videoEl ? videoEl.duration : 0, false, bMarks);
        renderBookmarkList(bMarks);
    }

    function renderBookmarkList(bookmarks) {
        const listEl = document.getElementById('video-bookmark-list');
        if (!listEl) return;

        if (bookmarks.length === 0) {
            listEl.innerHTML = `<div class="py-6 text-center text-slate-400 text-xs">저장된 북마크가 없습니다.<br>중요한 시점에 메모를 남겨보세요!</div>`;
            return;
        }

        listEl.innerHTML = bookmarks.map(bm => `
            <div class="flex items-center justify-between gap-2 p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl text-xs transition">
                <button class="flex items-center gap-2 text-left flex-1 min-w-0" onclick="VideoEngine.seekBookmark(${bm.time})">
                    <span class="px-2 py-0.5 bg-indigo-600 text-white font-mono font-bold rounded text-[11px] shrink-0">
                        ${formatTime(bm.time)}
                    </span>
                    <span class="text-slate-200 font-medium truncate">${escapeHtml(bm.note)}</span>
                </button>
                <button class="text-slate-400 hover:text-rose-400 p-1 text-[11px] transition shrink-0" onclick="VideoEngine.deleteBookmark('${bm.id}')" title="북마크 삭제">
                    &times;
                </button>
            </div>
        `).join('');
    }

    function renderNextPlaylist(currentVideoPath) {
        const listEl = document.getElementById('video-next-playlist');
        if (!listEl) return;

        const videos = currentItems.filter(it => it.type === 'file');
        if (videos.length <= 1) {
            listEl.innerHTML = `<div class="py-6 text-center text-slate-400 text-xs">현재 폴더에 다른 영상이 없습니다.</div>`;
            return;
        }

        listEl.innerHTML = videos.map((v, idx) => {
            const isCurrent = v.path === currentVideoPath;
            const vKey = getVideoKey(currentGrade, v.path);
            const prog = videoProgress[vKey] || {};
            const isCompleted = !!prog.completed;

            return `
                <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl text-xs cursor-pointer transition ${isCurrent ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800/70 hover:bg-slate-700/80 text-slate-300'}"
                     onclick="VideoEngine.playVideo('${encodeURIComponent(v.path)}', '${encodeURIComponent(v.name)}')">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="w-5 text-center text-[11px] opacity-75">#${idx + 1}</span>
                        <span class="truncate">${escapeHtml(v.name)}</span>
                    </div>
                    ${isCompleted ? `<span class="text-emerald-400 text-[11px] shrink-0">✓</span>` : ''}
                </div>
            `;
        }).join('');
    }

    function onVideoEnded() {
        const videoEl = document.getElementById('video-main-player');
        if (!videoEl || !currentVideo) return;

        // 수강완료 처리
        saveCurrentProgress(currentVideo.path, videoEl.duration, videoEl.duration, true);

        // 다음 강의 자동 재생
        if (autoPlayNext) {
            const videos = currentItems.filter(it => it.type === 'file');
            const curIdx = videos.findIndex(v => v.path === currentVideo.path);
            if (curIdx !== -1 && curIdx < videos.length - 1) {
                const nextV = videos[curIdx + 1];
                showNextVideoCountdown(nextV);
            }
        }
    }

    function showNextVideoCountdown(nextV) {
        let count = 5;
        const banner = document.getElementById('video-resume-banner');
        if (!banner) return;

        banner.classList.remove('hidden');
        const updateCountdown = () => {
            banner.innerHTML = `
                <div class="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-900/90 border border-emerald-500/50 text-white rounded-xl text-xs backdrop-blur-md shadow-lg">
                    <div class="flex items-center gap-2">
                        <span>⏭️</span>
                        <span><strong>${count}초 후 다음 강의가 자동 재생됩니다:</strong> ${escapeHtml(nextV.name)}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition" onclick="VideoEngine.playVideo('${encodeURIComponent(nextV.path)}', '${encodeURIComponent(nextV.name)}')">
                            지금 바로 재생
                        </button>
                        <button class="px-2 py-1 text-slate-300 hover:text-white font-medium transition" onclick="VideoEngine.cancelAutoPlay()">
                            취소
                        </button>
                    </div>
                </div>
            `;
        };

        updateCountdown();
        clearInterval(nextVideoTimer);
        nextVideoTimer = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(nextVideoTimer);
                banner.classList.add('hidden');
                playVideo(encodeURIComponent(nextV.path), encodeURIComponent(nextV.name));
            } else {
                updateCountdown();
            }
        }, 1000);
    }

    function cancelAutoPlay() {
        clearInterval(nextVideoTimer);
        const banner = document.getElementById('video-resume-banner');
        if (banner) banner.classList.add('hidden');
    }

    function closeVideoPlayerModal(e) {
        if (e && e.target && e.target.closest && e.target.closest('#video-modal-container') && !e.target.classList.contains('btn-video-modal-close') && !e.target.closest('.btn-video-modal-close')) {
            return;
        }

        const modal = document.getElementById('video-player-modal');
        const videoEl = document.getElementById('video-main-player');

        clearInterval(progressSaveInterval);
        clearInterval(nextVideoTimer);

        if (videoEl) {
            if (currentVideo && videoEl.duration > 0) {
                saveCurrentProgress(currentVideo.path, videoEl.currentTime, videoEl.duration, false);
            }
            videoEl.pause();
            videoEl.src = '';
        }

        if (modal) {
            modal.style.display = 'none';
        }

        // 목록 UI 갱신
        const container = document.getElementById('video-content-container');
        if (container) {
            renderVideoView(container, { current_path: currentPath, items: currentItems });
        }
    }

    // --- 키보드 단축키 핸들러 ---
    function initKeyboardShortcuts() {
        if (isInitialized) return;
        isInitialized = true;

        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('video-player-modal');
            if (!modal || modal.style.display === 'none') return;

            // 텍스트 인풋 포커스 중에는 단축키 비활성화
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

            const videoEl = document.getElementById('video-main-player');
            if (!videoEl) return;

            switch(e.key) {
                case ' ':
                case 'k':
                case 'K':
                    e.preventDefault();
                    videoEl.paused ? videoEl.play() : videoEl.pause();
                    break;
                case 'ArrowLeft':
                case 'j':
                case 'J':
                    e.preventDefault();
                    videoEl.currentTime = Math.max(0, videoEl.currentTime - 10);
                    break;
                case 'ArrowRight':
                case 'l':
                case 'L':
                    e.preventDefault();
                    videoEl.currentTime = Math.min(videoEl.duration, videoEl.currentTime + 10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    videoEl.volume = Math.min(1, videoEl.volume + 0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    videoEl.volume = Math.max(0, videoEl.volume - 0.1);
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        videoEl.requestFullscreen();
                    }
                    break;
                case 'm':
                case 'M':
                    e.preventDefault();
                    videoEl.muted = !videoEl.muted;
                    break;
                case '[':
                    videoEl.playbackRate = Math.max(0.5, videoEl.playbackRate - 0.1);
                    break;
                case ']':
                    videoEl.playbackRate = Math.min(2.0, videoEl.playbackRate + 0.1);
                    break;
                case 'Escape':
                    closeVideoPlayerModal();
                    break;
            }
        });
    }

    // 모듈 초기화
    document.addEventListener('DOMContentLoaded', () => {
        initKeyboardShortcuts();
        initModalInteractions();
    });

    return {
        checkAuthAndOpenView,
        openVideoAppView,
        closeVideoAppView,
        openLoginGateModal,
        closeLoginGateModal,
        switchGateTab,
        submitGateLogin,
        submitGateRegister,
        continueWithoutLogin,
        openFolder,
        goUpFolder,
        switchGrade,
        filterVideos,
        playVideo,
        playVideoFromRecent,
        resumePlayback,
        dismissResumeBanner,
        changePlaybackSpeed,
        toggleTheaterMode,
        toggleSidebar,
        togglePiP,
        addBookmark,
        seekBookmark,
        deleteBookmark,
        cancelAutoPlay,
        closeVideoPlayerModal,
        startDrag,
        startResize
    };
})();
