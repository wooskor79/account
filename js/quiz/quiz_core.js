function toggleQuizMenu() {
    const menu = document.getElementById('quiz-menu-dropdown');
    menu.classList.toggle('hidden');
}

function toggleQuizMenu1() {
    const menu = document.getElementById('quiz1-menu-dropdown');
    menu.classList.toggle('hidden');
}

document.addEventListener('click', function(event) {
    const wrapper = document.getElementById('quiz-dropdown-wrapper');
    const dropdown = document.getElementById('quiz-menu-dropdown');
    if (wrapper && dropdown && !wrapper.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
    
    const wrapper1 = document.getElementById('quiz1-dropdown-wrapper');
    const dropdown1 = document.getElementById('quiz1-menu-dropdown');
    if (wrapper1 && dropdown1 && !wrapper1.contains(event.target)) {
        dropdown1.classList.add('hidden');
    }
});

// --- 캐시 시스템 (프론트엔드 성능 최적화) ---
window.quizDataCache = {};

function getUserName() {
    return localStorage.getItem('quiz_user_name') || '';
}

function saveUserName(name) {
    const trimmed = (name || '').trim();
    localStorage.setItem('quiz_user_name', trimmed);
    syncUserName(trimmed);
    if (typeof updateWrongNotesUI === 'function') {
        updateWrongNotesUI();
    }
}

function syncUserName(name) {
    const val = name !== undefined ? name : getUserName();
    const el1 = document.getElementById('quiz-user-name');
    const el2 = document.getElementById('theory-quiz-user-name');
    if (el1 && el1.value !== val) el1.value = val;
    if (el2 && el2.value !== val) el2.value = val;
}

// --- 오답노트 통신 API ---
async function fetchWrongNotes(mode = currentQuizMode, level = currentQuizLevel) {
    const name = getUserName();
    if (!name) return { wrong_ids: [], total: 0, details: {} };
    const type = getQuizKey(mode, level);
    try {
        const res = await fetch(`?action=wrong_notes_get&name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`);
        if (res.ok) {
            const data = await res.json();
            return {
                wrong_ids: data.wrong_ids || [],
                total: data.total || 0,
                details: data.details || {}
            };
        }
    } catch (e) {
        console.warn('오답노트 불러오기 실패:', e);
    }
    return { wrong_ids: [], total: 0, details: {} };
}

async function recordWrongNote(mode = currentQuizMode, level = currentQuizLevel, id = '', isCorrect = false, isWrongMode = false) {
    const name = getUserName();
    if (!name || !id) return { remaining: 0, removed: false };
    const type = getQuizKey(mode, level);
    try {
        const res = await fetch('?action=wrong_notes_record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                type,
                id: String(id),
                is_correct: isCorrect,
                is_wrong_mode: isWrongMode
            })
        });
        if (res.ok) {
            const data = await res.json();
            await updateWrongNotesUI(mode, level);
            return data;
        }
    } catch (e) {
        console.warn('오답노트 기록 실패:', e);
    }
    return { remaining: 0, removed: false };
}

async function clearWrongNote(mode = currentQuizMode, level = currentQuizLevel, id = '') {
    const name = getUserName();
    if (!name) return;
    const type = getQuizKey(mode, level);
    try {
        await fetch('?action=wrong_notes_clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type, id: String(id) })
        });
        await updateWrongNotesUI(mode, level);
    } catch (e) {
        console.warn('오답노트 삭제 실패:', e);
    }
}

async function updateWrongNotesUI(mode = currentQuizMode, level = currentQuizLevel) {
    const res = await fetchWrongNotes(mode, level);
    let validIds = res.wrong_ids || [];

    // 현재 로드된 문제 데이터와 매칭되는 실제 오답만 카운팅
    if (mode === 'journal' && typeof problemsMap !== 'undefined' && problemsMap.size > 0) {
        validIds = validIds.map(String).filter(id => problemsMap.has(id));
    } else if (mode === 'theory' && typeof theoryProblemsMap !== 'undefined' && theoryProblemsMap.size > 0) {
        validIds = validIds.map(String).filter(id => theoryProblemsMap.has(id));
    }
    const count = validIds.length;

    if (mode === 'journal') {
        const btn = document.getElementById('start-wrong-journal-btn');
        const badge = document.getElementById('wrong-journal-count-badge');
        if (btn) {
            if (count > 0) {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
        if (badge) {
            badge.innerText = `${count}개`;
        }
    } else {
        const btn = document.getElementById('start-wrong-theory-btn');
        const badge = document.getElementById('wrong-theory-count-badge');
        if (btn) {
            if (count > 0) {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
        if (badge) {
            badge.innerText = `${count}개`;
        }
    }
}

async function fetchUserStreak(mode = currentQuizMode, level = currentQuizLevel) {
    const name = getUserName();
    if (!name) return 0;
    const type = getQuizKey(mode, level);
    try {
        const res = await fetch(`?action=user_streak_get&name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`);
        if (res.ok) {
            const data = await res.json();
            return (typeof data.streak === 'number') ? data.streak : 0;
        }
    } catch (e) {
        console.warn('사용자 연속 정답 불러오기 실패:', e);
    }
    return 0;
}

async function saveUserStreak(mode = currentQuizMode, level = currentQuizLevel, streak = 0) {
    const name = getUserName();
    if (!name) return;
    const type = getQuizKey(mode, level);
    try {
        await fetch('?action=user_streak_update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type, streak })
        });
    } catch (e) {
        console.warn('사용자 연속 정답 저장 실패:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    syncUserName();
    // 백그라운드 프리페치: 여유 시간에 다른 문제 엑셀 파일들 사전 로드
    setTimeout(prefetchAllQuizFiles, 1500);
});

let dynamicAccounts = new Set();
let currentQuizMode = 'journal';
let currentQuizLevel = '2급';
let isWrongQuizMode = false; // 오답노트 풀이 모드 여부
let allHighScores = {
    journal_1: { name: '기록 없음', score: 0 },
    journal_2: { name: '기록 없음', score: 0 },
    journal_acc1_book: { name: '기록 없음', score: 0 },
    theory_1: { name: '기록 없음', score: 0 },
    theory_2: { name: '기록 없음', score: 0 },
    theory_fat2: { name: '기록 없음', score: 0 },
    theory_acc2: { name: '기록 없음', score: 0 },
    theory_acc1_book: { name: '기록 없음', score: 0 }
};

function getQuizKey(mode = currentQuizMode, level = currentQuizLevel) {
    if (level === '전산회계1급책' || level === 'FAT1급책') return mode === 'journal' ? 'journal_acc1_book' : 'theory_acc1_book';
    if (level === '전산회계2급책') return mode === 'journal' ? 'journal_acc2_book' : 'theory_acc2_book';
    if (level === 'FAT2급') return 'theory_fat2';
    if (level === '회계2급기출') return mode === 'journal' ? 'journal_acc2_past' : 'theory_acc2_past';
    if (level === '회계1급기출') return mode === 'journal' ? 'journal_acc1_past' : 'theory_acc1_past';
    const levelKey = (level === '1급') ? '1' : '2';
    return `${mode}_${levelKey}`;
}

function openQuizApp(mode, level = '2급') {
    currentQuizMode = mode;
    currentQuizLevel = level;
    isWrongQuizMode = false;

    document.body.classList.remove('learning-app-active');
    document.getElementById('quiz-menu-dropdown')?.classList.add('hidden');
    document.getElementById('quiz1-menu-dropdown')?.classList.add('hidden');
    
    const mainView = document.getElementById('main-content-view');
    const quizView = document.getElementById('quiz-content-view');
    const learningView = document.getElementById('learning-course-view');

    if (mainView) {
        mainView.classList.add('hidden');
        mainView.style.display = 'none';
    }
    if (learningView) {
        learningView.classList.add('hidden');
        learningView.style.display = 'none';
    }
    if (quizView) {
        quizView.classList.remove('hidden');
        quizView.style.display = ''; // 인라인 display 스타일 제거하여 복원
    }

    const journalContainer = document.getElementById('journal-quiz-container');
    const theoryContainer = document.getElementById('theory-quiz-container');

    // 1급, 전산회계1급책, 회계1급기출, 2급에 따라 동적으로 단어장(계정과목 리스트) 교체
    if (level === '1급' || level === '전산회계1급책' || level === 'FAT1급책' || level === '회계1급기출') {
        dynamicAccounts = new Set(typeof ACCOUNT_LIST_1 !== 'undefined' ? ACCOUNT_LIST_1 : []);
    } else {
        dynamicAccounts = new Set(typeof ACCOUNT_LIST !== 'undefined' ? ACCOUNT_LIST : []);
    }

    if (mode === 'journal') {
        journalContainer.classList.remove('hidden');
        theoryContainer.classList.add('hidden');
        
        const h1 = journalContainer.querySelector('h1');
        if (h1) {
            if (level === '전산회계1급책' || level === 'FAT1급책') {
                h1.innerText = '1급 전산회계책 분개';
            } else if (level === '전산회계2급책') {
                h1.innerText = '2급 전산회계책 분개';
            } else if (level === '회계2급기출') {
                h1.innerText = '2급 전산회계 기출 분개';
            } else if (level === '회계1급기출') {
                h1.innerText = '1급 전산회계 기출 분개';
            } else if (level === '1급') {
                h1.innerText = '1급 분개문제 (AI)';
            } else {
                h1.innerText = '2급 분개문제 (AI)';
            }
        }
        
        let fileToLoad = '2급_분개문제(AI).xlsx';
        if (level === '1급') {
            fileToLoad = '1급_분개문제(AI).xlsx';
        } else if (level === '전산회계1급책' || level === 'FAT1급책') {
            fileToLoad = '1급_전산회계책_분개.xlsx';
        } else if (level === '전산회계2급책') {
            fileToLoad = '2급_전산회계책_분개.xlsx';
        } else if (level === '회계2급기출') {
            fileToLoad = '2급_기출문제_분개.xlsx';
        } else if (level === '회계1급기출') {
            fileToLoad = '1급_기출문제_분개.xlsx';
        }

        if (typeof resetJournalQuiz === 'function') resetJournalQuiz();
        fetchExcelFile(fileToLoad);
        
    } else if (mode === 'theory') {
        journalContainer.classList.add('hidden');
        theoryContainer.classList.remove('hidden');
        
        const h1 = theoryContainer.querySelector('h1');
        if (h1) {
            if (level === '전산회계1급책' || level === 'FAT1급책') {
                h1.innerText = '1급 전산회계책 필기';
            } else if (level === '전산회계2급책') {
                h1.innerText = '2급 전산회계책 필기';
            } else if (level === '회계2급기출') {
                h1.innerText = '2급 전산회계 기출 필기';
            } else if (level === '회계1급기출') {
                h1.innerText = '1급 전산회계 기출 필기';
            } else if (level === '1급') {
                h1.innerText = '1급 필기문제 (AI)';
            } else {
                h1.innerText = '2급 필기문제 (AI)';
            }
        }
        
        let fileToLoad = '2급_필기문제(AI).xlsx';
        if (level === '1급') {
            fileToLoad = '1급_필기문제(AI).xlsx';
        } else if (level === '전산회계1급책' || level === 'FAT1급책') {
            fileToLoad = '1급_전산회계책_필기.xlsx';
        } else if (level === '전산회계2급책') {
            fileToLoad = '2급_전산회계책_필기.xlsx';
        } else if (level === '회계2급기출') {
            fileToLoad = '2급_기출문제_필기.xlsx';
        } else if (level === '회계1급기출') {
            fileToLoad = '1급_기출문제_필기.xlsx';
        }

        if (typeof resetTheoryQuiz === 'function') resetTheoryQuiz();
        fetchTheoryExcelFile(fileToLoad);
    }

    fetchHighScores();
    syncUserName();
    updateWrongNotesUI(mode, level);
}

function goHome() {
    if (window.currentViewMode === 'mobile') return;
    const quizView = document.getElementById('quiz-content-view');
    const mainView = document.getElementById('main-content-view');
    if (quizView) {
        quizView.classList.add('hidden');
        quizView.style.display = 'none';
    }
    if (mainView) {
        mainView.classList.remove('hidden');
        mainView.style.display = ''; // 인라인 display 스타일 제거!
    }
}

let problemsMap = new Map(); 
let answersMap = new Map();  
let problemIds = [];         
let currentProblemId = null;
let streakCount = 0;

// 인접 문제 판단 함수 (기본범위 ±15 이내)
function isAdjacentProblem(candId, historyList, range = 15) {
    if (!candId) return true;
    const candNum = parseInt(String(candId).replace(/[^0-9]/g, ''), 10);
    
    for (let histId of historyList) {
        if (!histId) continue;
        const histNum = parseInt(String(histId).replace(/[^0-9]/g, ''), 10);
        
        if (!isNaN(candNum) && !isNaN(histNum)) {
            if (Math.abs(candNum - histNum) <= range) {
                return true;
            }
        } else if (String(candId) === String(histId)) {
            return true;
        }
    }
    return false;
}

// --- 최근 출제 이력 관리 (중복 및 인접 방지) ---
function loadRecentHistoryFromStorage(key) {
    try {
        const data = sessionStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function saveRecentHistoryToStorage(key, list) {
    try {
        sessionStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
}

let recentJournalHistory = loadRecentHistoryFromStorage('recent_journal_history');
let recentTheoryHistory = loadRecentHistoryFromStorage('recent_theory_history');
let recentJournalCategoryHistory = loadRecentHistoryFromStorage('recent_journal_category_history');
let recentTheoryCategoryHistory = loadRecentHistoryFromStorage('recent_theory_category_history');

function addToRecentJournalHistory(id) {
    if (!id) return;
    const existingIndex = recentJournalHistory.indexOf(id);
    if (existingIndex !== -1) {
        recentJournalHistory.splice(existingIndex, 1);
    }
    recentJournalHistory.push(id);
    const maxHistory = Math.min(30, Math.max(0, problemIds.length - 1));
    while (recentJournalHistory.length > maxHistory && recentJournalHistory.length > 0) {
        recentJournalHistory.shift();
    }
    saveRecentHistoryToStorage('recent_journal_history', recentJournalHistory);

    const probObj = problemsMap.get(id);
    const cat = (probObj && typeof probObj === 'object') ? probObj.category : null;
    if (cat) {
        recentJournalCategoryHistory.push(cat);
        while (recentJournalCategoryHistory.length > 6) {
            recentJournalCategoryHistory.shift();
        }
        saveRecentHistoryToStorage('recent_journal_category_history', recentJournalCategoryHistory);
    }
}

function addToRecentTheoryHistory(id) {
    if (!id) return;
    const existingIndex = recentTheoryHistory.indexOf(id);
    if (existingIndex !== -1) {
        recentTheoryHistory.splice(existingIndex, 1);
    }
    recentTheoryHistory.push(id);
    const maxHistory = Math.min(30, Math.max(0, theoryProblemIds.length - 1));
    while (recentTheoryHistory.length > maxHistory && recentTheoryHistory.length > 0) {
        recentTheoryHistory.shift();
    }
    saveRecentHistoryToStorage('recent_theory_history', recentTheoryHistory);

    const probObj = theoryProblemsMap.get(id);
    const cat = (probObj && typeof probObj === 'object') ? probObj.category : null;
    if (cat) {
        recentTheoryCategoryHistory.push(cat);
        while (recentTheoryCategoryHistory.length > 6) {
            recentTheoryCategoryHistory.shift();
        }
        saveRecentHistoryToStorage('recent_theory_category_history', recentTheoryCategoryHistory);
    }
}

function pickSmartRandomProblem({
    unusedIds,
    allIds,
    problemsMap,
    recentIdHistory,
    recentCategoryHistory,
    adjacentRange = 15
}) {
    if (unusedIds.length === 0) {
        let freshIds = [...allIds];
        for (let i = freshIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [freshIds[i], freshIds[j]] = [freshIds[j], freshIds[i]];
        }
        unusedIds.push(...freshIds);
    }

    const lastId = recentIdHistory.length > 0 ? recentIdHistory[recentIdHistory.length - 1] : null;

    const stages = [
        { catCoolDown: 4, adjRange: adjacentRange },
        { catCoolDown: 3, adjRange: Math.max(5, Math.floor(adjacentRange * 0.7)) },
        { catCoolDown: 2, adjRange: 5 },
        { catCoolDown: 1, adjRange: 3 },
        { catCoolDown: 0, adjRange: 3 },
        { catCoolDown: 0, adjRange: 0 }
    ];

    for (let stage of stages) {
        const coolDownCategories = (stage.catCoolDown > 0 && recentCategoryHistory.length > 0)
            ? recentCategoryHistory.slice(-stage.catCoolDown)
            : [];

        const candidateIndices = [];

        for (let i = 0; i < unusedIds.length; i++) {
            const candId = unusedIds[i];
            if (stage.adjRange === 0 && candId === lastId && unusedIds.length > 1) {
                continue;
            }

            const candObj = problemsMap.get(candId);
            const candCat = (candObj && typeof candObj === 'object') ? candObj.category : null;

            if (coolDownCategories.length > 0 && candCat && coolDownCategories.includes(candCat)) {
                continue;
            }

            if (stage.adjRange > 0 && isAdjacentProblem(candId, recentIdHistory, stage.adjRange)) {
                continue;
            }

            candidateIndices.push(i);
        }

        if (candidateIndices.length > 0) {
            const randomPick = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];
            return unusedIds.splice(randomPick, 1)[0];
        }
    }

    if (unusedIds.length > 0) {
        const randomPick = Math.floor(Math.random() * unusedIds.length);
        return unusedIds.splice(randomPick, 1)[0];
    }

    return allIds[Math.floor(Math.random() * allIds.length)];
}

let journalHighScore = { name: '기록 없음', score: 0 };
let theoryHighScore = { name: '기록 없음', score: 0 };

let isJournalStatRecorded = false;
let isTheoryStatRecorded = false;
let isJournalJumped = false;
let isTheoryJumped = false;

async function recordQuestionStat(mode, id, isCorrect) {
    try {
        const key = getQuizKey(mode, currentQuizLevel);
        const res = await fetch('?action=question_stats_record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: key, id: id, is_correct: isCorrect })
        });
        if (res.ok) {
            const data = await res.json();
            const badgeId = (mode === 'journal') ? 'journal-accuracy-badge' : 'theory-accuracy-badge';
            const badge = document.getElementById(badgeId);
            if (badge && data.rate !== undefined) {
                badge.innerText = `🎯 정답률: ${data.rate}%`;
            }
        }
    } catch (e) {
        console.warn('Failed to record stat:', e);
    }
}

async function fetchHighScores() {
    try {
        const res = await fetch('?action=high_score_get');
        if (res.ok) {
            const data = await res.json();
            allHighScores = Object.assign(allHighScores, data);
            updateHighScoreDisplay();
        }
    } catch (err) {
        console.warn('최고 기록 불러오기 실패:', err);
    }
}

function updateHighScoreDisplay() {
    const jKey = getQuizKey('journal', currentQuizLevel);
    const tKey = getQuizKey('theory', currentQuizLevel);
    const jScore = allHighScores[jKey] || { name: '기록 없음', score: 0 };
    const tScore = allHighScores[tKey] || { name: '기록 없음', score: 0 };

    const jEl = document.getElementById('journal-high-score-badge');
    if (jEl) {
        if (jScore.score > 0) {
            jEl.innerText = `🏆 최고기록: ${jScore.name} (${jScore.score}회)`;
        } else {
            jEl.innerText = `🏆 최고기록: 없음`;
        }
    }

    const tEl = document.getElementById('theory-high-score-badge');
    if (tEl) {
        if (tScore.score > 0) {
            tEl.innerText = `🏆 최고기록: ${tScore.name} (${tScore.score}회)`;
        } else {
            tEl.innerText = `🏆 최고기록: 없음`;
        }
    }
}

async function checkAndSaveHighScore(mode, currentStreak) {
    if (!currentStreak || currentStreak <= 0) return;
    const key = getQuizKey(mode, currentQuizLevel);
    const currentRecord = (allHighScores[key] && allHighScores[key].score) ? allHighScores[key].score : 0;
    
    if (currentStreak > currentRecord) {
        let nameToSave = getUserName() || '도전자';
        
        // 1. 클라이언트 로컬 상태 즉시 갱신하여 뱃지에 바로 반영
        allHighScores[key] = {
            name: nameToSave,
            score: currentStreak,
            date: new Date().toISOString()
        };
        updateHighScoreDisplay();

        // 2. 서버에 비동기 저장
        try {
            const res = await fetch('?action=high_score_update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: key,
                    name: nameToSave,
                    score: currentStreak
                })
            });
            if (res.ok) {
                const resData = await res.json();
                if (resData.updated) {
                    await fetchHighScores();
                }
            }
        } catch (e) {
            console.error('최고 기록 저장 중 오류:', e);
        }
    }
}

function applyJournalData(data) {
    problemsMap.clear();
    answersMap.clear();
    problemIds = data.problemIds || [];
    unusedProblemIds = [];
    
    if (data.problemsMapArr) {
        data.problemsMapArr.forEach(arr => problemsMap.set(arr[0], arr[1]));
    }
    if (data.answersMapArr) {
        data.answersMapArr.forEach(arr => answersMap.set(arr[0], arr[1]));
    }
    if (data.dynamicAccounts) {
        data.dynamicAccounts.forEach(acc => dynamicAccounts.add(acc));
    }

    const statusMessage = document.getElementById('status-message');
    if (problemIds.length > 0) {
        if (statusMessage) statusMessage.innerHTML = '성공적으로 불러왔습니다! 총 <strong>' + problemIds.length + '</strong>문항 연동 완료.';
        const startBtn = document.getElementById('start-btn');
        if (startBtn) startBtn.disabled = false;
        if (typeof updateWrongNotesUI === 'function') updateWrongNotesUI('journal', currentQuizLevel);
    } else {
        if (statusMessage) statusMessage.innerHTML = '불러온 문제가 없습니다. 엑셀 시트 양식을 확인해주세요.';
    }
}

function applyTheoryData(data) {
    if (typeof theoryProblemsMap !== 'undefined') {
        theoryProblemsMap.clear();
        theoryAnswersMap.clear();
        theoryProblemIds = data.theoryProblemIds || [];
        unusedTheoryIds = [];
        
        if (data.theoryProblemsMapArr) {
            data.theoryProblemsMapArr.forEach(arr => theoryProblemsMap.set(arr[0], arr[1]));
        }
        if (data.theoryAnswersMapArr) {
            data.theoryAnswersMapArr.forEach(arr => theoryAnswersMap.set(arr[0], arr[1]));
        }

        const statusMessage = document.getElementById('theory-status-message');
        if (theoryProblemIds.length > 0) {
            if (statusMessage) statusMessage.innerHTML = '성공적으로 불러왔습니다! 총 <strong>' + theoryProblemIds.length + '</strong>문항 연동 완료.';
            const startBtn = document.getElementById('start-theory-btn');
            if (startBtn) startBtn.disabled = false;
            if (typeof updateWrongNotesUI === 'function') updateWrongNotesUI('theory', currentQuizLevel);
        } else {
            if (statusMessage) statusMessage.innerHTML = '불러온 문제가 없습니다. 엑셀 시트 양식을 확인해주세요.';
        }
    }
}

let currentLoadingJournalFile = '';
let currentLoadingTheoryFile = '';

let excelWorker = new Worker('js/excel_worker.js?v=' + Date.now());
window.excelWorker = excelWorker;

excelWorker.addEventListener('message', function(e) {
    const data = e.data;
    const fileKey = data.fileKey || '';

    if (!data.success) {
        console.error("Worker Error:", data.error, "File:", fileKey);
        if (data.type === 'journal') {
            const statusMessage = document.getElementById('status-message');
            if (statusMessage) statusMessage.innerHTML = '엑셀 파싱 오류: ' + data.error;
        } else if (data.type === 'theory') {
            const statusMessage = document.getElementById('theory-status-message');
            if (statusMessage) statusMessage.innerHTML = '엑셀 파싱 오류: ' + data.error;
        }
        return;
    }

    // 캐시에 저장
    if (fileKey) {
        window.quizDataCache[fileKey] = data;
    }

    if (data.type === 'journal') {
        if (fileKey === currentLoadingJournalFile || !currentLoadingJournalFile) {
            applyJournalData(data);
        }
    } else if (data.type === 'theory') {
        if (fileKey === currentLoadingTheoryFile || !currentLoadingTheoryFile) {
            applyTheoryData(data);
        }
    }
});

function fetchExcelFile(url = '분개문제.xlsx') {
    currentLoadingJournalFile = url;

    // 캐시 확인 -> 캐시되어 있으면 0.01초 즉각 로드!
    if (window.quizDataCache[url]) {
        applyJournalData(window.quizDataCache[url]);
        return;
    }

    const status = document.getElementById('status-message');
    if (status) status.innerHTML = `엑셀 파일을 불러오는 중입니다... ⏳`;
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.disabled = true;

    const cleanUrl = url.replace(/^excels\//, '');
    const targetUrl = '?action=download_excel&file=' + encodeURIComponent(cleanUrl);

    fetch(targetUrl)
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.arrayBuffer();
        })
        .then(buffer => {
            if (window.excelWorker) {
                window.excelWorker.postMessage({ data: buffer, type: 'journal', fileKey: url });
            }
        })
        .catch(err => {
            console.error(`[${targetUrl}] 로드 실패:`, err);
            if (status) status.innerHTML = `'${url}' 파일을 불러오지 못했습니다. (서버 통신 오류)`;
        });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        excelWorker.postMessage({ data: e.target.result, type: 'journal', fileKey: 'custom_' + file.name });
    };
    reader.readAsArrayBuffer(file);
}

function parseWorkbook(data) {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) statusMessage.innerHTML = `엑셀 파일을 백그라운드에서 분석 중입니다... 잠시만 기다려주세요 ⏳`;
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.disabled = true;
    excelWorker.postMessage({ data: data, type: 'journal', fileKey: currentLoadingJournalFile || 'journal_temp' });
}

// 백그라운드 프리페치 함수 (모든 문제 파일 사전 캐싱)
async function prefetchAllQuizFiles() {
    const filesToPrefetch = [
        { url: '2급_분개문제(AI).xlsx', type: 'journal' },
        { url: '2급_필기문제(AI).xlsx', type: 'theory' },
        { url: '2급_전산회계책_분개.xlsx', type: 'journal' },
        { url: '2급_전산회계책_필기.xlsx', type: 'theory' },
        { url: '2급_기출문제_필기.xlsx', type: 'theory' },
        { url: '2급_기출문제_분개.xlsx', type: 'journal' },
        { url: '1급_분개문제(AI).xlsx', type: 'journal' },
        { url: '1급_필기문제(AI).xlsx', type: 'theory' },
        { url: '1급_전산회계책_분개.xlsx', type: 'journal' },
        { url: '1급_전산회계책_필기.xlsx', type: 'theory' },
        { url: '1급_기출문제_분개.xlsx', type: 'journal' },
        { url: '1급_기출문제_필기.xlsx', type: 'theory' }
    ];

    for (const item of filesToPrefetch) {
        if (!window.quizDataCache[item.url]) {
            try {
                const targetUrl = '?action=download_excel&file=' + encodeURIComponent(item.url);
                const res = await fetch(targetUrl);
                if (res.ok) {
                    const buffer = await res.arrayBuffer();
                    if (window.excelWorker) {
                        window.excelWorker.postMessage({ data: buffer, type: item.type, fileKey: item.url });
                    }
                }
            } catch (e) {
                // 프리페치 에러는 무시
            }
        }
    }
}

