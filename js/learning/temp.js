function renderDashboard() {
        const container = document.getElementById('learning-content-container');
        if (!container) return;

        const user = window.LearningAuth.getUser();
        const prog = window.LearningAuth.getProgress() || {};
        const curriculum = window.LearningCurriculum;

        // 마지막 학습 위치 조회
        let lastPosInfo = null;
        try {
            const saved = localStorage.getItem('last_learning_pos');
            if (saved) lastPosInfo = JSON.parse(saved);
        } catch(e) {}

        // --- 정밀 마이크로 진도율 연산 시스템 도입 ---
        let totalWeightAll = 0;
        let acquiredWeightAll = 0;
        let completedSectionsCount = 0;

        curriculum.sections.forEach(sec => {
            let totalWeight = 0;
            let acquiredWeight = 0;
            
            const isSectionAllDone = (prog.completed_steps || []).includes(sec.id);

            const counts = (prog.correct_counts && prog.correct_counts[sec.id]) || { theory: 0, journal: 0 };
            const reqT = sec.steps.some(st => st.quiz) ? 6 : 0;
            const reqJ = sec.steps.some(st => st.journalQuiz) ? 6 : 0;
            const maxScore = reqT + reqJ;

            if (maxScore > 0) {
                const curT = Math.min(reqT, counts.theory || 0);
                const curJ = Math.min(reqJ, counts.journal || 0);
                acquiredWeight += (curT + curJ);
                totalWeight += maxScore;
            }

            if (isSectionAllDone && sec.steps.length > 0) {
                completedSectionsCount++;
            }

            totalWeightAll += totalWeight;
            acquiredWeightAll += acquiredWeight;
        });

        const totalPct = totalWeightAll > 0 ? Math.round((acquiredWeightAll / totalWeightAll) * 100) : 0;
        const wrongCount = (prog.wrong_notes || []).filter(n => !n.resolved).length;

        container.innerHTML = `
            <div class="learning-dashboard-wrapper">
                <!-- 상단 프로필 & 진도율 요약 배너 -->
                <div class="learning-profile-banner">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-center gap-3.5">
                            <div class="profile-avatar-circle">
                                🎓
                            </div>
                            <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h2 class="text-xl font-extrabold text-slate-800">
                                        ${escapeHtml(user ? user.username : '학습자')}님의 학습 공간
                                    </h2>
                                    <span class="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                                        전산회계 1급
                                    </span>
                                    <button class="btn-resume-last-learning" onclick="LearningEngine.resumeLastLearning()" title="마지막으로 공부하던 위치로 즉시 이동합니다.">
                                        <span class="pulse-dot"></span>
                                        <span>🚀 마지막 학습한 곳으로 이동</span>
                                        ${lastPosInfo && lastPosInfo.stepTitle ? `<span class="last-step-name">(${escapeHtml(lastPosInfo.stepTitle.replace(/^[0-9.]+\s*/, ''))})</span>` : ''}
                                    </button>
                                </div>
                                <p class="text-xs text-slate-500 font-medium mt-0.5">
                                    📖 기반 교재: <strong>${escapeHtml(curriculum.bookTitle)}</strong>
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2.5">
                            <button class="btn-learning-wrong-notes" onclick="LearningWrongNotes.renderWrongNotesView(document.getElementById('learning-content-container'))">
                                <span class="text-rose-500">📝</span>
                                <span>오답노트</span>
                                <span class="badge-wrong-pill ${wrongCount > 0 ? 'active' : ''}">${wrongCount}</span>
                            </button>
                            <button class="btn-learning-logout-text" onclick="LearningEngine.showLogoutModal()" title="학습 종료 및 로그아웃">
                                <span>🚪</span>
                                <span>로그아웃</span>
                            </button>
                        </div>
                    </div>

                    <!-- 전체 진도율 게이지 바 -->
                    <div class="mt-5 pt-4 border-t border-slate-200/80">
                        <div class="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                            <span class="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                                📈 전체 7대 단원 달성률: <strong>${completedSectionsCount} / 7개 단원 완료</strong>
                            </span>
                            <span class="text-xs font-extrabold text-blue-600">
                                정밀 학습 달성률 (${totalPct}%)
                            </span>
                        </div>
                        <div class="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden shadow-inner">
                            <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500" style="width: ${totalPct}%"></div>
                        </div>
                    </div>
                </div>

                <!-- 로그아웃 확인 커스텀 모달 팝업 -->
                <div id="learning-logout-modal" class="learning-custom-modal-overlay" style="display:none;" onclick="LearningEngine.closeLogoutModal(event)">
                    <div class="learning-custom-modal-content" onclick="event.stopPropagation()">
                        <div class="modal-emoji-badge">🚪</div>
                        <h3 class="text-base font-extrabold text-slate-900 mt-2">학습을 종료하고 로그아웃할까요?</h3>
                        <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                            현재까지 완료한 학습 진도와 오답노트는 안전하게 저장되었습니다.<br>언제든 다시 로그인하여 이어서 공부하실 수 있습니다.
                        </p>
                        <div class="flex gap-2.5 justify-center mt-5">
                            <button class="btn-custom-modal-cancel" onclick="LearningEngine.closeLogoutModal()">
                                계속 공부하기
                            </button>
                            <button class="btn-custom-modal-danger" onclick="LearningEngine.confirmLogout()">
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 7대 단원 커리큘럼 벤토 그리드 -->
                <div class="mt-6">
                    <div class="flex items-center justify-between mb-3.5">
                        <h3 class="text-base font-extrabold text-slate-800 flex items-center gap-2">
                            <span>📚</span> 단원별 맞춤 학습 로드맵
                        </h3>
                        <span class="text-xs text-slate-400 font-medium">원하는 단원을 선택하여 바로 학습할 수 있습니다</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${curriculum.sections.map((sec, idx) => {
                            // 섹션별 마이크로 진도율 정밀 계산
                            let totalWeight = 0;
                            let acquiredWeight = 0;
                            let remainTheoryCount = 0;
                            let remainJournalCount = 0;

                            const isSectionAllDone = (prog.completed_steps || []).includes(sec.id);
                            const counts = (prog.correct_counts && prog.correct_counts[sec.id]) || { theory: 0, journal: 0 };
                            
                            let hasTheory = sec.steps.some(st => st.quiz);
                            let hasJournal = sec.steps.some(st => st.journalQuiz);

                            const reqT = hasTheory ? 6 : 0;
                            const reqJ = hasJournal ? 6 : 0;
                            const maxScore = reqT + reqJ;

                            const curT = Math.min(reqT, counts.theory || 0);
                            const curJ = Math.min(reqJ, counts.journal || 0);
                            
                            acquiredWeight = (curT + curJ);
                            totalWeight = maxScore;
                            remainTheoryCount = Math.max(0, reqT - curT);
                            remainJournalCount = Math.max(0, reqJ - curJ);

                            let sPct = totalWeight > 0 ? Math.round((acquiredWeight / totalWeight) * 100) : 0;
                            let isComplete = isSectionAllDone || (totalWeight > 0 && sPct === 100);

                            // 100% 미완성일 때 잔여 문제 수 명시
                            let incompleteWarning = '';
                            let btnText = '학습 시작하기 ➜';
                            if (sPct > 0) {
                                if (isComplete) {
                                    btnText = '다시 복습하기 ➜';
                                } else {
                                    btnText = '문제를 더 풀고 완수하기 ➜';
                                    let remainParts = [];
                                    if (remainTheoryCount > 0) remainParts.push(`필기 ${remainTheoryCount}문제`);
                                    if (remainJournalCount > 0) remainParts.push(`분개 ${remainJournalCount}문제`);
                                    let remainStr = remainParts.join(', ');

                                    incompleteWarning = `
                                        <div class="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200/80 rounded-lg py-1.5 px-2.5 mt-2 flex items-center gap-1.5 shadow-2xs">
                                            <span class="text-amber-500 text-xs">⚠️</span>
                                            <span>완료까지 <strong>${remainStr}</strong> 남음 (${sPct}%)</span>
                                        </div>
                                    `;
                                }
                            }

                            return `
                                <div class="curriculum-section-card" onclick="LearningEngine.openSection('${sec.id}')">
                                    <div class="flex items-start justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <div class="section-icon-box" style="background-color: ${sec.color}15; color: ${sec.color};">
                                                ${sec.icon}
                                            </div>
                                            <div>
                                                <span class="section-badge" style="background-color: ${sec.color}20; color: ${sec.color};">
                                                    ${sec.badge}
                                                </span>
                                                <h4 class="text-sm font-extrabold text-slate-900 mt-1">
                                                    ${escapeHtml(sec.title)}
                                                </h4>
                                            </div>
                                        </div>
                                        ${isComplete ? `
                                            <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200">
                                                완료 ✨
                                            </span>
                                        ` : ''}
                                    </div>

                                    <p class="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                                        ${escapeHtml(sec.description)}
                                    </p>

                                    <div class="section-book-page mt-3">
                                        📖 ${escapeHtml(sec.bookPages)}
                                    </div>

                                    ${incompleteWarning}

                                    <div class="section-progress-wrapper mt-3 pt-3 border-t border-slate-100">
                                        <div class="flex justify-between items-center text-[11px] font-bold mb-1">
                                            <span class="text-slate-500">진행률</span>
                                            <span class="text-slate-800">${sPct}%</span>
                                        </div>
                                        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div class="h-2 rounded-full transition-all duration-300" style="width: ${sPct}%; background-color: ${sec.color};"></div>
                                        </div>
                                    </div>

                                    <button class="btn-section-enter mt-3.5" style="border-color: ${sec.color}40; color: ${sPct > 0 && !isComplete ? '#d97706' : ''}; background-color: ${sPct > 0 && !isComplete ? '#fffbeb' : ''};">
                                        ${btnText}
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }