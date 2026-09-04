$path = "js/main.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 5. switchMemberAdminTab 교체
$target5 = "function switchMemberAdminTab(tab) {
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
}"
$replace5 = "async function switchMemberAdminTab(tab) {
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
}"
$content = $content.Replace($target5, $replace5)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)