$path = "js/main.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 4. delete alert/confirm 교체
$target4 = "async function deleteFile(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const res = await fetch(`?action=delete&id=${encodeURIComponent(id)}&grade=${encodeURIComponent(currentGrade)}`);
    if (res.ok) {
        await fetchFiles();
    } else {
        alert('삭제 실패');
    }
}

async function deleteVideo(path) {
    if (!confirm('정말 동영상을 삭제하시겠습니까?')) return;
    let decodedPath = path;
    try { decodedPath = decodeURIComponent(path); } catch(e){}
    const res = await fetch(`?action=delete_video&path=${encodeURIComponent(decodedPath)}&grade=${encodeURIComponent(currentGrade)}`);
    if (res.ok) {
        await fetchVideos(currentVideoFolder);
    } else {
        alert('삭제 실패');
    }
}"
$replace4 = "async function deleteFile(id) {
    const confirmed = await window.showConfirm('정말 삭제하시겠습니까?', '삭제 확인');
    if (!confirmed) return;
    const res = await fetch(`?action=delete&id=${encodeURIComponent(id)}&grade=${encodeURIComponent(currentGrade)}`);
    if (res.ok) {
        await fetchFiles();
    } else {
        await window.showAlert('삭제 실패', '오류');
    }
}

async function deleteVideo(path) {
    const confirmed = await window.showConfirm('정말 동영상을 삭제하시겠습니까?', '삭제 확인');
    if (!confirmed) return;
    let decodedPath = path;
    try { decodedPath = decodeURIComponent(path); } catch(e){}
    const res = await fetch(`?action=delete_video&path=${encodeURIComponent(decodedPath)}&grade=${encodeURIComponent(currentGrade)}`);
    if (res.ok) {
        await fetchVideos(currentVideoFolder);
    } else {
        await window.showAlert('삭제 실패', '오류');
    }
}"
$content = $content.Replace($target4, $replace4)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)