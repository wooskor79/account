$path = "index.php"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 1. 팝업 추가
$target1 = "    <!-- 회원관리 & 학습/영상 시청 통합 관리자 모달 -->"
$replace1 = "    <!-- 내 학습 현황 모달 -->
    <div id=""my-stats-modal"" class=""fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999999] hidden flex items-center justify-center p-4 transition-opacity opacity-0"" onclick=""closeMyStatsModal()"">
        <div class=""bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-lg w-full transform scale-95 transition-all relative"" onclick=""event.stopPropagation()"">
            <button onclick=""closeMyStatsModal()"" class=""absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"">
                <svg class=""w-6 h-6"" fill=""none"" stroke=""currentColor"" viewBox=""0 0 24 24""><path stroke-linecap=""round"" stroke-linejoin=""round"" stroke-width=""2"" d=""M6 18L18 6M6 6l12 12""></path></svg>
            </button>
            <div class=""flex items-center gap-3 mb-6 border-b border-slate-100 pb-4"">
                <div class=""w-12 h-12 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner"">📊</div>
                <div>
                    <h2 class=""text-xl font-extrabold text-slate-800"">내 학습 현황</h2>
                    <p class=""text-sm font-semibold text-slate-500 mt-0.5"" id=""my-stats-username-display"">로딩 중...</p>
                </div>
            </div>
            
            <div id=""my-stats-content"" class=""space-y-4"">
                <div class=""text-center py-8 text-slate-500 font-semibold text-sm"">데이터를 불러오는 중입니다...</div>
            </div>
            
            <div class=""mt-8"">
                <button onclick=""closeMyStatsModal()"" class=""w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"">닫기</button>
            </div>
        </div>
    </div>

    <!-- 회원관리 & 학습/영상 시청 통합 관리자 모달 -->"
$content = $content.Replace($target1, $replace1)

# 2. 다운로드 통계 탭 추가
$target2 = "                    <button id=""admin-tab-btn-videos"" class=""px-3.5 py-1.5 rounded-lg transition text-slate-400 hover:text-white"" onclick=""switchMemberAdminTab('videos')"">
                        🎬 영상 시청 상세 기록
                    </button>"
$replace2 = "                    <button id=""admin-tab-btn-videos"" class=""px-3.5 py-1.5 rounded-lg transition text-slate-400 hover:text-white"" onclick=""switchMemberAdminTab('videos')"">
                        🎬 영상 시청 상세 기록
                    </button>
                    <button id=""admin-tab-btn-downloads"" class=""px-3.5 py-1.5 rounded-lg transition text-slate-400 hover:text-white"" onclick=""switchMemberAdminTab('downloads')"">
                        📥 시스템 추적 로그
                    </button>"
$content = $content.Replace($target2, $replace2)

# 3. alert, confirm 치환
$target3 = "alert(""로그인 성공! 환영합니다."");"
$replace3 = "await window.showAlert(""로그인 성공! 환영합니다."", ""성공"");"
$content = $content.Replace($target3, $replace3)

$target4 = "alert(data.message); // 차단 알림용 커스텀 모달 활용"
$replace4 = "await window.showAlert(data.message, ""차단됨"");"
$content = $content.Replace($target4, $replace4)

$target5 = "alert(""회원가입 완료! 자동으로 로그인되었습니다."");"
$replace5 = "await window.showAlert(""회원가입 완료! 자동으로 로그인되었습니다."", ""환영합니다"");"
$content = $content.Replace($target5, $replace5)

$target6 = "if (!confirm('로그아웃 하시겠습니까?')) return;"
$replace6 = "const confirmed = await window.showConfirm('로그아웃 하시겠습니까?', '로그아웃');
            if (!confirmed) return;"
$content = $content.Replace($target6, $replace6)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)