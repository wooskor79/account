let calcValue = '0';
let calcFirstOperand = null;
let calcWaitingForSecondOperand = false;
let calcOperator = null;
let calcMemory = []; // 최근 기억 4개 저장 배열

function toggleCalculator() {
    const calcWidget = document.getElementById('calculator-widget');
    if (calcWidget.classList.contains('hidden')) {
        calcWidget.classList.remove('hidden');
    } else {
        calcWidget.classList.add('hidden');
    }
}

function toggleCalcMemory() {
    const memPanel = document.getElementById('calc-memory-panel');
    if (memPanel) {
        memPanel.classList.toggle('hidden');
    }
}

// 숫자를 3자리마다 콤마(,)가 포함된 문자열로 변환하는 함수
function formatCalcDisplayValue(numStr) {
    if (!numStr) return '0';
    const parts = String(numStr).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

function updateCalcDisplay() {
    const display = document.getElementById('calc-display');
    if (display) display.innerText = formatCalcDisplayValue(calcValue);
}

function updateCalcMemoryDisplay() {
    const countEl = document.getElementById('calc-mem-count');
    if (countEl) countEl.innerText = `(${calcMemory.length})`;

    const listEl = document.getElementById('calc-memory-list');
    if (!listEl) return;

    if (calcMemory.length === 0) {
        listEl.innerHTML = `<div class="calc-mem-empty">기억된 숫자가 없습니다.</div>`;
        return;
    }

    let html = '';
    calcMemory.forEach((val, idx) => {
        let displayVal = formatCalcDisplayValue(val);
        html += `<div class="calc-mem-item" onclick="useCalcMemory('${val}')">
                    <span class="calc-mem-idx">#${idx + 1}</span>
                    <span class="calc-mem-val">${displayVal}</span>
                 </div>`;
    });
    listEl.innerHTML = html;
}

function saveToCalcMemory(numVal) {
    if (isNaN(numVal)) return;
    calcMemory.unshift(numVal);
    if (calcMemory.length > 4) {
        calcMemory = calcMemory.slice(0, 4);
    }
    updateCalcMemoryDisplay();
}

function clearCalcMemory() {
    calcMemory = [];
    updateCalcMemoryDisplay();
}

function useCalcMemory(val) {
    calcValue = `${val}`;
    calcWaitingForSecondOperand = false;
    updateCalcDisplay();
}

function calcInput(digit) {
    if (['+', '-', '*', '/'].includes(digit)) {
        handleCalcOperator(digit);
        return;
    }

    if (digit === '.') {
        if (!calcValue.includes('.')) {
            calcValue += '.';
        }
        updateCalcDisplay();
        return;
    }

    if (digit === '00' || digit === '000') {
        if (calcWaitingForSecondOperand) {
            calcValue = '0';
            calcWaitingForSecondOperand = false;
        } else if (calcValue !== '0') {
            calcValue += digit;
        }
        updateCalcDisplay();
        return;
    }

    if (calcWaitingForSecondOperand) {
        calcValue = digit;
        calcWaitingForSecondOperand = false;
    } else {
        calcValue = calcValue === '0' ? digit : calcValue + digit;
    }
    updateCalcDisplay();
}

function handleCalcOperator(nextOperator) {
    const inputValue = parseFloat(calcValue);

    if (calcOperator && calcWaitingForSecondOperand) {
        calcOperator = nextOperator; 
        return;
    }

    if (calcFirstOperand == null && !isNaN(inputValue)) {
        calcFirstOperand = inputValue;
    } else if (calcOperator) {
        const result = calcCalculateResult(calcFirstOperand, inputValue, calcOperator);
        calcValue = `${parseFloat(result.toFixed(7))}`;
        calcFirstOperand = result;
        saveToCalcMemory(result);
    }

    calcWaitingForSecondOperand = true;
    calcOperator = nextOperator;
    updateCalcDisplay();
}

function calcCalculateResult(firstOperand, secondOperand, operator) {
    if (operator === '+') return firstOperand + secondOperand;
    if (operator === '-') return firstOperand - secondOperand;
    if (operator === '*') return firstOperand * secondOperand;
    if (operator === '/') return firstOperand / secondOperand;
    return secondOperand;
}

function calcCalculate() {
    if (calcOperator && !calcWaitingForSecondOperand) {
        const inputValue = parseFloat(calcValue);
        const result = calcCalculateResult(calcFirstOperand, inputValue, calcOperator);
        calcValue = `${parseFloat(result.toFixed(7))}`;
        saveToCalcMemory(result);
        calcFirstOperand = null; 
        calcOperator = null; 
        calcWaitingForSecondOperand = true; 
        updateCalcDisplay();
    }
}

function calcClear() {
    calcValue = '0';
    calcFirstOperand = null;
    calcWaitingForSecondOperand = false;
    calcOperator = null;
    updateCalcDisplay();
}

let calcIsDragging = false;
let calcStartX, calcStartY, calcInitialLeft, calcInitialTop;

document.addEventListener('DOMContentLoaded', () => {
    fetchHighScores();
    
    const calcHeader = document.getElementById('calc-header');
    const calcWidget = document.getElementById('calculator-widget');
    
    if (calcHeader && calcWidget) {
        calcHeader.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            calcIsDragging = true;
            calcStartX = e.clientX;
            calcStartY = e.clientY;
            
            const rect = calcWidget.getBoundingClientRect();
            calcInitialLeft = rect.left;
            calcInitialTop = rect.top;
            
            calcWidget.style.right = 'auto';
            calcWidget.style.bottom = 'auto';
            calcWidget.style.left = calcInitialLeft + 'px';
            calcWidget.style.top = calcInitialTop + 'px';
            calcWidget.style.transform = 'none';
            
            document.addEventListener('mousemove', calcDrag);
            document.addEventListener('mouseup', calcStopDrag);
        });
    }
});

function calcDrag(e) {
    if (!calcIsDragging) return;
    const calcWidget = document.getElementById('calculator-widget');
    calcWidget.style.left = (calcInitialLeft + (e.clientX - calcStartX)) + 'px';
    calcWidget.style.top = (calcInitialTop + (e.clientY - calcStartY)) + 'px';
}

function calcStopDrag() {
    calcIsDragging = false;
    document.removeEventListener('mousemove', calcDrag);
    document.removeEventListener('mouseup', calcStopDrag);
}

function jumpToJournalProblem() {
    const input = document.getElementById('journal-jump-input');
    if (!input || !input.value.trim()) {
        alert('이동할 분개 문제 번호를 입력해주세요.');
        return;
    }
    const targetId = input.value.trim();
    if (problemsMap.has(targetId)) {
        currentProblemId = targetId;
        isJournalJumped = true;
        addToRecentJournalHistory(currentProblemId);
        const uIdx = unusedProblemIds.indexOf(targetId);
        if (uIdx !== -1) unusedProblemIds.splice(uIdx, 1);

        document.getElementById('start-screen').classList.add('hidden');
        renderCurrentProblem();
        input.value = '';
    } else {
        alert(`분개문제 #${targetId}번을 찾을 수 없습니다. (불러온 문제 수: ${problemIds.length}개)`);
    }
}

function jumpToTheoryProblem() {
    const input = document.getElementById('theory-jump-input');
    if (!input || !input.value.trim()) {
        alert('이동할 필기 문제 번호를 입력해주세요.');
        return;
    }
    const targetId = input.value.trim();
    if (theoryProblemsMap.has(targetId)) {
        currentTheoryId = targetId;
        isTheoryJumped = true;
        addToRecentTheoryHistory(currentTheoryId);
        const uIdx = unusedTheoryIds.indexOf(targetId);
        if (uIdx !== -1) unusedTheoryIds.splice(uIdx, 1);

        document.getElementById('theory-start-screen').classList.add('hidden');
        renderCurrentTheoryProblem();
        input.value = '';
    } else {
        alert(`필기문제 #${targetId}번을 찾을 수 없습니다. (불러온 문제 수: ${theoryProblemIds.length}개)`);
    }
}