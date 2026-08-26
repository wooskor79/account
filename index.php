<?php
// 백엔드 API 로직 포함
require_once __DIR__ . '/api.php';

// 브라우저 캐시 방지용 헤더 추가 (강제 새로고침 유도)
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

$site_settings = get_site_settings();
$is_private = (bool)$site_settings['is_private'];
$is_admin = isset($_SESSION['admin']) && $_SESSION['admin'] === true;
$show_lock_gate = $is_private && !$is_admin;
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>학습 자료실 및 문제풀이</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/cfb@1.2.2/dist/cfb.min.js"></script>
    <link rel="stylesheet" href="css/style.css?v=<?php echo time(); ?>">
    <style>
        #quiz-menu-dropdown {
            transform-origin: top right;
            transition: opacity 0.2s, transform 0.2s;
        }
        #quiz-menu-dropdown.hidden {
            opacity: 0;
            pointer-events: none;
            transform: scale(0.95);
        }
        #quiz-menu-dropdown:not(.hidden) {
            opacity: 1;
            pointer-events: auto;
            transform: scale(1);
        }
    </style>
</head>
<body>

    <!-- 첫 화면 사이트 접근 잠금 화면 (비공개 모드 시 활성화) -->
    <div id="site-lock-gate" class="<?php echo $show_lock_gate ? '' : 'hidden'; ?> fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md px-4">
        <div class="bg-white rounded-3xl shadow-2xl p-7 sm:p-9 max-w-sm sm:max-w-md w-full text-center border border-slate-100 transition-all transform scale-100">
            <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
                🔒
            </div>
            <h2 class="text-xl sm:text-2xl font-bold text-slate-800 mb-2">전산회계 학습 자료실</h2>
            <p class="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
                현재 <strong class="text-amber-600 font-bold">비공개</strong>로 운영 중입니다.<br>
                접속을 위해 비밀번호를 입력해 주세요.
            </p>
            
            <form onsubmit="unlockSite(event)" class="space-y-4 text-left">
                <div>
                    <input type="password" id="gate-password-input" placeholder="비밀번호 입력" 
                        class="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center font-bold text-slate-800 shadow-inner tracking-widest text-base"
                        autofocus autocomplete="current-password">
                    <p id="gate-error-message" class="text-xs text-rose-500 font-semibold mt-2 text-center hidden">❌ 비밀번호가 올바르지 않습니다.</p>
                </div>
                <button type="submit" id="gate-submit-btn" 
                    class="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">
                    확인 및 입장 ➜
                </button>
            </form>
        </div>
    </div>

    <header>
        <div class="logo-section">
            <h1 id="main-logo-title" onclick="goHome()" style="cursor:pointer;" title="첫 화면">전산 회계 <span id="logo-level-badge">기초</span> 자료실</h1>
            
            <span id="grade-toggle-btn" onclick="toggleGrade()" style="cursor:pointer; font-size:1.15rem; font-weight:700; color:var(--accounting-point); margin-right:30px; text-decoration:underline; text-underline-offset:4px; user-select:none;" title="자료실 전환">
                중급이동
            </span>

            <button id="view-toggle-btn" onclick="toggleViewMode()" class="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-sm transition flex items-center gap-1">
                💻 PC화면
            </button>

            <!-- 1급 맞춤 학습하기 전용 진입 버튼 (1급/중급 모드에서만 노출) -->
            <button id="learning-course-nav-btn" onclick="openLearningCourseApp()" class="hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[11px] sm:text-xs font-extrabold px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg shadow-md hover:shadow-lg transition transform active:scale-95 flex items-center gap-1.5 ml-2" title="2026 PERFECT 전산회계 1급 교재 기반 맞춤 코스 학습">
                📖 1급 맞춤학습
            </button>

            <div class="header-links" style="align-items: center; display: flex; margin-left: auto;">
                <div class="relative inline-block z-[1001]" id="quiz-dropdown-wrapper">
                    <!-- 급수에 따라 텍스트 및 색상이 동적 변경되는 단일 문제풀이 버튼 -->
                    <span id="quiz-menu-btn" onclick="toggleQuizMenu()" style="color: var(--accounting-point); font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; font-size:1.05rem;">
                        ✨ 2급문제풀이 <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </span>

                    <div id="quiz-menu-dropdown" class="hidden absolute right-0 left-auto mt-3 w-64 max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-[99999]">
                        <!-- 2급 문제풀이 메뉴 (기초 모드 시 노출) -->
                        <div id="quiz-menu-items-grade2">
                            <a onclick="openQuizApp('journal')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-600 cursor-pointer border-b border-slate-100">
                                📝 1. 2급 분개문제 (AI)
                            </a>
                            <a onclick="openQuizApp('theory')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer border-b border-slate-100">
                                📖 2. 2급 필기문제 (AI)
                            </a>
                            <a onclick="openQuizApp('journal', '전산회계2급책')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-600 cursor-pointer border-b border-slate-100">
                                📝 3. 2급 전산회계책 분개
                            </a>
                            <a onclick="openQuizApp('theory', '전산회계2급책')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer border-b border-slate-100">
                                📖 4. 2급 전산회계책 필기
                            </a>
                            <a onclick="openQuizApp('journal', '회계2급기출')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-600 cursor-pointer border-b border-slate-100">
                                📝 5. 2급 전산회계 기출 분개
                            </a>
                            <a onclick="openQuizApp('theory', '회계2급기출')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer">
                                📖 6. 2급 전산회계 기출 필기
                            </a>
                        </div>

                        <!-- 1급 문제풀이 메뉴 (중급 모드 시 노출) -->
                        <div id="quiz-menu-items-grade1" class="hidden">
                            <a onclick="openQuizApp('journal', '1급')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-600 cursor-pointer border-b border-slate-100">
                                📝 1. 1급 분개문제 (AI)
                            </a>
                            <a onclick="openQuizApp('theory', '1급')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer border-b border-slate-100">
                                📖 2. 1급 필기문제 (AI)
                            </a>
                            <a onclick="openQuizApp('journal', '전산회계1급책')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-600 cursor-pointer border-b border-slate-100">
                                📝 3. 1급 전산회계책 분개
                            </a>
                            <a onclick="openQuizApp('theory', '전산회계1급책')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer border-b border-slate-100">
                                📖 4. 1급 전산회계책 필기
                            </a>
                            <a onclick="openQuizApp('journal', '회계1급기출')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-600 cursor-pointer border-b border-slate-100">
                                📝 5. 1급 전산회계 기출 분개
                            </a>
                            <a onclick="openQuizApp('theory', '회계1급기출')" class="block px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer">
                                📖 6. 1급 전산회계 기출 필기
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="header-right-section">
            <div class="login-section" id="login-section"></div>
        </div>
    </header>

    <div id="main-content-view" class="page-wrapper">
        <main class="main-grid-container">
            <!-- 1열 (공통 기본 학습 & 그림 자료실) -->
            <div class="column-wrapper" id="col1-wrapper">
                <!-- 1열 상단: 전산회계 & 일반자료 그룹 -->
                <div class="col1-sub-grid" id="col1-sub-grid">
                    <section class="card accounting" id="card-accounting">
                        <div class="card-header">
                            <div class="card-title flex items-center gap-1.5" id="card-title-accounting">
                                <span>📘</span>
                                <span class="title-text">전산회계 자료</span>
                                <button class="btn-edit-title text-xs text-slate-400 hover:text-indigo-600 transition hidden" onclick="editSectionTitle('accounting')" title="섹션 제목 변경">✏️</button>
                            </div>
                            <div class="view-controls">
                                <button class="btn-view" data-view="view-1" onclick="changeView('accounting', 'view-1', this)">1</button>
                                <button class="btn-view" data-view="view-2" onclick="changeView('accounting', 'view-2', this)">2</button>
                                <button class="btn-view" data-view="view-3" onclick="changeView('accounting', 'view-3', this)">3</button>
                                <button class="btn-view" data-view="view-icon" onclick="changeView('accounting', 'view-icon', this)">▦</button>
                            </div>
                        </div>
                        <div class="upload-section" id="upload-accounting">
                            <input type="file" id="file-accounting">
                            <button class="upload-btn" onclick="uploadFile('accounting')">파일 올리기</button>
                        </div>
                        <ul class="file-list" id="list-accounting"></ul>
                    </section>
                    
                    <section class="card general" id="card-general">
                        <div class="card-header">
                            <div class="card-title flex items-center gap-1.5" id="card-title-general">
                                <span>📁</span>
                                <span class="title-text">일반 자료</span>
                                <button class="btn-edit-title text-xs text-slate-400 hover:text-indigo-600 transition hidden" onclick="editSectionTitle('general')" title="섹션 제목 변경">✏️</button>
                            </div>
                            <div class="view-controls">
                                <button class="btn-view" data-view="view-1" onclick="changeView('general', 'view-1', this)">1</button>
                                <button class="btn-view" data-view="view-2" onclick="changeView('general', 'view-2', this)">2</button>
                                <button class="btn-view" data-view="view-3" onclick="changeView('general', 'view-3', this)">3</button>
                                <button class="btn-view" data-view="view-icon" onclick="changeView('general', 'view-icon', this)">▦</button>
                            </div>
                        </div>
                        <div class="upload-section" id="upload-general">
                            <input type="file" id="file-general">
                            <button class="upload-btn" onclick="uploadFile('general')">파일 올리기</button>
                        </div>
                        <ul class="file-list" id="list-general"></ul>
                    </section>
                </div>
                
                <div class="resizer-horizontal" id="resizer1"></div>
                
                <!-- 1열 하단: 그림 자료실 -->
                <section class="card drawing" id="card-drawing">
                    <div class="card-header">
                        <div class="card-title flex items-center gap-1.5" id="card-title-drawing">
                            <span>🎨</span>
                            <span class="title-text">그림 자료</span>
                            <button class="btn-edit-title text-xs text-slate-400 hover:text-indigo-600 transition hidden" onclick="editSectionTitle('drawing')" title="섹션 제목 변경">✏️</button>
                        </div>
                        <div class="view-controls">
                            <button class="btn-view" data-view="view-1" onclick="changeView('drawing', 'view-1', this)">1</button>
                            <button class="btn-view" data-view="view-2" onclick="changeView('drawing', 'view-2', this)">2</button>
                            <button class="btn-view" data-view="view-3" onclick="changeView('drawing', 'view-3', this)">3</button>
                            <button class="btn-view" data-view="view-icon" onclick="changeView('drawing', 'view-icon', this)">▦</button>
                        </div>
                    </div>
                    
                    <div class="paste-guide">
                        💡 이미지를 복사한 후 화면 아무 곳에서나 <b>Ctrl + V (붙여넣기)</b>를 누르면 그림이 업로드됩니다.
                    </div>
                    
                    <div class="upload-section" id="upload-drawing">
                        <input type="file" id="file-drawing" accept="image/*">
                        <button class="upload-btn" onclick="uploadFile('drawing')">파일 올리기</button>
                    </div>
                    <ul class="file-list" id="list-drawing"></ul>
                </section>
            </div>

            <!-- 2열 (선생님별 전문 특강 자료실) -->
            <div class="seohee-wrapper" id="col2-wrapper">
                <!-- 2열 상단: 이서희 선생님 자료 -->
                <section class="card seohee" id="card-seohee">
                    <div class="card-header">
                        <div class="card-title flex items-center gap-1.5" id="card-title-seohee">
                            <span>👩‍🏫</span>
                            <span class="title-text">이서희선생님 자료</span>
                            <button class="btn-edit-title text-xs text-slate-400 hover:text-indigo-600 transition hidden" onclick="editSectionTitle('seohee')" title="섹션 제목 변경">✏️</button>
                        </div>
                        <div class="view-controls">
                            <button class="btn-view" data-view="view-1" onclick="changeView('seohee', 'view-1', this)">1</button>
                            <button class="btn-view" data-view="view-2" onclick="changeView('seohee', 'view-2', this)">2</button>
                            <button class="btn-view" data-view="view-3" onclick="changeView('seohee', 'view-3', this)">3</button>
                            <button class="btn-view" data-view="view-icon" onclick="changeView('seohee', 'view-icon', this)">▦</button>
                        </div>
                    </div>
                    <div class="upload-section" id="upload-seohee">
                        <input type="file" id="file-seohee">
                        <button class="upload-btn" onclick="uploadFile('seohee')">파일 올리기</button>
                    </div>
                    <ul class="file-list" id="list-seohee"></ul>
                </section>

                <div class="resizer-horizontal" id="resizer2"></div>

                <!-- 2열 하단: 우승현 선생님 자료 -->
                <section class="card heera" id="card-heera">
                    <div class="card-header">
                        <div class="card-title flex items-center gap-1.5" id="card-title-heera">
                            <span>👨‍🏫</span>
                            <span class="title-text">우승현선생님 자료 (희라쌤자료)</span>
                            <button class="btn-edit-title text-xs text-slate-400 hover:text-indigo-600 transition hidden" onclick="editSectionTitle('heera')" title="섹션 제목 변경">✏️</button>
                        </div>
                        <div class="view-controls">
                            <button class="btn-view" data-view="view-1" onclick="changeView('heera', 'view-1', this)">1</button>
                            <button class="btn-view" data-view="view-2" onclick="changeView('heera', 'view-2', this)">2</button>
                            <button class="btn-view" data-view="view-3" onclick="changeView('heera', 'view-3', this)">3</button>
                            <button class="btn-view" data-view="view-icon" onclick="changeView('heera', 'view-icon', this)">▦</button>
                        </div>
                    </div>
                    <div class="upload-section" id="upload-heera">
                        <input type="file" id="file-heera">
                        <button class="upload-btn" onclick="uploadFile('heera')">파일 올리기</button>
                    </div>
                    <ul class="file-list" id="list-heera"></ul>
                </section>
            </div>
        </main>
    </div>

    <div id="quiz-content-view" class="hidden flex-grow flex items-center justify-center p-4 bg-[#fdfbf7] overflow-y-auto" style="min-height: calc(100vh - 85px);">
        
        <!-- 1. 분개문제풀기 컨테이너 -->
        <div id="journal-quiz-container" class="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-4 sm:p-7 md:p-8 border border-amber-100 my-auto hidden relative z-10">
            
            <div class="flex items-center justify-between gap-1 sm:gap-2 mb-2 sm:mb-4 min-h-[36px] sm:min-h-[44px]">
                <div class="flex items-center flex-shrink-0 min-w-0 lg:min-w-[110px]">
                    <button onclick="goHome()" class="hidden lg:inline-flex items-center text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl transition font-medium whitespace-nowrap shadow-xs">
                        🏠 홈으로 돌아가기
                    </button>
                </div>
                
                <div class="flex-1 flex items-center justify-center min-h-[32px] sm:min-h-[38px] px-1 overflow-hidden">
                    <h1 class="text-base sm:text-lg md:text-xl font-bold text-slate-800 text-center leading-snug break-keep line-clamp-2 max-w-full m-0">2급분개</h1>
                </div>

                <div class="flex items-center justify-end flex-shrink-0 min-w-0 md:min-w-[110px]">
                    <div class="hidden md:flex items-center bg-slate-100 border border-slate-200 rounded-xl px-2 py-1 text-xs">
                        <input type="text" id="journal-jump-input" placeholder="문제번호" class="w-14 sm:w-16 bg-transparent text-slate-700 outline-none px-1 text-center font-bold" onkeypress="if(event.key==='Enter') jumpToJournalProblem()">
                        <button onclick="jumpToJournalProblem()" class="bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold px-2 py-0.5 rounded-lg ml-1 transition">이동</button>
                    </div>
                </div>
            </div>

            <!-- 분개 Start Screen -->
            <div id="start-screen" class="text-center py-2 sm:py-3 space-y-3">
                <div class="bg-amber-50/80 rounded-2xl p-4 sm:p-5 border border-amber-200 text-slate-800 shadow-sm max-w-md mx-auto">
                    <label for="quiz-user-name" class="block text-xs sm:text-sm font-bold text-amber-900 mb-1.5">
                        👤 사용자 이름을 적어주세요
                    </label>
                    <input type="text" id="quiz-user-name" placeholder="이름을 입력하세요 (예: 홍길동)" class="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 sm:py-3 text-slate-800 outline-none text-center font-bold text-sm sm:text-base focus:ring-2 focus:ring-amber-400 focus:border-amber-500 shadow-inner transition" onchange="saveUserName(this.value)" oninput="syncUserName(this.value); updateWrongNotesUI('journal', currentQuizLevel);" onkeydown="if(event.key==='Enter'){ saveUserName(this.value); startQuiz(); }">
                </div>

                <span id="status-message" class="hidden"></span>

                <div class="max-w-md mx-auto flex flex-col gap-2">
                    <button id="start-btn" onclick="startQuiz()" disabled class="w-full py-3 sm:py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-2xl shadow-md transition transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2">
                        ✨ 분개문제 풀기 시작하기
                    </button>
                    <button id="start-wrong-journal-btn" onclick="startWrongJournalQuiz()" disabled class="w-full py-2.5 sm:py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-300 font-bold rounded-2xl shadow-sm transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex items-center justify-center gap-2">
                        <span>📌 내 오답노트 다시 풀기</span>
                        <span id="wrong-journal-count-badge" class="bg-rose-500 text-white text-xs px-2.5 py-0.5 rounded-full font-extrabold shadow-2xs">0개</span>
                    </button>
                </div>
            </div>

            <!-- 분개 Quiz Screen -->
            <div id="quiz-screen" class="hidden">
                <div class="flex justify-between items-end gap-2 mb-4 text-xs font-medium text-slate-400">
                    <div class="flex-1 flex items-center gap-1.5 flex-wrap min-w-0 pb-0.5">
                        <span id="question-badge" class="hidden md:inline-block mobile-hidden bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">문제 #1</span>
                        <span id="journal-category-badge" class="bg-sky-100/90 text-sky-900 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">🏷️ 유형: -</span>
                        <span id="journal-difficulty-badge" class="hidden md:inline-block mobile-hidden bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">⚡ 난이도: -</span>
                        <span id="journal-accuracy-badge" class="hidden md:inline-block mobile-hidden bg-blue-100/80 text-blue-900 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">🎯 정답률: -%</span>
                        <span id="journal-high-score-badge" class="hidden md:inline-block mobile-hidden bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">🏆 최고기록: 불러오는 중...</span>
                    </div>
                    <div class="flex flex-col items-end gap-2 flex-shrink-0">
                        <button onclick="toggleCalculator()" class="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-xl transition font-bold border border-indigo-200 shadow-sm whitespace-nowrap">🧮 계산기</button>
                        <span id="score-tracker" class="whitespace-nowrap text-slate-600 font-bold bg-amber-50/80 border border-amber-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">연속 정답: <strong class="text-amber-600 font-extrabold">0</strong>회</span>
                    </div>
                </div>

                <div class="bg-slate-50 rounded-2xl p-5 mb-4 border border-slate-100 shadow-inner">
                    <h3 id="problem-text" class="text-base font-medium text-slate-800 leading-relaxed"></h3>
                </div>

                <!-- 차변/대변 합계 및 차액 실시간 비교 요약 바 -->
                <div id="journal-balance-summary" class="bg-amber-50/80 border border-amber-200 rounded-2xl px-4 py-3 mb-6 text-xs sm:text-sm font-semibold flex items-center justify-between flex-wrap gap-2 shadow-sm">
                </div>

                <div class="space-y-6 mb-6">
                    <div class="bg-sky-50/40 p-4 rounded-2xl border border-sky-100/70">
                        <div class="flex justify-between items-center mb-2">
                            <label class="text-xs font-bold text-sky-700 uppercase tracking-wide">차변 (DEBIT)</label>
                            <button onclick="addDebitRow('', '', true)" class="text-xs bg-sky-100 hover:bg-sky-200 text-sky-700 font-semibold px-2.5 py-1 rounded-lg transition">+ 차변 줄 추가 (*)</button>
                        </div>
                        <div id="debit-rows-container" class="space-y-2"></div>
                    </div>

                    <div class="bg-purple-50/40 p-4 rounded-2xl border border-purple-100/70">
                        <div class="flex justify-between items-center mb-2">
                            <label class="text-xs font-bold text-purple-700 uppercase tracking-wide">대변 (CREDIT)</label>
                            <button onclick="addCreditRow('', '', true)" class="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold px-2.5 py-1 rounded-lg transition">+ 대변 줄 추가 (/)</button>
                        </div>
                        <div id="credit-rows-container" class="space-y-2"></div>
                    </div>
                </div>

                <button onclick="submitAnswer()" class="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-2xl shadow transition transform active:scale-95">
                    정답 확인하기
                </button>
            </div>

            <!-- 분개 Result Screen -->
            <div id="result-screen" class="hidden text-center py-4">
                <div id="result-icon" class="text-5xl mb-3">🎉</div>
                <h2 id="result-title" class="text-xl font-bold text-slate-800 mb-1">정답입니다!</h2>
                <p id="result-desc" class="text-sm text-slate-500 mb-6">훌륭합니다. 정확하게 분개하셨네요.</p>

                <div class="bg-slate-50 rounded-2xl p-5 mb-6 text-left border border-slate-100 space-y-4">
                    <div id="user-answer-display-box" class="hidden border-b border-slate-200/60 pb-3">
                        <h4 class="text-xs font-bold text-rose-500 uppercase tracking-wide mb-1.5">❌ 내가 입력한 답안</h4>
                        <div id="user-answer-display" class="text-sm text-slate-700 pl-2 space-y-0.5"></div>
                    </div>

                    <div>
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">정답 및 해설 (엑셀 기준)</h4>
                        <div id="correct-answer-display" class="text-sm font-semibold text-slate-700 mb-3 space-y-1"></div>
                        <p id="explanation-text" class="text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3"></p>
                    </div>
                </div>

                <div class="flex gap-3">
                    <button id="retry-btn" onclick="retryProblem()" class="hidden flex-1 whitespace-nowrap px-2 sm:px-5 py-3.5 text-sm sm:text-base bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-2xl transition">다시 풀기 <span class="hidden md:inline">(Backspace)</span></button>
                    <button onclick="nextProblem()" class="flex-1 whitespace-nowrap px-2 sm:px-5 py-3.5 text-sm sm:text-base bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold rounded-2xl shadow transition">다음 문제 풀기 <span class="hidden md:inline">(Space)</span></button>
                    <button onclick="resetJournalQuiz()" class="flex-1 whitespace-nowrap px-2 sm:px-5 py-3.5 text-sm sm:text-base bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-2xl transition">처음으로 <span class="hidden md:inline">(Home)</span></button>
                </div>
            </div>
        </div>

        <!-- 2. 필기문제풀기 컨테이너 -->
        <div id="theory-quiz-container" class="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-4 sm:p-7 md:p-8 border border-emerald-100 my-auto hidden relative z-10">
            
            <div class="flex items-center justify-between gap-1 sm:gap-2 mb-2 sm:mb-4 min-h-[36px] sm:min-h-[44px]">
                <div class="flex items-center flex-shrink-0 min-w-0 lg:min-w-[110px]">
                    <button onclick="goHome()" class="hidden lg:inline-flex items-center text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl transition font-medium whitespace-nowrap shadow-xs">
                        🏠 홈으로 돌아가기
                    </button>
                </div>
                
                <div class="flex-1 flex items-center justify-center min-h-[32px] sm:min-h-[38px] px-1 overflow-hidden">
                    <h1 class="text-base sm:text-lg md:text-xl font-bold text-slate-800 text-center leading-snug break-keep line-clamp-2 max-w-full m-0">2급필기</h1>
                </div>

                <div class="flex items-center justify-end flex-shrink-0 min-w-0 md:min-w-[110px]">
                    <div class="hidden md:flex items-center bg-slate-100 border border-slate-200 rounded-xl px-2 py-1 text-xs">
                        <input type="text" id="theory-jump-input" placeholder="문제번호" class="w-14 sm:w-16 bg-transparent text-slate-700 outline-none px-1 text-center font-bold" onkeypress="if(event.key==='Enter') jumpToTheoryProblem()">
                        <button onclick="jumpToTheoryProblem()" class="bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-bold px-2 py-0.5 rounded-lg ml-1 transition">이동</button>
                    </div>
                </div>
            </div>

            <!-- 필기 Start Screen -->
            <div id="theory-start-screen" class="text-center py-2 sm:py-3 space-y-3">
                <div class="bg-emerald-50/80 rounded-2xl p-4 sm:p-5 border border-emerald-200 text-slate-800 shadow-sm max-w-md mx-auto">
                    <label for="theory-quiz-user-name" class="block text-xs sm:text-sm font-bold text-emerald-900 mb-1.5">
                        👤 사용자 이름을 적어주세요
                    </label>
                    <input type="text" id="theory-quiz-user-name" placeholder="이름을 입력하세요 (예: 홍길동)" class="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 sm:py-3 text-slate-800 outline-none text-center font-bold text-sm sm:text-base focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 shadow-inner transition" onchange="saveUserName(this.value)" oninput="syncUserName(this.value); updateWrongNotesUI('theory', currentQuizLevel);" onkeydown="if(event.key==='Enter'){ saveUserName(this.value); startTheoryQuiz(); }">
                </div>

                <span id="theory-status-message" class="hidden"></span>

                <div class="max-w-md mx-auto flex flex-col gap-2">
                    <button id="start-theory-btn" onclick="startTheoryQuiz()" class="w-full py-3 sm:py-3.5 bg-emerald-400 hover:bg-emerald-500 text-slate-900 font-bold rounded-2xl shadow-md transition transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2">
                        ✨ 필기문제 풀기 시작하기
                    </button>
                    <button id="start-wrong-theory-btn" onclick="startWrongTheoryQuiz()" disabled class="w-full py-2.5 sm:py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-300 font-bold rounded-2xl shadow-sm transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex items-center justify-center gap-2">
                        <span>📌 내 오답노트 다시 풀기</span>
                        <span id="wrong-theory-count-badge" class="bg-rose-500 text-white text-xs px-2.5 py-0.5 rounded-full font-extrabold shadow-2xs">0개</span>
                    </button>
                </div>
            </div>

            <!-- 필기 Quiz Screen -->
            <div id="theory-quiz-screen" class="hidden">
                <div class="flex justify-between items-end gap-2 mb-4 text-xs font-medium text-slate-400">
                    <div class="flex-1 flex items-center gap-1.5 flex-wrap min-w-0 pb-0.5">
                        <span id="theory-question-badge" class="hidden md:inline-block mobile-hidden bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">문제 #1</span>
                        <span id="theory-category-badge" class="bg-teal-100/90 text-teal-900 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">🏷️ 유형: -</span>
                        <span id="theory-difficulty-badge" class="hidden md:inline-block mobile-hidden bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">⚡ 난이도: -</span>
                        <span id="theory-accuracy-badge" class="hidden md:inline-block mobile-hidden bg-blue-100/80 text-blue-900 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">🎯 정답률: -%</span>
                        <span id="theory-high-score-badge" class="hidden md:inline-block mobile-hidden bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">🏆 최고기록: 불러오는 중...</span>
                    </div>
                    <div class="flex flex-col items-end gap-2 flex-shrink-0">
                        <button onclick="toggleCalculator()" class="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-xl transition font-bold border border-indigo-200 shadow-sm whitespace-nowrap">🧮 계산기</button>
                        <span id="theory-score-tracker" class="whitespace-nowrap text-slate-600 font-bold bg-emerald-50/80 border border-emerald-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">연속 정답: <strong class="text-emerald-600 font-extrabold">0</strong>회</span>
                    </div>
                </div>

                <div class="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100 shadow-inner">
                    <h3 id="theory-problem-text" class="text-base font-medium text-slate-800 leading-relaxed whitespace-pre-wrap"></h3>
                </div>

                <div id="theory-choices-container" class="space-y-3 mb-4"></div>

                <div class="hidden md:block text-xs text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 rounded-xl py-2 px-3 text-center mb-4 font-semibold">
                    ⚡ 1~4 숫자키 또는 마우스로 선택 후 스페이스바(Space)를 누르면 정답이 확인됩니다.
                </div>

                <button onclick="submitTheoryAnswer()" class="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-2xl shadow transition transform active:scale-95">
                    정답 확인하기 <span class="hidden md:inline">(Space / Enter)</span>
                </button>
            </div>

            <!-- 필기 Result Screen -->
            <div id="theory-result-screen" class="hidden text-center py-4">
                <div id="theory-result-icon" class="text-5xl mb-3">🎉</div>
                <h2 id="theory-result-title" class="text-xl font-bold text-slate-800 mb-1">정답입니다!</h2>
                <p id="theory-result-desc" class="text-sm text-slate-500 mb-6">정확한 개념을 알고 계시네요!</p>

                <div class="bg-slate-50 rounded-2xl p-5 mb-6 text-left border border-slate-100 space-y-3">
                    <div id="theory-user-answer-box" class="hidden border-b border-slate-200/60 pb-2">
                        <span class="text-xs font-bold text-rose-500 uppercase tracking-wide">❌ 내가 선택한 답:</span>
                        <div id="theory-user-answer-display" class="text-sm font-semibold text-rose-600 mt-1"></div>
                    </div>

                    <div>
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">정답 및 해설</h4>
                        <div id="theory-correct-answer-display" class="text-lg font-bold text-emerald-600 mb-2"></div>
                        <p id="theory-explanation-text" class="text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3 whitespace-pre-wrap"></p>
                    </div>
                </div>

                <div class="flex gap-3">
                    <button id="theory-retry-btn" onclick="retryTheoryProblem()" class="hidden flex-1 whitespace-nowrap px-2 sm:px-5 py-3.5 text-sm sm:text-base bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-2xl transition">다시 풀기 <span class="hidden md:inline">(Backspace)</span></button>
                    <button onclick="nextTheoryProblem()" class="flex-1 whitespace-nowrap px-2 sm:px-5 py-3.5 text-sm sm:text-base bg-emerald-400 hover:bg-emerald-500 text-slate-900 font-semibold rounded-2xl shadow transition">다음 문제 풀기 <span class="hidden md:inline">(Space)</span></button>
                    <button onclick="resetTheoryQuiz()" class="flex-1 whitespace-nowrap px-2 sm:px-5 py-3.5 text-sm sm:text-base bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-2xl transition">처음으로 <span class="hidden md:inline">(Home)</span></button>
                </div>
            </div>

        </div>

    </div>

    <!-- 계산기 플로팅 위젯 -->
    <div id="calculator-widget" class="hidden">
        <div class="calc-header" id="calc-header">
            <span>🧮 계산기</span>
            <div class="flex items-center gap-2">
                <button onclick="toggleCalcMemory()" class="calc-mem-toggle-btn" title="최근 기억">기억 <span id="calc-mem-count">(0)</span></button>
                <button onclick="toggleCalculator()" title="닫기">✖</button>
            </div>
        </div>

        <!-- 최근 기억(Memory) 패널 -->
        <div id="calc-memory-panel" class="hidden">
            <div class="calc-mem-header">
                <span>최근 기억 (최대 4개)</span>
                <button onclick="clearCalcMemory()" class="calc-mem-reset-btn">리셋</button>
            </div>
            <div id="calc-memory-list" class="calc-mem-list">
                <div class="calc-mem-empty">기억된 숫자가 없습니다.</div>
            </div>
        </div>

        <div class="calc-display" id="calc-display">0</div>
        <div class="calc-buttons">
            <button class="calc-btn calc-clear" onclick="calcClear()">C</button>
            <button class="calc-btn calc-op" onclick="calcInput('/')">÷</button>
            <button class="calc-btn calc-op" onclick="calcInput('*')">×</button>
            <button class="calc-btn calc-op" onclick="calcInput('-')">−</button>
            
            <button class="calc-btn calc-num" onclick="calcInput('7')">7</button>
            <button class="calc-btn calc-num" onclick="calcInput('8')">8</button>
            <button class="calc-btn calc-num" onclick="calcInput('9')">9</button>
            <button class="calc-btn calc-op" onclick="calcInput('+')">+</button>
            
            <button class="calc-btn calc-num" onclick="calcInput('4')">4</button>
            <button class="calc-btn calc-num" onclick="calcInput('5')">5</button>
            <button class="calc-btn calc-num" onclick="calcInput('6')">6</button>
            <button class="calc-btn calc-eq" onclick="calcCalculate()" style="grid-row: span 2; height: 100%;">=</button>
            
            <button class="calc-btn calc-num" onclick="calcInput('1')">1</button>
            <button class="calc-btn calc-num" onclick="calcInput('2')">2</button>
            <button class="calc-btn calc-num" onclick="calcInput('3')">3</button>
            
            <button class="calc-btn calc-num" onclick="calcInput('0')">0</button>
            <button class="calc-btn calc-num calc-btn-00" onclick="calcInput('00')">00</button>
            <button class="calc-btn calc-num calc-btn-000" onclick="calcInput('000')">000</button>
            <button class="calc-btn calc-num" onclick="calcInput('.')">.</button>
        </div>
    </div>

    <!-- 1급 맞춤 코스 학습 (Learning Course) 전용 뷰 -->
    <div id="learning-course-view" class="hidden max-w-7xl mx-auto px-3 sm:px-6 py-4">
        <div id="learning-content-container"></div>
    </div>

    <!-- 통합 문서 & 그림 미리보기 모달 (PDF, XLSX, HWP/HWPX, IMAGE) -->
    <div id="doc-preview-modal" class="modal-overlay" style="display:none;" onclick="closePreviewModal(event)">
        <div class="doc-modal-content" id="doc-modal-content" onclick="event.stopPropagation()">
            <div class="doc-modal-header" id="doc-modal-header">
                <div class="doc-header-left">
                    <span id="preview-file-badge" class="badge-ext badge-default">FILE</span>
                    <h3 id="preview-file-title" class="doc-title-text">파일명</h3>
                </div>
                <div class="doc-header-right">
                    <div id="preview-col-controls" class="doc-col-group" style="display:none;">
                        <button class="btn-col-btn" onclick="setDocColumns(1, this)">1단</button>
                        <button class="btn-col-btn" onclick="setDocColumns(2, this)">2단</button>
                        <button class="btn-col-btn active" onclick="setDocColumns(3, this)">3단(가로)</button>
                    </div>
                    <button id="preview-btn-orientation" class="btn-modal-action btn-orientation" onclick="toggleDocOrientation()" title="가로/세로 보기 전환" style="display:none;">
                        🔄 <span id="orientation-text">가로보기</span>
                    </button>
                    <a id="preview-btn-download" href="#" class="btn-modal-action" title="원본 다운로드">
                        ⬇ 다운로드
                    </a>
                    <button class="btn-modal-close" onclick="closePreviewModal(event)" title="닫기">&times;</button>
                </div>
            </div>

            <!-- 시트 선택 바 (XLSX 전용) -->
            <div id="preview-sheet-tabs" class="preview-sheet-tabs" style="display:none;"></div>

            <!-- 뷰어 본체 -->
            <div class="doc-modal-body" id="doc-modal-body">
                <div id="preview-loading" class="preview-loading" style="display:none;">
                    <div class="spinner"></div>
                    <p class="mt-2 text-sm text-slate-500 font-medium">문서를 불러오는 중입니다...</p>
                </div>
                
                <!-- 1. PDF 뷰어 -->
                <iframe id="preview-pdf-frame" class="preview-frame" style="display:none;" frameborder="0"></iframe>

                <!-- 2. 이미지 뷰어 -->
                <div id="preview-img-container" class="preview-img-box" style="display:none;">
                    <img id="preview-img-element" src="" alt="미리보기 이미지">
                </div>

                <!-- 3. XLSX 스프레드시트 뷰어 -->
                <div id="preview-xlsx-container" class="preview-xlsx-box" style="display:none;"></div>

                <!-- 4. HWP / HWPX / TXT 문서 뷰어 -->
                <div id="preview-doc-container" class="preview-doc-box" style="display:none;"></div>
            </div>
        </div>
    </div>

    <div id="paste-modal" class="paste-modal-overlay">
        <div class="paste-modal-content">
            <h3>이미지 저장</h3>
            <img id="paste-preview" class="paste-preview" src="">
            <input type="text" id="paste-filename" placeholder="저장할 파일명 입력 (예: 회계노트1)">
            <div class="paste-modal-actions">
                <button class="btn-cancel" onclick="cancelPaste()">취소</button>
                <button class="btn-save" onclick="savePastedImage()">저장</button>
            </div>
        </div>
    </div>

    <!-- JavaScript 모듈 로드 -->
    <script src="js/data/accounts.js?v=<?php echo time(); ?>"></script>
    <script src="js/data/accounts_1.js?v=<?php echo time(); ?>"></script>
    <script src="js/doc_preview.js?v=<?php echo time(); ?>"></script>
    <script src="js/quiz/quiz_calc.js?v=<?php echo time(); ?>"></script>
    <script src="js/quiz/quiz_core.js?v=<?php echo time(); ?>"></script>
    <script src="js/quiz/quiz_journal.js?v=<?php echo time(); ?>"></script>
    <script src="js/quiz/quiz_theory.js?v=<?php echo time(); ?>"></script>
    <!-- 1급 맞춤 코스 학습 모듈 -->
    <script src="js/learning/learning_curriculum.js?v=<?php echo time(); ?>"></script>
    <script src="js/learning/learning_auth.js?v=<?php echo time(); ?>"></script>
    <script src="js/learning/learning_wrong_notes.js?v=<?php echo time(); ?>"></script>
    <script src="js/learning/learning_engine.js?v=<?php echo time(); ?>"></script>
    <script src="js/main.js?v=<?php echo time(); ?>"></script>
</body>
</html>
