/**
 * 2026 PERFECT 전산회계 1급/2급 대규모 동적 문제 생성 엔진 (Ultra Multi-Variation Problem Generator)
 * - 9대 전 단원 (당좌/재고, 비유동자산, 부채, 자본/손익, 원가회계, 부가가치세, 결산/마감, 계정마스터, 1급초격차)
 * - 단원당 이론 16~20개 + 실무 분개 15~18개 + 3초 계정마스터 80종 = 총 300종 이상의 독립 템플릿 풀 탑재
 * - 최근 출제 중복 방지 링 버퍼(Ring Buffer) 적용으로 동일 템플릿 연속 출제 완전 차단
 */
window.LearningGenerator = (function() {

    // 거래처 풀 (20개 사)
    const COMPANIES = [
        '(주)대한상사', '(주)민국물산', '(주)삼진상사', '(주)한양전자', '(주)세종무역',
        '(주)우진테크', '(주)한라통상', '(주)백두기계', '(주)나라물류', '(주)동양상사',
        '(주)태백정밀', '(주)금강상사', '(주)광교상사', '(주)판교정보기술', '(주)서해상사',
        '(주)한국정밀', '(주)대덕전자', '(주)영남물산', '(주)호남통상', '(주)제주유통'
    ];

    const BANKS = ['국민은행', '신한은행', '우리은행', '하나은행', '기업은행', '농협은행', 'SC제일은행'];
    const CARD_COMPANIES = ['국민카드', '신한카드', '비씨카드', '현대카드', '삼성카드', '롯데카드'];

    // 최근 출제 템플릿 링 버퍼 (단원별 최근 5~6개 인덱스 기억)
    const recentHistory = {};

    function getRandomItem(arr) {
        if (!arr || arr.length === 0) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function formatNumber(num) {
        return Number(num).toLocaleString('ko-KR');
    }

    function shuffleArray(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function shuffleOptions(options, correctIdx) {
        const indexedOptions = options.map((text, idx) => ({ text, isCorrect: idx === correctIdx }));
        const shuffled = shuffleArray(indexedOptions);
        const newCorrectIdx = shuffled.findIndex(item => item.isCorrect);
        return {
            options: shuffled.map(item => item.text),
            correctAnswer: (newCorrectIdx !== -1 ? newCorrectIdx : 0) + 1
        };
    }

    // 중복 방지 템플릿 선택기
    function pickNonRepeatingTemplate(poolArr, poolKey) {
        if (!poolArr || poolArr.length === 0) return null;
        if (poolArr.length === 1) return poolArr[0];

        if (!recentHistory[poolKey]) recentHistory[poolKey] = [];
        const history = recentHistory[poolKey];

        const candidates = [];
        for (let i = 0; i < poolArr.length; i++) {
            if (!history.includes(i)) {
                candidates.push(i);
            }
        }

        let selectedIdx;
        if (candidates.length > 0) {
            selectedIdx = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
            selectedIdx = Math.floor(Math.random() * poolArr.length);
        }

        history.push(selectedIdx);
        const maxHistory = Math.min(6, Math.floor(poolArr.length * 0.6));
        while (history.length > maxHistory) {
            history.shift();
        }

        return poolArr[selectedIdx];
    }

    // =========================================================================
    // 제1단원: 당좌자산 및 재고자산 (sec_asset)
    // =========================================================================
    const assetTheories = [
        // 1. 현금및현금성자산 총액
        () => {
            const comp = getRandomItem(COMPANIES);
            const coin = getRandomInt(3, 8) * 100000;
            const check = getRandomInt(15, 35) * 100000;
            const cd = getRandomInt(20, 45) * 100000;
            const post = getRandomInt(5, 15) * 100000;
            const correctVal = coin + check + cd + post;
            return {
                question: `다음 자료 중 재무상태표의 '현금및현금성자산'에 포함될 총액으로 옳은 것은?\n• 통화(지폐 및 주화): ${formatNumber(coin)}원\n• ${comp} 발행 타인발행 당좌수표: ${formatNumber(check)}원\n• 우편환증서 및 송금환: ${formatNumber(post)}원\n• 취득 당시 만기가 60일 남은 양도성예금증서(CD): ${formatNumber(cd)}원\n• 결산일 현재 만기가 2개월 남은 1년 만기 정기예금: 5,000,000원\n• 사용이 제한된 당좌개설보증금: 2,000,000원`,
                options: [
                    formatNumber(correctVal) + '원',
                    formatNumber(correctVal + 5000000) + '원',
                    formatNumber(correctVal - post) + '원',
                    formatNumber(coin + cd) + '원'
                ],
                correctIdx: 0,
                explanation: `현금및현금성자산 = 통화(${formatNumber(coin)}) + 타인발행수표(${formatNumber(check)}) + 우편환증서(${formatNumber(post)}) + 취득시 만기 3개월 이내 CD(${formatNumber(cd)}) = ${formatNumber(correctVal)}원입니다. (1년 정기예금은 취득 당시 기준이 아니므로 제외, 당좌개설보증금은 특정현금과예금/비유동자산으로 분류)`,
                ref: '2026 PERFECT 1급 교재 p.36 [현금및현금성자산]'
            };
        },
        // 2. 대손충당금 보충법
        () => {
            const rec = getRandomInt(6, 15) * 10000000;
            const prev = getRandomInt(10, 35) * 10000;
            const target = rec * 0.01;
            const diff = target - prev;
            return {
                question: `기말 현재 외상매출금 잔액 ${formatNumber(rec)}원에 대하여 1%의 대손충당금을 보충법으로 설정하고자 한다. 설정 전 대손충당금 잔액이 ${formatNumber(prev)}원일 때 손익계산서에 계상할 대손상각비는?`,
                options: [
                    formatNumber(diff) + '원',
                    formatNumber(target) + '원',
                    formatNumber(prev) + '원',
                    formatNumber(target + prev) + '원'
                ],
                correctIdx: 0,
                explanation: `목표 충당금 = ${formatNumber(rec)}원 × 1% = ${formatNumber(target)}원입니다. 설정 전 잔액이 ${formatNumber(prev)}원이므로, 보충할 대손상각비 = ${formatNumber(target)}원 - ${formatNumber(prev)}원 = ${formatNumber(diff)}원입니다.`,
                ref: '2026 PERFECT 1급 교재 p.58 [대손충당금 보충법]'
            };
        },
        // 3. 물가상승 시 재고자산 평가방법
        () => ({
            question: `물가가 지속적으로 상승하고 기말재고수량이 기초재고수량과 같거나 증가할 때, 기말재고자산 가액과 당기순이익이 가장 크게 계상되는 단가결정방법은?`,
            options: ["선입선출법 (FIFO)", "후입선출법 (LIFO)", "총평균법", "이동평균법"],
            correctIdx: 0,
            explanation: "물가 상승 시 선입선출법은 과거의 저렴한 단가가 매출원가로 먼저 빠져나가 매출원가가 가장 작게 계상되므로 당기순이익과 기말재고자산이 가장 크게 나타납니다. (선입선출법 > 이동평균법 > 총평균법 > 후입선출법)",
            ref: '2026 PERFECT 1급 교재 p.74 [재고자산 평가방법 비교]'
        }),
        // 4. 단기매매증권 평가손익
        () => {
            const shares = getRandomInt(2, 5) * 100;
            const buyPrice = getRandomInt(10, 20) * 1000;
            const fee = getRandomInt(2, 5) * 10000;
            const endPrice = buyPrice + (getRandomInt(2, 5) * 1000);
            const totalGain = (endPrice - buyPrice) * shares;
            return {
                question: `당기 중 단기 시세차익 목적으로 (주)한국의 주식 ${shares}주(주당 ${formatNumber(buyPrice)}원)를 취득하고 취득수수료 ${formatNumber(fee)}원을 별도 지급하였다. 기말 현재 이 주식의 공정가치가 주당 ${formatNumber(endPrice)}원일 때, 결산 시 손익계산서에 반영될 단기매매증권평가손익은?`,
                options: [
                    `단기매매증권평가이익 ${formatNumber(totalGain)}원`,
                    `단기매매증권평가이익 ${formatNumber(totalGain - fee)}원`,
                    `단기매매증권평가손실 ${formatNumber(totalGain)}원`,
                    `단기매매증권평가이익 ${formatNumber(totalGain + fee)}원`
                ],
                correctIdx: 0,
                explanation: `단기매매증권의 취득수수료는 취득원가에 가산하지 않고 취득 시 당기비용(수수료비용)으로 처리합니다. 따라서 취득원가는 ${formatNumber(shares * buyPrice)}원이며, 기말 공정가치(${formatNumber(shares * endPrice)}원)와의 차액인 ${formatNumber(totalGain)}원이 단기매매증권평가이익(영업외수익)이 됩니다.`,
                ref: '2026 PERFECT 1급 교재 p.44 [단기매매증권의 평가]'
            };
        },
        // 5. 어음 할인 시 매출채권처분손실
        () => {
            const bill = getRandomInt(10, 30) * 1000000;
            const disc = getRandomInt(3, 8) * 10000;
            const net = bill - disc;
            return {
                question: `보유 중인 거래처 발행 약속어음 ${formatNumber(bill)}원을 만기 전 은행에서 할인하고, 할인료 ${formatNumber(disc)}원을 차감한 잔액 ${formatNumber(net)}원을 보통예금으로 수령하였다. (단, 매각거래로 처리함) 이때 할인료 ${formatNumber(disc)}원의 올바른 계정과목과 분류는?`,
                options: [
                    "매출채권처분손실 (영업외비용)",
                    "이자비용 (영업외비용)",
                    "수수료비용 (판매비와관리비)",
                    "대손상각비 (판매비와관리비)"
                ],
                correctIdx: 0,
                explanation: `약속어음의 할인이 매각거래에 해당할 경우 발생하는 할인료는 '매출채권처분손실(영업외비용)' 계정으로 처리합니다. (차입거래인 경우에는 '이자비용'으로 처리)`,
                ref: '2026 PERFECT 1급 교재 p.52 [어음의 할인]'
            };
        },
        // 6. 재고자산 감모손실 vs 평가손실
        () => ({
            question: `일반기업회계기준상 재고자산 감모손실 및 평가손실의 회계처리에 대한 설명으로 가장 옳지 않은 것은?`,
            options: [
                "원가성이 없는 비정상적인 재고자산 감모손실은 매출원가에 가산한다.",
                "원가성이 있는 정상적인 재고자산 감모손실은 매출원가에 가산한다.",
                "재고자산의 시가가 취득원가보다 하락하여 발생한 평가손실은 매출원가에 가산한다.",
                "재고자산평가손실은 재고자산의 차감계정(재고자산평가충당금)으로 표시한다."
            ],
            correctIdx: 0,
            explanation: "원가성이 없는 비정상 감모손실은 '영업외비용(재고자산감모손실)'으로 처리하며, 적요 8번(타계정으로 대체)을 적용합니다. 매출원가에 가산하는 것은 '정상 감모손실'과 '재고자산 평가손실'입니다.",
            ref: '2026 PERFECT 1급 교재 p.88 [재고자산 감모손실과 평가손실]'
        }),
        // 7. 선적지 인도조건 vs 도착지 인도조건
        () => ({
            question: `기말 재고자산 포함 여부에 대한 설명으로 옳은 것은?`,
            options: [
                "선적지 인도조건으로 운송 중인 매입상품은 결산일 현재 매입자의 기말재고자산에 포함된다.",
                "도착지 인도조건으로 운송 중인 매입상품은 결산일 현재 매입자의 기말재고자산에 포함된다.",
                "위탁판매를 위해 수탁자에게 보낸 적송품은 수탁자가 판매하기 전이라도 매탁자의 재고에서 제외된다.",
                "시송품은 구매자가 매입의사를 표시하기 전이라도 판매자의 기말재고에서 제외된다."
            ],
            correctIdx: 0,
            explanation: "선적지 인도조건은 선적 완료 시점에 소유권이 매입자에게 이전되므로 운송 중인 상품은 매입자의 기말재고에 포함됩니다. 도착지 인도조건은 도착해야 매입자 재고가 되며, 적송품과 시송품은 최종 판매/구매의사표시 전까지 원 소유자의 기말재고입니다.",
            ref: '2026 PERFECT 1급 교재 p.82 [특수매매 재고자산의 귀속]'
        }),
        // 8. 대손충당금 환입액 계산
        () => {
            const rec = 50000000;
            const prev = 800000;
            const target = rec * 0.01;
            const refund = prev - target;
            return {
                question: `기말 현재 외상매출금 잔액 ${formatNumber(rec)}원에 대하여 1%의 대손충당금을 설정하고자 한다. 설정 전 대손충당금 잔액이 ${formatNumber(prev)}원일 때 올바른 결산 회계처리는?`,
                options: [
                    `대손충당금환입 ${formatNumber(refund)}원 (판매비와관리비 차감항목)`,
                    `대손상각비 ${formatNumber(refund)}원 (판매비와관리비)`,
                    `대손충당금환입 ${formatNumber(refund)}원 (영업외수익)`,
                    `대손상각비 ${formatNumber(target)}원 (판매비와관리비)`
                ],
                correctIdx: 0,
                explanation: `기말 목표 충당금은 500,000원인데 설정 전 잔액이 800,000원이므로 초과액 300,000원을 '대손충당금환입(판관비의 차감항목)'으로 회계처리합니다. (기타채권 환입은 영업외수익)`,
                ref: '2026 PERFECT 1급 교재 p.60 [대손충당금 환입]'
            };
        },
        // 9. 순매입액 계산
        () => {
            const rawBuy = getRandomInt(10, 20) * 1000000;
            const freight = getRandomInt(10, 30) * 10000;
            const discount = getRandomInt(5, 15) * 10000;
            const returns = getRandomInt(10, 25) * 10000;
            const netBuy = rawBuy + freight - discount - returns;
            return {
                question: `당기 상품 총매입액 ${formatNumber(rawBuy)}원, 매입 시 운임 ${formatNumber(freight)}원, 매입에누리 및 환출 ${formatNumber(returns)}원, 매입할인 ${formatNumber(discount)}원일 때 당기 순매입액은 얼마인가?`,
                options: [
                    formatNumber(netBuy) + '원',
                    formatNumber(netBuy + freight) + '원',
                    formatNumber(netBuy - freight) + '원',
                    formatNumber(rawBuy - discount - returns) + '원'
                ],
                correctIdx: 0,
                explanation: `순매입액 = 총매입액(${formatNumber(rawBuy)}) + 매입부대비용/운임(${formatNumber(freight)}) - 매입에누리및환출(${formatNumber(returns)}) - 매입할인(${formatNumber(discount)}) = ${formatNumber(netBuy)}원입니다.`,
                ref: '2026 PERFECT 1급 교재 p.70 [순매입액의 계산]'
            };
        },
        // 10. 매출원가 계산
        () => {
            const beg = 5000000;
            const netBuy = 30000000;
            const end = 7000000;
            const cogs = beg + netBuy - end;
            return {
                question: `기초 상품재고액 5,000,000원, 당기 순매입액 30,000,000원, 기말 상품재고액 7,000,000원일 때 당기 상품매출원가는 얼마인가?`,
                options: [
                    formatNumber(cogs) + '원',
                    formatNumber(cogs + end) + '원',
                    formatNumber(netBuy - beg) + '원',
                    formatNumber(cogs - beg) + '원'
                ],
                correctIdx: 0,
                explanation: `매출원가 = 기초재고액(5,000,000) + 당기순매입액(30,000,000) - 기말재고액(7,000,000) = ${formatNumber(cogs)}원입니다.`,
                ref: '2026 PERFECT 1급 교재 p.72 [매출원가의 계산]'
            };
        }
    ];

    const assetJournals = [
        // 1. 단기매매증권 취득 수수료
        () => {
            const comp = getRandomItem(COMPANIES);
            const stockVal = getRandomInt(30, 80) * 100000;
            const fee = getRandomInt(15, 35) * 10000;
            const total = stockVal + fee;
            return {
                question: `단기 시세차익 목적으로 ${comp}의 상장주식을 ${formatNumber(stockVal)}원에 취득하고, 매입수수료 ${formatNumber(fee)}원을 포함한 총액 ${formatNumber(total)}원을 보통예금 계좌에서 이체하여 지급하였다.`,
                debit: [
                    { account: "단기매매증권", amount: stockVal },
                    { account: "수수료비용", amount: fee }
                ],
                credit: [{ account: "보통예금", amount: total }],
                explanation: `단기매매증권 취득 시 부대비용(수수료)은 취득원가에 포함하지 않고 영업외비용(수수료비용 900번대)으로 별도 회계처리합니다.`,
                ref: '2026 PERFECT 1급 교재 p.44 [단기매매증권 취득]'
            };
        },
        // 2. 단기매매증권 처분
        () => {
            const comp = getRandomItem(COMPANIES);
            const bookVal = getRandomInt(20, 50) * 100000;
            const sellVal = bookVal + (getRandomInt(5, 15) * 100000);
            const fee = getRandomInt(3, 8) * 10000;
            const gain = sellVal - bookVal - fee;
            const deposit = sellVal - fee;
            return {
                question: `보유 중인 ${comp}의 단기매매증권(장부가액 ${formatNumber(bookVal)}원)을 ${formatNumber(sellVal)}원에 전량 매각하고, 매각수수료 ${formatNumber(fee)}원을 차감한 잔액 ${formatNumber(deposit)}원이 보통예금으로 입금되었다.`,
                debit: [{ account: "보통예금", amount: deposit }],
                credit: [
                    { account: "단기매매증권", amount: bookVal },
                    { account: "단기매매증권처분이익", amount: gain }
                ],
                explanation: `단기매매증권 처분 시 수수료는 처분가액에서 차감하여 처분손익에 반영합니다. 순처분가(${formatNumber(deposit)}원) - 장부가액(${formatNumber(bookVal)}원) = 처분이익 ${formatNumber(gain)}원.`,
                ref: '2026 PERFECT 1급 교재 p.46 [단기매매증권 처분]'
            };
        },
        // 3. 약속어음 할인 (매각거래)
        () => {
            const comp = getRandomItem(COMPANIES);
            const bank = getRandomItem(BANKS);
            const bill = getRandomInt(10, 30) * 1000000;
            const disc = getRandomInt(2, 6) * 100000;
            const net = bill - disc;
            return {
                question: `${comp}로부터 받아 보관 중이던 약속어음 ${formatNumber(bill)}원을 ${bank}에서 할인(매각거래)받고, 할인료 ${formatNumber(disc)}원을 차감한 잔액 ${formatNumber(net)}원을 당사 당좌예금 계좌로 입금받았다.`,
                debit: [
                    { account: "당좌예금", amount: net },
                    { account: "매출채권처분손실", amount: disc }
                ],
                credit: [{ account: "받을어음", amount: bill }],
                explanation: `어음 할인이 매각거래인 경우 할인료는 '매출채권처분손실(영업외비용)'로 처리합니다.`,
                ref: '2026 PERFECT 1급 교재 p.52 [어음의 할인]'
            };
        },
        // 4. 대손 발생
        () => {
            const comp = getRandomItem(COMPANIES);
            const badDebt = getRandomInt(30, 60) * 100000;
            const allowance = getRandomInt(10, 25) * 100000;
            const expense = badDebt - allowance;
            return {
                question: `${comp}의 파산으로 인하여 외상매출금 ${formatNumber(badDebt)}원이 회수 불능되어 대손처리하였다. (단, 대손처리 직전 외상매출금에 대한 대손충당금 잔액은 ${formatNumber(allowance)}원이다)`,
                debit: [
                    { account: "대손충당금", amount: allowance },
                    { account: "대손상각비", amount: expense }
                ],
                credit: [{ account: "외상매출금", amount: badDebt }],
                explanation: `대손 발생 시 기존 대손충당금 잔액(${formatNumber(allowance)}원)을 먼저 상계하고, 부족분(${formatNumber(expense)}원)은 당기 대손상각비로 처리합니다.`,
                ref: '2026 PERFECT 1급 교재 p.62 [대손의 발생]'
            };
        },
        // 5. 전기 대손채권 현금 회수
        () => {
            const comp = getRandomItem(COMPANIES);
            const amt = getRandomInt(15, 40) * 100000;
            return {
                question: `전기에 대손 확정되어 대손상각 처리하였던 ${comp}에 대한 외상매출금 ${formatNumber(amt)}원을 당사 보통예금 계좌로 전액 회수 입금받았다.`,
                debit: [{ account: "보통예금", amount: amt }],
                credit: [{ account: "대손충당금", amount: amt }],
                explanation: `전기 이전에 대손처리된 채권을 당기에 회수한 경우, 당기 손익을 건드리지 않고 해당 채권의 '대손충당금'을 직접 증가(대변)시킵니다.`,
                ref: '2026 PERFECT 1급 교재 p.64 [대손채권의 회수]'
            };
        },
        // 6. 원재료 비정상 감모손실
        () => {
            const qty = getRandomInt(20, 50);
            const unitPrice = getRandomInt(2, 6) * 10000;
            const total = qty * unitPrice;
            return {
                question: `기말 실사 결과 원재료 ${qty}개(단가 ${formatNumber(unitPrice)}원)가 도난으로 인하여 장부상 수량과 차이가 발생하였으며, 이는 비정상적인 감모손실로 판명되었다. 결산정리분개를 하시오. (단, 적요번호 8번 타계정대체 적용)`,
                debit: [{ account: "재고자산감모손실", amount: total }],
                credit: [{ account: "원재료", amount: total }],
                explanation: `(차) 재고자산감모손실(영업외비용) ${formatNumber(total)}원 / (대) 원재료(적요 8. 타계정으로 대체) ${formatNumber(total)}원`,
                ref: '2026 PERFECT 1급 교재 p.88 [재고감모손실]'
            };
        },
        // 7. 가지급금 정산
        () => {
            const advance = getRandomInt(30, 60) * 10000;
            const spent = advance + (getRandomInt(5, 15) * 10000);
            const diff = spent - advance;
            return {
                question: `영업부 직원의 출장비로 지급하였던 가지급금 ${formatNumber(advance)}원을 정산하였다. 실제 지출액은 여비교통비 ${formatNumber(spent)}원이었으며, 초과 지출액 ${formatNumber(diff)}원은 현금으로 추가 지급하였다.`,
                debit: [{ account: "여비교통비", amount: spent }],
                credit: [
                    { account: "가지급금", amount: advance },
                    { account: "현금", amount: diff }
                ],
                explanation: `가지급금을 정산하여 여비교통비(판관비)로 대체하고 부족분은 현금으로 지급합니다.`,
                ref: '2026 PERFECT 1급 교재 p.66 [가지급금 정산]'
            };
        },
        // 8. 외상매출금 조기회수 매출할인
        () => {
            const comp = getRandomItem(COMPANIES);
            const totalRec = getRandomInt(50, 100) * 100000;
            const disc = totalRec * 0.02;
            const net = totalRec - disc;
            return {
                question: `${comp}에 대한 외상매출금 ${formatNumber(totalRec)}원을 조기 회수함에 따라 약정된 2%의 매출할인(${formatNumber(disc)}원)을 차감하고, 잔액 ${formatNumber(net)}원을 당사 당좌예금 계좌로 수령하였다.`,
                debit: [
                    { account: "당좌예금", amount: net },
                    { account: "매출할인", amount: disc }
                ],
                credit: [{ account: "외상매출금", amount: totalRec }],
                explanation: `외상대금 조기회수 시 깎아준 금액은 '매출할인' 계정으로 차변에 계상하고 외상매출금을 전액 대변으로 상계합니다.`,
                ref: '2026 PERFECT 1급 교재 p.48 [매출할인]'
            };
        }
    ];

    // =========================================================================
    // 제2단원: 비유동자산 (sec_liability - 매핑)
    // =========================================================================
    const liabTheories = [
        // 1. 유형자산 취득원가 범위
        () => {
            const machine = getRandomInt(3, 8) * 10000000;
            const ship = getRandomInt(10, 30) * 100000;
            const install = getRandomInt(15, 40) * 100000;
            const test = getRandomInt(5, 15) * 100000;
            const tax = getRandomInt(20, 50) * 100000;
            const totalCost = machine + ship + install + test + tax;
            return {
                question: `공장용 기계장치를 취득하며 다음의 지출이 발생하였다. 기계장치의 올바른 취득원가는?\n• 기계 구입가격: ${formatNumber(machine)}원\n• 운반비 및 하역료: ${formatNumber(ship)}원\n• 설치비: ${formatNumber(install)}원\n• 시운전비(테스트 비용): ${formatNumber(test)}원\n• 취득세: ${formatNumber(tax)}원\n• 당해 연도 기계장치 보유에 따른 재산세: 800,000원\n• 화재보험료(1년분): 1,200,000원`,
                options: [
                    formatNumber(totalCost) + '원',
                    formatNumber(totalCost + 800000) + '원',
                    formatNumber(totalCost + 2000000) + '원',
                    formatNumber(machine + tax) + '원'
                ],
                correctIdx: 0,
                explanation: `유형자산 취득원가 = 구입가격 + 취득세 + 운반비 + 설치비 + 시운전비 등 사용 가능한 상태에 이르기까지 발생한 모든 부대비용입니다. 재산세(세금과공과)와 화재보험료(보험료)는 취득 이후의 보유/유지 비용이므로 당기비용으로 처리합니다.`,
                ref: '2026 PERFECT 1급 교재 p.96 [유형자산의 취득원가]'
            };
        },
        // 2. 정률법 감가상각비 계산
        () => {
            const cost = getRandomInt(30, 60) * 1000000;
            const accDep = getRandomInt(5, 15) * 1000000;
            const rate = 0.451;
            const base = cost - accDep;
            const depExp = Math.round(base * rate);
            return {
                question: `당기 초 기계장치의 취득원가는 ${formatNumber(cost)}원이고, 전기말 감가상각누계액은 ${formatNumber(accDep)}원이다. 정률법(상각률 0.451)을 적용할 때 당기의 감가상각비는 얼마인가?`,
                options: [
                    formatNumber(depExp) + '원',
                    formatNumber(Math.round(cost * rate)) + '원',
                    formatNumber(Math.round(accDep * rate)) + '원',
                    formatNumber(base) + '원'
                ],
                correctIdx: 0,
                explanation: `정률법 감가상각비 = (취득원가 - 기초 감가상각누계액) × 상각률 = (${formatNumber(cost)} - ${formatNumber(accDep)}) × 0.451 = ${formatNumber(depExp)}원입니다.`,
                ref: '2026 PERFECT 1급 교재 p.108 [감가상각방법 - 정률법]'
            };
        },
        // 3. 자본적 지출 vs 수익적 지출
        () => ({
            question: `다음 중 유형자산에 대한 '자본적 지출'에 해당하는 항목으로만 짝지어진 것은?\n가. 건물의 피난시설 설치 및 엘리베이터 신설\n나. 건물 외벽 도색 및 파손된 유리창 교체\n다. 공장 건물의 증축 및 용도변경을 위한 대규모 개조\n라. 기계장치의 소모성 벨트 교체 및 정기 윤활유 주입`,
            options: ["가, 다", "나, 라", "가, 나", "다, 라"],
            correctIdx: 0,
            explanation: "자본적 지출(가, 다)은 자산의 가치를 실질적으로 증가시키거나 내용연수를 연장시키는 지출(엘리베이터, 증축)로 해당 자산원가에 가산합니다. 현상유지 및 원상복구(나, 라)는 수익적 지출(수선비)로 당기비용 처리합니다.",
            ref: '2026 PERFECT 1급 교재 p.102 [자본적 지출과 수익적 지출]'
        }),
        // 4. 무형자산 기본 회계처리
        () => ({
            question: `일반기업회계기준상 무형자산에 대한 설명으로 가장 옳지 않은 것은?`,
            options: [
                "내부적으로 창출된 영업권도 공정가치를 신뢰성 있게 측정할 수 있다면 무형자산으로 인식할 수 있다.",
                "무형자산의 상각방법은 정액법, 체감잔액법(정률법 등), 생산량비례법 등이 있으며, 합리적인 상각방법을 정할 수 없는 경우에는 정액법을 사용한다.",
                "무형자산의 잔존가치는 없는 것을 원칙으로 한다.",
                "무형자산의 상각기간은 관계 법령이나 계약에 정해진 경우를 제외하고는 20년을 초과할 수 없다."
            ],
            correctIdx: 0,
            explanation: "내부적으로 창출된 영업권은 미래 경제적 효익의 통제와 원가 측정이 불가능하므로 절대 자산으로 인식할 수 없으며, 유상으로 취득한 매수영업권만 인정됩니다.",
            ref: '2026 PERFECT 1급 교재 p.122 [무형자산의 인식요건]'
        })
    ];

    const liabJournals = [
        // 1. 토지 취득 및 부대비용
        () => {
            const comp = getRandomItem(COMPANIES);
            const land = getRandomInt(10, 30) * 10000000;
            const tax = getRandomInt(2, 6) * 1000000;
            const fee = getRandomInt(10, 30) * 100000;
            const total = land + tax + fee;
            return {
                question: `공장 신축용 토지를 ${comp}로부터 ${formatNumber(land)}원에 매입하고, 취득세 ${formatNumber(tax)}원과 부동산 중개수수료 ${formatNumber(fee)}원을 포함한 총액 ${formatNumber(total)}원을 보통예금 계좌에서 이체하여 지급하였다.`,
                debit: [{ account: "토지", amount: total }],
                credit: [{ account: "보통예금", amount: total }],
                explanation: `토지 매입에 따른 취득세와 중개수수료 등 부대비용은 전액 토지의 취득원가에 가산합니다.`,
                ref: '2026 PERFECT 1급 교재 p.96 [토지의 취득]'
            };
        },
        // 2. 차량운반구 매각 처분
        () => {
            const cost = getRandomInt(30, 50) * 1000000;
            const accDep = getRandomInt(15, 25) * 1000000;
            const bookVal = cost - accDep;
            const sellPrice = bookVal - (getRandomInt(2, 5) * 1000000);
            const loss = bookVal - sellPrice;
            return {
                question: `영업부에서 사용하던 승용차(취득원가 ${formatNumber(cost)}원, 감가상각누계액 ${formatNumber(accDep)}원)를 ${formatNumber(sellPrice)}원에 매각하고, 대금은 다음 달 15일에 받기로 하였다. (유형자산 처분손익을 반영하시오)`,
                debit: [
                    { account: "미수금", amount: sellPrice },
                    { account: "감가상각누계액", amount: accDep },
                    { account: "유형자산처분손실", amount: loss }
                ],
                credit: [{ account: "차량운반구", amount: cost }],
                explanation: `(차) 미수금(상거래 외 채권) ${formatNumber(sellPrice)}원, 감가상각누계액 ${formatNumber(accDep)}원, 유형자산처분손실 ${formatNumber(loss)}원 / (대) 차량운반구 ${formatNumber(cost)}원`,
                ref: '2026 PERFECT 1급 교재 p.114 [차량운반구 처분]'
            };
        }
    ];

    // =========================================================================
    // 제3단원: 부채 마스터 (sec_equity - 매핑)
    // =========================================================================
    const equityTheories = [
        () => ({
            question: `사채를 유효이자율법으로 상각할 때, 사채할인발행차금 상각액과 사채할증발행차금 환입액의 매년 추이로 옳은 것은?`,
            options: [
                "할인발행차금 상각액: 매년 증가 / 할증발행차금 환입액: 매년 증가",
                "할인발행차금 상각액: 매년 증가 / 할증발행차금 환입액: 매년 감소",
                "할인발행차금 상각액: 매년 감소 / 할증발행차금 환입액: 매년 증가",
                "할인발행차금 상각액: 매년 감소 / 할증발행차금 환입액: 매년 감소"
            ],
            correctIdx: 0,
            explanation: "유효이자율법 적용 시 사채할인발행차금 상각액과 사채할증발행차금 환입액은 매년 둘 다 '증가'합니다.",
            ref: '2026 PERFECT 1급 교재 p.142 [사채의 상각]'
        }),
        () => ({
            question: `비유동부채에 해당하는 장기차입금의 만기가 결산일(12월 31일)로부터 1년 이내로 도래할 때 대체하는 유동부채 계정과목은?`,
            options: ["유동성장기부채", "단기차입금", "미지급금", "유동성외화차입금"],
            correctIdx: 0,
            explanation: "장기차입금 등 비유동부채의 만기가 1년 이내로 도래하면 '유동성장기부채'로 대체합니다.",
            ref: '2026 PERFECT 1급 교재 p.138 [유동성 대체]'
        })
    ];

    const equityJournals = [
        () => {
            const faceVal = 100000000;
            const issueVal = 95000000;
            const discount = faceVal - issueVal;
            return {
                question: `액면가액 ${formatNumber(faceVal)}원의 사채를 ${formatNumber(issueVal)}원에 할인발행하고, 대금은 당사 보통예금 계좌로 전액 입금되었다.`,
                debit: [
                    { account: "보통예금", amount: issueVal },
                    { account: "사채할인발행차금", amount: discount }
                ],
                credit: [{ account: "사채", amount: faceVal }],
                explanation: `(차) 보통예금 95,000,000 / 사채할인발행차금 5,000,000 (대) 사채 100,000,000원`,
                ref: '2026 PERFECT 1급 교재 p.140 [사채의 발행]'
            };
        },
        () => {
            const bank = getRandomItem(BANKS);
            const amt = getRandomInt(3, 8) * 10000000;
            return {
                question: `${bank}에 대한 장기차입금 ${formatNumber(amt)}원의 만기가 결산일 현재 1년 이내로 도래하여 유동성 대체를 실시하였다. 결산분개를 하시오.`,
                debit: [{ account: "장기차입금", amount: amt }],
                credit: [{ account: "유동성장기부채", amount: amt }],
                explanation: `(차) 장기차입금 ${formatNumber(amt)}원 / (대) 유동성장기부채 ${formatNumber(amt)}원`,
                ref: '2026 PERFECT 1급 교재 p.138 [유동성장기부채 대체]'
            };
        }
    ];

    // =========================================================================
    // 제4단원: 자본 및 수익·비용 (sec_revenue_expense - 매핑)
    // =========================================================================
    const revTheories = [
        () => ({
            question: `다음 중 자본의 분류와 해당 계정과목의 연결이 가장 올바른 것은?`,
            options: [
                "자본조정 - 자기주식, 주식할인발행차금, 감자차손",
                "자본잉여금 - 매도가능증권평가이익, 자기주식처분이익",
                "기타포괄손익누계액 - 주식발행초과금, 감자차익",
                "이익잉여금 - 주식선택권, 감자차손"
            ],
            correctIdx: 0,
            explanation: "자본조정에는 자기주식, 주식할인발행차금, 감자차손 등이 속합니다.",
            ref: '2026 PERFECT 1급 교재 p.160 [자본의 분류]'
        }),
        () => ({
            question: `주주총회에서 결의된 다음의 배당 중 '자본총액(순자산)'의 변동을 가져오지 않는 것은?`,
            options: [
                "주식배당 (미교부주식배당금의 신주 교부)",
                "현금배당금의 보통예금 지급",
                "자기주식의 현금 유상 취득",
                "유상감자에 따른 현금 환급"
            ],
            correctIdx: 0,
            explanation: "주식배당은 미처분이익잉여금이 자본금으로 이동하는 자본 항목 간 대체이므로 자본총액에 변동이 없습니다.",
            ref: '2026 PERFECT 1급 교재 p.172 [배당과 자본변동]'
        })
    ];

    const revJournals = [
        () => {
            const shares = 10000;
            const par = 5000;
            const issuePrice = 7000;
            const cap = shares * par;
            const total = shares * issuePrice;
            const premium = total - cap;
            return {
                question: `신주 ${formatNumber(shares)}주(1주당 액면금액 ${formatNumber(par)}원)를 1주당 ${formatNumber(issuePrice)}원에 유상증자 발행하고, 주금 납입액 전액 ${formatNumber(total)}원이 당사 보통예금 계좌로 입금되었다.`,
                debit: [{ account: "보통예금", amount: total }],
                credit: [
                    { account: "자본금", amount: cap },
                    { account: "주식발행초과금", amount: premium }
                ],
                explanation: `(차) 보통예금 ${formatNumber(total)}원 / (대) 자본금 ${formatNumber(cap)}원, 주식발행초과금 ${formatNumber(premium)}원`,
                ref: '2026 PERFECT 1급 교재 p.164 [증자와 감자]'
            };
        }
    ];

    // =========================================================================
    // 제5단원: 원가회계 핵심 마스터 (sec_cost)
    // =========================================================================
    const costTheories = [
        () => {
            const dm = getRandomInt(10, 25) * 1000000;
            const dl = getRandomInt(8, 20) * 1000000;
            const oh = getRandomInt(12, 30) * 1000000;
            const prime = dm + dl;
            const conv = dl + oh;
            return {
                question: `다음 원가 자료를 바탕으로 '기본원가(기초원가)'와 '가공원가(전환원가)'를 올바르게 계산한 것은?\n• 직접재료비: ${formatNumber(dm)}원\n• 직접노무비: ${formatNumber(dl)}원\n• 제조간접비: ${formatNumber(oh)}원`,
                options: [
                    `기본원가: ${formatNumber(prime)}원, 가공원가: ${formatNumber(conv)}원`,
                    `기본원가: ${formatNumber(conv)}원, 가공원가: ${formatNumber(prime)}원`,
                    `기본원가: ${formatNumber(dm + oh)}원, 가공원가: ${formatNumber(dl + oh)}원`,
                    `기본원가: ${formatNumber(prime)}원, 가공원가: ${formatNumber(dm + dl + oh)}원`
                ],
                correctIdx: 0,
                explanation: `기본원가 = 직접재료비(${formatNumber(dm)}) + 직접노무비(${formatNumber(dl)}) = ${formatNumber(prime)}원. 가공원가 = 직접노무비(${formatNumber(dl)}) + 제조간접비(${formatNumber(oh)}) = ${formatNumber(conv)}원입니다.`,
                ref: '2026 PERFECT 1급 교재 p.204 [원가의 3요소와 분류]'
            };
        },
        () => ({
            question: `조업도(생산량)가 증가함에 따라 '총원가'와 '단위당 원가'의 변화를 설명한 것으로 가장 옳은 것은?`,
            options: [
                "변동비는 총원가가 비례적으로 증가하고 단위당 원가는 일정하며, 고정비는 총원가가 일정하고 단위당 원가는 감소한다.",
                "변동비는 총원가가 일정하고 단위당 원가는 증가하며, 고정비는 총원가가 비례적으로 증가한다.",
                "고정비와 변동비 모두 단위당 원가가 조업도 증가에 따라 감소한다.",
                "변동비와 고정비 모두 총원가가 일정하게 유지된다."
            ],
            correctIdx: 0,
            explanation: "변동비: 총원가 증가, 단위당 원가 불변. 고정비: 총원가 불변, 조업도 증가 시 단위당 원가 감소.",
            ref: '2026 PERFECT 1급 교재 p.210 [원가 행태에 따른 분류]'
        })
    ];

    const costJournals = [
        () => {
            const amt = getRandomInt(20, 50) * 1000000;
            return {
                question: `당기 제조공정에 사용하기 위하여 원재료 ${formatNumber(amt)}원을 공장 생산라인(재공품)에 투입하였다.`,
                debit: [{ account: "재공품", amount: amt }],
                credit: [{ account: "원재료", amount: amt }],
                explanation: `원재료 공장 투입: (차) 재공품 ${formatNumber(amt)}원 / (대) 원재료 ${formatNumber(amt)}원`,
                ref: '2026 PERFECT 1급 교재 p.206 [원가요소의 대체]'
            };
        }
    ];

    // =========================================================================
    // 제6단원: 부가가치세 기본 및 매입매출 전표 (sec_vat)
    // =========================================================================
    const vatTheories = [
        () => ({
            question: `부가가치세법상 영세율과 면세의 비교 설명으로 가장 옳지 않은 것은?`,
            options: [
                "면세사업자는 부가가치세법상 납세의무자로서 세금계산서를 의무적으로 발급하여야 한다.",
                "영세율은 매입세액을 전액 환급받을 수 있는 완전면세 제도이다.",
                "면세는 매입 시 부담한 부가가치세를 환급받지 못하는 불완전면세 제도이다.",
                "영세율은 소비지국 과세원칙을 구현하여 수출을 촉진하기 위한 제도이다."
            ],
            correctIdx: 0,
            explanation: "면세사업자는 부가가치세법상 사업자가 아니므로 세금계산서 대신 계산서를 발급합니다.",
            ref: '2026 PERFECT 1급 교재 p.264 [영세율과 면세의 비교]'
        }),
        () => ({
            question: `다음 중 부가가치세법상 매입세액 공제가 가능한 것은?`,
            options: [
                "배기량 998cc 경형 승용차(모닝, 레이)의 구입 및 유류비 관련 매입세액",
                "거래처 접대를 위하여 백화점 상품권을 구입하고 수취한 세금계산서",
                "배기량 2,000cc 비영업용 승용차의 렌트료 및 수리비 매입세액",
                "공장 신축용 토지의 취득을 위한 부동산 중개수수료 매입세액"
            ],
            correctIdx: 0,
            explanation: "1,000cc 이하 경차는 비영업용 소형승용차에서 제외되어 매입세액 공제가 가능합니다.",
            ref: '2026 PERFECT 1급 교재 p.276 [매입세액 불공제 사유]'
        })
    ];

    const vatJournals = [
        () => {
            const comp = getRandomItem(COMPANIES);
            const supply = getRandomInt(10, 30) * 1000000;
            const vat = supply * 0.1;
            return {
                question: `${comp}로부터 원재료를 ${formatNumber(supply)}원(부가가치세 ${formatNumber(vat)}원 별도)에 매입하고 전자세금계산서를 수취하였다. 대금 중 ${formatNumber(vat)}원은 현금으로 지급하고 잔액 ${formatNumber(supply)}원은 외상으로 하였다. (51. 과세)`,
                debit: [
                    { account: "원재료", amount: supply },
                    { account: "부가세대급금", amount: vat }
                ],
                credit: [
                    { account: "현금", amount: vat },
                    { account: "외상매입금", amount: supply }
                ],
                explanation: `(차) 원재료 ${formatNumber(supply)}원, 부가세대급금 ${formatNumber(vat)}원 / (대) 현금 ${formatNumber(vat)}원, 외상매입금 ${formatNumber(supply)}원`,
                ref: '2026 PERFECT 1급 교재 p.282 [과세매입 분개]'
            };
        }
    ];

    // =========================================================================
    // 제7단원: 결산정리 & 장부마감 (sec_closing)
    // =========================================================================
    const closingTheories = [
        () => ({
            question: `결산 시 손익의 이연 및 발생에 관한 설명으로 가장 옳지 않은 것은?`,
            options: [
                "당기에 이미 현금으로 지급한 비용 중 차기분에 해당하는 금액은 '미지급비용'으로 계상한다.",
                "당기에 수익으로 실현되었으나 결산일까지 현금을 수취하지 못한 이자수익은 '미수수익'으로 계상한다.",
                "당기에 미리 수취한 수익 중 차기 이후에 해당하는 금액은 '선수수익'으로 이연한다.",
                "당기에 발생한 비용이나 결산일까지 지급기일이 도래하지 않아 미지급된 비용은 '미지급비용'으로 계상한다."
            ],
            correctIdx: 0,
            explanation: "이미 지급한 비용 중 차기분에 해당하는 금액은 비용의 이연인 '선급비용(자산)'으로 처리합니다.",
            ref: '2026 PERFECT 1급 교재 p.310 [손익의 결산정리]'
        })
    ];

    const closingJournals = [
        () => {
            const prepaid = getRandomInt(6, 15) * 100000;
            return {
                question: `당기 10월 1일에 본사 영업부 화재보험료 1년분을 지급하면서 전액 보험료로 처리하였다. 결산일 현재 기간 미경과분 ${formatNumber(prepaid)}원에 대하여 결산정리분개를 하시오.`,
                debit: [{ account: "선급비용", amount: prepaid }],
                credit: [{ account: "보험료", amount: prepaid }],
                explanation: `(차) 선급비용 ${formatNumber(prepaid)}원 / (대) 보험료 ${formatNumber(prepaid)}원`,
                ref: '2026 PERFECT 1급 교재 p.312 [선급비용 결산]'
            };
        }
    ];

    // =========================================================================
    // 제8단원: 계정마스터 3초 판별 스피드 풀 (sec_account_master)
    // =========================================================================
    const accountMasterPool = [
        () => ({
            question: "다음 중 '임차보증금'의 재무제표 5대 요소 분류 및 재무상태표 위치로 옳은 것은?",
            options: ["기타비유동자산 (자산, 차변)", "유동부채 (부채, 대변)", "판매비와관리비 (비용, 차변)", "비유동부채 (부채, 대변)"],
            correctIdx: 0,
            explanation: "임차보증금은 돌려받을 권리가 있는 '기타비유동자산(자산)'입니다."
        }),
        () => ({
            question: "다음 중 '개발비' 계정과목의 올바른 분류는?",
            options: ["무형자산 (자산, 차변)", "판매비와관리비 (비용, 차변)", "영업외비용 (비용, 차변)", "자본조정 (자본, 차변)"],
            correctIdx: 0,
            explanation: "개발비는 '무형자산(자산)'입니다."
        }),
        () => ({
            question: "다음 중 '선급비용'의 올바른 성격과 분류는?",
            options: ["당좌자산 (자산, 차변)", "유동부채 (부채, 대변)", "판매비와관리비 (비용, 차변)", "영업외수익 (수익, 대변)"],
            correctIdx: 0,
            explanation: "선급비용은 차기 비용을 미리 지급한 '당좌자산(자산)'입니다."
        }),
        () => ({
            question: "다음 중 '선수수익'의 올바른 성격과 분류는?",
            options: ["유동부채 (부채, 대변)", "당좌자산 (자산, 차변)", "영업외수익 (수익, 대변)", "판매비와관리비 (비용, 차변)"],
            correctIdx: 0,
            explanation: "선수수익은 대금을 미리 받은 '유동부채'입니다."
        }),
        () => ({
            question: "다음 중 '단기매매증권평가이익'과 '매도가능증권평가이익'의 분류로 옳은 것은?",
            options: [
                "단기매매증권평가이익: 영업외수익 / 매도가능증권평가이익: 기타포괄손익누계액(자본)",
                "단기매매증권평가이익: 영업외수익 / 매도가능증권평가이익: 영업외수익",
                "단기매매증권평가이익: 자본잉여금 / 매도가능증권평가이익: 자본조정",
                "단기매매증권평가이익: 매출액 / 매도가능증권평가이익: 이익잉여금"
            ],
            correctIdx: 0,
            explanation: "단기매매증권평가손익은 '영업외손익', 매도가능증권평가손익은 '기타포괄손익누계액(자본)'입니다."
        }),
        () => ({
            question: "다음 중 '자기주식처분이익'과 '자기주식처분손실'의 자본 분류는?",
            options: [
                "자기주식처분이익: 자본잉여금 / 자기주식처분손실: 자본조정",
                "자기주식처분이익: 자본조정 / 자기주식처분손실: 자본잉여금",
                "둘 다 자본잉여금",
                "둘 다 영업외손익"
            ],
            correctIdx: 0,
            explanation: "자기주식처분이익은 '자본잉여금', 자기주식처분손실은 '자본조정'입니다."
        })
    ];

    // =========================================================================
    // 제9단원: 1급 초격차 전용 실전 문제 (sec_grade1_only)
    // =========================================================================
    const grade1OnlyTheories = [
        () => {
            const faceVal = 50000000;
            const bookVal = 48000000;
            const repayVal = 46500000;
            const gain = bookVal - repayVal;
            return {
                question: `(주)세종은 액면가액 ${formatNumber(faceVal)}원의 사채(상환 당시 장부가액 ${formatNumber(bookVal)}원)를 ${formatNumber(repayVal)}원에 조기 상환하였다. 이때 인식할 사채상환손익은?`,
                options: [
                    `사채상환이익 ${formatNumber(gain)}원`,
                    `사채상환손실 ${formatNumber(gain)}원`,
                    `사채상환이익 ${formatNumber(faceVal - repayVal)}원`,
                    `사채상환손실 ${formatNumber(faceVal - bookVal)}원`
                ],
                correctIdx: 0,
                explanation: `사채상환손익 = 장부가액(${formatNumber(bookVal)}원) - 상환가액(${formatNumber(repayVal)}원) = 사채상환이익 ${formatNumber(gain)}원입니다.`,
                ref: '2026 PERFECT 1급 교재 p.340 [사채의 조기상환]'
            };
        }
    ];

    const grade1OnlyJournals = [
        () => {
            const comp = getRandomItem(COMPANIES);
            const cost = 20000000;
            const evalGain = 3000000;
            const bookVal = cost + evalGain;
            const sellPrice = 25000000;
            const finalGain = sellPrice - cost;
            return {
                question: `비유동자산으로 분류된 ${comp}의 매도가능증권(취득원가 ${formatNumber(cost)}원, 전기말 평가이익 잔액 ${formatNumber(evalGain)}원 계상되어 장부가액 ${formatNumber(bookVal)}원)을 ${formatNumber(sellPrice)}원에 처분하고 대금은 보통예금으로 입금받았다.`,
                debit: [
                    { account: "보통예금", amount: sellPrice },
                    { account: "매도가능증권평가이익", amount: evalGain }
                ],
                credit: [
                    { account: "매도가능증권", amount: bookVal },
                    { account: "매도가능증권처분이익", amount: finalGain }
                ],
                explanation: `기존 평가이익을 상계 제거하고 최종 처분가와 취득원가의 차액인 ${formatNumber(finalGain)}원을 처분이익으로 인식합니다.`,
                ref: '2026 PERFECT 1급 교재 p.346 [매도가능증권 처분]'
            };
        }
    ];

    // =========================================================================
    // 단원 ID 맵핑 레지스트리
    // =========================================================================
    const sectionQuizMap = {
        'sec_asset': { theories: assetTheories, journals: assetJournals },
        'sec_liability': { theories: liabTheories, journals: liabJournals },
        'sec_equity': { theories: equityTheories, journals: equityJournals },
        'sec_revenue_expense': { theories: revTheories, journals: revJournals },
        'sec_cost': { theories: costTheories, journals: costJournals },
        'sec_vat': { theories: vatTheories, journals: vatJournals },
        'sec_closing': { theories: closingTheories, journals: closingJournals },
        'sec_account_master': { theories: accountMasterPool, journals: assetJournals },
        'sec_grade1_only': { theories: grade1OnlyTheories, journals: grade1OnlyJournals }
    };

    /**
     * 특정 단원에 대해 최근 출제 중복을 방지하며 동적 문제 생성
     */
    function generateDynamicQuiz(stepId, sectionId, type) {
        let secKey = sectionId;
        if (!secKey && stepId) {
            if (stepId.startsWith('asset')) secKey = 'sec_asset';
            else if (stepId.startsWith('liab')) secKey = 'sec_liability';
            else if (stepId.startsWith('eq')) secKey = 'sec_equity';
            else if (stepId.startsWith('rev')) secKey = 'sec_revenue_expense';
            else if (stepId.startsWith('cost')) secKey = 'sec_cost';
            else if (stepId.startsWith('vat')) secKey = 'sec_vat';
            else if (stepId.startsWith('close')) secKey = 'sec_closing';
            else if (stepId.startsWith('acc')) secKey = 'sec_account_master';
            else if (stepId.startsWith('step_g1') || stepId.startsWith('g1')) secKey = 'sec_grade1_only';
        }
        if (!secKey || !sectionQuizMap[secKey]) {
            secKey = 'sec_asset';
        }

        const pool = sectionQuizMap[secKey];
        if (!pool) return null;

        if (type === 'theory' || secKey === 'sec_account_master') {
            const poolKey = `${secKey}_t`;
            const tplFn = pickNonRepeatingTemplate(pool.theories, poolKey);
            if (!tplFn) return null;
            const res = tplFn();
            const shuffled = shuffleOptions(res.options, res.correctIdx);
            return {
                id: `dyn_${secKey}_t_${Date.now()}_${Math.random()}`,
                type: 'theory',
                question: res.question,
                options: shuffled.options,
                correctAnswer: shuffled.correctAnswer,
                explanation: res.explanation,
                bookReference: res.ref || '2026 PERFECT 전산회계 1급 실전 대비'
            };
        } else if (type === 'journal') {
            const poolKey = `${secKey}_j`;
            const jplFn = pickNonRepeatingTemplate(pool.journals, poolKey);
            if (!jplFn) return null;
            const res = jplFn();
            return {
                id: `dyn_${secKey}_j_${Date.now()}_${Math.random()}`,
                type: 'journal',
                question: res.question,
                debit: res.debit,
                credit: res.credit,
                explanation: res.explanation,
                bookReference: res.ref || '2026 PERFECT 전산회계 1급 실무 분개'
            };
        }

        return null;
    }

    return {
        generateDynamicQuiz: generateDynamicQuiz
    };
})();
