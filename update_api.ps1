$path = "api.php"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 1. users json 을 db 조회로 변경
$target1 = "        `$users = atomic_json_read(`$learning_users_file);
        if (!is_array(`$users)) `$users = [];"
$replace1 = "        `$stmt = `$pdo->query(""SELECT id, username, created_at, last_login_at AS last_login, is_blocked, block_reason FROM users ORDER BY created_at DESC"");
        `$users = `$stmt->fetchAll();"
$content = $content.Replace($target1, $replace1)

# 2. 통계 합산 변경
$target2 = "            `$stats = `$u_prog['stats'] ?? ['solved_count' => 0, 'correct_count' => 0];
            `$wrong_notes = `$u_prog['wrong_notes'] ?? [];"
$replace2 = "            `$stats = `$u_prog['stats'] ?? ['solved_count' => 0, 'correct_count' => 0];
            `$wrong_notes = `$u_prog['wrong_notes'] ?? [];

            // 기출문제(일반 퀴즈) 통계 병합
            `$q_stmt = `$pdo->prepare(""SELECT SUM(total_solved) as t_sol, SUM(total_correct) as t_cor FROM learning_stats WHERE user_id = :uid"");
            `$q_stmt->execute([':uid' => `$uid]);
            `$q_res = `$q_stmt->fetch();
            `$quiz_solved = (int)(`$q_res['t_sol'] ?? 0);
            `$quiz_correct = (int)(`$q_res['t_cor'] ?? 0);
            
            `$stats['solved_count'] += `$quiz_solved;
            `$stats['correct_count'] += `$quiz_correct;"
$content = $content.Replace($target2, $replace2)

# 3. user_list 배열에 is_blocked 추가
$target3 = "                'last_login' => `$u['last_login'] ?? '',"
$replace3 = "                'last_login' => `$u['last_login'] ?? '',
                'is_blocked' => (int)(`$u['is_blocked'] ?? 0),
                'block_reason' => `$u['block_reason'] ?? '',"
$content = $content.Replace($target3, $replace3)

# 4. 블럭 및 다운로드 API 추가
$target4 = "        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

}"
$replace4 = "        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 8) 관리자: 회원 차단/해제 API
    if (`$action === 'admin_block_user') {
        `$cur_user = isset(`$_SESSION['learning_user']) ? `$_SESSION['learning_user'] : null;
        `$is_admin = (!empty(`$cur_user['is_admin'])) || (isset(`$_SESSION['admin']) && `$_SESSION['admin'] === true);
        if (!`$is_admin) {
            http_response_code(403);
            exit(json_encode(['success' => false, 'message' => '관리자 권한이 필요합니다.']));
        }
        
        `$input = json_decode(file_get_contents('php://input'), true);
        `$target_id = `$input['target_id'] ?? '';
        `$is_blocked = isset(`$input['is_blocked']) ? (int)`$input['is_blocked'] : 1;
        `$block_reason = `$input['block_reason'] ?? '';
        
        if (!`$target_id) {
            exit(json_encode(['success' => false, 'message' => '대상 ID가 없습니다.']));
        }
        
        `$stmt = `$pdo->prepare(""UPDATE users SET is_blocked = :blocked, block_reason = :reason WHERE id = :id"");
        `$stmt->execute([':blocked' => `$is_blocked, ':reason' => `$block_reason, ':id' => `$target_id]);
        
        exit(json_encode(['success' => true]));
    }

    // 9) 관리자: 다운로드 내역 조회 API
    if (`$action === 'admin_download_logs') {
        `$cur_user = isset(`$_SESSION['learning_user']) ? `$_SESSION['learning_user'] : null;
        `$is_admin = (!empty(`$cur_user['is_admin'])) || (isset(`$_SESSION['admin']) && `$_SESSION['admin'] === true);
        if (!`$is_admin) {
            http_response_code(403);
            exit(json_encode(['success' => false, 'message' => '권한이 없습니다.']));
        }
        
        `$stmt = `$pdo->query(""
            SELECT d.id, u.username, d.file_path, d.downloaded_at, d.ip_address 
            FROM download_logs d 
            LEFT JOIN users u ON d.user_id = u.id 
            ORDER BY d.downloaded_at DESC 
            LIMIT 500
        "");
        `$logs = `$stmt->fetchAll(PDO::FETCH_ASSOC);
        exit(json_encode(['success' => true, 'logs' => `$logs]));
    }
}"
$content = $content.Replace($target4, $replace4)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)