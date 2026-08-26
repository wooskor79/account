importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');

self.onmessage = function(e) {
    const { data, type, fileKey } = e.data;
    try {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;

        if (type === 'journal') {
            let probSheetName = sheetNames.find(s => s.trim() === '문제') || sheetNames.find(s => s.includes('문제')) || sheetNames[0];
            let ansSheetName = sheetNames.find(s => s.replace(/\s+/g, '') === '정답및해설') || sheetNames.find(s => s.includes('정답') || s.includes('해설')) || sheetNames[1];

            const probRows = XLSX.utils.sheet_to_json(workbook.Sheets[probSheetName], { header: 1 });
            const ansRows = XLSX.utils.sheet_to_json(workbook.Sheets[ansSheetName], { header: 1 });

            let problemsMapArr = [];
            let answersMapArr = [];
            let problemIds = [];
            let dynamicAccountsSet = new Set();

            let probHeader = probRows[0] || [];
            let probIdColIdx = probHeader.findIndex(h => h && /문제|번호|no/i.test(String(h).trim()));
            if (probIdColIdx === -1) probIdColIdx = 0;
            let probTextColIdx = probHeader.findIndex(h => h && String(h).trim() === '문제');
            if (probTextColIdx === -1) probTextColIdx = 1;
            let catColIdx = probHeader.findIndex(h => h && String(h).trim() === '유형');
            let diffColIdx = probHeader.findIndex(h => h && String(h).trim() === '난이도');
            if (diffColIdx === -1) diffColIdx = 8;

            let lastProbId = null;
            for (let i = 1; i < probRows.length; i++) {
                let row = probRows[i];
                if (!row || row.length === 0) continue;
                
                let idStr = String(row[probIdColIdx] || '').replace(/[^0-9]/g, '');
                let id = idStr ? idStr : lastProbId;
                if (!id) continue;
                lastProbId = id;

                let text = String(row[probTextColIdx] || '').trim();
                if (text && text.length > 5) {
                    let diff = (diffColIdx !== -1 && row[diffColIdx] !== undefined && row[diffColIdx] !== null) ? String(row[diffColIdx]).trim() : '';
                    let cat = (catColIdx !== -1 && row[catColIdx] !== undefined && row[catColIdx] !== null) ? String(row[catColIdx]).trim() : '일반분개';
                    problemsMapArr.push([id, { text: text, difficulty: diff, category: cat }]);
                    if (!problemIds.includes(id)) problemIds.push(id);
                }
            }

            let ansHeader = ansRows[0] || [];
            let ansIdColIdx = ansHeader.findIndex(h => h && /문제|번호|no/i.test(String(h).trim()));
            if (ansIdColIdx === -1) ansIdColIdx = 0;

            let debitAccColIdx = ansHeader.findIndex(h => h && (String(h).replace(/\s+/g, '').includes('차변계정') || String(h).replace(/\s+/g, '') === '차변'));
            let debitAmtColIdx = ansHeader.findIndex(h => h && (String(h).replace(/\s+/g, '').includes('차변금액') || String(h).replace(/\s+/g, '') === '차변금'));
            let creditAccColIdx = ansHeader.findIndex(h => h && (String(h).replace(/\s+/g, '').includes('대변계정') || String(h).replace(/\s+/g, '') === '대변'));
            let creditAmtColIdx = ansHeader.findIndex(h => h && (String(h).replace(/\s+/g, '').includes('대변금액') || String(h).replace(/\s+/g, '') === '대변금'));
            let expColIdx = ansHeader.findIndex(h => h && (String(h).replace(/\s+/g, '').includes('해설') || String(h).replace(/\s+/g, '').includes('설명')));

            if (debitAccColIdx === -1) debitAccColIdx = 1;
            if (debitAmtColIdx === -1) debitAmtColIdx = debitAccColIdx + 1;
            if (creditAccColIdx === -1) creditAccColIdx = debitAmtColIdx + 1;
            if (creditAmtColIdx === -1) creditAmtColIdx = creditAccColIdx + 1;
            if (expColIdx === -1) expColIdx = creditAmtColIdx + 1;

            let lastAnsId = null;
            let tempAnswers = {};

            for (let i = 1; i < ansRows.length; i++) {
                let row = ansRows[i];
                if (!row || row.length === 0) continue;

                let idStr = String(row[ansIdColIdx] || '').replace(/[^0-9]/g, '');
                let isNewId = !!idStr && idStr !== lastAnsId;
                let id = isNewId ? idStr : lastAnsId;
                if (!id) continue;

                if (isNewId) {
                    lastAnsId = id;
                }

                if (!tempAnswers[id]) {
                    tempAnswers[id] = { debit: [], credit: [], explanation: '' };
                }
                
                let ansObj = tempAnswers[id];

                let rawDebitAcc = (debitAccColIdx !== -1 && row[debitAccColIdx] !== undefined) ? String(row[debitAccColIdx]).trim() : '';
                let rawDebitAmt = (debitAmtColIdx !== -1 && row[debitAmtColIdx] !== undefined) ? String(row[debitAmtColIdx]).trim() : '';
                let rawCreditAcc = (creditAccColIdx !== -1 && row[creditAccColIdx] !== undefined) ? String(row[creditAccColIdx]).trim() : '';
                let rawCreditAmt = (creditAmtColIdx !== -1 && row[creditAmtColIdx] !== undefined) ? String(row[creditAmtColIdx]).trim() : '';
                let rawExp = (expColIdx !== -1 && row[expColIdx] !== undefined) ? String(row[expColIdx]).trim() : '';

                if (rawDebitAcc) {
                    let accList = rawDebitAcc.split('\n').map(s => s.trim()).filter(Boolean);
                    let amtList = rawDebitAmt.split('\n').map(s => s.trim()).filter(Boolean);
                    accList.forEach((acc, idx) => {
                        let amtStr = (amtList[idx] || '0').replace(/[,원\s]/g, '');
                        let amtNum = Math.round(Number(amtStr)) || 0;
                        ansObj.debit.push({ account: acc, amount: amtNum });
                        if (acc) dynamicAccountsSet.add(acc);
                    });
                }

                if (rawCreditAcc) {
                    let accList = rawCreditAcc.split('\n').map(s => s.trim()).filter(Boolean);
                    let amtList = rawCreditAmt.split('\n').map(s => s.trim()).filter(Boolean);
                    accList.forEach((acc, idx) => {
                        let amtStr = (amtList[idx] || '0').replace(/[,원\s]/g, '');
                        let amtNum = Math.round(Number(amtStr)) || 0;
                        ansObj.credit.push({ account: acc, amount: amtNum });
                        if (acc) dynamicAccountsSet.add(acc);
                    });
                }

                if (rawExp && !ansObj.explanation.includes(rawExp)) {
                    ansObj.explanation += (ansObj.explanation ? ' ' : '') + rawExp;
                }
            }

            for (let id in tempAnswers) {
                answersMapArr.push([id, tempAnswers[id]]);
            }

            self.postMessage({
                success: true,
                type: 'journal',
                fileKey: fileKey || '',
                problemsMapArr,
                answersMapArr,
                problemIds,
                dynamicAccounts: Array.from(dynamicAccountsSet)
            });

        } else if (type === 'theory') {
            let probSheetName = sheetNames.find(s => s.includes('문제')) || sheetNames[0];
            let ansSheetName = sheetNames.find(s => s.includes('정답') || s.includes('해설')) || (sheetNames.length > 1 ? sheetNames[1] : sheetNames[0]);

            let probSheet = workbook.Sheets[probSheetName] || workbook.Sheets[sheetNames[0]];
            let ansSheet = workbook.Sheets[ansSheetName] || (sheetNames.length > 1 ? workbook.Sheets[sheetNames[1]] : probSheet);

            const probRows = XLSX.utils.sheet_to_json(probSheet, { header: 1 });
            const ansRows = ansSheet ? XLSX.utils.sheet_to_json(ansSheet, { header: 1 }) : [];

            let theoryProblemsMapArr = [];
            let theoryAnswersMapArr = [];
            let theoryProblemIds = [];

            let probHeader = probRows[0] || [];
            let probIdColIdx = probHeader.findIndex(h => h && /문제|번호|no/i.test(String(h).trim()));
            if (probIdColIdx === -1) probIdColIdx = 0;
            let probTextColIdx = probHeader.findIndex(h => h && String(h).trim() === '문제');
            if (probTextColIdx === -1) probTextColIdx = 1;

            let choice1Idx = probHeader.findIndex(h => h && String(h).replace(/\s+/g, '').includes('보기1'));
            let choice2Idx = probHeader.findIndex(h => h && String(h).replace(/\s+/g, '').includes('보기2'));
            let choice3Idx = probHeader.findIndex(h => h && String(h).replace(/\s+/g, '').includes('보기3'));
            let choice4Idx = probHeader.findIndex(h => h && String(h).replace(/\s+/g, '').includes('보기4'));

            if (choice1Idx === -1) choice1Idx = 2;
            if (choice2Idx === -1) choice2Idx = 3;
            if (choice3Idx === -1) choice3Idx = 4;
            if (choice4Idx === -1) choice4Idx = 5;

            let catColIdx = probHeader.findIndex(h => h && String(h).trim() === '유형');
            let diffColIdx = probHeader.findIndex(h => h && String(h).trim() === '난이도');
            if (diffColIdx === -1) diffColIdx = 6;

            let lastProbId = null;
            for (let i = 1; i < probRows.length; i++) {
                let row = probRows[i];
                if (!row || row.length === 0) continue;
                
                let idStr = String(row[probIdColIdx] || '').replace(/[^0-9]/g, '');
                let id = idStr ? idStr : lastProbId;
                if (!id) continue;
                lastProbId = id;

                let text = String(row[probTextColIdx] || '').trim();
                if (text) {
                    let choices = [
                        choice1Idx !== -1 && row[choice1Idx] !== undefined && row[choice1Idx] !== null ? String(row[choice1Idx]).trim() : '',
                        choice2Idx !== -1 && row[choice2Idx] !== undefined && row[choice2Idx] !== null ? String(row[choice2Idx]).trim() : '',
                        choice3Idx !== -1 && row[choice3Idx] !== undefined && row[choice3Idx] !== null ? String(row[choice3Idx]).trim() : '',
                        choice4Idx !== -1 && row[choice4Idx] !== undefined && row[choice4Idx] !== null ? String(row[choice4Idx]).trim() : ''
                    ];
                    let diff = (diffColIdx !== -1 && row[diffColIdx] !== undefined && row[diffColIdx] !== null) ? String(row[diffColIdx]).trim() : '';
                    let cat = (catColIdx !== -1 && row[catColIdx] !== undefined && row[catColIdx] !== null) ? String(row[catColIdx]).trim() : '회계이론';
                    theoryProblemsMapArr.push([id, { text, choices, difficulty: diff, category: cat }]);
                    if (!theoryProblemIds.includes(id)) theoryProblemIds.push(id);
                }
            }

            let ansHeader = ansRows[0] || [];
            let ansIdColIdx = ansHeader.findIndex(h => h && /문제|번호|no/i.test(String(h).trim()));
            if (ansIdColIdx === -1) ansIdColIdx = 0;

            let ansColIdx = ansHeader.findIndex(h => h && (String(h).replace(/\s+/g, '').includes('정답') || String(h).replace(/\s+/g, '') === '답'));
            let expColIdx = ansHeader.findIndex(h => h && (String(h).replace(/\s+/g, '').includes('해설') || String(h).replace(/\s+/g, '').includes('설명')));

            if (ansColIdx === -1) ansColIdx = 1;
            if (expColIdx === -1) expColIdx = 2;

            let lastAnsId = null;
            let tempTheoryAnswers = {};

            for (let i = 1; i < ansRows.length; i++) {
                let row = ansRows[i];
                if (!row || row.length === 0) continue;

                let idStr = String(row[ansIdColIdx] || '').replace(/[^0-9]/g, '');
                let isNewId = !!idStr && idStr !== lastAnsId;
                let id = isNewId ? idStr : lastAnsId;
                if (!id) continue;

                if (isNewId) {
                    lastAnsId = id;
                }

                if (!tempTheoryAnswers[id]) {
                    tempTheoryAnswers[id] = { answer: '', explanation: '' };
                }
                
                let ansObj = tempTheoryAnswers[id];

                let ansVal = (ansColIdx !== -1 && row[ansColIdx] !== undefined && row[ansColIdx] !== null) ? String(row[ansColIdx]).trim().replace(/[^0-9]/g, '') : '';
                let expVal = (expColIdx !== -1 && row[expColIdx] !== undefined && row[expColIdx] !== null) ? String(row[expColIdx]).trim() : '';

                if (ansVal) {
                    let intVal = parseInt(ansVal, 10);
                    if (intVal >= 1 && intVal <= 4) ansObj.answer = String(intVal);
                }

                if (expVal && !ansObj.explanation.includes(expVal)) {
                    ansObj.explanation += (ansObj.explanation ? ' ' : '') + expVal;
                }
            }
            
            for (let id in tempTheoryAnswers) {
                theoryAnswersMapArr.push([id, tempTheoryAnswers[id]]);
            }

            self.postMessage({
                success: true,
                type: 'theory',
                fileKey: fileKey || '',
                theoryProblemsMapArr,
                theoryAnswersMapArr,
                theoryProblemIds
            });
        }
    } catch (error) {
        self.postMessage({ success: false, error: error.message, type, fileKey: fileKey || '' });
    }
};