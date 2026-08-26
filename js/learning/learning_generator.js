/**
 * 2026 PERFECT 전산회계 1급 동적 문제 생성 엔진 (Dynamic Problem Generator)
 * - 각 단원/스텝별로 숫자, 거래처, 계정 조건, 상황을 실시간으로 변형하여 무한히 새로운 필기/분개 문제를 생성합니다.
 */
window.LearningGenerator = (function() {

    const COMPANIES = [
        '(주)대한상사', '(주)민국물산', '(주)삼진상사', '(주)한양전자', '(주)세종무역',
        '(주)우진테크', '(주)한라통상', '(주)백두기계', '(주)나라물류', '(주)동양상사',
        '(주)태백정밀', '(주)금강상사', '(주)광교상사', '(주)판교정보기술', '(주)서해상사'
    ];

    const BANKS = ['국민은행', '신한은행', '우리은행', '하나은행', '기업은행', '농협은행'];

    function getRandomItem(arr) {
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
        const correctText = options[correctIdx];
        const shuffled = shuffleArray(options);
        const newCorrectIdx = shuffled.indexOf(correctText);
        return {
            options: shuffled,
            correctAnswer: newCorrectIdx + 1
        };
    }

    // --- 단원/스텝별 동적 생성 템플릿 레지스트리 ---
    const stepGenerators = {
        // [단원 1. 당좌자산]
        'asset_01': {
            theory: function() {
                const comp = getRandomItem(COMPANIES);
                const days = getRandomInt(20, 80);
                const months = getRandomInt(4, 12);
                
                const questionTemplates = [
                    {
                        question: `다음 중 일반기업회계기준상 현금및현금성자산의 합계액으로 옳은 것은?\n[자료] 통화 500,000원, ${comp} 발행 당좌수표 1,200,000원, 당사 발행 당좌수표 800,000원, 만기 ${days}일 양도성예금증서(CD) 3,000,000원, 취득 시 만기 ${months}개월 정기예금 2,000,000원`,
                        calc: () => {
                            const correctVal = 500000 + 1200000 + 3000000;
                            const opt1 = formatNumber(correctVal) + '원';
                            const opt2 = formatNumber(correctVal + 800000) + '원';
                            const opt3 = formatNumber(correctVal + 2000000) + '원';
                            const opt4 = formatNumber(correctVal - 1200000) + '원';
                            
                            return {
                                options: [opt1, opt2, opt3, opt4],
                                correctIdx: 0,
                                explanation: `현금및현금성자산 = 통화(500,000원) + 타인발행수표(1,200,000원) + 만기 3개월 이내 양도성예금증서(3,000,000원) = 4,700,000원입니다. (당사발행 당좌수표는 당좌예금 차감 항목이며, 만기 ${months}개월 정기예금은 단기금융상품입니다.)`
                            };
                        }
                    },
                    {
                        // 기존 정적 question 문자열을 제거하고 calc 내부에서 동적 생성하도록 수정
                        calc: () => {
                            const receivable = getRandomInt(40, 100) * 1000000;
                            const prevAllowance = getRandomInt(10, 30) * 10000;
                            const targetAllowance = receivable * 0.01;
                            const diff = targetAllowance - prevAllowance;

                            // 동적 데이터가 포함된 명확한 지문 생성
                            const dynamicQuestion = `다음은 결산 시 매출채권에 대한 대손충당금을 계산하기 위한 자료이다. 올바른 회계처리는?\n[자료] 결산 전 대손충당금 잔액: ${formatNumber(prevAllowance)}원, 기말 매출채권 잔액: ${formatNumber(receivable)}원 (대손율 1%)`;

                            const correctText = `(차) 대손상각비 ${formatNumber(diff)}원 | (대) 대손충당금 ${formatNumber(diff)}원`;
                            const wrong1 = `(차) 대손상각비 ${formatNumber(targetAllowance)}원 | (대) 대손충당금 ${formatNumber(targetAllowance)}원`;
                            const wrong2 = `(차) 기타의대손상각비 ${formatNumber(diff)}원 | (대) 대손충당금 ${formatNumber(diff)}원`;
                            const wrong3 = `(차) 대손충당금 ${formatNumber(diff)}원 | (대) 대손충당금환입 ${formatNumber(diff)}원`;

                            return {
                                question: dynamicQuestion, // 생성된 동적 지문 반환
                                options: [correctText, wrong1, wrong2, wrong3],
                                correctIdx: 0,
                                explanation: `목표 대손충당금 = ${formatNumber(receivable)}원 × 1% = ${formatNumber(targetAllowance)}원입니다. 보충할 금액 = ${formatNumber(targetAllowance)}원 - 기존잔액 ${formatNumber(prevAllowance)}원 = ${formatNumber(diff)}원입니다.`
                            };
                        }
                    }
                ];

                const tpl = getRandomItem(questionTemplates);
                const res = tpl.calc();
                const shuffled = shuffleOptions(res.options, res.correctIdx);

                return {
                    id: 'dyn_asset_01_t_' + Date.now(),
                    type: 'theory',
                    question: res.question || tpl.question, // calc에서 생성된 question이 있으면 우선 사용
                    options: shuffled.options,
                    correctAnswer: shuffled.correctAnswer,
                    explanation: res.explanation,
                    bookReference: '2026 PERFECT 1급 교재 p.36 [현금및현금성자산 & 매출채권]'
                };
            },
            journal: function() {
                const comp = getRandomItem(COMPANIES);
                const receivable = getRandomInt(4, 12) * 10000000;
                const rate = getRandomItem([0.01, 0.02]);
                const prev = getRandomInt(1, 4) * 100000;
                const target = receivable * rate;
                const supplement = target - prev;

                return {
                    id: 'dyn_asset_01_j_' + Date.now(),
                    type: 'journal',
                    question: `기말 현재 매출채권(${comp}) 잔액 ${formatNumber(receivable)}원에 대하여 ${(rate * 100)}%의 대손충당금을 보충법으로 설정하고자 한다. 설정 전 대손충당금 잔액은 ${formatNumber(prev)}원이다. 결산정리분개를 하시오.`,
                    debit: [{ account: "대손상각비", amount: supplement }],
                    credit: [{ account: "대손충당금", amount: supplement }],
                    explanation: `목표 대손충당금: ${formatNumber(receivable)}원 × ${(rate * 100)}% = ${formatNumber(target)}원\n보충 설정액: ${formatNumber(target)}원 - 기존잔액 ${formatNumber(prev)}원 = ${formatNumber(supplement)}원\n분개: (차) 대손상각비(판) ${formatNumber(supplement)}원 / (대) 대손충당금 ${formatNumber(supplement)}원`,
                    bookReference: '2026 PERFECT 1급 교재 p.58 [대손충당금 보충법]'
                };
            }
        },

        // [단원 2. 재고자산]
        'asset_02': {
            theory: function() {
                const qty = getRandomInt(50, 150);
                const lossQty = getRandomInt(5, 15);
                const unitPrice = getRandomInt(10, 50) * 1000;
                const totalLoss = lossQty * unitPrice;

                const rawOptions = [
                    `영업외비용인 '재고자산감모손실' ${formatNumber(totalLoss)}원으로 처리하고 대변 원재료에 적요 8번(타계정대체)을 적용한다.`,
                    `매출원가에 가산하고 대변 원재료에 적요 8번을 적용하지 않는다.`,
                    `판매비와관리비인 '감모상각비'로 처리한다.`,
                    `자산의 차감계정인 '재고자산평가충당금'으로 회계처리한다.`
                ];
                const shuffled = shuffleOptions(rawOptions, 0);

                return {
                    id: 'dyn_asset_02_t_' + Date.now(),
                    type: 'theory',
                    question: `기말 재고실사 결과 원재료 장부수량 ${qty}개(단가 ${formatNumber(unitPrice)}원) 중 ${lossQty}개가 도난으로 분실되었으며, 비정상적인 감모손실로 판명되었다. 이에 대한 설명으로 옳은 것은?`,
                    options: shuffled.options,
                    correctAnswer: shuffled.correctAnswer,
                    explanation: `비정상적인 재고자산 감모손실(${lossQty}개 × ${formatNumber(unitPrice)}원 = ${formatNumber(totalLoss)}원)은 영업외비용 항목인 '재고자산감모손실'로 처리하고, 대변 원재료 계정에 적요 8번(타계정으로 대체)을 반드시 기재합니다.`,
                    bookReference: '2026 PERFECT 1급 교재 p.88 [재고자산 감모손실과 평가손실]'
                };
            },
            journal: function() {
                const qty = getRandomInt(10, 30);
                const price = getRandomInt(5, 20) * 1000;
                const total = qty * price;

                return {
                    id: 'dyn_asset_02_j_' + Date.now(),
                    type: 'journal',
                    question: `기말 결산 시 원재료의 장부상 수량보다 실제 수량이 ${qty}개 부족(단가 ${formatNumber(price)}원)함을 확인하였으며, 이는 원인 불명의 비정상적 감모손실로 판명되었다. 결산분개를 하시오.`,
                    debit: [{ account: "재고자산감모손실", amount: total }],
                    credit: [{ account: "원재료", amount: total }],
                    explanation: `비정상 감모손실 금액 = ${qty}개 × ${formatNumber(price)}원 = ${formatNumber(total)}원\n분개: (차) 재고자산감모손실(영업외비용) ${formatNumber(total)}원 / (대) 원재료(적요8) ${formatNumber(total)}원`,
                    bookReference: '2026 PERFECT 1급 교재 p.88 [비정상 재고감모 결산분개]'
                };
            }
        },

        // [단원 3. 유형·무형자산]
        'asset_03': {
            theory: function() {
                const comp = getRandomItem(COMPANIES);
                const cost = getRandomInt(20, 50) * 1000000;
                const dep = getRandomInt(5, 15) * 1000000;
                const sell = getRandomInt(10, 40) * 1000000;
                const bookVal = cost - dep;
                const gainLoss = sell - bookVal;
                const isGain = gainLoss >= 0;

                const gainLossText = isGain ? `유형자산처분이익 ${formatNumber(gainLoss)}원` : `유형자산처분손실 ${formatNumber(Math.abs(gainLoss))}원`;
                const wrongGainLoss = isGain ? `유형자산처분손실 ${formatNumber(gainLoss)}원` : `유형자산처분이익 ${formatNumber(Math.abs(gainLoss))}원`;

                const rawOptions = [
                    gainLossText,
                    wrongGainLoss,
                    `유형자산처분이익 ${formatNumber(cost - sell)}원`,
                    `감가상각비 ${formatNumber(dep)}원`
                ];
                const shuffled = shuffleOptions(rawOptions, 0);

                return {
                    id: 'dyn_asset_03_t_' + Date.now(),
                    type: 'theory',
                    question: `${comp}는 보유 중이던 기계장치(취득원가 ${formatNumber(cost)}원, 감가상각누계액 ${formatNumber(dep)}원)를 ${formatNumber(sell)}원에 처분하고 대금은 월말에 받기로 하였다. 손익계산서에 반영될 손익은?`,
                    options: shuffled.options,
                    correctAnswer: shuffled.correctAnswer,
                    explanation: `장부가액 = 취득원가(${formatNumber(cost)}원) - 감가상각누계액(${formatNumber(dep)}원) = ${formatNumber(bookVal)}원입니다.\n처분손익 = 처분가액(${formatNumber(sell)}원) - 장부가액(${formatNumber(bookVal)}원) = ${gainLossText}입니다.`,
                    bookReference: '2026 PERFECT 1급 교재 p.112 [유형자산의 처분]'
                };
            },
            journal: function() {
                const comp = getRandomItem(COMPANIES);
                const bank = getRandomItem(BANKS);
                const cost = getRandomInt(30, 60) * 1000000;
                const dep = getRandomInt(10, 25) * 1000000;
                const bookVal = cost - dep;
                const diff = getRandomInt(1, 5) * 1000000;
                const isGain = Math.random() > 0.5;
                const sell = isGain ? (bookVal + diff) : (bookVal - diff);

                const debits = [
                    { account: "감가상각누계액", amount: dep },
                    { account: "보통예금", amount: sell }
                ];
                const credits = [
                    { account: "기계장치", amount: cost }
                ];

                if (isGain) {
                    credits.push({ account: "유형자산처분이익", amount: diff });
                } else {
                    debits.push({ account: "유형자산처분손실", amount: diff });
                }

                return {
                    id: 'dyn_asset_03_j_' + Date.now(),
                    type: 'journal',
                    question: `사용하던 기계장치(취득원가 ${formatNumber(cost)}원, 감가상각누계액 ${formatNumber(dep)}원)를 ${comp}에 ${formatNumber(sell)}원에 처분하고, 대금은 ${bank} 보통예금 계좌로 입금받았다. (처분 분개를 하시오.)`,
                    debit: debits,
                    credit: credits,
                    explanation: `1. 대변에 기계장치 취득원가 ${formatNumber(cost)}원 제거\n2. 차변에 감가상각누계액 ${formatNumber(dep)}원 제거 및 입금액(보통예금) ${formatNumber(sell)}원 기록\n3. ${isGain ? '처분이익 ' + formatNumber(diff) + '원 대변 기록' : '처분손실 ' + formatNumber(diff) + '원 차변 기록'}`,
                    bookReference: '2026 PERFECT 1급 교재 p.112 [유형자산 처분 분개]'
                };
            }
        },

        // [단원 4. 부채]
        'sec_liability': {
            theory: function() {
                const comp = getRandomItem(COMPANIES);
                const totalSalary = getRandomInt(300, 600) * 10000;
                const tax = Math.round(totalSalary * 0.09);
                const netPay = totalSalary - tax;

                const rawOptions = [
                    "예수금 (유동부채)",
                    "선수금 (유동부채)",
                    "미지급비용 (유동부채)",
                    "세금과공과 (판매비와관리비)"
                ];
                const shuffled = shuffleOptions(rawOptions, 0);

                return {
                    id: 'dyn_liab_t_' + Date.now(),
                    type: 'theory',
                    question: `${comp}는 본사 관리부 직원들의 급여 총액 ${formatNumber(totalSalary)}원을 지급하면서 소득세 및 4대보험료 ${formatNumber(tax)}원을 원천징수하고 잔액 ${formatNumber(netPay)}원을 보통예금으로 이체하였다. 원천징수한 금액 ${formatNumber(tax)}원의 올바른 계정과목은?`,
                    options: shuffled.options,
                    correctAnswer: shuffled.correctAnswer,
                    explanation: `급여 지급 시 소득세, 지방소득세, 건강보험료, 국민연금 등 원천징수한 세액과 보험료는 임시로 보관하는 유동부채인 '예수금'으로 처리합니다.`,
                    bookReference: '2026 PERFECT 1급 교재 p.150 [유동부채 - 예수금]'
                };
            },
            journal: function() {
                const totalSalary = getRandomInt(400, 800) * 10000;
                const tax = Math.round(totalSalary * 0.1);
                const net = totalSalary - tax;
                const bank = getRandomItem(BANKS);

                return {
                    id: 'dyn_liab_j_' + Date.now(),
                    type: 'journal',
                    question: `영업부 직원의 급여 ${formatNumber(totalSalary)}원을 지급하면서 근로소득세 및 4대보험 예수금 ${formatNumber(tax)}원을 차감한 잔액 ${formatNumber(net)}원을 ${bank} 보통예금으로 이체 지급하였다.`,
                    debit: [{ account: "급여", amount: totalSalary }],
                    credit: [
                        { account: "예수금", amount: tax },
                        { account: "보통예금", amount: net }
                    ],
                    explanation: `차변: 급여(판) ${formatNumber(totalSalary)}원\n대변: 예수금 ${formatNumber(tax)}원, 보통예금 ${formatNumber(net)}원`,
                    bookReference: '2026 PERFECT 1급 교재 p.150 [급여 지급 및 예수금 회계처리]'
                };
            }
        },

        // [단원 5. 자본]
        'sec_equity': {
            theory: function() {
                const shares = getRandomInt(1000, 5000);
                const par = 5000;
                const issue = getRandomInt(6000, 10000);
                const cap = shares * par;
                const premium = shares * (issue - par);

                const rawOptions = [
                    formatNumber(cap + premium) + '원',
                    formatNumber(cap) + '원',
                    formatNumber(premium) + '원',
                    formatNumber(shares * issue) + '원'
                ];
                const shuffled = shuffleOptions(rawOptions, 0);

                return {
                    id: 'dyn_eq_t_' + Date.now(),
                    type: 'theory',
                    question: `당사는 보통주식 ${formatNumber(shares)}주(액면가액 1주당 ${formatNumber(par)}원)를 1주당 ${formatNumber(issue)}원에 할증발행하고 주금 납입액 전액이 보통예금으로 입금되었다. 이 거래로 인하여 증가하는 자본금의 금액은?`,
                    options: shuffled.options,
                    correctAnswer: shuffled.correctAnswer,
                    explanation: `주식 발행 시 '자본금'은 무조건 '발행주식수 × 액면가액'(${formatNumber(shares)}주 × ${formatNumber(par)}원 = ${formatNumber(cap)}원)으로만 증가합니다. 액면초과액(${formatNumber(premium)}원)은 '주식발행초과금(자본잉여금)'으로 처리됩니다.`,
                    bookReference: '2026 PERFECT 1급 교재 p.184 [주식의 발행과 자본금]'
                };
            },
            journal: function() {
                const shares = getRandomInt(2000, 5000);
                const par = 5000;
                const issue = getRandomInt(6, 10) * 1000;
                const cap = shares * par;
                const total = shares * issue;
                const premium = total - cap;

                return {
                    id: 'dyn_eq_j_' + Date.now(),
                    type: 'journal',
                    question: `이사회 결의를 거쳐 보통주식 ${formatNumber(shares)}주(액면가액 1주당 ${formatNumber(par)}원)를 1주당 ${formatNumber(issue)}원에 신주 발행하고, 주금 전액이 보통예금 통장으로 입금되었다. (주식발행초과금 잔액은 0원임)`,
                    debit: [{ account: "보통예금", amount: total }],
                    credit: [
                        { account: "자본금", amount: cap },
                        { account: "주식발행초과금", amount: premium }
                    ],
                    explanation: `차변: 보통예금 ${formatNumber(total)}원\n대변: 자본금(${formatNumber(shares)}주 × ${formatNumber(par)}원) ${formatNumber(cap)}원, 주식발행초과금 ${formatNumber(premium)}원`,
                    bookReference: '2026 PERFECT 1급 교재 p.184 [주식 할증발행 분개]'
                };
            }
        },

        // [단원 6. 원가회계]
        'sec_cost': {
            theory: function() {
                const directLaborHours = getRandomInt(1000, 3000);
                const rate = getRandomInt(2, 5) * 1000;
                const estimated = directLaborHours * rate;
                const actual = estimated + (getRandomItem([-1, 1]) * getRandomInt(10, 50) * 10000);
                const diff = actual - estimated;
                const isUnder = diff > 0;

                const ansText = isUnder ? `과소배부 ${formatNumber(diff)}원` : `과대배부 ${formatNumber(Math.abs(diff))}원`;
                const wrongText = isUnder ? `과대배부 ${formatNumber(diff)}원` : `과소배부 ${formatNumber(Math.abs(diff))}원`;

                const rawOptions = [
                    ansText,
                    wrongText,
                    `과소배부 ${formatNumber(estimated)}원`,
                    `과대배부 ${formatNumber(actual)}원`
                ];
                const shuffled = shuffleOptions(rawOptions, 0);

                return {
                    id: 'dyn_cost_t_' + Date.now(),
                    type: 'theory',
                    question: `당사는 제조간접비를 직접노동시간을 기준으로 예정배부하고 있다. 당기 예정배부율은 직접노동시간당 ${formatNumber(rate)}원이며, 당기 실제 직접노동시간은 ${formatNumber(directLaborHours)}시간이었다. 당기 실제 제조간접비 발생액이 ${formatNumber(actual)}원일 때, 제조간접비 배부차이는?`,
                    options: shuffled.options,
                    correctAnswer: shuffled.correctAnswer,
                    explanation: `예정배부액 = 실제조업도(${formatNumber(directLaborHours)}시간) × 예정배부율(${formatNumber(rate)}원) = ${formatNumber(estimated)}원입니다.\n배부차이 = 예정배부액(${formatNumber(estimated)}원) - 실제발생액(${formatNumber(actual)}원) = ${ansText}입니다. (실제발생액이 예정배부액보다 크면 배부가 덜 된 것이므로 과소배부입니다.)`,
                    bookReference: '2026 PERFECT 1급 교재 p.240 [제조간접비 예정배부 및 배부차이]'
                };
            },
            journal: function() {
                const rawMat = getRandomInt(300, 600) * 10000;
                const labor = getRandomInt(200, 500) * 10000;
                const total = rawMat + labor;

                return {
                    id: 'dyn_cost_j_' + Date.now(),
                    type: 'journal',
                    question: `당월 제품 제조를 위하여 원재료 ${formatNumber(rawMat)}원과 노무비(임금) ${formatNumber(labor)}원을 제조 공정에 투입(재공품 대체)하였다.`,
                    debit: [{ account: "재공품", amount: total }],
                    credit: [
                        { account: "원재료", amount: rawMat },
                        { account: "임금", amount: labor }
                    ],
                    explanation: `차변: 재공품 ${formatNumber(total)}원\n대변: 원재료 ${formatNumber(rawMat)}원, 임금 ${formatNumber(labor)}원`,
                    bookReference: '2026 PERFECT 1급 교재 p.230 [원가요소의 재공품 대체]'
                };
            }
        },

        // [단원 7. 부가가치세]
        'sec_vat': {
            theory: function() {
                const rawOptions = [
                    `공장 생산직 직원의 복리후생비 성격의 작업복 구입 매입세액`,
                    `영업용 화물차(1톤 트럭) 구입 관련 매입세액`,
                    `본사 총무부 업무용 2,000cc 개별소비세 과세대상 승용차 구입 및 유지 관련 매입세액`,
                    `과세사업에 사용하기 위해 취득한 원재료 매입세액`
                ];
                // 기존 코드는 3번째(index 2)가 정답이었습니다. 보기 순서를 위와 같이 재배치하고 0번 인덱스를 정답으로 셔플합니다.
                const shuffled = shuffleOptions(rawOptions, 2); // '개별소비세 과세대상...' 이 정답(인덱스 2)

                return {
                    id: 'dyn_vat_t_' + Date.now(),
                    type: 'theory',
                    question: `다음 중 부가가치세법상 매입세액공제가 불가능한(불공제) 항목으로 옳은 것은?`,
                    options: shuffled.options,
                    correctAnswer: shuffled.correctAnswer,
                    explanation: `개별소비세 과세대상 승용차(비영업용 소형승용차: 8인승 이하 승용차로서 배기량 1,000cc 초과)의 구입·임차·유지 관련 매입세액은 부가가치세법 제39조에 따라 불공제(매입세액 불공제) 대상입니다. (1톤 트럭이나 9인승 이상 승합차, 1,000cc 이하 경차는 공제 가능)`,
                    bookReference: '2026 PERFECT 1급 교재 p.310 [매입세액 불공제 항목]'
                };
            },
            journal: function() {
                const comp = getRandomItem(COMPANIES);
                const supply = getRandomInt(10, 30) * 100000;
                const vat = supply * 0.1;
                const bank = getRandomItem(BANKS);

                return {
                    id: 'dyn_vat_j_' + Date.now(),
                    type: 'journal',
                    question: `${comp}에 제품을 공급가액 ${formatNumber(supply)}원(부가가치세 ${formatNumber(vat)}원 별도)에 판매하고, 전자세금계산서를 발급하였다. 대금 중 ${formatNumber(vat)}원은 당일 ${bank} 보통예금으로 받고, 잔액은 외상으로 하였다.`,
                    debit: [
                        { account: "보통예금", amount: vat },
                        { account: "외상매출금", amount: supply }
                    ],
                    credit: [
                        { account: "제품매출", amount: supply },
                        { account: "부가세예수금", amount: vat }
                    ],
                    explanation: `차변: 보통예금 ${formatNumber(vat)}원, 외상매출금 ${formatNumber(supply)}원\n대변: 제품매출 ${formatNumber(supply)}원, 부가세예수금 ${formatNumber(vat)}원`,
                    bookReference: '2026 PERFECT 1급 교재 p.305 [과세매출 분개]'
                };
            }
        }
    };

    /**
     * 특정 스텝 및 유형(theory / journal)에 대한 신규 동적 문제 생성
     */
    function generateDynamicQuiz(stepId, sectionId, type) {
        if (!stepId && sectionId && window.LearningCurriculum) {
            const section = window.LearningCurriculum.sections.find(s => s.id === sectionId);
            if (section && section.steps && section.steps.length > 0) {
                const randomStep = section.steps[Math.floor(Math.random() * section.steps.length)];
                stepId = randomStep.id;
            }
        }

        let gen = stepGenerators[stepId];
        
        if (!gen && sectionId) {
            gen = stepGenerators[sectionId];
        }

        if (!gen) {
            if (sectionId === 'sec_asset' || (stepId && stepId.startsWith('asset'))) gen = stepGenerators['asset_01'];
            else if (sectionId === 'sec_liability' || (stepId && stepId.startsWith('liab'))) gen = stepGenerators['sec_liability'];
            else if (sectionId === 'sec_equity' || (stepId && stepId.startsWith('eq'))) gen = stepGenerators['sec_equity'];
            else if (sectionId === 'sec_cost' || (stepId && stepId.startsWith('cost'))) gen = stepGenerators['sec_cost'];
            else if (sectionId === 'sec_vat' || (stepId && stepId.startsWith('vat'))) gen = stepGenerators['sec_vat'];
            else gen = stepGenerators['asset_01'];
        }

        if (type === 'theory' && gen.theory) {
            return gen.theory();
        } else if (type === 'journal' && gen.journal) {
            return gen.journal();
        }

        return null;
    }

    return {
        generateDynamicQuiz: generateDynamicQuiz
    };
})();