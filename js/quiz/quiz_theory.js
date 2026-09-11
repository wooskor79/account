let theoryProblemsMap = new Map();
let theoryAnswersMap = new Map();
let theoryProblemIds = [];
let wrongTheoryProblemIds = [];
let currentTheoryId = null;
let theoryStreakCount = 0;

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

    // 2. 표 형식의 다중 컬럼 데이터 (금액, 회계처리 등이 나열된 경우)
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

// 전역 문제 이미지 라이트박스(확대 뷰어) 헬퍼
window.openProblemImageModal = function(src) {
    if (!src) return;
    let overlay = document.getElementById('problem-image-lightbox');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'problem-image-lightbox';
        overlay.className = 'problem-lightbox-overlay';
        overlay.innerHTML = `
            <div class="relative max-w-full max-h-full flex flex-col items-center">
                <img class="problem-lightbox-img" src="" alt="도표 원본 확대">
                <div class="text-white text-xs mt-2 bg-black/60 px-3 py-1 rounded-full pointer-events-none">화면을 클릭하면 닫힙니다</div>
            </div>
        `;
        overlay.addEventListener('click', (e) => {
            overlay.classList.remove('active');
            setTimeout(() => { overlay.style.display = 'none'; }, 200);
        });
        document.body.appendChild(overlay);
    }
    const imgEl = overlay.querySelector('.problem-lightbox-img');
    if (imgEl) imgEl.src = src;
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });
};

function renderProblemImageTag(rawPath, alt = '문제 도표 자료') {
    let src = (rawPath || '').trim();
    if (!src.startsWith('http') && !src.startsWith('/') && !src.startsWith('./') && !src.startsWith('images/')) {
        src = 'images/problems/' + src;
    }
    const safeSrc = encodeURI(src);
    return `<div class="problem-image-container my-2"><img src="${safeSrc}" alt="${escapeHtml(alt)}" class="problem-image" onclick="window.openProblemImageModal('${safeSrc}')" title="클릭하여 원본 크기로 보기"><div class="problem-image-caption"><span>🔍 클릭하면 크게 확대됩니다</span></div></div>`;
}

function formatTheoryQuestionHtml(rawText) {
    if (!rawText) return '';
    let text = String(rawText).trim();

    // 0. 이미지 태그 파싱 ([이미지: 경로] 또는 [img: 경로] 또는 ![설명](경로))
    let extractedImages = [];
    text = text.replace(/\[(?:이미지|img)\s*:\s*([^\]]+)\]/gi, (match, p1) => {
        extractedImages.push(renderProblemImageTag(p1.trim()));
        return '';
    });
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, p1) => {
        extractedImages.push(renderProblemImageTag(p1.trim(), alt.trim() || '문제 도표 자료'));
        return '';
    }).trim();

    const imagesHtml = extractedImages.length > 0 ? `<div class="text-center w-full">${extractedImages.join('')}</div>` : '';

    // 1. 마크다운 테이블 감지 (| 헤더1 | 헤더2 | ...)
    const mdTableRegex = /((?:\|[^\n]+\|\r?\n?){2,})/;
    const mdMatch = text.match(mdTableRegex);
    if (mdMatch) {
        const preText = text.substring(0, mdMatch.index).trim();
        const tableText = mdMatch[1].trim();
        const postText = text.substring(mdMatch.index + mdMatch[0].length).trim();

        const lines = tableText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const rows = lines.map(line => {
            return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        }).filter(r => !r.every(c => /^[-:\s]+$/.test(c))); // 구분선(---) 제외

        if (rows.length >= 2) {
            const headerRow = rows[0];
            const bodyRows = rows.slice(1);
            let res = '';
            if (preText) res += `<div class="theory-question-main mb-2 font-bold text-slate-800 leading-relaxed text-left">${escapeHtml(preText).replace(/\n/g, '<br>')}</div>`;
            if (imagesHtml) res += imagesHtml;
            res += `<div class="theory-table-container my-2"><table class="theory-table"><thead><tr>${headerRow.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map(row => `<tr>${row.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
            if (postText) res += `<div class="theory-question-sub mt-2 text-slate-700 leading-relaxed text-left">${escapeHtml(postText).replace(/\n/g, '<br>')}</div>`;
            return res.trim();
        }
    }

    // 2. 질문 본문과 부가 데이터(표, 보기 박스 등) 분리
    const splitMatch = text.match(/^(.*?(\?|\.|\:))\s*(\n+|(?<=\?)\s+)(.+)$/s);
    if (splitMatch && splitMatch[4] && splitMatch[4].trim().length > 3) {
        const qMain = splitMatch[1].trim();
        const subData = splitMatch[4].trim();
        const lines = subData.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        // 2-A. 특수 3열 원가 자료 표 자동 복원 (120회 9번 등)
        if (lines.length >= 7 && lines[0].includes('기초') && lines[1].includes('기말') && (lines[2].includes('소비액') || lines[2].includes('기중'))) {
            const headers = [lines[0], lines[1], lines[2]];
            const dataItems = lines.slice(3);
            if (dataItems.length === 9) {
                const rowCount = 3;
                const bodyRows = [];
                for (let r = 0; r < rowCount; r++) {
                    bodyRows.push([dataItems[r], dataItems[r + 3], dataItems[r + 6]]);
                }
                return `<div class="theory-question-main mb-2 font-bold text-slate-800 leading-relaxed text-left">${escapeHtml(qMain).replace(/\n/g, '<br>')}</div>${imagesHtml}<div class="theory-table-container my-2"><table class="theory-table"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map(row => `<tr>${row.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
            }
        }

        // 2-B. 탭(\t) 구분 2차원 표 감지
        const hasTabs = lines.some(l => l.includes('\t'));
        if (hasTabs) {
            const tableRows = lines.map(l => l.split('\t').map(c => c.trim()).filter(Boolean));
            if (tableRows.length >= 2 && tableRows[0].length >= 2) {
                const headerRow = tableRows[0];
                const bodyRows = tableRows.slice(1);
                return `<div class="theory-question-main mb-2 font-bold text-slate-800 leading-relaxed text-left">${escapeHtml(qMain).replace(/\n/g, '<br>')}</div>${imagesHtml}<div class="theory-table-container my-2"><table class="theory-table"><thead><tr>${headerRow.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map(row => `<tr>${row.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
            }
        }

        // 2-C. 공통 <보기> 또는 조건 박스 (가. 나. 다. / ㄱ. ㄴ. ㄷ. / ㆍ 조건 등)
        const isBogiLike = lines.some(l => /^(가|나|다|라|마|바|ㄱ|ㄴ|ㄷ|ㄹ|ㅁ|ㅂ|a|b|c|d|A|B|C|D)\.|\<보기\>|\[보기\]|【보기】|^ㆍ|^·|^\-|■/.test(l));
        if (isBogiLike || lines.length >= 2) {
            let boxTitle = '보 기';
            if (lines[0].includes('보기')) {
                boxTitle = lines[0].replace(/[<>[\]【】]/g, '').trim() || '보 기';
            } else if (subData.includes('취득') || subData.includes('상각') || subData.includes('원가') || subData.includes('재고')) {
                boxTitle = '문제 자료';
            }

            const cleanLines = lines.filter(l => !/^[<>[\]【】\s]*보기[<>[\]【】\s]*$/i.test(l));
            const mergedLines = [];
            for (let line of cleanLines) {
                if (/^[:：\s]/.test(line) && mergedLines.length > 0) {
                    mergedLines[mergedLines.length - 1] += ' ' + line.trim();
                } else {
                    mergedLines.push(line);
                }
            }
            const isShortItems = mergedLines.every(l => l.length <= 28);
            const gridClass = isShortItems && mergedLines.length >= 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1' : 'space-y-1';

            return `<div class="theory-question-main mb-2 font-bold text-slate-800 leading-relaxed text-left">${escapeHtml(qMain).replace(/\n/g, '<br>')}</div>${imagesHtml}<div class="theory-bogi-box my-2"><div class="theory-bogi-header"><span class="text-indigo-600">📋</span><span>&lt;${escapeHtml(boxTitle)}&gt;</span></div><div class="theory-bogi-content ${gridClass}">${mergedLines.map(line => `<div class="font-medium text-slate-700">${escapeHtml(line)}</div>`).join('')}</div></div>`;
        }
    }

    return `<div class="theory-question-main font-bold text-slate-800 leading-relaxed text-left">${escapeHtml(text).replace(/\n/g, '<br>')}</div>${imagesHtml}`;
}

function fetchTheoryExcelFile(url = '필기문제.xlsx') {
    currentLoadingTheoryFile = url;

    // 캐시 확인 -> 캐시되어 있으면 0.01초 즉각 로드!
    if (window.quizDataCache && window.quizDataCache[url]) {
        applyTheoryData(window.quizDataCache[url]);
        return;
    }

    const status = document.getElementById('theory-status-message');
    if (status) status.innerHTML = `문제 데이터를 불러오는 중입니다... ⏳`;
    const startBtn = document.getElementById('start-theory-btn');
    if (startBtn) startBtn.disabled = true;

    const cleanUrl = url.replace(/^excels\//, '');

    // 1순위: DB/고속 JSON 캐시 API 호출 (?action=get_quiz)
    fetch('?action=get_quiz&file=' + encodeURIComponent(cleanUrl))
        .then(res => res.json())
        .then(resData => {
            if (resData && resData.success) {
                if (window.quizDataCache) window.quizDataCache[url] = resData;
                applyTheoryData(resData);
            } else {
                fallbackExcelTheoryFetch();
            }
        })
        .catch(err => {
            console.warn('[get_quiz theory] 실패, 엑셀 다운로드로 전환:', err);
            fallbackExcelTheoryFetch();
        });

    function fallbackExcelTheoryFetch() {
        const targetUrl = '?action=download_excel&file=' + encodeURIComponent(cleanUrl);
        fetch(targetUrl)
            .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.arrayBuffer();
            })
            .then(buffer => {
                const worker = window.excelWorker || (typeof excelWorker !== 'undefined' ? excelWorker : null);
                if (worker) {
                    worker.postMessage({ data: buffer, type: 'theory', fileKey: url });
                }
            })
            .catch(err => {
                console.error(`[${targetUrl}] 로드 실패:`, err);
                if (status) status.innerHTML = `'${url}' 파일을 불러오지 못했습니다. (서버 통신 오류)`;
            });
    }
}

function handleTheoryFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        if (typeof excelWorker !== 'undefined') {
            excelWorker.postMessage({ data: e.target.result, type: 'theory', fileKey: 'custom_' + file.name });
        }
    };
    reader.readAsArrayBuffer(file);
}

function parseTheoryWorkbook(data) {
    const statusMessage = document.getElementById('theory-status-message');
    if (statusMessage) statusMessage.innerHTML = `엑셀 파일을 백그라운드에서 분석 중입니다... 잠시만 기다려주세요 ⏳`;
    const startBtn = document.getElementById('start-theory-btn');
    if (startBtn) startBtn.disabled = true;
    if (typeof excelWorker !== 'undefined') {
        excelWorker.postMessage({ data: data, type: 'theory', fileKey: currentLoadingTheoryFile || 'theory_temp' });
    }
}

async function startTheoryQuiz() {
    isWrongQuizMode = false;
    if (theoryProblemIds.length === 0) {
        alert("필기 문제를 불러오는 중입니다. 잠시 후 다시 눌러주세요.");
        return;
    }
    document.getElementById('theory-start-screen').classList.add('hidden');
    document.getElementById('theory-quiz-screen').classList.remove('hidden');

    if (typeof fetchUserStreak === 'function') {
        theoryStreakCount = await fetchUserStreak('theory', currentQuizLevel);
        const tracker = document.querySelector('#theory-score-tracker strong');
        if (tracker) tracker.innerText = theoryStreakCount;
    }

    loadRandomTheoryProblem();
}

async function startWrongTheoryQuiz() {
    if (theoryProblemIds.length === 0 || theoryProblemsMap.size === 0) {
        alert("필기 문제를 불러오는 중입니다. 잠시 후 다시 눌러주세요.");
        return;
    }

    const wrongData = await fetchWrongNotes('theory', currentQuizLevel);
    if (!wrongData.wrong_ids || wrongData.wrong_ids.length === 0) {
        alert("등록된 오답이 없습니다. 모든 문제를 완벽히 맞히셨습니다! 🎉");
        return;
    }

    isWrongQuizMode = true;
    wrongTheoryProblemIds = wrongData.wrong_ids.map(String).filter(id => theoryProblemsMap.has(id));
    if (wrongTheoryProblemIds.length === 0) {
        alert("현재 문제셋에 해당하는 오답이 없습니다. 등록된 오답이 없거나 모두 해결되었습니다.");
        if (typeof updateWrongNotesUI === 'function') updateWrongNotesUI('theory', currentQuizLevel);
        return;
    }

    unusedTheoryIds = [...wrongTheoryProblemIds];

    document.getElementById('theory-start-screen').classList.add('hidden');
    document.getElementById('theory-quiz-screen').classList.remove('hidden');

    if (typeof fetchUserStreak === 'function') {
        theoryStreakCount = await fetchUserStreak('theory', currentQuizLevel);
        const tracker = document.querySelector('#theory-score-tracker strong');
        if (tracker) tracker.innerText = theoryStreakCount;
    }

    loadRandomTheoryProblem();
}

function resetTheoryQuiz() {
    isWrongQuizMode = false;
    document.getElementById('theory-result-screen').classList.add('hidden');
    document.getElementById('theory-quiz-screen').classList.add('hidden');
    document.getElementById('theory-start-screen').classList.remove('hidden');
    if (typeof updateWrongNotesUI === 'function') {
        updateWrongNotesUI('theory', currentQuizLevel);
    }
}

let unusedTheoryIds = [];

function loadRandomTheoryProblem() {
    isTheoryJumped = false;
    const activeProblemIds = isWrongQuizMode ? wrongTheoryProblemIds : theoryProblemIds;
    if (!activeProblemIds || activeProblemIds.length === 0) {
        if (isWrongQuizMode) {
            alert("오답노트에 남은 문제가 없습니다! 모두 맞히셨습니다 🎉");
            resetTheoryQuiz();
            return;
        }
        return;
    }

    if (isWrongQuizMode) {
        if (unusedTheoryIds.length === 0) {
            unusedTheoryIds = [...wrongTheoryProblemIds];
        }
        currentTheoryId = unusedTheoryIds.splice(Math.floor(Math.random() * unusedTheoryIds.length), 1)[0];
    } else {
        if (typeof pickSmartRandomProblem === 'function') {
            currentTheoryId = pickSmartRandomProblem({
                unusedIds: unusedTheoryIds,
                allIds: theoryProblemIds,
                problemsMap: theoryProblemsMap,
                recentIdHistory: recentTheoryHistory,
                recentCategoryHistory: (typeof recentTheoryCategoryHistory !== 'undefined') ? recentTheoryCategoryHistory : [],
                adjacentRange: 15
            });
        } else {
            if (unusedTheoryIds.length === 0) unusedTheoryIds = [...theoryProblemIds];
            currentTheoryId = unusedTheoryIds.splice(Math.floor(Math.random() * unusedTheoryIds.length), 1)[0];
        }
    }

    addToRecentTheoryHistory(currentTheoryId);
    renderCurrentTheoryProblem();
}

function retryTheoryProblem() {
    renderCurrentTheoryProblem();
}

let currentShuffledChoices = [];
let currentShuffledCorrectAnswer = '1';
let currentShuffledCorrectText = '';

function renderCurrentTheoryProblem() {
    const prob = theoryProblemsMap.get(currentTheoryId);
    const correctObj = theoryAnswersMap.get(currentTheoryId);
    const category = (prob && typeof prob === 'object' && prob.category) ? prob.category : '';

    // 원본 정답 번호 (1~4)
    let origAnswerDigit = correctObj ? String(correctObj.answer).replace(/[^1-4]/g, '').trim() : '';
    let origCorrectIdx = origAnswerDigit ? parseInt(origAnswerDigit, 10) - 1 : -1;

    // 원본 보기 4개 복사
    let origChoices = prob && prob.choices ? prob.choices : ['', '', '', ''];
    let choiceItems = origChoices.map((text, idx) => ({
        originalIndex: idx + 1,
        text: text,
        isCorrect: (idx === origCorrectIdx)
    }));

    // 보기 무작위 셔플 (Fisher-Yates)
    for (let i = choiceItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choiceItems[i], choiceItems[j]] = [choiceItems[j], choiceItems[i]];
    }

    currentShuffledChoices = choiceItems;

    // 셔플된 새 정답 번호 계산 (1~4)
    let newCorrectIdx = choiceItems.findIndex(c => c.isCorrect);
    if (newCorrectIdx !== -1) {
        currentShuffledCorrectAnswer = String(newCorrectIdx + 1);
        currentShuffledCorrectText = choiceItems[newCorrectIdx].text.trim();
    } else {
        currentShuffledCorrectAnswer = origAnswerDigit || (correctObj ? String(correctObj.answer).trim() : '1');
        currentShuffledCorrectText = '';
    }

    document.getElementById('theory-problem-text').innerHTML = formatTheoryQuestionHtml(prob.text);
    
    if (isWrongQuizMode) {
        document.getElementById('theory-question-badge').innerText = `📌 오답복습 #${currentTheoryId}`;
    } else {
        document.getElementById('theory-question-badge').innerText = `문제 #${currentTheoryId}`;
    }

    const catBadge = document.getElementById('theory-category-badge');
    if (catBadge) {
        if (category) {
            catBadge.innerText = `🏷️ ${category}`;
            catBadge.classList.remove('hidden');
        } else {
            catBadge.classList.add('hidden');
        }
    }

    const diffBadge = document.getElementById('theory-difficulty-badge');
    if (diffBadge) {
        if (prob && prob.difficulty) {
            diffBadge.innerText = `⚡ 난이도: ${prob.difficulty}`;
            diffBadge.classList.remove('hidden');
        } else {
            diffBadge.classList.add('hidden');
        }
    }

    isTheoryStatRecorded = false;
    const accBadge = document.getElementById('theory-accuracy-badge');
    if (accBadge) {
        accBadge.innerText = '🎯 정답률: 조회 중...';
        const statType = typeof getQuizKey === 'function' ? getQuizKey('theory', currentQuizLevel) : 'theory_2';
        fetch(`?action=question_stats_get&type=${statType}&id=${currentTheoryId}`)
            .then(res => res.json())
            .then(data => {
                const rateText = (data.rate === undefined || data.rate === '-') ? '-%' : `${data.rate}%`;
                accBadge.innerText = `🎯 정답률: ${rateText}`;
            })
            .catch(() => { accBadge.innerText = `🎯 정답률: -%`; });
    }

    // 보기 렌더링
    const container = document.getElementById('theory-choices-container');
    container.innerHTML = '';

    choiceItems.forEach((choice, idx) => {
        const choiceNum = idx + 1;
        const div = document.createElement('div');
        div.className = `theory-choice-label flex items-start gap-2.5 py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl border-2 border-slate-100 bg-white hover:bg-slate-50/80 hover:border-slate-300 cursor-pointer transition shadow-2xs`;
        div.dataset.num = choiceNum;
        
        div.innerHTML = `
            <div class="flex items-center gap-2 mt-0.5 pointer-events-none flex-shrink-0">
                <input type="radio" name="theory-choice" id="theory-choice-${choiceNum}" value="${choiceNum}" class="w-4 h-4 text-emerald-600 focus:ring-emerald-400">
                <span class="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 text-slate-700 font-extrabold text-[11px] group-hover:bg-slate-200">${choiceNum}</span>
            </div>
            <label for="theory-choice-${choiceNum}" class="flex-1 text-xs sm:text-sm font-medium text-slate-700 cursor-pointer select-none leading-snug">${formatTheoryOptionHtml(choice.text)}</label>
        `;
        
        div.addEventListener('click', () => {
            selectTheoryChoice(choiceNum);
        });

        container.appendChild(div);
    });

    document.getElementById('theory-quiz-screen').classList.remove('hidden');
    document.getElementById('theory-result-screen').classList.add('hidden');
}

function selectTheoryChoice(num) {
    const radio = document.querySelector(`input[name="theory-choice"][value="${num}"]`);
    if (radio) {
        radio.checked = true;
    }
    updateTheoryChoiceStyles();
}

function updateTheoryChoiceStyles() {
    const checkedRadio = document.querySelector('input[name="theory-choice"]:checked');
    const labels = document.querySelectorAll('.theory-choice-label');
    labels.forEach(label => {
        const radio = label.querySelector('input[type="radio"]');
        const badge = label.querySelector('span');
        if (radio && radio.checked) {
            label.className = `theory-choice-label flex items-start gap-2.5 py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl border-2 border-emerald-400 bg-emerald-50/90 ring-1 ring-emerald-300/60 cursor-pointer transition shadow-2xs`;
            if (badge) {
                badge.className = `w-5 h-5 flex items-center justify-center rounded-md bg-emerald-600 text-white font-extrabold text-[11px] shadow-2xs`;
            }
        } else {
            label.className = `theory-choice-label flex items-start gap-2.5 py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl border-2 border-slate-100 bg-white hover:bg-slate-50/80 hover:border-slate-300 cursor-pointer transition shadow-2xs`;
            if (badge) {
                badge.className = `w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 text-slate-700 font-extrabold text-[11px] group-hover:bg-slate-200`;
            }
        }
    });
}

function submitTheoryAnswer() {
    const selected = document.querySelector('input[name="theory-choice"]:checked');
    if (!selected) {
        alert("보기를 선택해주세요! (1~4 숫자키 또는 마우스 클릭)");
        return;
    }

    const userChoiceNum = selected.value; // 셔플된 선택 번호 (1~4)
    const userChoiceObj = currentShuffledChoices[parseInt(userChoiceNum, 10) - 1];
    const userChoiceText = userChoiceObj ? userChoiceObj.text : '';

    const isCorrect = (userChoiceNum === currentShuffledCorrectAnswer);

    const correctObj = theoryAnswersMap.get(currentTheoryId);

    const resultIcon = document.getElementById('theory-result-icon');
    const resultTitle = document.getElementById('theory-result-title');
    const resultDesc = document.getElementById('theory-result-desc');
    const answerDisplay = document.getElementById('theory-correct-answer-display');
    const explanationText = document.getElementById('theory-explanation-text');
    const retryBtn = document.getElementById('theory-retry-btn');
    const userAnswerBox = document.getElementById('theory-user-answer-box');
    const userAnswerDisplay = document.getElementById('theory-user-answer-display');

    if (!isTheoryStatRecorded) {
        recordQuestionStat('theory', currentTheoryId, isCorrect);
        isTheoryStatRecorded = true;
    }

    // 오답노트 동기화 (틀리면 추가, 오답풀이 모드에서 맞히면 삭제)
    if (typeof recordWrongNote === 'function') {
        recordWrongNote('theory', currentQuizLevel, currentTheoryId, isCorrect, isWrongQuizMode).then(res => {
            if (isWrongQuizMode && isCorrect && res && res.removed) {
                // 오답 목록에서도 제외
                wrongTheoryProblemIds = wrongTheoryProblemIds.filter(id => id !== currentTheoryId);
                resultDesc.innerText = `오답 노트 탈출 성공! 🎉 (남은 오답: ${res.remaining}개)`;
            }
        });
    }

    if (isCorrect) {
        if (!isTheoryJumped) {
            theoryStreakCount++;
            if (typeof saveUserStreak === 'function') {
                saveUserStreak('theory', currentQuizLevel, theoryStreakCount);
            }
            checkAndSaveHighScore('theory', theoryStreakCount);
        }

        resultIcon.innerText = '🎉';
        resultTitle.innerText = '정답입니다!';
        resultTitle.className = 'text-xl font-bold text-emerald-600 mb-1';
        if (!isWrongQuizMode) {
            resultDesc.innerText = '정확한 개념을 알고 계시네요!';
        }
        userAnswerBox.classList.add('hidden');
        if (retryBtn) retryBtn.classList.add('hidden');
    } else {
        theoryStreakCount = 0;
        if (typeof saveUserStreak === 'function') {
            saveUserStreak('theory', currentQuizLevel, 0);
        }
        resultIcon.innerText = '💧';
        resultTitle.innerText = '아쉽네요, 오답입니다.';
        resultTitle.className = 'text-xl font-bold text-rose-500 mb-1';
        resultDesc.innerText = '오답 노트에 자동 저장되었습니다. 해설을 꼼꼼히 확인해 보세요.';

        userAnswerBox.classList.remove('hidden');
        userAnswerDisplay.innerText = `${userChoiceNum}번. ${userChoiceText}`;
        if (retryBtn) retryBtn.classList.remove('hidden');
    }

    document.querySelector('#theory-score-tracker strong').innerText = theoryStreakCount;

    let correctText = currentShuffledCorrectText || (userChoiceObj ? userChoiceObj.text : '');
    answerDisplay.innerText = `정답: ${currentShuffledCorrectAnswer}번. ${correctText}`;
    explanationText.innerText = (correctObj && correctObj.explanation) ? correctObj.explanation : '해설이 제공되지 않는 문항입니다.';

    document.getElementById('theory-quiz-screen').classList.add('hidden');
    document.getElementById('theory-result-screen').classList.remove('hidden');
}

function nextTheoryProblem() {
    loadRandomTheoryProblem();
}

function jumpToTheoryProblem() {
    const input = document.getElementById('theory-jump-input');
    const val = input.value.trim();
    if (!val) return;

    if (theoryProblemsMap.has(val)) {
        currentTheoryId = val;
        isTheoryJumped = true;
        
        unusedTheoryIds = unusedTheoryIds.filter(id => id !== val);
        addToRecentTheoryHistory(val);

        document.getElementById('theory-start-screen').classList.add('hidden');
        renderCurrentTheoryProblem();
        input.value = '';
    } else {
        alert(`문제 번호 #${val}을(를) 찾을 수 없습니다. (1 ~ ${theoryProblemIds.length})`);
    }
}

// 키보드 단축키 등록: 숫자 1~4로 보기 선택, 스페이스바로 정답 확인 / 다음 문제
document.addEventListener('keydown', (e) => {
    const theoryContainer = document.getElementById('theory-quiz-container');
    if (!theoryContainer || theoryContainer.classList.contains('hidden')) {
        return;
    }

    // 결과 화면(theory-result-screen)이 열려있을 때 단축키
    const resultScreen = document.getElementById('theory-result-screen');
    if (resultScreen && !resultScreen.classList.contains('hidden')) {
        // Space 키 -> 다음 문제 풀기 (Enter 연타 방지)
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            nextTheoryProblem();
            return;
        }
        // Home 키 -> 처음으로
        if (e.key === 'Home') {
            e.preventDefault();
            resetTheoryQuiz();
            return;
        }
        // Backspace 키 -> 다시 풀기
        if (e.key === 'Backspace') {
            e.preventDefault();
            retryTheoryProblem();
            return;
        }
        return;
    }

    // 필기 퀴즈 문제 풀이 화면일 때 단축키
    const quizScreen = document.getElementById('theory-quiz-screen');
    if (!quizScreen || quizScreen.classList.contains('hidden')) {
        return;
    }

    // 문제번호 점프 입력창 등 다른 입력창에 포커스가 있는 경우 제외
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.closest('#calculator-widget'))) {
        return;
    }

    // 숫자키 1, 2, 3, 4 (일반 숫자키 & 넘패드 키) -> 보기 선택
    const keyMap = {
        '1': 1, '2': 2, '3': 3, '4': 4,
        'Numpad1': 1, 'Numpad2': 2, 'Numpad3': 3, 'Numpad4': 4
    };

    if (keyMap[e.key] || keyMap[e.code]) {
        const choiceNum = keyMap[e.key] || keyMap[e.code];
        e.preventDefault();
        selectTheoryChoice(choiceNum);
        return;
    }

    // Space 키 또는 Enter 키 -> 정답 확인하기
    if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        submitTheoryAnswer();
        return;
    }
});
