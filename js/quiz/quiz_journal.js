let wrongJournalProblemIds = [];

async function startQuiz() {
    isWrongQuizMode = false;
    if (problemIds.length === 0) {
        alert("사용 가능한 문제가 없습니다.");
        return;
    }
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');

    if (typeof fetchUserStreak === 'function') {
        streakCount = await fetchUserStreak('journal', currentQuizLevel);
        const tracker = document.querySelector('#score-tracker strong');
        if (tracker) tracker.innerText = streakCount;
    }

    loadRandomProblem();
}

async function startWrongJournalQuiz() {
    if (problemIds.length === 0 || problemsMap.size === 0) {
        alert("분개 문제를 불러오는 중입니다. 잠시 후 다시 눌러주세요.");
        return;
    }

    const wrongData = await fetchWrongNotes('journal', currentQuizLevel);
    if (!wrongData.wrong_ids || wrongData.wrong_ids.length === 0) {
        alert("등록된 오답이 없습니다. 모든 문제를 완벽히 맞히셨습니다! 🎉");
        return;
    }

    isWrongQuizMode = true;
    wrongJournalProblemIds = wrongData.wrong_ids.map(String).filter(id => problemsMap.has(id));
    if (wrongJournalProblemIds.length === 0) {
        alert("현재 문제셋에 해당하는 오답이 없습니다. 등록된 오답이 없거나 모두 해결되었습니다.");
        if (typeof updateWrongNotesUI === 'function') updateWrongNotesUI('journal', currentQuizLevel);
        return;
    }

    unusedProblemIds = [...wrongJournalProblemIds];

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');

    if (typeof fetchUserStreak === 'function') {
        streakCount = await fetchUserStreak('journal', currentQuizLevel);
        const tracker = document.querySelector('#score-tracker strong');
        if (tracker) tracker.innerText = streakCount;
    }

    loadRandomProblem();
}

function resetJournalQuiz() {
    isWrongQuizMode = false;
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    if (typeof updateWrongNotesUI === 'function') {
        updateWrongNotesUI('journal', currentQuizLevel);
    }
}

function formatNumberInput(el) {
    let raw = el.value;
    if (raw.includes('+')) {
        raw = raw.replace(/\+/g, '000');
    }
    let val = raw.replace(/[^0-9]/g, '');
    if (val !== '') { el.value = Number(val).toLocaleString(); } 
    else { el.value = ''; }

    // 기존 금액 강제 차감 로직 없음 -> 사용자가 입력한 금액 그대로 보존
    updateJournalBalanceSummary();
}

function fillAutoBalance(targetInput) {
    let activeRow = targetInput ? targetInput.closest('#debit-rows-container > div, #credit-rows-container > div') : null;
    
    // 포커스가 없거나 특정 행이 아니면:
    // 1. 비어있는 금액창 우선 탐색
    // 2. 합계가 부족한 쪽의 마지막 행 탐색
    if (!activeRow) {
        const emptyAmt = Array.from(document.querySelectorAll('.debit-amt, .credit-amt')).find(inp => !inp.value || inp.value === '0');
        if (emptyAmt) {
            activeRow = emptyAmt.closest('#debit-rows-container > div, #credit-rows-container > div');
            targetInput = emptyAmt;
        } else {
            let debitSum = 0;
            document.querySelectorAll('#debit-rows-container .debit-amt').forEach(i => debitSum += (Number(i.value.replace(/[^0-9]/g, '')) || 0));
            let creditSum = 0;
            document.querySelectorAll('#credit-rows-container .credit-amt').forEach(i => creditSum += (Number(i.value.replace(/[^0-9]/g, '')) || 0));
            
            if (debitSum > creditSum) {
                const creditRows = document.querySelectorAll('#credit-rows-container > div');
                if (creditRows.length > 0) {
                    activeRow = creditRows[creditRows.length - 1];
                    targetInput = activeRow.querySelector('.credit-amt');
                }
            } else if (creditSum > debitSum) {
                const debitRows = document.querySelectorAll('#debit-rows-container > div');
                if (debitRows.length > 0) {
                    activeRow = debitRows[debitRows.length - 1];
                    targetInput = activeRow.querySelector('.debit-amt');
                }
            }
        }
    }

    if (!activeRow) return false;

    const container = activeRow.parentElement;
    const isDebit = container.id === 'debit-rows-container';
    const amtInput = activeRow.querySelector('.debit-amt, .credit-amt');
    if (!amtInput) return false;

    // 반대편 합계
    let oppositeSum = 0;
    const oppAmts = document.querySelectorAll(isDebit ? '#credit-rows-container .credit-amt' : '#debit-rows-container .debit-amt');
    oppAmts.forEach(input => {
        let v = Number(input.value.replace(/[^0-9]/g, '')) || 0;
        oppositeSum += v;
    });

    // 같은 편의 다른 행 합계
    let otherSameSum = 0;
    const sameAmts = container.querySelectorAll('.debit-amt, .credit-amt');
    sameAmts.forEach(input => {
        if (input !== amtInput) {
            let v = Number(input.value.replace(/[^0-9]/g, '')) || 0;
            otherSameSum += v;
        }
    });

    if (oppositeSum > 0) {
        const fillAmt = Math.max(0, oppositeSum - otherSameSum);
        amtInput.value = fillAmt.toLocaleString();
        updateJournalBalanceSummary();
        setTimeout(() => { amtInput.focus(); amtInput.select(); }, 20);
        return true;
    }
    return false;
}

function checkSideFilled(side) {
    const selector = side === 'debit' ? '#debit-rows-container > div' : '#credit-rows-container > div';
    const rows = document.querySelectorAll(selector);
    if (rows.length === 0) return false;
    for (let row of rows) {
        const acc = row.querySelector('.debit-acc, .credit-acc')?.value.trim();
        const amt = Number(row.querySelector('.debit-amt, .credit-amt')?.value.replace(/[^0-9]/g, '')) || 0;
        if (!acc || amt <= 0) return false;
    }
    return true;
}

function updateJournalBalanceSummary() {
    const summaryBox = document.getElementById('journal-balance-summary');
    if (!summaryBox) return;

    let debitSum = 0;
    const debitAmts = document.querySelectorAll('#debit-rows-container .debit-amt');
    debitAmts.forEach(input => {
        let val = Number(input.value.replace(/[^0-9]/g, '')) || 0;
        debitSum += val;
    });

    let creditSum = 0;
    const creditAmts = document.querySelectorAll('#credit-rows-container .credit-amt');
    creditAmts.forEach(input => {
        let val = Number(input.value.replace(/[^0-9]/g, '')) || 0;
        creditSum += val;
    });

    let diff = Math.abs(debitSum - creditSum);
    let operator = '=';
    if (debitSum < creditSum) operator = '<';
    else if (debitSum > creditSum) operator = '>';

    const isBalanced = (debitSum === creditSum && debitSum > 0);

    let diffBadge = '';
    if (debitSum === creditSum) {
        if (debitSum > 0) {
            diffBadge = `<span class="bg-emerald-600 text-white font-extrabold px-2.5 py-1 rounded-xl shadow-xs">0원 (일치 ✨)</span>`;
        } else {
            diffBadge = `<span class="bg-slate-400 text-white font-bold px-2.5 py-1 rounded-xl">0원</span>`;
        }
    } else {
        diffBadge = `<span class="bg-amber-500 text-white font-extrabold px-2.5 py-1 rounded-xl shadow-xs animate-pulse">${diff.toLocaleString()}원</span>`;
    }

    if (isBalanced) {
        summaryBox.className = "bg-emerald-50/90 border-2 border-emerald-300 ring-2 ring-emerald-200/60 rounded-2xl px-4 py-3 mb-6 text-xs sm:text-sm font-semibold flex items-center justify-between flex-wrap gap-2 shadow-sm transition duration-200";
    } else {
        summaryBox.className = "bg-amber-50/80 border border-amber-200 rounded-2xl px-4 py-3 mb-6 text-xs sm:text-sm font-semibold flex items-center justify-between flex-wrap gap-2 shadow-sm transition duration-200";
    }

    // 차변/대변 금액 일치 시 금액 입력란 초록색 테두리 강조
    const allAmtInputs = document.querySelectorAll('.debit-amt, .credit-amt');
    allAmtInputs.forEach(input => {
        const val = Number(input.value.replace(/[^0-9]/g, '')) || 0;
        if (isBalanced && val > 0) {
            input.classList.add('border-emerald-400', 'bg-emerald-50/30', 'text-emerald-950');
            input.classList.remove('border-slate-200', 'bg-white');
        } else {
            input.classList.remove('border-emerald-400', 'bg-emerald-50/30', 'text-emerald-950');
            input.classList.add('border-slate-200', 'bg-white');
        }
    });

    summaryBox.innerHTML = `
        <div class="flex items-center justify-between w-full font-bold">
            <div class="flex items-center gap-1.5 text-slate-700 flex-wrap">
                <span>차변합계 (<strong class="text-sky-700 font-extrabold">${debitSum.toLocaleString()}원</strong>)</span>
                <span class="text-amber-600 text-base font-extrabold px-1">${operator}</span>
                <span>대변합계 (<strong class="text-purple-700 font-extrabold">${creditSum.toLocaleString()}원</strong>)</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="text-slate-600 font-extrabold">: 차액</span>
                ${diffBadge}
            </div>
        </div>
    `;
}

function convertToKoreanIfNeeded(el) {
    if (el.dataset.isComposing === 'true') return;
    let val = el.value.trim();
    if (val !== '' && /^[a-zA-Z\s]+$/.test(val)) {
        let converted = englishToKorean(val);
        if (converted !== val) {
            el.value = converted;
            try {
                el.setSelectionRange(el.value.length, el.value.length);
            } catch (e) {}
        }
    }
}

function attachKoreanInputEvents(inputEl) {
    if (!inputEl) return;
    
    inputEl.dataset.engBuffer = '';
    inputEl.dataset.isComposing = 'false';

    inputEl.addEventListener('compositionstart', () => {
        inputEl.dataset.isComposing = 'true';
        inputEl.dataset.engBuffer = '';
    });

    inputEl.addEventListener('compositionend', () => {
        inputEl.dataset.isComposing = 'false';
    });

    inputEl.addEventListener('focus', () => {
        if (!inputEl.value) {
            inputEl.dataset.engBuffer = '';
        }
    });

    inputEl.addEventListener('keydown', (e) => {
        if (inputEl.dataset.isComposing === 'true') return;

        if (e.key === 'Backspace' && inputEl.dataset.engBuffer) {
            e.preventDefault();
            inputEl.dataset.engBuffer = inputEl.dataset.engBuffer.slice(0, -1);
            inputEl.value = englishToKorean(inputEl.dataset.engBuffer);
            inputEl.dispatchEvent(new Event('input'));
            try {
                inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
            } catch (err) {}
            return;
        }

        if (e.key.length === 1 && /[a-zA-Z]/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            inputEl.dataset.engBuffer = (inputEl.dataset.engBuffer || '') + e.key;
            inputEl.value = englishToKorean(inputEl.dataset.engBuffer);
            inputEl.dispatchEvent(new Event('input'));
            try {
                inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
            } catch (err) {}
        }
    });

    inputEl.addEventListener('input', () => {
        if (inputEl.dataset.isComposing === 'true') return;
        if (!inputEl.value) {
            inputEl.dataset.engBuffer = '';
        }
    });
}

function englishToKorean(text) {
    const KOR_KEYMAP = {
        'r':'ㄱ', 'R':'ㄲ', 's':'ㄴ', 'e':'ㄷ', 'E':'ㄸ', 'f':'ㄹ', 'a':'ㅁ', 'q':'ㅂ', 'Q':'ㅃ',
        't':'ㅅ', 'T':'ㅆ', 'd':'ㅇ', 'w':'ㅈ', 'W':'ㅉ', 'c':'ㅊ', 'z':'ㅋ', 'x':'ㅌ', 'v':'ㅍ', 'g':'ㅎ',
        'k':'ㅏ', 'o':'ㅐ', 'i':'ㅑ', 'O':'ㅒ', 'j':'ㅓ', 'p':'ㅔ', 'u':'ㅕ', 'P':'ㅖ', 'h':'ㅗ',
        'y':'ㅛ', 'n':'ㅜ', 'b':'ㅠ', 'm':'ㅡ', 'l':'ㅣ'
    };

    const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    const JOUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
    const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

    const DOUBLE_VOWEL = {
        'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
        'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ',
        'ㅡㅣ': 'ㅢ'
    };

    const DOUBLE_BATCHIM = {
        'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ',
        'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㄾ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ'
    };

    let jamo = '';
    for (let i = 0; i < text.length; i++) {
        let ch = text[i];
        if (KOR_KEYMAP[ch]) {
            jamo += KOR_KEYMAP[ch];
        } else {
            jamo += ch;
        }
    }

    let result = '';
    let i = 0;
    while (i < jamo.length) {
        let choIdx = CHO.indexOf(jamo[i]);
        if (choIdx === -1) {
            result += jamo[i];
            i++;
            continue;
        }

        if (i + 1 >= jamo.length || JOUNG.indexOf(jamo[i + 1]) === -1) {
            result += jamo[i];
            i++;
            continue;
        }

        let jungStr = jamo[i + 1];
        let jungAdv = 1;
        if (i + 2 < jamo.length && DOUBLE_VOWEL[jungStr + jamo[i + 2]]) {
            jungStr = DOUBLE_VOWEL[jungStr + jamo[i + 2]];
            jungAdv = 2;
        }

        let jungIdx = JOUNG.indexOf(jungStr);
        let jongIdx = 0;
        let jongAdv = 0;

        let nextIdx = i + 1 + jungAdv;
        if (nextIdx < jamo.length) {
            let possibleJong1 = jamo[nextIdx];
            let possibleJong2 = (nextIdx + 1 < jamo.length) ? jamo[nextIdx + 1] : '';
            let afterJongVowel = (nextIdx + 1 < jamo.length) ? JOUNG.indexOf(jamo[nextIdx + 1]) !== -1 : false;
            let afterJong2Vowel = (nextIdx + 2 < jamo.length) ? JOUNG.indexOf(jamo[nextIdx + 2]) !== -1 : false;

            if (JONG.indexOf(possibleJong1) !== -1 && !afterJongVowel) {
                if (possibleJong2 && DOUBLE_BATCHIM[possibleJong1 + possibleJong2] && !afterJong2Vowel) {
                    let dbStr = DOUBLE_BATCHIM[possibleJong1 + possibleJong2];
                    jongIdx = JONG.indexOf(dbStr);
                    jongAdv = 2;
                } else {
                    jongIdx = JONG.indexOf(possibleJong1);
                    jongAdv = 1;
                }
            }
        }

        let code = 0xAC00 + (choIdx * 21 * 28) + (jungIdx * 28) + jongIdx;
        result += String.fromCharCode(code);
        i += 1 + jungAdv + jongAdv;
    }

    return result;
}

// 스마트 드롭다운 및 방향키, 단일클릭(Single-Click) 선택, 다중 행 포커스 이벤트 적용
function attachAutoCompleteEvents(rowDiv, type) {
    const inputEl = rowDiv.querySelector('.debit-acc, .credit-acc');
    const popupEl = rowDiv.querySelector('.suggest-popup');
    const amtInput = rowDiv.querySelector('.debit-amt, .credit-amt');

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
            html += `<div class="cursor-pointer px-3 py-1.5 text-sm font-semibold rounded-lg transition ${bgClass}" data-val="${m}">${m}</div>`;
        });
        popupEl.innerHTML = html;
        popupEl.classList.remove('hidden');

        // 단일 클릭 이벤트 바인딩
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
        // 선택 즉시 금액란으로 점프
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

        currentMatches = [];
        for (let acc of dynamicAccounts) {
            if (acc.startsWith(trimmed)) {
                currentMatches.push(acc);
                if (currentMatches.length >= 8) break;
            }
        }
        
        if (currentMatches.length > 0) {
            activeIndex = 0; 
        } else {
            activeIndex = -1;
        }
        
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

    // 다중 행 포커스 버그 수정 및 +, - 키 단축키
    if (amtInput) {
        amtInput.addEventListener('keydown', (e) => {
            if (e.isComposing || e.keyCode === 229) return;
            
            // 회계 프로그램 단축키: '+' 키 누르면 '000' 추가
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

            // 회계 프로그램 단축키: '-' 키 누르면 반대편 합계/차액 자동 채우기
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
                    // 1. 다음 차변 행이 있다면 다음 차변 계정과목으로 이동
                    if (nextRow && nextRow.querySelector('.debit-acc')) {
                        const nextAcc = nextRow.querySelector('.debit-acc');
                        setTimeout(() => { nextAcc.focus(); nextAcc.select(); }, 20);
                        return;
                    }

                    // 2. 대변 첫 번째 행으로 이동 (대변 금액이 비어있으면 차변 합계 자동 채우기)
                    const firstCreditRow = document.querySelector('#credit-rows-container > div');
                    if (firstCreditRow) {
                        const creditAmtInput = firstCreditRow.querySelector('.credit-amt');
                        const creditAccInput = firstCreditRow.querySelector('.credit-acc');

                        // 대변 금액이 비어있거나 0이면 차변 합계 자동 입력
                        if (creditAmtInput && (!creditAmtInput.value || creditAmtInput.value === '0')) {
                            let debitSum = 0;
                            document.querySelectorAll('#debit-rows-container .debit-amt').forEach(inp => {
                                debitSum += (Number(inp.value.replace(/[^0-9]/g, '')) || 0);
                            });
                            if (debitSum > 0) {
                                creditAmtInput.value = debitSum.toLocaleString();
                                updateJournalBalanceSummary();
                            }
                        }

                        // 차변금액에서 엔터 치면 대변 계정입력으로 이동
                        if (creditAccInput) {
                            setTimeout(() => { creditAccInput.focus(); creditAccInput.select(); }, 20);
                            return;
                        }
                    }
                    submitAnswer();
                } else if (type === 'credit') {
                    // 1. 다음 대변 행이 있다면 다음 대변 계정과목으로 이동
                    if (nextRow && nextRow.querySelector('.credit-acc')) {
                        const nextAcc = nextRow.querySelector('.credit-acc');
                        setTimeout(() => { nextAcc.focus(); nextAcc.select(); }, 20);
                        return;
                    }

                    // 2. 차변이 비어있다면 첫 번째 차변 행으로 이동하면서 차변 금액 자동 채우기
                    const firstDebitRow = document.querySelector('#debit-rows-container > div');
                    if (firstDebitRow) {
                        const debitAmtInput = firstDebitRow.querySelector('.debit-amt');
                        const debitAccInput = firstDebitRow.querySelector('.debit-acc');

                        // 차변 금액이 비어있거나 0이면 대변 합계 자동 입력
                        if (debitAmtInput && (!debitAmtInput.value || debitAmtInput.value === '0')) {
                            let creditSum = 0;
                            document.querySelectorAll('#credit-rows-container .credit-amt').forEach(inp => {
                                creditSum += (Number(inp.value.replace(/[^0-9]/g, '')) || 0);
                            });
                            if (creditSum > 0) {
                                debitAmtInput.value = creditSum.toLocaleString();
                                updateJournalBalanceSummary();
                            }
                        }

                        // 차변 계정과목이 비어있다면 차변 계정과목으로 이동
                        if (debitAccInput && !debitAccInput.value.trim()) {
                            setTimeout(() => { debitAccInput.focus(); debitAccInput.select(); }, 20);
                            return;
                        }
                    }

                    // 3. 대변 금액 입력란에서 최종 엔터를 쳤을 때 정답 확인 실행
                    submitAnswer();
                }
            }
        });
    }
}

function addDebitRow(acc = '', amt = '', autoFocus = false) {
    const container = document.getElementById('debit-rows-container');
    const rowId = 'debit-row-' + Date.now() + Math.random();
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.id = rowId;
    let displayAmt = amt !== '' ? Number(amt).toLocaleString() : '';
    div.innerHTML = `
        <div class="relative flex-1 flex items-center min-w-0 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-sky-400">
            <input type="text" lang="ko" style="ime-mode:active; -ms-ime-mode:active;" onchange="convertToKoreanIfNeeded(this)" onfocus="this.style.imeMode='active'" placeholder="계정과목 (예: 현금)" value="${acc}" class="debit-acc w-full px-3.5 py-2.5 bg-transparent relative z-10 text-sm text-slate-800 focus:outline-none font-bold">
            <div class="suggest-popup hidden absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-[100] flex flex-col gap-1 max-h-48 overflow-y-auto"></div>
        </div>
        <input type="text" inputmode="numeric" oninput="formatNumberInput(this)" placeholder="금액" value="${displayAmt}" class="debit-amt w-32 sm:w-40 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 text-right font-bold">
        <button onclick="removeRow('${rowId}')" class="text-slate-400 hover:text-rose-500 p-2 font-bold transition">×</button>
    `;
    container.appendChild(div);
    const accInput = div.querySelector('.debit-acc');
    attachKoreanInputEvents(accInput);
    attachAutoCompleteEvents(div, 'debit');
    if (autoFocus && accInput) {
        setTimeout(() => { accInput.focus(); accInput.select(); }, 100);
    }
    updateJournalBalanceSummary();
}

function addCreditRow(acc = '', amt = '', autoFocus = false) {
    const container = document.getElementById('credit-rows-container');
    const rowId = 'credit-row-' + Date.now() + Math.random();
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.id = rowId;
    let displayAmt = amt !== '' ? Number(amt).toLocaleString() : '';
    div.innerHTML = `
        <div class="relative flex-1 flex items-center min-w-0 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-purple-400">
            <input type="text" lang="ko" style="ime-mode:active; -ms-ime-mode:active;" onchange="convertToKoreanIfNeeded(this)" onfocus="this.style.imeMode='active'" placeholder="계정과목 (예: 보통예금)" value="${acc}" class="credit-acc w-full px-3.5 py-2.5 bg-transparent relative z-10 text-sm text-slate-800 focus:outline-none font-bold">
            <div class="suggest-popup hidden absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-[100] flex flex-col gap-1 max-h-48 overflow-y-auto"></div>
        </div>
        <input type="text" inputmode="numeric" oninput="formatNumberInput(this)" placeholder="금액" value="${displayAmt}" class="credit-amt w-32 sm:w-40 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-right font-bold">
        <button onclick="removeRow('${rowId}')" class="text-slate-400 hover:text-rose-500 p-2 font-bold transition">×</button>
    `;
    container.appendChild(div);
    const accInput = div.querySelector('.credit-acc');
    attachKoreanInputEvents(accInput);
    attachAutoCompleteEvents(div, 'credit');
    if (autoFocus && accInput) {
        setTimeout(() => { accInput.focus(); accInput.select(); }, 100);
    }
    updateJournalBalanceSummary();
}

function removeRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        const parent = row.parentNode;
        if (parent.children.length > 1) { row.remove(); } 
        else {
            const inputs = row.querySelectorAll('input');
            if(inputs[0]) inputs[0].value = '';
            if(inputs[1]) inputs[1].value = '';
        }
        updateJournalBalanceSummary();
    }
}

let unusedProblemIds = [];
function loadRandomProblem() {
    isJournalJumped = false;
    const activeProblemIds = isWrongQuizMode ? wrongJournalProblemIds : problemIds;
    if (!activeProblemIds || activeProblemIds.length === 0) {
        if (isWrongQuizMode) {
            alert("오답노트에 남은 문제가 없습니다! 모두 맞히셨습니다 🎉");
            resetJournalQuiz();
            return;
        }
        return;
    }

    if (isWrongQuizMode) {
        if (unusedProblemIds.length === 0) {
            unusedProblemIds = [...wrongJournalProblemIds];
        }
        currentProblemId = unusedProblemIds.splice(Math.floor(Math.random() * unusedProblemIds.length), 1)[0];
    } else {
        if (typeof pickSmartRandomProblem === 'function') {
            currentProblemId = pickSmartRandomProblem({
                unusedIds: unusedProblemIds,
                allIds: problemIds,
                problemsMap: problemsMap,
                recentIdHistory: recentJournalHistory,
                recentCategoryHistory: (typeof recentJournalCategoryHistory !== 'undefined') ? recentJournalCategoryHistory : [],
                adjacentRange: 15
            });
        } else {
            if (unusedProblemIds.length === 0) unusedProblemIds = [...problemIds];
            currentProblemId = unusedProblemIds.splice(Math.floor(Math.random() * unusedProblemIds.length), 1)[0];
        }
    }

    addToRecentJournalHistory(currentProblemId);
    renderCurrentProblem();
}

function retryProblem() {
    renderCurrentProblem();
}

function renderCurrentProblem() {
    const probObj = problemsMap.get(currentProblemId);
    const questionText = typeof probObj === 'object' ? probObj.text : probObj;
    const diff = (typeof probObj === 'object' && probObj.difficulty) ? probObj.difficulty : '';
    const category = (typeof probObj === 'object' && probObj.category) ? probObj.category : '';

    document.getElementById('problem-text').innerText = questionText;
    
    if (isWrongQuizMode) {
        document.getElementById('question-badge').innerText = `📌 오답복습 #${currentProblemId}`;
    } else {
        document.getElementById('question-badge').innerText = `문제 #${currentProblemId}`;
    }

    const catBadge = document.getElementById('journal-category-badge');
    if (catBadge) {
        if (category) {
            catBadge.innerText = `🏷️ ${category}`;
            catBadge.classList.remove('hidden');
        } else {
            catBadge.classList.add('hidden');
        }
    }

    const diffBadge = document.getElementById('journal-difficulty-badge');
    if (diffBadge) {
        if (diff) {
            diffBadge.innerText = `⚡ 난이도: ${diff}`;
            diffBadge.classList.remove('hidden');
        } else {
            diffBadge.classList.add('hidden');
        }
    }

    isJournalStatRecorded = false;
    const accBadge = document.getElementById('journal-accuracy-badge');
    if (accBadge) {
        accBadge.innerText = '🎯 정답률: 조회 중...';
        const statType = typeof getQuizKey === 'function' ? getQuizKey('journal', currentQuizLevel) : 'journal_2';
        fetch(`?action=question_stats_get&type=${statType}&id=${currentProblemId}`)
            .then(res => res.json())
            .then(data => {
                const rateText = (data.rate === undefined || data.rate === '-') ? '-%' : `${data.rate}%`;
                accBadge.innerText = `🎯 정답률: ${rateText}`;
            })
            .catch(() => { accBadge.innerText = `🎯 정답률: -%`; });
    }

    document.getElementById('debit-rows-container').innerHTML = '';
    document.getElementById('credit-rows-container').innerHTML = '';

    addDebitRow();
    addCreditRow();

    document.getElementById('quiz-screen').classList.remove('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    updateJournalBalanceSummary();

    setTimeout(() => {
        const firstDebitAcc = document.querySelector('#debit-rows-container .debit-acc');
        if (firstDebitAcc) firstDebitAcc.focus();
    }, 100);
}

function submitAnswer() {
    const debitRows = document.querySelectorAll('#debit-rows-container > div');
    const userDebits = [];
    for (let row of debitRows) {
        const acc = row.querySelector('.debit-acc').value.trim();
        const amtStr = row.querySelector('.debit-amt').value.replace(/,/g, '');
        const amt = Number(amtStr);
        if (acc || amt > 0) { userDebits.push({ account: acc, amount: amt }); }
    }

    const creditRows = document.querySelectorAll('#credit-rows-container > div');
    const userCredits = [];
    for (let row of creditRows) {
        const acc = row.querySelector('.credit-acc').value.trim();
        const amtStr = row.querySelector('.credit-amt').value.replace(/,/g, '');
        const amt = Number(amtStr);
        if (acc || amt > 0) { userCredits.push({ account: acc, amount: amt }); }
    }

    if (userDebits.length === 0 && userCredits.length === 0) {
        alert('차변이나 대변에 계정과 금액을 입력해주세요!');
        return;
    }

    const correctAnswerObj = answersMap.get(currentProblemId);
    let isCorrect = false;
    
    if (correctAnswerObj) {
        const isDebitMatch = compareEntries(userDebits, correctAnswerObj.debit);
        const isCreditMatch = compareEntries(userCredits, correctAnswerObj.credit);
        isCorrect = isDebitMatch && isCreditMatch;
    }

    const resultIcon = document.getElementById('result-icon');
    const resultTitle = document.getElementById('result-title');
    const resultDesc = document.getElementById('result-desc');
    const correctAnswerDisplay = document.getElementById('correct-answer-display');
    const explanationText = document.getElementById('explanation-text');
    const retryBtn = document.getElementById('retry-btn');

    const userAnswerDisplayBox = document.getElementById('user-answer-display-box');
    const userAnswerDisplay = document.getElementById('user-answer-display');

    if (!isJournalStatRecorded) {
        recordQuestionStat('journal', currentProblemId, isCorrect);
        isJournalStatRecorded = true;
    }

    // 오답노트 동기화 (틀리면 추가, 오답풀이 모드에서 맞히면 삭제)
    if (typeof recordWrongNote === 'function') {
        recordWrongNote('journal', currentQuizLevel, currentProblemId, isCorrect, isWrongQuizMode).then(res => {
            if (isWrongQuizMode && isCorrect && res && res.removed) {
                // 오답 목록에서도 제외
                wrongJournalProblemIds = wrongJournalProblemIds.filter(id => id !== currentProblemId);
                resultDesc.innerText = `오답 노트 탈출 성공! 🎉 (남은 오답: ${res.remaining}개)`;
            }
        });
    }

    if (isCorrect) {
        if (!isJournalJumped) {
            streakCount++;
            if (typeof saveUserStreak === 'function') {
                saveUserStreak('journal', currentQuizLevel, streakCount);
            }
            checkAndSaveHighScore('journal', streakCount);
        }

        resultIcon.innerText = '🎉';
        resultTitle.innerText = '정답입니다!';
        resultTitle.className = 'text-xl font-bold text-emerald-600 mb-1';
        if (!isWrongQuizMode) {
            resultDesc.innerText = '완벽하게 올바른 분계입니다. 계속해서 도전해보세요!';
        }
        userAnswerDisplayBox.classList.add('hidden');
        if (retryBtn) retryBtn.classList.add('hidden'); 
    } else {
        streakCount = 0;
        if (typeof saveUserStreak === 'function') {
            saveUserStreak('journal', currentQuizLevel, 0);
        }
        resultIcon.innerText = '💧';
        resultTitle.innerText = '아쉽네요, 오답입니다.';
        resultTitle.className = 'text-xl font-bold text-rose-500 mb-1';
        resultDesc.innerText = '오답 노트에 자동 저장되었습니다. 해설을 꼼꼼히 확인해 보세요.';

        userAnswerDisplayBox.classList.remove('hidden');
        if (retryBtn) retryBtn.classList.remove('hidden'); 

        let userHtml = '';
        if (userDebits.length > 0) {
            userDebits.forEach(d => {
                userHtml += `<div>차변) <span class="font-semibold text-sky-800">${d.account || '(미입력)'}</span> : ${d.amount ? d.amount.toLocaleString() + '원' : '0원'}</div>`;
            });
        } else {
            userHtml += `<div class="text-slate-400">차변) 입력 안 함</div>`;
        }

        if (userCredits.length > 0) {
            userCredits.forEach(c => {
                userHtml += `<div>대변) <span class="font-semibold text-purple-800">${c.account || '(미입력)'}</span> : ${c.amount ? c.amount.toLocaleString() + '원' : '0원'}</div>`;
            });
        } else {
            userHtml += `<div class="text-slate-400">대변) 입력 안 함</div>`;
        }
        userAnswerDisplay.innerHTML = userHtml;
    }

    document.querySelector('#score-tracker strong').innerText = streakCount;

    let correctHtml = `<div class="font-bold text-slate-500 mb-1">[엑셀 시트 정답 기준]</div>`;
    correctHtml += `<div class="pl-2 space-y-0.5">`;
    if (correctAnswerObj) {
        correctAnswerObj.debit.filter(d => d.amount > 0 || d.account).forEach(d => {
            correctHtml += `<div>차변) <span class="text-sky-700 font-bold">${d.account}</span> : ${d.amount ? d.amount.toLocaleString() + '원' : ''}</div>`;
        });
        correctAnswerObj.credit.filter(c => c.amount > 0 || c.account).forEach(c => {
            correctHtml += `<div>대변) <span class="text-purple-700 font-bold">${c.account}</span> : ${c.amount ? c.amount.toLocaleString() + '원' : ''}</div>`;
        });
        explanationText.innerText = (correctAnswerObj.explanation.trim() !== '') ? correctAnswerObj.explanation : '추가 해설이 없습니다.';
    } else {
        correctHtml += `<div><span class="text-rose-500">주의:</span> 해당 문제 번호(${currentProblemId})에 대한 정답 데이터가 [정답및해설] 시트에 없습니다!</div>`;
        explanationText.innerText = "해설 데이터를 찾을 수 없습니다.";
    }
    correctHtml += `</div>`;
    correctAnswerDisplay.innerHTML = correctHtml;

    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
}

function compareEntries(userList, targetList) {
    const validTargets = targetList.filter(t => t.account !== '' && t.amount > 0);
    const validUsers = userList.filter(u => u.account !== '' && u.amount > 0);

    if (validTargets.length === 0 && validUsers.length === 0) return true;
    if (validUsers.length !== validTargets.length) return false;
    
    const matchedTarget = new Array(validTargets.length).fill(false);
    
    for (let userItem of validUsers) {
        let foundIndex = -1;
        for (let i = 0; i < validTargets.length; i++) {
            if (!matchedTarget[i]) {
                let targetAcc = validTargets[i].account.replace(/\s+/g, '');
                let userAcc = userItem.account.replace(/\s+/g, '');
                let accMatch = (targetAcc === userAcc) || targetAcc.includes(userAcc) || userAcc.includes(targetAcc);
                let amtMatch = (validTargets[i].amount === userItem.amount);
                if (accMatch && amtMatch) {
                    foundIndex = i;
                    break;
                }
            }
        }
        if (foundIndex === -1) return false;
        matchedTarget[foundIndex] = true;
    }
    return true;
}

function nextProblem() {
    loadRandomProblem();
}

// 키보드 단축키 등록
document.addEventListener('keydown', (e) => {
    const journalContainer = document.getElementById('journal-quiz-container');
    if (!journalContainer || journalContainer.classList.contains('hidden')) {
        return;
    }

    // 결과 화면(result-screen)이 열려있을 때 단축키
    const resultScreen = document.getElementById('result-screen');
    if (resultScreen && !resultScreen.classList.contains('hidden')) {
        // Space 키 -> 다음 문제 풀기 (Enter 연타 방지)
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            nextProblem();
            return;
        }
        // Home 키 -> 처음으로
        if (e.key === 'Home') {
            e.preventDefault();
            resetJournalQuiz();
            return;
        }
        // Backspace 키 -> 다시 풀기
        if (e.key === 'Backspace') {
            e.preventDefault();
            retryProblem();
            return;
        }
        return;
    }

    // 분개 퀴즈 화면이 표시 중일 때만 동작
    const quizScreen = document.getElementById('quiz-screen');
    if (!quizScreen || quizScreen.classList.contains('hidden')) {
        return;
    }

    // 문제번호 점프 입력창 등 다른 입력창에 포커스가 있는 경우 제외
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.closest('#calculator-widget'))) {
        return;
    }

    // '*' 키 (NumpadMultiply 또는 Shift+8) -> 차변 줄 추가
    if (e.key === '*' || e.code === 'NumpadMultiply') {
        e.preventDefault();
        addDebitRow('', '', true);
        return;
    }

    // '/' 키 (NumpadDivide 또는 슬래시 키) -> 대변 줄 추가
    if (e.key === '/' || e.code === 'NumpadDivide') {
        e.preventDefault();
        addCreditRow('', '', true);
        return;
    }

    // '-' 키 (NumpadSubtract 또는 마이너스 키) -> 반대편 합계/차액 자동 채우기
    if (e.key === '-' || e.key === 'Subtract' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        fillAutoBalance(activeEl);
        return;
    }

    // Ctrl + Z 키 -> 현재 포커스된 줄(또는 마지막 줄) 삭제
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        
        let targetRow = activeEl ? activeEl.closest('#debit-rows-container > div, #credit-rows-container > div') : null;

        if (!targetRow) {
            const creditRows = document.querySelectorAll('#credit-rows-container > div');
            const debitRows = document.querySelectorAll('#debit-rows-container > div');
            if (creditRows.length > 1) {
                targetRow = creditRows[creditRows.length - 1];
            } else if (debitRows.length > 1) {
                targetRow = debitRows[debitRows.length - 1];
            } else if (creditRows.length === 1) {
                targetRow = creditRows[0];
            } else if (debitRows.length === 1) {
                targetRow = debitRows[0];
            }
        }

        if (targetRow) {
            const parent = targetRow.parentNode;
            const prevRow = targetRow.previousElementSibling;
            
            if (parent && parent.children.length > 1) {
                targetRow.remove();
                if (prevRow) {
                    const accInput = prevRow.querySelector('input');
                    if (accInput) setTimeout(() => { accInput.focus(); accInput.select(); }, 20);
                }
            } else {
                const inputs = targetRow.querySelectorAll('input');
                inputs.forEach(input => input.value = '');
                const accInput = targetRow.querySelector('input');
                if (accInput) setTimeout(() => { accInput.focus(); }, 20);
            }
            updateJournalBalanceSummary();
        }
        return;
    }
});
