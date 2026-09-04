$path = "js/main.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 1. CustomModal 삽입
$target1 = "let sectionTitles = {};"
$replace1 = "let sectionTitles = {};

const CustomModal = (function() {
    function init() {
        if (document.getElementById('custom-modal-overlay')) return;
        const html = `
            <div id=""custom-modal-overlay"" class=""fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999999] hidden flex items-center justify-center p-4 transition-opacity opacity-0"">
                <div id=""custom-modal-box"" class=""bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full transform scale-95 transition-all text-center"">
                    <div id=""custom-modal-icon"" class=""w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner""></div>
                    <h3 id=""custom-modal-title"" class=""text-xl font-bold text-slate-800 mb-2"">알림</h3>
                    <div id=""custom-modal-msg"" class=""text-sm text-slate-600 mb-6 whitespace-pre-wrap leading-relaxed""></div>
                    <div id=""custom-modal-input-container"" class=""hidden mb-6"">
                        <input type=""text"" id=""custom-modal-input"" class=""w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-center"" placeholder="""">
                    </div>
                    <div id=""custom-modal-buttons"" class=""flex gap-2 justify-center""></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }
    
    function show({ title, msg, icon, iconBg, type = 'alert', inputPlaceholder = '', onConfirm, onCancel }) {
        init();
        const overlay = document.getElementById('custom-modal-overlay');
        const box = document.getElementById('custom-modal-box');
        const titleEl = document.getElementById('custom-modal-title');
        const msgEl = document.getElementById('custom-modal-msg');
        const iconEl = document.getElementById('custom-modal-icon');
        const inputContainer = document.getElementById('custom-modal-input-container');
        const inputEl = document.getElementById('custom-modal-input');
        const btnContainer = document.getElementById('custom-modal-buttons');
        
        titleEl.textContent = title || '알림';
        msgEl.textContent = msg || '';
        iconEl.innerHTML = icon || '💡';
        iconEl.className = `w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner ${iconBg || 'bg-blue-50 text-blue-500'}`;
        
        inputContainer.classList.add('hidden');
        inputEl.value = '';
        btnContainer.innerHTML = '';
        
        const close = (result = null) => {
            overlay.classList.remove('opacity-100');
            box.classList.remove('scale-100');
            box.classList.add('scale-95');
            setTimeout(() => { overlay.classList.add('hidden'); }, 200);
            if (result !== null && onConfirm) onConfirm(result);
            else if (result === null && onCancel) onCancel();
        };

        if (type === 'alert') {
            const btn = document.createElement('button');
            btn.className = 'flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition';
            btn.textContent = '확인';
            btn.onclick = () => close(true);
            btnContainer.appendChild(btn);
        } else if (type === 'confirm' || type === 'prompt') {
            const btnCancel = document.createElement('button');
            btnCancel.className = 'flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition';
            btnCancel.textContent = '취소';
            btnCancel.onclick = () => close(null);
            
            const btnConfirm = document.createElement('button');
            btnConfirm.className = 'flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition';
            btnConfirm.textContent = '확인';
            
            if (type === 'prompt') {
                inputContainer.classList.remove('hidden');
                inputEl.placeholder = inputPlaceholder;
                inputEl.focus();
                btnConfirm.onclick = () => close(inputEl.value);
            } else {
                btnConfirm.onclick = () => close(true);
            }
            
            btnContainer.appendChild(btnCancel);
            btnContainer.appendChild(btnConfirm);
        }
        
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.add('opacity-100');
            box.classList.remove('scale-95');
            box.classList.add('scale-100');
            if(type === 'prompt') inputEl.focus();
        }, 10);
    }

    return {
        alert: (msg, title=""알림"") => new Promise(res => show({ msg, title, type: 'alert', onConfirm: res, onCancel: res })),
        confirm: (msg, title=""확인"") => new Promise(res => show({ msg, title, icon: '❓', iconBg: 'bg-amber-50 text-amber-500', type: 'confirm', onConfirm: () => res(true), onCancel: () => res(false) })),
        prompt: (msg, title=""입력"", placeholder="""") => new Promise(res => show({ msg, title, icon: '✏️', iconBg: 'bg-emerald-50 text-emerald-500', type: 'prompt', inputPlaceholder: placeholder, onConfirm: res, onCancel: () => res(null) }))
    };
})();
window.showAlert = CustomModal.alert;
window.showConfirm = CustomModal.confirm;
window.showPrompt = CustomModal.prompt;
"
$content = $content.Replace($target1, $replace1)

# 2. 헤더 정리
$target2 = "            const privateBtnHtml = isPrivateMode
                ? `<button class=""btn btn-status-private"" onclick=""togglePrivateMode()"" title=""클릭 시 '공개' 모드로 전환됩니다."">🔒 비공개 모드</button>`
                : `<button class=""btn btn-status-public"" onclick=""togglePrivateMode()"" title=""클릭 시 '비공개' 모드로 전환됩니다."">🌐 공개 모드</button>`;
            
            adminHtml = `
                <button class=""btn btn-member-manage"" onclick=""openMemberAdminModal()"" style=""background:#4f46e5; color:#ffffff; font-weight:700; border-radius:10px; padding:6px 13px; margin-right:6px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem;"" title=""회원 관리 대시보드"">
                    ⚙️ 관리자
                </button>
                ${privateBtnHtml}
            `;"
$replace2 = "            adminHtml = `
                <button class=""btn btn-member-manage"" onclick=""openMemberAdminModal()"" style=""background:#4f46e5; color:#ffffff; font-weight:700; border-radius:10px; padding:6px 13px; margin-right:6px; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:0.85rem;"" title=""회원 관리 대시보드"">
                    ⚙️ 관리자
                </button>
            `;"
$content = $content.Replace($target2, $replace2)

# 3. 내 학습 현황 버튼
$target3 = "                <div style=""font-size: 0.9rem; font-weight: 700; color: #475569;"">
                    반갑습니다, <span style=""color: #6366f1;"">${displayName}</span>님 🌿
                </div>
                <button class=""btn btn-logout"" onclick=""AuthEngine.logout()"" style=""background:#f1f5f9; color:#64748b; font-weight:700; border-radius:8px; padding:6px 12px; border:1px solid #e2e8f0; cursor:pointer; font-size:0.8rem; transition:0.2s;"" onmouseover=""this.style.background='#e2e8f0'"" onmouseout=""this.style.background='#f1f5f9'"">"
$replace3 = "                <div style=""font-size: 0.9rem; font-weight: 700; color: #475569;"">
                    반갑습니다, <span style=""color: #6366f1;"">${displayName}</span>님 🌿
                </div>
                <button onclick=""openMyStatsModal()"" style=""background:#fffbeb; color:#d97706; font-weight:700; border-radius:8px; padding:6px 12px; border:1px solid #fde68a; cursor:pointer; font-size:0.8rem; transition:0.2s;"" onmouseover=""this.style.background='#fef3c7'"" onmouseout=""this.style.background='#fffbeb'"">
                    📊 내 학습 현황
                </button>
                <button class=""btn btn-logout"" onclick=""AuthEngine.logout()"" style=""background:#f1f5f9; color:#64748b; font-weight:700; border-radius:8px; padding:6px 12px; border:1px solid #e2e8f0; cursor:pointer; font-size:0.8rem; transition:0.2s;"" onmouseover=""this.style.background='#e2e8f0'"" onmouseout=""this.style.background='#f1f5f9'"">"
$content = $content.Replace($target3, $replace3)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)