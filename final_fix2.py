import os

# === index.php 수정 ===
with open('index.php', 'r', encoding='utf-8') as f:
    idx_content = f.read()

t1 = """    <!-- 회원관리 & 학습/영상 시청 통합 관리자 모달 -->"""
r1 = """    <!-- 내 학습 현황 모달 -->
    <div id="my-stats-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999999] hidden flex items-center justify-center p-4 transition-opacity opacity-0" onclick="closeMyStatsModal()">
        <div class="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-lg w-full transform scale-95 transition-all relative" onclick="event.stopPropagation()">
            <button onclick="closeMyStatsModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div class="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div class="w-12 h-12 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner">📊</div>
                <div>
                    <h2 class="text-xl font-extrabold text-slate-800">내 학습 현황</h2>
                    <p class="text-sm font-semibold text-slate-500 mt-0.5" id="my-stats-username-display">로딩 중...</p>
                </div>
            </div>
            
            <div id="my-stats-content" class="space-y-4">
                <div class="text-center py-8 text-slate-500 font-semibold text-sm">데이터를 불러오는 중입니다...</div>
            </div>
            
            <div class="mt-8">
                <button onclick="closeMyStatsModal()" class="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">닫기</button>
            </div>
        </div>
    </div>

    <!-- 회원관리 & 학습/영상 시청 통합 관리자 모달 -->"""
idx_content = idx_content.replace(t1, r1)

t2 = """                    <button id="admin-tab-btn-videos" class="px-3.5 py-1.5 rounded-lg transition text-slate-400 hover:text-white" onclick="switchMemberAdminTab('videos')">
                        🎬 영상 시청 상세 기록
                    </button>"""
r2 = """                    <button id="admin-tab-btn-videos" class="px-3.5 py-1.5 rounded-lg transition text-slate-400 hover:text-white" onclick="switchMemberAdminTab('videos')">
                        🎬 영상 시청 상세 기록
                    </button>
                    <button id="admin-tab-btn-downloads" class="px-3.5 py-1.5 rounded-lg transition text-slate-400 hover:text-white" onclick="switchMemberAdminTab('downloads')">
                        📥 시스템 추적 로그
                    </button>"""
idx_content = idx_content.replace(t2, r2)

idx_content = idx_content.replace('alert("로그인 성공! 환영합니다.");', 'await window.showAlert("로그인 성공! 환영합니다.", "성공");')
idx_content = idx_content.replace('alert(data.message); // 차단 알림용 커스텀 모달 활용', 'await window.showAlert(data.message, "차단됨");')
idx_content = idx_content.replace('alert("회원가입 완료! 자동으로 로그인되었습니다.");', 'await window.showAlert("회원가입 완료! 자동으로 로그인되었습니다.", "환영합니다");')
idx_content = idx_content.replace("""if (!confirm('로그아웃 하시겠습니까?')) return;""", """const confirmed = await window.showConfirm('로그아웃 하시겠습니까?', '로그아웃');\n            if (!confirmed) return;""")
idx_content = idx_content.replace('alert("로그아웃 되었습니다.");', 'await window.showAlert("로그아웃 되었습니다.", "로그아웃");')

with open('index.php', 'w', encoding='utf-8') as f:
    f.write(idx_content)


# === main.js 수정 ===
with open('js/main.js', 'r', encoding='utf-8') as f:
    main_content = f.read()

t3 = """            const privateBtnHtml = isPrivateMode
                ? `<button class="btn btn-status-private" onclick="togglePrivateMode()" title="클릭 시 '공개' 모드로 전환됩니다.">🔒 비공개 모드</button>`
                : `<button class="btn btn-status-public" onclick="togglePrivateMode()" title="클릭 시 '비공개' 모드로 전환됩니다.">🌐 공개 모드</button>`;
            
            adminHtml = `
                <button class="btn btn-member-manage" onclick="openMemberAdminModal()" style="background:#4f46e5; color:#ffffff; font-weight:700; border-radius:10px; padding:6px 13px; margin-right:6px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem;" title="회원 관리 대시보드">
                    ⚙️ 관리자
                </button>
                ${privateBtnHtml}
            `;"""
r3 = """            adminHtml = `
                <button class="btn btn-member-manage" onclick="openMemberAdminModal()" style="background:#4f46e5; color:#ffffff; font-weight:700; border-radius:10px; padding:6px 13px; margin-right:6px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem;" title="회원 관리 대시보드">
                    ⚙️ 관리자
                </button>
            `;"""
main_content = main_content.replace(t3, r3)

t4 = """                <div style="font-size: 0.9rem; font-weight: 700; color: #475569;">
                    반갑습니다, <span style="color: #6366f1;">${displayName}</span>님 🌿
                </div>
                <button class="btn btn-logout" onclick="AuthEngine.logout()" style="background:#f1f5f9; color:#64748b; font-weight:700; border-radius:8px; padding:6px 12px; border:1px solid #e2e8f0; cursor:pointer; font-size:0.8rem; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">"""
r4 = """                <div style="font-size: 0.9rem; font-weight: 700; color: #475569;">
                    반갑습니다, <span style="color: #6366f1;">${displayName}</span>님 🌿
                </div>
                <button onclick="openMyStatsModal()" style="background:#fffbeb; color:#d97706; font-weight:700; border-radius:8px; padding:6px 12px; border:1px solid #fde68a; cursor:pointer; font-size:0.8rem; transition:0.2s;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='#fffbeb'">
                    📊 내 학습 현황
                </button>
                <button class="btn btn-logout" onclick="AuthEngine.logout()" style="background:#f1f5f9; color:#64748b; font-weight:700; border-radius:8px; padding:6px 12px; border:1px solid #e2e8f0; cursor:pointer; font-size:0.8rem; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">"""
main_content = main_content.replace(t4, r4)

t5 = """async function deleteFile(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;"""
r5 = """async function deleteFile(id) {
    const confirmed = await window.showConfirm('정말 삭제하시겠습니까?', '삭제 확인');
    if (!confirmed) return;"""
main_content = main_content.replace(t5, r5)

main_content = main_content.replace("""        alert('삭제 실패');""", """        await window.showAlert('삭제 실패', '오류');""")

t6 = """async function deleteVideo(path) {
    if (!confirm('정말 동영상을 삭제하시겠습니까?')) return;"""
r6 = """async function deleteVideo(path) {
    const confirmed = await window.showConfirm('정말 동영상을 삭제하시겠습니까?', '삭제 확인');
    if (!confirmed) return;"""
main_content = main_content.replace(t6, r6)

t7 = """function switchMemberAdminTab(tab) {
    currentAdminTab = tab;
    const btnOverview = document.getElementById('admin-tab-btn-overview');
    const btnVideos = document.getElementById('admin-tab-btn-videos');

    if (tab === 'overview') {
        if (btnOverview) { btnOverview.classList.add('bg-indigo-600', 'text-white'); btnOverview.classList.remove('text-slate-400'); }
        if (btnVideos) { btnVideos.classList.remove('bg-indigo-600', 'text-white'); btnVideos.classList.add('text-slate-400'); }
    } else {
        if (btnVideos) { btnVideos.classList.add('bg-indigo-600', 'text-white'); btnVideos.classList.remove('text-slate-400'); }
        if (btnOverview) { btnOverview.classList.remove('bg-indigo-600', 'text-white'); btnOverview.classList.add('text-slate-400'); }
    }

    if (memberAdminData) {
        renderMemberAdminBody(memberAdminData);
    }
}"""
r7 = """async function switchMemberAdminTab(tab) {
    currentAdminTab = tab;
    const btnOverview = document.getElementById('admin-tab-btn-overview');
    const btnVideos = document.getElementById('admin-tab-btn-videos');
    const btnDownloads = document.getElementById('admin-tab-btn-downloads');

    [btnOverview, btnVideos, btnDownloads].forEach(btn => {
        if(btn) {
            btn.classList.remove('bg-indigo-600', 'text-white');
            btn.classList.add('text-slate-400');
        }
    });

    let activeBtn = null;
    if (tab === 'overview') activeBtn = btnOverview;
    else if (tab === 'videos') activeBtn = btnVideos;
    else if (tab === 'downloads') activeBtn = btnDownloads;
    
    if (activeBtn) {
        activeBtn.classList.add('bg-indigo-600', 'text-white');
        activeBtn.classList.remove('text-slate-400');
    }

    if (tab === 'downloads') {
        renderDownloadLogs();
    } else if (memberAdminData) {
        renderMemberAdminBody(memberAdminData);
    }
}"""
main_content = main_content.replace(t7, r7)

t8 = """                                    <td class="p-3 font-extrabold text-white flex items-center gap-1.5">
                                        <span>👤</span> <span>${u.username}</span>
                                    </td>"""
r8 = """                                    <td class="p-3 font-extrabold text-white flex items-center gap-1.5">
                                        <span>👤</span> <span>${u.username}</span>
                                        ${u.is_blocked ? `<span class="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] rounded" title="${u.block_reason}">차단됨</span>` : ''}
                                    </td>"""
main_content = main_content.replace(t8, r8)

t9 = """                                    <td class="p-3 text-right">
                                        <button class="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg font-bold text-[11px] transition" onclick="event.stopPropagation(); openUserDetailPopup('${u.id}')">
                                            상세 ➜
                                        </button>
                                    </td>"""
r9 = """                                    <td class="p-3 text-right">
                                        <div class="flex items-center justify-end gap-1">
                                            <button class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-[11px] transition" onclick="event.stopPropagation(); toggleUserBlock('${u.id}', ${u.is_blocked})">
                                                ${u.is_blocked ? '차단해제' : '차단 🚫'}
                                            </button>
                                            <button class="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg font-bold text-[11px] transition" onclick="event.stopPropagation(); openUserDetailPopup('${u.id}')">
                                                상세 ➜
                                            </button>
                                        </div>
                                    </td>"""
main_content = main_content.replace(t9, r9)

append_code = """
// --- 내 학습 현황 모달 로직 ---
async function openMyStatsModal() {
    const modal = document.getElementById('my-stats-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('opacity-100');
        modal.querySelector('div').classList.remove('scale-95');
        modal.querySelector('div').classList.add('scale-100');
    }, 10);
    
    const loggedUser = window.sessionStorage.getItem('learning_username');
    const displayName = window.currentUser ? window.currentUser.username : loggedUser;
    if (!displayName) {
        document.getElementById('my-stats-content').innerHTML = '<div class="text-center py-8 text-rose-500 font-bold text-sm">로그인이 필요합니다.</div>';
        return;
    }
    
    document.getElementById('my-stats-username-display').textContent = displayName + ' 님의 통계';
    
    let progressHtml = '';
    try {
        const res = await fetch('api.php?action=learning_status');
        const data = await res.json();
        if (data.is_logged_in && data.progress) {
            const prg = data.progress;
            const solved = prg.stats ? prg.stats.solved_count : 0;
            const correct = prg.stats ? prg.stats.correct_count : 0;
            const acc = solved > 0 ? Math.round((correct / solved) * 100) : 0;
            const steps = prg.completed_steps ? prg.completed_steps.length : 0;
            progressHtml = `
                <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                        <div class="text-xs font-bold text-indigo-400 mb-1">맞춤 코스 학습 진도</div>
                        <div class="text-lg font-extrabold text-indigo-700">총 ${steps}개 스텝 완료</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs font-bold text-indigo-400 mb-1">정답률</div>
                        <div class="text-lg font-extrabold text-indigo-700">${acc}% <span class="text-xs font-semibold text-indigo-500">(${correct}/${solved})</span></div>
                    </div>
                </div>
            `;
        }
    } catch(e) {}
    
    let localHtml = '';
    if (window.allHighScores) {
        let itemsHtml = '';
        for (const [key, val] of Object.entries(window.allHighScores)) {
            if (val.name === displayName || val.name === '도전자') {
                const label = key.replace('grade1', '1급').replace('grade2', '2급').replace('theory', '필기').replace('journal', '분개');
                itemsHtml += `
                    <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 mt-2">
                        <span class="text-sm font-bold text-slate-700">${label}</span>
                        <span class="text-sm font-extrabold text-blue-600">${val.score}점</span>
                    </div>
                `;
            }
        }
        if (itemsHtml) {
            localHtml = `
                <div class="mt-4">
                    <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">기출문제 최고 기록</h3>
                    ${itemsHtml}
                </div>
            `;
        }
    }
    
    const content = document.getElementById('my-stats-content');
    if (!progressHtml && !localHtml) {
        content.innerHTML = '<div class="text-center py-8 text-slate-500 font-semibold text-sm">아직 학습 기록이 없습니다.</div>';
    } else {
        content.innerHTML = progressHtml + localHtml;
    }
}

function closeMyStatsModal() {
    const modal = document.getElementById('my-stats-modal');
    if (!modal) return;
    modal.classList.remove('opacity-100');
    modal.querySelector('div').classList.remove('scale-100');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 200);
}

async function toggleUserBlock(userId, isBlocked) {
    let reason = "";
    if (!isBlocked) {
        reason = await window.showPrompt("해당 사용자를 차단하시겠습니까?\\n사유를 입력해주세요:", "계정 차단", "예: 부적절한 접근");
        if (reason === null) return;
    } else {
        const confirmUnblock = await window.showConfirm("차단을 해제하시겠습니까?", "차단 해제");
        if (!confirmUnblock) return;
    }
    
    try {
        const res = await fetch("?action=admin_block_user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target_id: userId, is_blocked: isBlocked ? 0 : 1, block_reason: reason })
        });
        const data = await res.json();
        if (data.success) {
            await window.showAlert("처리되었습니다.", "성공");
            fetchAndRenderMemberAdmin();
        } else {
            await window.showAlert("오류: " + data.message, "실패");
        }
    } catch(err) {
        await window.showAlert("서버 통신 오류", "에러");
    }
}

async function renderDownloadLogs() {
    const body = document.getElementById('member-admin-body');
    if (!body) return;
    
    body.innerHTML = `
        <div class="py-16 text-center text-slate-400">
            <div class="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p class="font-bold text-xs text-slate-300">다운로드 이력을 불러오는 중입니다...</p>
        </div>
    `;
    
    try {
        const res = await fetch('?action=admin_download_logs');
        const data = await res.json();
        if (!data.success) throw new Error(data.message || '오류 발생');
        
        const logs = data.logs || [];
        
        body.innerHTML = `
            <div class="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden mt-4">
                <div class="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h4 class="font-extrabold text-sm text-white flex items-center gap-2">
                        <span>📥</span> 시스템 파일 다운로드 추적 로그
                    </h4>
                </div>
                <div class="overflow-x-auto max-h-[600px]">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead class="sticky top-0 z-10 bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800">
                            <tr>
                                <th class="p-3">#</th>
                                <th class="p-3">다운로드 일시</th>
                                <th class="p-3">사용자명</th>
                                <th class="p-3">파일명</th>
                                <th class="p-3">접속 IP</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60">
                            ${logs.length === 0 ? '<tr><td colspan="5" class="p-8 text-center text-slate-500 font-bold">기록이 없습니다.</td></tr>' : logs.map((log, i) => `
                                <tr class="hover:bg-slate-800/50 transition">
                                    <td class="p-3 text-slate-500 font-mono">${logs.length - i}</td>
                                    <td class="p-3 text-slate-300">${log.downloaded_at}</td>
                                    <td class="p-3 font-extrabold text-indigo-400">${log.username || '비회원'}</td>
                                    <td class="p-3 text-emerald-300 font-mono truncate max-w-xs" title="${log.file_path}">${log.file_path.split('/').pop()}</td>
                                    <td class="p-3 text-slate-500 font-mono">${log.ip_address}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch(err) {
        body.innerHTML = `<div class="p-8 text-center text-rose-500 font-bold">${err.message}</div>`;
    }
}
"""

main_content = main_content.replace('window.onload = init;', append_code + '\nwindow.onload = init;\n')

with open('js/main.js', 'w', encoding='utf-8') as f:
    f.write(main_content)
