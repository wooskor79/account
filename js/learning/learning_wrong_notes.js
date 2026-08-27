/**
 * 1급 맞춤 코스 학습용 오답노트 관리 및 복습 모듈
 */
window.LearningWrongNotes = (function() {

    function renderWrongNotesView(container) {
        const prog = window.LearningAuth.getProgress() || {};
        const wrongNotes = prog.wrong_notes || [];
        const user = window.LearningAuth.getUser();

        if (!container) return;

        // 미해결 오답 / 해결된 오답 분류
        const activeNotes = wrongNotes.filter(n => !n.resolved);
        const resolvedNotes = wrongNotes.filter(n => n.resolved);

        container.innerHTML = `
            <div class="learning-header-bar">
                <div class="flex items-center gap-3">
                    <button class="btn-learning-back" onclick="window.LearningEngine.renderDashboard()" title="대시보드로 돌아가기">
                        <i class="fa-solid fa-arrow-left"></i> 대시보드
                    </button>
                    <div>
                        <h2 class="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            📝 ${escapeHtml(user ? user.username : '학습자')}님의 오답노트
                        </h2>
                        <p class="text-xs text-slate-500 font-medium">틀린 문제를 복습하고 교재 설명과 연계하여 완벽히 이해해보세요!</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full border border-rose-200">
                        미해결 ${activeNotes.length}개
                    </span>
                    <span class="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                        복습 완료 ${resolvedNotes.length}개
                    </span>
                </div>
            </div>

            <!-- 단원 필터 탭 -->
            <div class="learning-filter-tabs mt-4">
                <button class="filter-tab-btn active" onclick="LearningWrongNotes.filterNotes('all', this)">전체 (${wrongNotes.length})</button>
                <button class="filter-tab-btn" onclick="LearningWrongNotes.filterNotes('sec_asset', this)">💎 자산</button>
                <button class="filter-tab-btn" onclick="LearningWrongNotes.filterNotes('sec_liability', this)">📜 부채</button>
                <button class="filter-tab-btn" onclick="LearningWrongNotes.filterNotes('sec_equity', this)">🏛️ 자본</button>
                <button class="filter-tab-btn" onclick="LearningWrongNotes.filterNotes('sec_revenue_expense', this)">📈 수익·비용</button>
                <button class="filter-tab-btn" onclick="LearningWrongNotes.filterNotes('sec_cost', this)">⚙️ 원가회계</button>
                <button class="filter-tab-btn" onclick="LearningWrongNotes.filterNotes('sec_vat', this)">🧾 부가가치세</button>
                <button class="filter-tab-btn" onclick="LearningWrongNotes.filterNotes('sec_closing', this)">🎯 결산마스터</button>
            </div>

            <!-- 오답 카드 목록 -->
            <div id="wrong-notes-list" class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                ${wrongNotes.length === 0 ? `
                    <div class="col-span-full py-16 text-center bg-white/70 backdrop-blur rounded-2xl border border-slate-200/80 shadow-sm">
                        <div class="text-4xl mb-3">🎉</div>
                        <h3 class="text-base font-bold text-slate-700">현재 오답노트에 등록된 문제가 없습니다!</h3>
                        <p class="text-xs text-slate-400 mt-1">코스 학습을 진행하면서 틀린 문제가 이곳에 자동으로 기록됩니다.</p>
                        <button class="mt-4 px-5 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow hover:bg-blue-700 transition" onclick="window.LearningEngine.renderDashboard()">
                            학습 코스로 이동하기 ➜
                        </button>
                    </div>
                ` : wrongNotes.map((note, idx) => renderNoteCard(note, idx)).join('')}
            </div>
        `;
    }

    function renderNoteCard(note, idx) {
        const isResolved = !!note.resolved;
        const isJournal = note.type === 'journal';
        const bookRef = note.book_reference || '2026 PERFECT 전산회계 1급 교재 해당 단원 참고';

        return `
            <div class="wrong-note-card ${isResolved ? 'resolved' : ''}" data-section="${note.section_id || 'all'}" data-note-id="${note.id}">
                <div class="note-card-header">
                    <div class="flex items-center gap-2">
                        <span class="badge-note-type ${isJournal ? 'journal' : 'theory'}">
                            ${isJournal ? '실전분개' : '객관식필기'}
                        </span>
                        <span class="text-xs font-bold text-slate-500">
                            ${escapeHtml(note.section_title || '전산회계 1급')}
                        </span>
                        ${note.wrong_count > 1 ? `<span class="badge-wrong-count">${note.wrong_count}회 오답</span>` : ''}
                    </div>
                    <div>
                        ${isResolved ? `
                            <span class="badge-resolved"><i class="fa-solid fa-check"></i> 복습완료</span>
                        ` : `
                            <span class="badge-active">복습 필요</span>
                        `}
                    </div>
                </div>

                <div class="note-question-body">
                    <p class="text-sm font-bold text-slate-800 leading-snug">
                        ${escapeHtml(note.question)}
                    </p>
                </div>

                ${note.options && Array.isArray(note.options) && note.options.length > 0 ? `
                    <div class="note-options-box p-3 bg-slate-50 border border-slate-200/80 rounded-xl my-2.5 text-xs">
                        <div class="font-extrabold text-slate-600 mb-2 flex items-center gap-1.5">
                            <span class="text-blue-500">📋</span> <strong>문제 보기</strong>
                        </div>
                        <div class="space-y-1.5">
                            ${note.options.map((opt, oIdx) => `
                                <div class="flex items-start gap-2 p-1.5 bg-white rounded-lg border border-slate-100 shadow-2xs">
                                    <span class="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-md bg-slate-100 text-slate-700 font-extrabold text-[11px]">${oIdx + 1}</span>
                                    <span class="text-slate-800 font-medium leading-relaxed">${escapeHtml(opt)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 교재 안내 배너 (핵심 요구사항!) -->
                <div class="note-book-ref-box">
                    <div class="flex items-start gap-2">
                        <span class="text-amber-600 text-sm">📖</span>
                        <div>
                            <div class="text-[11px] font-extrabold text-amber-900">교재 학습 가이드</div>
                            <div class="text-xs font-semibold text-amber-800 mt-0.5">${escapeHtml(bookRef)}</div>
                        </div>
                    </div>
                </div>

                <!-- 정답 및 해설 -->
                <div class="note-explanation-box">
                    <div class="text-[11px] font-bold text-blue-700 mb-1 flex items-center gap-1">
                        <i class="fa-solid fa-lightbulb"></i> 정답 및 해설
                    </div>
                    <div class="text-xs font-semibold text-slate-700 mb-1">
                        <strong>정답:</strong> ${escapeHtml(note.correct_answer)}
                    </div>
                    <div class="text-xs text-slate-600 leading-relaxed">
                        ${escapeHtml(note.explanation)}
                    </div>
                </div>

                <!-- 하단 액션 버튼 -->
                <div class="note-card-actions">
                    ${!isResolved ? `
                        <button class="btn-note-resolve" onclick="LearningWrongNotes.resolveNote('${note.id}')">
                            <i class="fa-solid fa-check-circle"></i> 이해 완료
                        </button>
                    ` : `
                        <button class="btn-note-unresolve" onclick="LearningWrongNotes.unresolveNote('${note.id}')">
                            <i class="fa-solid fa-rotate-left"></i> 다시 오답으로
                        </button>
                    `}
                    <button class="btn-note-delete" onclick="LearningWrongNotes.deleteNote('${note.id}')" title="오답노트에서 삭제">
                        삭제
                    </button>
                </div>
            </div>
        `;
    }

    function filterNotes(sectionId, btn) {
        document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        const cards = document.querySelectorAll('.wrong-note-card');
        cards.forEach(card => {
            if (sectionId === 'all' || card.getAttribute('data-section') === sectionId) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    async function resolveNote(noteId) {
        try {
            const res = await fetch('?action=learning_resolve_wrong_note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note_id: noteId, delete: false })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const prog = window.LearningAuth.getProgress() || {};
                prog.wrong_notes = data.wrong_notes;
                window.LearningAuth.setProgress(prog);
                renderWrongNotesView(document.getElementById('learning-content-container'));
            }
        } catch (e) {
            console.error('오답노트 해결 처리 실패:', e);
        }
    }

    async function unresolveNote(noteId) {
        // 다시 미해결로 전환 (save_step을 통해 재등록 처리)
        try {
            const prog = window.LearningAuth.getProgress() || {};
            const target = (prog.wrong_notes || []).find(n => n.id === noteId);
            if (target) {
                target.resolved = false;
                renderWrongNotesView(document.getElementById('learning-content-container'));
            }
        } catch (e) {}
    }

    async function deleteNote(noteId) {
        window.customConfirm('이 문제를 오답노트에서 삭제하시겠습니까?', async () => {
            try {
                const res = await fetch('?action=learning_resolve_wrong_note', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ note_id: noteId, delete: true })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    const prog = window.LearningAuth.getProgress() || {};
                    prog.wrong_notes = data.wrong_notes;
                    window.LearningAuth.setProgress(prog);
                    renderWrongNotesView(document.getElementById('learning-content-container'));
                }
            } catch (e) {
                console.error('오답노트 삭제 실패:', e);
            }
        });
    }

    return {
        renderWrongNotesView,
        filterNotes,
        resolveNote,
        unresolveNote,
        deleteNote
    };
})();