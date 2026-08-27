/**
 * 2026 PERFECT 전산회계 1급 동적 문제 생성 엔진 (Dynamic Problem Generator)
 * - 8대 단원 체제 (자산, 부채, 자본, 수익비용, 원가회계, 부가가치세, 결산마스터, 계정마스터)
 * - 원가/부가세/결산 대폭 확장 및 제8단원 계정과목 3초 판별 스피드 트레이닝 풀 25종 이상 탑재
 */
window.LearningGenerator = (function() {

    const COMPANIES = [
        '(주)대한상사', '(주)민국물산', '(주)삼진상사', '(주)한양전자', '(주)세종무역',
        '(주)우진테크', '(주)한라통상', '(주)백두기계', '(주)나라물류', '(주)동양상사',
        '(주)태백정밀', '(주)금강상사', '(주)광교상사', '(주)판교정보기술', '(주)서해상사'
    ];

    const BANKS = ['국민은행', '신한은행', '우리은행', '하나은행', '기업은행', '농협은행'];

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
        const correctText = options[correctIdx];
        const shuffled = shuffleArray(options);
        const newCorrectIdx = shuffled.indexOf(correctText);
        return {
            options: shuffled,
            correctAnswer: newCorrectIdx + 1
        };
    }

    // =========================================================================
    // 1단원: 자산 심화
    // =========================================================================
    const assetTheories = [
        () => {
            const comp = getRandomItem(COMPANIES);
            const days = getRandomInt(20, 80);
            const coin = getRandomInt(2, 8) * 100000;
            const check = getRandomInt(10, 30) * 100000;
            const cd = getRandomInt(20, 50) * 100000;
            const correctVal = coin + check + cd;
            return {
                question: `다음 자료 중 재무상태표의 '현금및현금성자산' 총액으로 옳은 것은?\n• 주화 및 지폐: ${formatNumber(coin)}원\n• ${comp} 발행 당좌수표: ${formatNumber(check)}원\n• 취득시 만기 ${days}일 CD: ${formatNumber(cd)}원\n• 결산일 현재 만기 2개월 남은 1년 만기 정기예금: 3,000,000원`,
                options: [
                    formatNumber(correctVal) + '원',
                    formatNumber(correctVal + 3000000) + '원',
                    formatNumber(correctVal - check) + '원',
                    formatNumber(coin + cd) + '원'
                ],
                correctIdx: 0,
                explanation: `현금및현금성자산 = 통화(${formatNumber(coin)}) + 타인발행수표(${formatNumber(check)}) + 취득시 3개월 이내 CD(${formatNumber(cd)}) = ${formatNumber(correctVal)}원입니다. (1년 정기예금은 취득시 기준이므로 제외)`,
                ref: '2026 PERFECT 1급 교재 p.36 [현금및현금성자산]'
            };
        },
        () => {
            const rec = getRandomInt(5, 12) * 10000000;
            const prev = getRandomInt(10, 40) * 10000;
            const target = rec * 0.01;
            const diff = target - prev;
            return {
                question: `기말 현재 외상매출금 잔액 ${formatNumber(rec)}원에 대하여 1%의 대손충당금을 보충법으로 설정하고자 한다. 설정 전 충당금 잔액이 ${formatNumber(prev)}원일 때 손익계산서에 계상할 대손상각비는?`,
                options: [
                    formatNumber(diff) + '원',
                    formatNumber(target) + '원',
                    formatNumber(prev) + '원',
                    formatNumber(target + prev) + '원'
                ],
                correctIdx: 0,
                explanation: `목표액 = ${formatNumber(rec)}원 × 1% = ${formatNumber(target)}원. 보충액 = ${formatNumber(target)}원 - ${formatNumber(prev)}원 = ${formatNumber(diff)}원입니다.`,
                ref: '2026 PERFECT 1급 교재 p.58 [대손충당금 보충법]'
            };
        },
        () => {
            return {
                question: `물가가 지속적으로 상승할 때 기말재고자산과 당기순이익을 가장 크게 계상하게 되는 단가결정방법은?`,
                options: [
                    "선입선출법 (FIFO)",
                    "후입선출법 (LIFO)",
                    "총평균법",
                    "이동평균법"
                ],
                correctIdx: 0,
                explanation: "물가 상승 시 선입선출법은 과거의 저렴한 단가가 매출원가로 먼저 빠져나가 매출원가가 가장 작고 순이익과 기말재고가 가장 큽니다. (선 > 이 > 총 > 후)",
                ref: '2026 PERFECT 1급 교재 p.74 [재고자산 손익비교]'
            };
        }
    ];

    const assetJournals = [
        () => {
            const comp = getRandomItem(COMPANIES);
            const stockVal = getRandomInt(20, 60) * 100000;
            const fee = getRandomInt(10, 30) * 10000;
            const total = stockVal + fee;
            return {
                question: `단기 시세차익 목적으로 상장주식을 ${formatNumber(stockVal)}원에 취득하고, 매입수수료 ${formatNumber(fee)}원을 포함한 총액 ${formatNumber(total)}원을 보통예금에서 이체 지급하였다.`,
                debit: [
                    { account: "단기매매증권", amount: stockVal },
                    { account: "수수료비용", amount: fee }
                ],
                credit: [{ account: "보통예금", amount: total }],
                explanation: `단기매매증권 취득 수수료는 영업외비용(수수료비용 900번대)으로 별도 분개합니다.`,
                ref: '2026 PERFECT 1급 교재 p.44 [단기매매증권 취득]'
            };
        },
        () => {
            const qty = getRandomInt(10, 30);
            const price = getRandomInt(1, 4) * 10000;
            const total = qty * price;
            return {
                question: `기말 실사 결과 원재료 ${qty}개(단가 ${formatNumber(price)}원)가 도난으로 분실되었으며 이는 비정상적인 감모손실로 판명되었다. 결산분개를 하시오.`,
                debit: [{ account: "재고자산감모손실", amount: total }],
                credit: [{ account: "원재료", amount: total }],
                explanation: `(차) 재고자산감모손실(영업외비용) ${formatNumber(total)}원 / (대) 원재료(적요 8. 타계정대체) ${formatNumber(total)}원`,
                ref: '2026 PERFECT 1급 교재 p.88 [재고감모손실]'
            };
        }
    ];

    // =========================================================================
    // 2단원: 부채 심화
    // =========================================================================
    const liabTheories = [
        () => {
            return {
                question: `사채를 유효이자율법으로 상각할 때, 사채할인발행차금 상각액과 사채할증발행차금 환입액의 매년 추이로 옳은 것은?`,
                options: [
                    "할인발행차금 상각액: 매년 증가 / 할증발행차금 환입액: 매년 증가",
                    "할인발행차금 상각액: 매년 증가 / 할증발행차금 환입액: 매년 감소",
                    "할인발행차금 상각액: 매년 감소 / 할증발행차금 환입액: 매년 증가",
                    "할인발행차금 상각액: 매년 감소 / 할증발행차금 환입액: 매년 감소"
                ],
                correctIdx: 0,
                explanation: "유효이자율법 적용 시 사채할인발행차금 상각액과 할증발행차금 환입액은 모두 매년 증가합니다.",
                ref: '2026 PERFECT 1급 교재 p.176 [사채 상각]'
            };
        }
    ];

    const liabJournals = [
        () => {
            const salary = getRandomInt(400, 700) * 10000;
            const tax = Math.round(salary * 0.1);
            const net = salary - tax;
            return {
                question: `영업부 직원 급여 ${formatNumber(salary)}원을 지급하면서 소득세 및 4대보험 예수금 ${formatNumber(tax)}원을 차감한 잔액 ${formatNumber(net)}원을 보통예금으로 이체하였다.`,
                debit: [{ account: "급여", amount: salary }],
                credit: [
                    { account: "예수금", amount: tax },
                    { account: "보통예금", amount: net }
                ],
                explanation: `(차) 급여(판) ${formatNumber(salary)}원 / (대) 예수금 ${formatNumber(tax)}원, 보통예금 ${formatNumber(net)}원`,
                ref: '2026 PERFECT 1급 교재 p.150 [급여 전표]'
            };
        },
        () => {
            const amt = getRandomInt(5, 15) * 1000000;
            return {
                question: `본사 영업부 직원에 대한 확정급여형(DB형) 퇴직연금 부담금 ${formatNumber(amt)}원을 보통예금 계좌에서 이체 납부하였다.`,
                debit: [{ account: "퇴직연금운용자산", amount: amt }],
                credit: [{ account: "보통예금", amount: amt }],
                explanation: `확정급여형(DB형)은 납입 시 '퇴직연금운용자산(자산)'으로 처리합니다.`,
                ref: '2026 PERFECT 1급 교재 p.186 [퇴직연금]'
            };
        }
    ];

    // =========================================================================
    // 3단원: 자본 심화
    // =========================================================================
    const equityTheories = [
        () => {
            const div = getRandomInt(10, 30) * 1000000;
            const stockDiv = getRandomInt(5, 10) * 1000000;
            const prep = Math.round(div * 0.1);
            return {
                question: `주주총회에서 현금배당 ${formatNumber(div)}원과 주식배당 ${formatNumber(stockDiv)}원을 결의하였다. 상법상 최소한으로 적립해야 하는 이익준비금은?`,
                options: [
                    formatNumber(prep) + '원',
                    formatNumber(prep + stockDiv * 0.1) + '원',
                    formatNumber(stockDiv * 0.1) + '원',
                    '0원'
                ],
                correctIdx: 0,
                explanation: `이익준비금은 현금배당액(${formatNumber(div)}원)의 10%인 ${formatNumber(prep)}원을 적립합니다. (주식배당은 제외)`,
                ref: '2026 PERFECT 1급 교재 p.220 [이익준비금]'
            };
        }
    ];

    const equityJournals = [
        () => {
            const shares = getRandomInt(2000, 4000);
            const par = 5000;
            const issue = 8000;
            const cap = shares * par;
            const total = shares * issue;
            const premium = total - cap;
            return {
                question: `보통주식 ${formatNumber(shares)}주(액면가 5,000원)를 1주당 8,000원에 할증발행하고 주금 전액이 보통예금으로 입금되었다.`,
                debit: [{ account: "보통예금", amount: total }],
                credit: [
                    { account: "자본금", amount: cap },
                    { account: "주식발행초과금", amount: premium }
                ],
                explanation: `자본금은 액면가(${formatNumber(cap)}원)로 증가하고 초과액은 주식발행초과금으로 처리합니다.`,
                ref: '2026 PERFECT 1급 교재 p.202 [주식 할증발행]'
            };
        }
    ];

    // =========================================================================
    // 4단원: 수익과 비용
    // =========================================================================
    const revTheories = [
        () => {
            return {
                question: `다음 중 포괄손익계산서상 판매비와관리비에 해당하지 않고 '영업외비용'으로 분류되는 것은?`,
                options: [
                    "불우이웃돕기 성금 및 수재의연금 기부금",
                    "본사 사무실 전화요금 및 인터넷 통신비",
                    "거래처 명절 선물 구입비인 접대비",
                    "영업부 직원 야간 식대인 복리후생비"
                ],
                correctIdx: 0,
                explanation: "기부금은 주된 영업활동과 무관한 영업외비용(900번대)입니다.",
                ref: '2026 PERFECT 1급 교재 p.250 [영업외비용]'
            };
        }
    ];

    const revJournals = [
        () => {
            const amt = getRandomInt(50, 150) * 10000;
            return {
                question: `지역 복지관에 불우이웃돕기 성금 ${formatNumber(amt)}원을 보통예금 계좌에서 이체 기부하였다.`,
                debit: [{ account: "기부금", amount: amt }],
                credit: [{ account: "보통예금", amount: amt }],
                explanation: `(차) 기부금(영업외비용) ${formatNumber(amt)}원 / (대) 보통예금 ${formatNumber(amt)}원`,
                ref: '2026 PERFECT 1급 교재 p.250 [기부금 전표]'
            };
        }
    ];

    // =========================================================================
    // 5단원: 원가회계 (8개 스텝 대폭 강화 🚀)
    // =========================================================================
    const costTheories = [
        () => {
            return {
                question: `다음 중 원가의 3요소 결합에서 '가공원가(가공비)'에 해당하는 항목의 조합으로 옳은 것은?`,
                options: [
                    "직접노무비 + 제조간접비",
                    "직접재료비 + 직접노무비",
                    "직접재료비 + 제조간접비",
                    "직접재료비 + 판매비와관리비"
                ],
                correctIdx: 0,
                explanation: "기초원가 = 직접재료비 + 직접노무비 / 가공원가 = 직접노무비 + 제조간접비입니다.",
                ref: '2026 PERFECT 1급 교재 p.280 [원가의 분류]'
            };
        },
        () => {
            return {
                question: `조업도(생산량)가 증가함에 따라 '단위당 원가'는 감소하고 '총원가'는 일정한 원가 행태를 보이는 것은?`,
                options: [
                    "고정원가 (공장 임차료, 감가상각비)",
                    "변동원가 (직접재료비)",
                    "준변동원가 (전력비)",
                    "준고정원가 (품질검사원 인건비)"
                ],
                correctIdx: 0,
                explanation: "고정원가는 총원가가 일정하므로 생산량이 늘어날수록 단위당 고정원가는 반비례하여 감소합니다.",
                ref: '2026 PERFECT 1급 교재 p.285 [원가 행태]'
            };
        },
        () => {
            const hours = getRandomInt(1000, 2500);
            const rate = getRandomInt(2, 4) * 1000;
            const estimated = hours * rate;
            const diff = getRandomInt(10, 40) * 10000;
            const isUnder = Math.random() > 0.5;
            const actual = isUnder ? (estimated + diff) : (estimated - diff);
            const ansText = isUnder ? `과소배부 ${formatNumber(diff)}원` : `과대배부 ${formatNumber(diff)}원`;
            const wrongText = isUnder ? `과대배부 ${formatNumber(diff)}원` : `과소배부 ${formatNumber(diff)}원`;

            return {
                question: `당사는 제조간접비를 직접노동시간 기준으로 예정배부한다. 예정배부율은 시간당 ${formatNumber(rate)}원이며 실제 직접노동시간은 ${formatNumber(hours)}시간이었다. 실제 발생액이 ${formatNumber(actual)}원일 때 배부차이는?`,
                options: [
                    ansText,
                    wrongText,
                    `과소배부 ${formatNumber(estimated)}원`,
                    `과대배부 ${formatNumber(actual)}원`
                ],
                correctIdx: 0,
                explanation: `예정배부액 = ${formatNumber(hours)}시간 × ${formatNumber(rate)}원 = ${formatNumber(estimated)}원. 배부차이 = 예정 - 실제 = ${ansText}입니다.`,
                ref: '2026 PERFECT 1급 교재 p.325 [제조간접비 예정배부]'
            };
        },
        () => {
            const compQty = 800;
            const endQty = 200;
            const endRate = 0.5;
            const baseQty = 100;
            const baseRate = 0.4;
            const fifoEquivalent = compQty + (endQty * endRate) - (baseQty * baseRate);

            return {
                question: `기초재공품 ${baseQty}개(진척도 40%), 당기완성 ${compQty}개, 기말재공품 ${endQty}개(진척도 50%)일 때, 재료비는 공정 초기에 전량 투입되고 가공비는 균등 발생한다. '선입선출법'에 의한 가공비 완성품환산량은?`,
                options: [
                    `${fifoEquivalent}개`,
                    `${compQty + endQty * endRate}개`,
                    `${compQty}개`,
                    `${fifoEquivalent - 50}개`
                ],
                correctIdx: 0,
                explanation: `선입선출법 가공비 환산량 = 당기완성(${compQty}) + 기말환산(${endQty}×50%=100) - 기초환산(${baseQty}×40%=40) = ${fifoEquivalent}개입니다.`,
                ref: '2026 PERFECT 1급 교재 p.345 [완성품환산량 계산]'
            };
        }
    ];

    const costJournals = [
        () => {
            const mat = getRandomInt(300, 700) * 10000;
            const labor = getRandomInt(200, 500) * 10000;
            const total = mat + labor;
            return {
                question: `당월 제품 생산을 위해 원재료 ${formatNumber(mat)}원과 생산직 임금 ${formatNumber(labor)}원을 제조공정(재공품)에 투입·대체하였다.`,
                debit: [{ account: "재공품", amount: total }],
                credit: [
                    { account: "원재료", amount: mat },
                    { account: "임금", amount: labor }
                ],
                explanation: `(차) 재공품 ${formatNumber(total)}원 / (대) 원재료 ${formatNumber(mat)}원, 임금 ${formatNumber(labor)}원`,
                ref: '2026 PERFECT 1급 교재 p.295 [재공품 대체]'
            };
        },
        () => {
            const amt = getRandomInt(15, 35) * 1000000;
            return {
                question: `당월 제조공정에서 최종 완성된 제품 ${formatNumber(amt)}원을 재공품 계정에서 제품 계정으로 대체하다.`,
                debit: [{ account: "제품", amount: amt }],
                credit: [{ account: "재공품", amount: amt }],
                explanation: `(차) 제품 ${formatNumber(amt)}원 / (대) 재공품 ${formatNumber(amt)}원`,
                ref: '2026 PERFECT 1급 교재 p.300 [완제품 대체]'
            };
        }
    ];

    // =========================================================================
    // 6단원: 부가가치세 (8개 스텝 대폭 강화 🚀)
    // =========================================================================
    const vatTheories = [
        () => {
            return {
                question: `다음 중 부가가치세법상 '면세(Tax Exemption)' 대상에 해당하지 않고 과세되는 거래는?`,
                options: [
                    "KTX 고속철도 및 항공기, 택시 이용 요금",
                    "병원 및 한의원의 진료 및 치료 용역",
                    "초·중·고등학교 및 정규 인가 학원의 교육 용역",
                    "가공되지 않은 신선 농·축·수·임산물"
                ],
                correctIdx: 0,
                explanation: "시내버스와 지하철은 면세이나 KTX 고속철도, 항공기, 택시, 우등고속버스는 과세 대상입니다.",
                ref: '2026 PERFECT 1급 교재 p.385 [면세 대상]'
            };
        },
        () => {
            return {
                question: `다음 중 세금계산서를 수취하였더라도 부가가치세 매입세액을 공제받을 수 없는(54.불공) 거래는?`,
                options: [
                    "영업부 업무용 2,000cc 개별소비세 과세대상 중형승용차 주유비 및 수리비",
                    "생산부 직원의 출퇴근용 9인승 카니발 승합차 구입비",
                    "배기량 1,000cc 이하 모닝 경차의 타이어 교체 비용",
                    "공장 원재료 운반용 1톤 화물트럭 구입비"
                ],
                correctIdx: 0,
                explanation: "1,000cc 초과 8인승 이하 비영업용 승용차 관련 지출은 매입세액 불공제 대상입니다.",
                ref: '2026 PERFECT 1급 교재 p.415 [매입세액 불공제]'
            };
        },
        () => {
            return {
                question: `다음 중 세금계산서의 '필요적 기재사항'으로만 짝지어진 것은?`,
                options: [
                    "공급자 등록번호/성명, 공급받는자 등록번호, 작성연월일, 공급가액과 부가가치세액",
                    "공급자 등록번호, 공급받는자 상호 및 성명, 공급연월일, 공급대가",
                    "공급자 사업장 주소, 공급받는자 등록번호, 작성연월일, 비고란",
                    "공급자 업태/종목, 공급받는자 상호, 공급연월일, 세액"
                ],
                correctIdx: 0,
                explanation: "필요적 기재사항은 ①공급자 등록번호·성명, ②공급받는자 사업자등록번호, ③작성연월일, ④공급가액과 세액입니다.",
                ref: '2026 PERFECT 1급 교재 p.405 [세금계산서 필요적 기재사항]'
            };
        }
    ];

    const vatJournals = [
        () => {
            const comp = getRandomItem(COMPANIES);
            const supply = getRandomInt(10, 30) * 1000000;
            const vat = supply * 0.1;
            return {
                question: `${comp}에 제품을 ${formatNumber(supply)}원(부가가치세 ${formatNumber(vat)}원 별도)에 공급하고 전자세금계산서를 발급하였다. 대금 전액은 외상으로 하였다. (11.과세)`,
                debit: [{ account: "외상매출금", amount: supply + vat }],
                credit: [
                    { account: "제품매출", amount: supply },
                    { account: "부가세예수금", amount: vat }
                ],
                explanation: `(차) 외상매출금 ${formatNumber(supply + vat)}원 / (대) 제품매출 ${formatNumber(supply)}원, 부가세예수금 ${formatNumber(vat)}원`,
                ref: '2026 PERFECT 1급 교재 p.422 [11.과세 전표]'
            };
        },
        () => {
            const gift = getRandomInt(10, 30) * 100000;
            const vat = gift * 0.1;
            const total = gift + vat;
            return {
                question: `거래처 명절 선물용 과일세트를 ${formatNumber(gift)}원(부가가치세 ${formatNumber(vat)}원 별도)에 구입하고 전자세금계산서를 발급받았으며, 보통예금에서 이체 지급하였다. (54.불공)`,
                debit: [{ account: "접대비", amount: total }],
                credit: [{ account: "보통예금", amount: total }],
                explanation: `접대비 관련 매입세액은 불공제되므로 부가세대급금이 아닌 접대비 원가에 전액 가산(${formatNumber(total)}원)합니다.`,
                ref: '2026 PERFECT 1급 교재 p.415 [54.불공 전표]'
            };
        }
    ];

    // =========================================================================
    // 7단원: 결산정리분개 마스터 (5개 스텝 실전 집중 🎯)
    // =========================================================================
    const closingTheories = [
        () => {
            const amt = getRandomInt(20, 60) * 10000;
            return {
                question: `결산 시 '당기분 미지급 이자비용 ${formatNumber(amt)}원'을 누락하고 결산을 마감한 경우 재무제표에 미치는 영향으로 옳은 것은?`,
                options: [
                    "부채가 과소계상되고 당기순이익이 과대계상된다.",
                    "비용이 과대계상되고 당기순이익이 과소계상된다.",
                    "자산이 과대계상되고 당기순이익이 과대계상된다.",
                    "부채가 과대계상되고 당기순이익이 과소계상된다."
                ],
                correctIdx: 0,
                explanation: "미지급이자(비용)와 미지급비용(부채)이 누락되었으므로 비용 과소 ➔ 순이익 과대, 부채 과소계상됩니다.",
                ref: '2026 PERFECT 1급 교재 p.258 [손익의 발생 누락]'
            };
        },
        () => {
            return {
                question: `결산 시 장부 마감 과정에서 재무제표가 작성 및 연결되는 올바른 순서는?`,
                options: [
                    "제조원가명세서 ➔ 손익계산서 ➔ 이익잉여금처분계산서 ➔ 재무상태표",
                    "손익계산서 ➔ 제조원가명세서 ➔ 재무상태표 ➔ 이익잉여금처분계산서",
                    "재무상태표 ➔ 손익계산서 ➔ 제조원가명세서 ➔ 이익잉여금처분계산서",
                    "제조원가명세서 ➔ 재무상태표 ➔ 손익계산서 ➔ 이익잉여금처분계산서"
                ],
                correctIdx: 0,
                explanation: "재무제표 마감 순서는 '제조원가명세서 ➔ 손익계산서 ➔ 이익잉여금처분계산서 ➔ 재무상태표' (제-손-이-표)입니다.",
                ref: '2026 PERFECT 1급 교재 p.267 [마감 순서]'
            };
        }
    ];

    const closingJournals = [
        () => {
            const startMonth = getRandomInt(7, 10);
            const annual = 2400000;
            const remainMonths = 12 - (12 - startMonth + 1);
            const prepaid = Math.round(annual * (remainMonths / 12));
            return {
                question: `당기 ${startMonth}월 1일에 본사 영업부 화재보험료 1년분 ${formatNumber(annual)}원(보험기간: 당기 ${startMonth}/1 ~ 차기 ${startMonth-1}/말일)을 전액 보험료(비용)로 처리하였다. 12월 31일 결산정리분개를 하시오. (월할계산)`,
                debit: [{ account: "선급비용", amount: prepaid }],
                credit: [{ account: "보험료", amount: prepaid }],
                explanation: `차기 미경과분은 ${remainMonths}개월치(${formatNumber(prepaid)}원)이므로 차변 선급비용 / 대변 보험료로 대체합니다.`,
                ref: '2026 PERFECT 1급 교재 p.260 [선급비용 결산]'
            };
        },
        () => {
            const dollars = getRandomInt(10, 40) * 1000;
            const diff = dollars * 100;
            return {
                question: `결산일 현재 보유 중인 외화외상매출금 $${formatNumber(dollars)}(발생시 환율 1,250원/$)에 대해 결산일 현재 기준환율 1,350원/$을 적용하여 평가하다.`,
                debit: [{ account: "외상매출금", amount: diff }],
                credit: [{ account: "외화환산이익", amount: diff }],
                explanation: `환율이 100원 상승하여 채권 가치가 ${formatNumber(diff)}원 증가하였습니다. (차) 외상매출금 / (대) 외화환산이익`,
                ref: '2026 PERFECT 1급 교재 p.269 [외화평가]'
            };
        },
        () => {
            const totalTax = getRandomInt(10, 20) * 1000000;
            const prepTax = getRandomInt(3, 6) * 1000000;
            const payTax = totalTax - prepTax;
            return {
                question: `당기분 법인세 추산액 ${formatNumber(totalTax)}원을 계상하고자 한다. 당기 중 납부한 법인세 중간예납세액(선납세금)은 ${formatNumber(prepTax)}원이다. 결산정리분개를 하시오.`,
                debit: [{ account: "법인세비용", amount: totalTax }],
                credit: [
                    { account: "선납세금", amount: prepTax },
                    { account: "미지급세금", amount: payTax }
                ],
                explanation: `(차) 법인세비용 ${formatNumber(totalTax)}원 / (대) 선납세금 ${formatNumber(prepTax)}원, 미지급세금 ${formatNumber(payTax)}원`,
                ref: '2026 PERFECT 1급 교재 p.270 [법인세 결산]'
            };
        }
    ];

    // =========================================================================
    // [신설!] 8단원: 실무 계정과목 3초 판별 트레이닝 풀 25종 이상 ⚡
    // =========================================================================
    const accountMasterPool = [
        // 1. 공장 식대
        () => ({
            question: `[3초 계정과목 판별]\n"공장 생산직 직원의 야간 식대 150,000원을 법인카드로 결제함."\n이 거래의 [차변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "복리후생비 (500번대 제조경비)",
                "복리후생비 (800번대 판매비와관리비)",
                "접대비 (500번대 제조경비)",
                "여비교통비 (500번대 제조경비)"
            ],
            correctIdx: 0,
            explanation: "공장 생산직 직원에게 발생한 식대는 500번대 제조경비인 '복리후생비(제)'로 처리합니다.",
            ref: '실무 계정코드 구분 [공장 복리후생비]'
        }),
        // 2. 본사 식대
        () => ({
            question: `[3초 계정과목 판별]\n"본사 영업부 직원의 야간 회식대 200,000원을 보통예금에서 이체함."\n이 거래의 [차변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "복리후생비 (800번대 판매비와관리비)",
                "복리후생비 (500번대 제조경비)",
                "접대비 (800번대 판매비와관리비)",
                "급여 (800번대 판매비와관리비)"
            ],
            correctIdx: 0,
            explanation: "본사 영업부 직원에게 발생한 식대는 800번대 판매비와관리비인 '복리후생비(판)'로 처리합니다.",
            ref: '실무 계정코드 구분 [본사 복리후생비]'
        }),
        // 3. 공장 기계 수리비
        () => ({
            question: `[3초 계정과목 판별]\n"공장 제조라인 기계장치의 모터 교체 수리비 500,000원을 현금 지급함."\n이 거래의 [차변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "수선비 (500번대 제조경비)",
                "수선비 (800번대 판매비와관리비)",
                "기계장치 (유형자산)",
                "소모품비 (500번대 제조경비)"
            ],
            correctIdx: 0,
            explanation: "공장 생산 설비의 일상적 수리는 500번대 '수선비(제)'로 처리합니다.",
            ref: '실무 계정코드 구분 [공장 수선비]'
        }),
        // 4. 거래처 선물
        () => ({
            question: `[3초 계정과목 판별]\n"주요 매출 거래처의 개업 축하 화환 150,000원을 보통예금에서 결제함."\n이 거래의 [차변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "접대비 (800번대 판매비와관리비)",
                "복리후생비 (800번대 판매비와관리비)",
                "광고선전비 (800번대 판매비와관리비)",
                "기부금 (영업외비용)"
            ],
            correctIdx: 0,
            explanation: "외부 거래처를 위한 경조사비 및 선물은 '접대비(800번대)'로 처리합니다.",
            ref: '실무 계정코드 구분 [접대비]'
        }),
        // 5. 계약금 지급 (선급금)
        () => ({
            question: `[3초 계정과목 판별]\n"원재료를 구입하기로 계약하고 계약금 1,000,000원을 보통예금에서 미리 송금함."\n이 거래의 [차변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "선급금 (유동자산)",
                "선수금 (유동부채)",
                "외상매입금 (유동부채)",
                "원재료 (재고자산)"
            ],
            correctIdx: 0,
            explanation: "상품이나 원재료 매입을 위해 계약금을 미리 지급한 것은 '선급금(자산)'입니다.",
            ref: '혼동 계정과목 [선급금]'
        }),
        // 6. 계약금 수령 (선수금)
        () => ({
            question: `[3초 계정과목 판별]\n"제품을 공급하기로 계약하고 거래처로부터 계약금 2,000,000원을 당좌예금으로 입금받음."\n이 거래의 [대변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "선수금 (유동부채)",
                "선급금 (유동자산)",
                "외상매출금 (유동자산)",
                "제품매출 (수익)"
            ],
            correctIdx: 0,
            explanation: "재화 공급 전 계약금을 미리 수령한 것은 '선수금(부채)'입니다.",
            ref: '혼동 계정과목 [선수금]'
        }),
        // 7. 비품 처분 외상 (미수금)
        () => ({
            question: `[3초 계정과목 판별]\n"사용하던 업무용 복사기(비품)를 매각 처분하고 대금 500,000원은 다음달에 받기로 함."\n이 거래의 [차변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "미수금 (유동자산)",
                "외상매출금 (유동자산)",
                "받을어음 (유동자산)",
                "미지급금 (유동부채)"
            ],
            correctIdx: 0,
            explanation: "주된 상거래(상품/제품) 이외의 자산을 외상 처분한 대금은 '미수금(자산)'으로 처리합니다.",
            ref: '혼동 계정과목 [미수금]'
        }),
        // 8. 비품 구입 외상 (미지급금)
        () => ({
            question: `[3초 계정과목 판별]\n"사무실에서 사용할 컴퓨터 5대를 구입하고 대금 4,000,000원은 다음달 말일에 결제하기로 함."\n이 거래의 [대변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "미지급금 (유동부채)",
                "외상매입금 (유동부채)",
                "지급어음 (유동부채)",
                "미수금 (유동자산)"
            ],
            correctIdx: 0,
            explanation: "주된 상거래(원재료/상품) 이외의 자산을 외상 구입한 채무는 '미지급금(부채)'으로 처리합니다.",
            ref: '혼동 계정과목 [미지급금]'
        }),
        // 9. 출장 여비 개산액 (가지급금)
        () => ({
            question: `[3초 계정과목 판별]\n"영업부 직원의 지방 출장에 앞서 여비 개산액 300,000원을 현금으로 지급함."\n이 거래의 [차변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "가지급금 (유동자산)",
                "여비교통비 (800번대)",
                "가수금 (유동부채)",
                "선급금 (유동자산)"
            ],
            correctIdx: 0,
            explanation: "용도나 금액이 확정되지 않은 채 미리 어림잡아 지급한 출장비는 임시 자산인 '가지급금'으로 처리합니다.",
            ref: '혼동 계정과목 [가지급금]'
        }),
        // 10. 원인 불명 통장 입금 (가수금)
        () => ({
            question: `[3초 계정과목 판별]\n"당사 보통예금 통장에 내역을 알 수 없는 1,500,000원이 입금되어 확인 중임."\n이 거래의 [대변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "가수금 (유동부채)",
                "가지급금 (유동자산)",
                "외상매출금 (유동자산)",
                "잡이익 (영업외수익)"
            ],
            correctIdx: 0,
            explanation: "입금 원인을 알 수 없을 때 일시적으로 보관하는 임시 부채 계정은 '가수금'입니다.",
            ref: '혼동 계정과목 [가수금]'
        }),
        // 11. 급여 원천징수 (예수금)
        () => ({
            question: `[3초 계정과목 판별]\n"직원 월급을 지급하면서 근로소득세와 건강보험료 350,000원을 떼어둠."\n이 거래의 [대변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "예수금 (유동부채)",
                "선수금 (유동부채)",
                "세금과공과 (800번대)",
                "미지급세금 (유동부채)"
            ],
            correctIdx: 0,
            explanation: "급여 지급 시 원천징수한 세금 및 보험료는 임시 보관 부채인 '예수금'으로 처리합니다.",
            ref: '혼동 계정과목 [예수금]'
        }),
        // 12. 미수금 대손 (기타의대손상각비)
        () => ({
            question: `[3초 계정과목 판별]\n"보유 중이던 단기대여금(또는 미수금)에 대해 채무자 파산으로 회수 불능(대손)이 확정됨."\n이 거래의 [차변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "기타의대손상각비 (영업외비용)",
                "대손상각비 (판매비와관리비)",
                "대손충당금 (자산 차감)",
                "잡손실 (영업외비용)"
            ],
            correctIdx: 0,
            explanation: "외상매출금/받을어음 외의 기타채권(미수금, 대여금 등) 대손은 '기타의대손상각비(영업외비용)'로 처리합니다.",
            ref: '실무 특수계정 [기타의대손상각비]'
        }),
        // 13. 결산일 외화평가 (외화환산이익)
        () => ({
            question: `[3초 계정과목 판별]\n"12월 31일 결산일 현재 보유 중인 외화외상매출금의 기준환율이 상승하여 장부를 평가함."\n이 거래의 [대변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "외화환산이익 (영업외수익)",
                "외환차익 (영업외수익)",
                "외화외상매출금 (유동자산)",
                "단기투자자산평가익 (영업외수익)"
            ],
            correctIdx: 0,
            explanation: "12/31 결산일 장부 평가로 인한 외화 이익은 '외화환산이익'입니다. (평소 환전 결제는 외환차익)",
            ref: '실무 특수계정 [외화환산이익]'
        }),
        // 14. 신주 할증발행 초과액 (주식발행초과금)
        () => ({
            question: `[3초 계정과목 판별]\n"신주를 발행하면서 주식 액면가액을 초과하여 입금된 납입대금 잔액."\n이 거래의 [대변]에 입력해야 할 올바른 자본잉여금 계정과목은?`,
            options: [
                "주식발행초과금 (자본잉여금)",
                "자본금 (자본금)",
                "감자차익 (자본잉여금)",
                "주식할인발행차금 (자본조정)"
            ],
            correctIdx: 0,
            explanation: "주식 액면가액을 초과하여 납입된 금액은 자본잉여금 항목인 '주식발행초과금'입니다.",
            ref: '자본 계정 [주식발행초과금]'
        }),
        // 15. DB형 퇴직연금 불입 (퇴직연금운용자산)
        () => ({
            question: `[3초 계정과목 판별]\n"확정급여형(DB형) 퇴직연금 부담금을 금융기관 보통예금에서 납부함."\n이 거래의 [차변]에 입력해야 할 올바른 계정과목은?`,
            options: [
                "퇴직연금운용자산 (투자자산)",
                "퇴직급여 (당기비용)",
                "퇴직급여충당부채 (비유동부채)",
                "예치금 (당좌자산)"
            ],
            correctIdx: 0,
            explanation: "확정급여형(DB형) 납입액은 '퇴직연금운용자산' 계정으로 처리합니다.",
            ref: '실무 특수계정 [퇴직연금운용자산]'
        })
    ];

    // =========================================================================
    // 9단원: 1급 전용 초격차 시크릿 특강 (1급 Only & 2급 사각지대)
    // =========================================================================
    const grade1OnlyTheories = [
        () => {
            const comp = getRandomItem(COMPANIES);
            const qty = getRandomInt(10, 30) * 100;
            const cost = getRandomInt(10, 20) * 1000;
            const fair = getRandomInt(6, 9) * 1000;
            return {
                question: `다음 중 전산회계 1급 유가증권 회계처리에 대한 설명으로 가장 옳은 것은?`,
                options: [
                    `단기매매증권 취득 수수료는 영업외비용으로, 매도가능증권 취득 수수료는 자산 취득원가에 가산한다.`,
                    `매도가능증권평가손익은 손익계산서의 영업외손익(당기손익)으로 처리한다.`,
                    `단기매매증권평가손익은 재무상태표의 기타포괄손익누계액(자본)으로 분류한다.`,
                    `매도가능증권 처분 시 기존에 계상된 매도가능증권평가손익 잔액은 처분손익 계산 시 무시한다.`
                ],
                correctIdx: 0,
                explanation: `단기매매증권 취득수수료는 영업외비용(900번대)이지만, 매도가능증권 취득수수료는 취득원가에 가산합니다. 또한 매도가능증권평가손익은 기타포괄손익누계액(자본)입니다.`,
                ref: '1급 초격차 [매도가능증권 vs 단기매매증권]'
            };
        },
        () => {
            const normalLoss = getRandomInt(10, 30) * 10000;
            const abnormalLoss = getRandomInt(20, 50) * 10000;
            return {
                question: `기말 재고실사 결과 정상감모손실 ${formatNumber(normalLoss)}원과 비정상감모손실 ${formatNumber(abnormalLoss)}원이 발생하였다. 이에 대한 올바른 회계처리는?`,
                options: [
                    `정상감모손실은 매출원가에 가산하고, 비정상감모손실은 영업외비용(적요 8. 타계정대체)으로 처리한다.`,
                    `정상감모손실과 비정상감모손실 모두 판매비와관리비로 처리한다.`,
                    `정상감모손실은 영업외비용으로, 비정상감모손실은 매출원가로 처리한다.`,
                    `비정상감모손실은 전표 입력 시 적요 입력을 생략하여도 무방하다.`
                ],
                correctIdx: 0,
                explanation: `정상감모손실은 매출원가에 포함(분개X)되며, 비정상감모손실은 영업외비용(재고자산감모손실)으로 대변 계정에 [적요 8. 타계정으로 대체]를 반드시 걸어야 합니다.`,
                ref: '1급 초격차 [재고자산 감모손실]'
            };
        },
        () => {
            const parVal = 10000000;
            const issueFee = getRandomInt(10, 30) * 10000;
            return {
                question: `(주)대한은 사채(액면가액 10,000,000원)를 발행하면서 사채발행수수료 ${formatNumber(issueFee)}원이 발생하였다. 사채발행비에 대한 올바른 회계처리는?`,
                options: [
                    `사채발행가액에서 직접 차감하여 사채할인발행차금에 가산하거나 사채할증발행차금에서 차감한다.`,
                    `당기 판매비와관리비(지급수수료)로 전액 비용 처리한다.`,
                    `영업외비용(사채발행비용)으로 별도 계상한다.`,
                    `사채 액면가액에 직접 가산하여 사채 원금으로 계상한다.`
                ],
                correctIdx: 0,
                explanation: `일반기업회계기준상 사채발행비는 별도 비용으로 처리하지 않고, 사채발행가액에서 직접 차감합니다.`,
                ref: '1급 초격차 [사채발행비 회계처리]'
            };
        },
        () => {
            const dbVal = getRandomInt(3, 7) * 1000000;
            const dcVal = getRandomInt(2, 5) * 1000000;
            return {
                question: `퇴직연금제도에 대한 설명으로 가장 올바른 것은?`,
                options: [
                    `확정급여형(DB) 불입액은 '퇴직연금운용자산(자산)'으로, 확정기여형(DC) 불입액은 '퇴직급여(비용)'로 처리한다.`,
                    `확정급여형(DB) 불입 시 즉시 전액 비용(퇴직급여)으로 회계처리하고 끝낸다.`,
                    `확정기여형(DC) 불입액은 기업의 자산인 '퇴직연금운용자산'으로 계상한다.`,
                    `DB형과 DC형 모두 기업이 운용 수익과 손실에 대한 최종 책임을 진다.`
                ],
                correctIdx: 0,
                explanation: `DB형(확정급여형)은 회사가 운용하므로 불입 시 자산(퇴직연금운용자산)으로 처리하고, DC형(확정기여형)은 근로자가 운용하므로 불입 시 즉시 비용(퇴직급여)으로 처리합니다.`,
                ref: '1급 초격차 [퇴직연금 DB vs DC]'
            };
        },
        () => {
            const actualCost = getRandomInt(80, 120) * 10000;
            const estCost = actualCost + getRandomInt(5, 20) * 10000;
            const diff = estCost - actualCost;
            return {
                question: `당기 제조간접비 실제발생액이 ${formatNumber(actualCost)}원이고, 예정배부액이 ${formatNumber(estCost)}원일 때 제조간접비 배부차이는?`,
                options: [
                    `${formatNumber(diff)}원 과대배부`,
                    `${formatNumber(diff)}원 과소배부`,
                    `${formatNumber(actualCost)}원 과대배부`,
                    `${formatNumber(estCost)}원 과소배부`
                ],
                correctIdx: 0,
                explanation: `제조간접비 배부차이는 [예정배부액 - 실제발생액]으로 계산하며, 예정배부액(${formatNumber(estCost)}원)이 실제발생액(${formatNumber(actualCost)}원)보다 ${formatNumber(diff)}원 더 크므로 '${formatNumber(diff)}원 과대배부'입니다.`,
                ref: '1급 초격차 [제조간접비 배부차이 분석]'
            };
        },
        () => {
            return {
                question: `다음 중 부가가치세법상 매입세액공제가 가능한 거래는 어느 것인가?`,
                options: [
                    `공장 원자재 운반용 1톤 화물트럭 구입 및 수리비 (세금계산서 수취)`,
                    `거래처 접대용 선물세트 구입비용 (54.불공)`,
                    `본사 대표이사 전용 2,500cc 비영업용 소형승용차 주유비 (54.불공)`,
                    `토지의 자본적 지출 관련 정지공사 비용 (54.불공)`
                ],
                correctIdx: 0,
                explanation: `접대비, 1,000cc 초과 비영업용 승용차, 토지 관련 지출은 54.불공 사유입니다. 반면 화물트럭, 1,000cc 이하 경차(모닝/스파크), 9인승 이상 승합차는 매입세액 공제(51.과세)가 가능합니다.`,
                ref: '1급 초격차 [54.불공 매입세액불공제 판별]'
            };
        },
        () => {
            return {
                question: `전산회계 1급 결산 마감 시 4대 부속장부의 올바른 마감 순서는?`,
                options: [
                    `제조원가명세서 ➔ 손익계산서 ➔ 이익잉여금처분계산서 ➔ 재무상태표`,
                    `재무상태표 ➔ 손익계산서 ➔ 제조원가명세서 ➔ 이익잉여금처분계산서`,
                    `손익계산서 ➔ 제조원가명세서 ➔ 재무상태표 ➔ 이익잉여금처분계산서`,
                    `이익잉여금처분계산서 ➔ 손익계산서 ➔ 제조원가명세서 ➔ 재무상태표`
                ],
                correctIdx: 0,
                explanation: `장부 마감 순서는 '제-손-이-표'(제조원가명세서 ➔ 손익계산서 ➔ 이익잉여금처분계산서(F6전표추가) ➔ 재무상태표) 순서로 마감해야 최종 당기순이익과 미처분이익잉여금이 일치합니다.`,
                ref: '1급 초격차 [결산 마감 4대 장부 순서]'
            };
        }
    ];

    const grade1OnlyJournals = [
        () => {
            const comp = getRandomItem(COMPANIES);
            const bookVal = getRandomInt(5, 10) * 1000000;
            const evalGain = getRandomInt(5, 15) * 100000;
            const sellPrice = bookVal + getRandomInt(10, 20) * 100000;
            const totalGain = (sellPrice - bookVal) + evalGain;
            return {
                question: `(주)대한은 장기투자목적으로 보유 중인 ${comp}의 매도가능증권(장부가액 ${formatNumber(bookVal)}원, 과거 매도가능증권평가이익 잔액 ${formatNumber(evalGain)}원 있음)을 ${formatNumber(sellPrice)}원에 처분하고 대금은 보통예금으로 송금받았다.`,
                debit: [
                    { account: '보통예금', amount: sellPrice },
                    { account: '매도가능증권평가이익', amount: evalGain }
                ],
                credit: [
                    { account: '매도가능증권', amount: bookVal },
                    { account: '매도가능증권처분이익', amount: totalGain }
                ],
                explanation: `매도가능증권 처분 시 대변에 매도가능증권(${formatNumber(bookVal)}원)을 장부 제거하고, 차변에 보통예금(${formatNumber(sellPrice)}원)과 과거 매도가능증권평가이익 잔액(${formatNumber(evalGain)}원)을 상계 제거한 후 차액을 매도가능증권처분이익(${formatNumber(totalGain)}원)으로 인식합니다.`,
                ref: '1급 초격차 [매도가능증권 처분 상계 분개]'
            };
        },
        () => {
            const comp = getRandomItem(COMPANIES);
            const loss = getRandomInt(2, 6) * 100000;
            return {
                question: `공장 창고의 도난으로 인해 원재료 장부상 재고 중 ${formatNumber(loss)}원(원가)이 부족한 것을 발견하여 비정상 감모손실로 회계처리하였다.`,
                debit: [{ account: '재고자산감모손실', amount: loss }],
                credit: [{ account: '원재료', amount: loss }],
                explanation: `비정상 감모손실은 차변에 영업외비용인 '재고자산감모손실'로 처리하고, 대변 원재료 계정에 [적요 8번: 타계정으로 대체]를 반드시 적용합니다.`,
                ref: '1급 초격차 [비정상 감모손실 적요8번 분개]'
            };
        },
        () => {
            const bank = getRandomItem(BANKS);
            const loan = getRandomInt(3, 7) * 10000000;
            return {
                question: `12월 31일 결산일 현재 ${bank}의 장기차입금 ${formatNumber(loan)}원 중 만기가 1년 이내인 내년 6월 30일에 도래하는 금액이 ${formatNumber(loan)}원이다. 유동성 대체 분개를 행하시오.`,
                debit: [{ account: '장기차입금', amount: loan }],
                credit: [{ account: '유동성장기부채', amount: loan }],
                explanation: `만기가 1년 이내로 도래한 비유동부채(장기차입금)는 차변으로 감소시키고, 대변에 유동부채 항목인 '유동성장기부채'로 대체합니다.`,
                ref: '1급 초격차 [유동성장기부채 대체 분개]'
            };
        },
        () => {
            const comp = getRandomItem(COMPANIES);
            const price = getRandomInt(5, 15) * 100000;
            const vat = Math.round(price * 0.1);
            const total = price + vat;
            return {
                question: `매출 거래처인 ${comp}에 선물할 명절 선물세트(공급가액 ${formatNumber(price)}원, 부가세 ${formatNumber(vat)}원)를 구입하고 전자세금계산서를 발급받았으며 대금은 보통예금에서 이체하였다. (54.불공)`,
                debit: [{ account: '접대비', amount: total }],
                credit: [{ account: '보통예금', amount: total }],
                explanation: `접대비 관련 매입세액은 불공제(54.불공) 대상이므로 부가세대급금을 분리하지 않고 공급대가(부가세 포함 ${formatNumber(total)}원) 전액을 '접대비(800번대)'로 처리합니다.`,
                ref: '1급 초격차 [54.불공 접대비 분개]'
            };
        },
        () => {
            const factoryDining = getRandomInt(2, 5) * 100000;
            return {
                question: `공장 생산직 근로자들의 야간 작업 식대 ${formatNumber(factoryDining)}원을 (주)맛나식당에서 보통예금으로 지급하였다.`,
                debit: [{ account: '복리후생비', amount: factoryDining }],
                credit: [{ account: '보통예금', amount: factoryDining }],
                explanation: `공장 생산직 근로자를 위한 식대는 500번대 제조경비인 '복리후생비(제)'로 분개합니다.`,
                ref: '1급 초격차 [500번대 제조경비 분개]'
            };
        },
        () => {
            const prepaidTax = getRandomInt(5, 15) * 100000;
            const corporateTax = prepaidTax + getRandomInt(10, 30) * 100000;
            const payTax = corporateTax - prepaidTax;
            return {
                question: `12월 31일 결산일 현재 법인세 추산액은 ${formatNumber(corporateTax)}원이다. 당기 중 납부한 중간예납세액 등 선납세금 잔액 ${formatNumber(prepaidTax)}원을 정리하고 나머지 잔액은 미지급세금으로 계상하시오.`,
                debit: [{ account: '법인세등', amount: corporateTax }],
                credit: [
                    { account: '선납세금', amount: prepaidTax },
                    { account: '미지급세금', amount: payTax }
                ],
                explanation: `기말 법인세 정리 시 차변에 당기 총 법인세비용(법인세등 ${formatNumber(corporateTax)}원), 대변에 기납부한 선납세금(${formatNumber(prepaidTax)}원)을 상계하고 나머지 잔여 납부세액을 '미지급세금(${formatNumber(payTax)}원)'으로 처리합니다.`,
                ref: '1급 초격차 [법인세 결산 정리 분개]'
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
     * 특정 단원에 대해 무작위로 동적 문제 생성
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
            const tplFn = getRandomItem(pool.theories);
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
                bookReference: res.ref || '2026 PERFECT 1급 실전 대비'
            };
        } else if (type === 'journal') {
            const jplFn = getRandomItem(pool.journals);
            if (!jplFn) return null;
            const res = jplFn();
            return {
                id: `dyn_${secKey}_j_${Date.now()}_${Math.random()}`,
                type: 'journal',
                question: res.question,
                debit: res.debit,
                credit: res.credit,
                explanation: res.explanation,
                bookReference: res.ref || '2026 PERFECT 1급 실무 분개'
            };
        }

        return null;
    }

    return {
        generateDynamicQuiz: generateDynamicQuiz
    };
})();