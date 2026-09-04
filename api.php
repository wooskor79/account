<?php
ini_set('upload_max_filesize', '1000M');
ini_set('post_max_size', '1000M');
ini_set('memory_limit', '2048M');
ini_set('max_execution_time', '3600');
ini_set('max_input_time', '3600');

if (session_status() === PHP_SESSION_NONE) {
    // 세션 최대 유효시간 15분(900초) 설정
    ini_set('session.gc_maxlifetime', 900);
    session_set_cookie_params(900);
    @session_start();
}

// 로그인 세션 활동 시간 갱신 (15분 idle = 자동 로그아웃)
if (isset($_SESSION['learning_user']) && isset($_SESSION['last_activity'])) {
    if (time() - $_SESSION['last_activity'] > 900) {
        unset($_SESSION['learning_user']);
        unset($_SESSION['last_activity']);
    }
}
if (isset($_SESSION['learning_user'])) {
    $_SESSION['last_activity'] = time();
}

// .env 파일 로드 로직
function load_env($file_path) {
    if (!file_exists($file_path)) return [];
    $lines = file($file_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val);
            $val = trim($val, "\"'");
            $env[$key] = $val;
            $_ENV[$key] = $val;
            putenv("$key=$val");
        }
    }
    return $env;
}

function atomic_json_read($file) {
    if (!file_exists($file)) return [];
    $fp = @fopen($file, 'rb');
    if (!$fp) return [];
    @flock($fp, LOCK_SH);
    $content = stream_get_contents($fp);
    @flock($fp, LOCK_UN);
    @fclose($fp);
    return json_decode($content, true) ?: [];
}

function atomic_json_modify($file, callable $modifier) {
    $dir = dirname($file);
    if (!file_exists($dir)) mkdir($dir, 0777, true);

    $lock_file = $file . '.lock';
    $lock_fp = @fopen($lock_file, 'c+');
    if ($lock_fp) {
        @flock($lock_fp, LOCK_EX);
    }

    $current_data = [];
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $current_data = json_decode($content, true) ?: [];
    }

    $new_data = $modifier($current_data);

    if ($new_data !== null) {
        $tmp_file = $file . '.' . uniqid('tmp_', true);
        file_put_contents($tmp_file, json_encode($new_data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        @rename($tmp_file, $file);
    }

    if ($lock_fp) {
        @flock($lock_fp, LOCK_UN);
        @fclose($lock_fp);
    }

    return $new_data;
}

function read_db($file) {
    return atomic_json_read($file);
}

function write_db($file, $data) {
    return atomic_json_modify($file, function() use ($data) {
        return $data;
    });
}

$env_vars = load_env(__DIR__ . '/.env');
$gate_password = isset($env_vars['GATE_PASSWORD']) ? $env_vars['GATE_PASSWORD'] : (getenv('GATE_PASSWORD') ?: "1100");
$admin_password = isset($env_vars['ADMIN_PASSWORD']) ? $env_vars['ADMIN_PASSWORD'] : (getenv('ADMIN_PASSWORD') ?: "!@#$");

// MariaDB PDO 연동
$pdo = null;
try {
    $db_host = isset($env_vars['DB_HOST']) ? $env_vars['DB_HOST'] : '127.0.0.1';
    $db_port = isset($env_vars['DB_PORT']) ? $env_vars['DB_PORT'] : '3306';
    $db_name = isset($env_vars['DB_NAME']) ? $env_vars['DB_NAME'] : 'account_db';
    $db_user = isset($env_vars['DB_USER']) ? $env_vars['DB_USER'] : 'root';
    $db_pass = isset($env_vars['DB_PASS']) ? $env_vars['DB_PASS'] : '';

    $dsn = "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4";
    $pdo = new PDO($dsn, $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    // DB 연결 실패 시 에러 로깅 처리 (실제 환경에서는 화면에 출력하지 않음)
    error_log("DB Connection Failed: " . $e->getMessage());
}


$grade = isset($_REQUEST['grade']) && in_array($_REQUEST['grade'], ['grade1', 'grade2']) ? $_REQUEST['grade'] : 'grade2';

$base_share = file_exists('/volume1/ShareFolder/Share/전산회계자료') ? '/volume1/ShareFolder/Share/전산회계자료' : __DIR__ . '/uploads';
$base_video = file_exists('/volume1/ShareFolder/ect_video/전산회계영상') ? '/volume1/ShareFolder/ect_video/전산회계영상' : __DIR__ . '/uploads/videos';

$upload_dir = $base_share . '/' . $grade;
$video_dir = $base_video . '/' . $grade;
$general_dir = $upload_dir . '/일반자료';
$drawing_dir = $upload_dir . '/그림자료'; 
$data_file = __DIR__ . '/data/files_' . $grade . '.json';

// grade2 초기 마이그레이션 및 자동 복구: files_grade2.json이 없거나 비어있으면 기존 files.json 복사
if ($grade === 'grade2' && file_exists(__DIR__ . '/data/files.json')) {
    $should_copy = false;
    if (!file_exists($data_file)) {
        $should_copy = true;
    } else {
        $size = @filesize($data_file);
        if ($size === false || $size < 5) {
            $should_copy = true;
        } else {
            $existing_data = atomic_json_read($data_file);
            if (!is_array($existing_data) || count($existing_data) === 0) {
                $should_copy = true;
            }
        }
    }
    if ($should_copy) {
        @copy(__DIR__ . '/data/files.json', $data_file);
    }
}

// --- Site Settings (공개/비공개 설정) ---
$settings_file = __DIR__ . '/data/site_settings.json';
function get_site_settings() {
    global $settings_file;
    $default_settings = [
        'is_private' => true // 기본값: 비공개 모드 (비밀번호 입력 필요)
    ];
    $data = atomic_json_read($settings_file);
    if (!is_array($data)) return $default_settings;
    return array_merge($default_settings, $data);
}

$site_settings = get_site_settings();
$is_private_mode = (bool)$site_settings['is_private'];
$is_admin_session = isset($_SESSION['admin']) && $_SESSION['admin'] === true;
$is_site_unlocked = $is_admin_session || (isset($_SESSION['site_unlocked']) && $_SESSION['site_unlocked'] === true);

if (!file_exists($upload_dir)) @mkdir($upload_dir, 0777, true);
if (!file_exists($video_dir)) @mkdir($video_dir, 0777, true);
if (!file_exists($general_dir)) @mkdir($general_dir, 0777, true);
if (!file_exists($drawing_dir)) @mkdir($drawing_dir, 0777, true); 
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action) {
    if ($action === 'stream_video' || $action === 'view_image' || $action === 'view_drawing') {
        // 비공개 모드일 경우 권한 체크
        if ($is_private_mode && !$is_site_unlocked) {
            http_response_code(403);
            exit('비공개 모드입니다. 비밀번호 인증이 필요합니다.');
        }

        $path = isset($_GET['path']) ? $_GET['path'] : (isset($_GET['name']) ? $_GET['name'] : '');
        if (strpos($path, '..') !== false || strpos($path, './') !== false) {
            http_response_code(403);
            exit('잘못된 접근입니다.');
        }

        if ($action === 'view_image' || $action === 'view_drawing') {
            $target_file = realpath($drawing_dir . '/' . $path);
            $base_dir = realpath($drawing_dir);
            if ($target_file === false || !is_file($target_file)) {
                if (file_exists($upload_dir . '/' . $path)) {
                    $target_file = realpath($upload_dir . '/' . $path);
                    $base_dir = realpath($upload_dir);
                } else if (file_exists(__DIR__ . '/uploads/' . $path)) {
                    $target_file = realpath(__DIR__ . '/uploads/' . $path);
                    $base_dir = realpath(__DIR__ . '/uploads');
                } else if (file_exists(__DIR__ . '/' . $path)) {
                    $target_file = realpath(__DIR__ . '/' . $path);
                    $base_dir = realpath(__DIR__);
                }
            }
            $norm_target = $target_file ? str_replace('\\', '/', strtolower($target_file)) : '';
            $norm_base = $base_dir ? str_replace('\\', '/', strtolower($base_dir)) : '';
            if ($target_file === false || strpos($norm_target, $norm_base) !== 0 || !is_file($target_file)) {
                http_response_code(404);
                exit('파일을 찾을 수 없습니다.');
            }

            $ext = strtolower(pathinfo($target_file, PATHINFO_EXTENSION));
            $mime_type = 'image/png';
            if ($ext === 'jpg' || $ext === 'jpeg') $mime_type = 'image/jpeg';
            if ($ext === 'gif') $mime_type = 'image/gif';
            if ($ext === 'webp') $mime_type = 'image/webp';
            
            header('Content-Type: ' . $mime_type);
            header('Content-Length: ' . filesize($target_file));
            readfile($target_file);
            exit;
        } else {
            // 비디오 스트리밍
            $target_file = realpath($video_dir . '/' . $path);
            $base_dir = realpath($video_dir);

            if ($target_file === false || !is_file($target_file)) {
                $candidate = $video_dir . '/' . $path;
                if (file_exists($candidate) && is_file($candidate)) {
                    $target_file = $candidate;
                } else {
                    $candidate_decoded = $video_dir . '/' . rawurldecode($path);
                    if (file_exists($candidate_decoded) && is_file($candidate_decoded)) {
                        $target_file = $candidate_decoded;
                    }
                }
            }

            if (!$target_file || !file_exists($target_file) || !is_file($target_file)) {
                http_response_code(404);
                exit('비디오 파일을 찾을 수 없습니다.');
            }

            // 세션 락 해제 및 출력 버퍼링 정리 (스트리밍 멈춤 방지의 핵심)
            session_write_close();
            while (ob_get_level() > 0) {
                ob_end_clean();
            }

            $size = filesize($target_file);
            $length = $size;
            $start = 0;
            $end = $size - 1;
            
            $ext = strtolower(pathinfo($target_file, PATHINFO_EXTENSION));
            $mime_type = 'video/mp4';
            if ($ext === 'webm') $mime_type = 'video/webm';
            else if ($ext === 'ogg') $mime_type = 'video/ogg';
            else if ($ext === 'mkv') $mime_type = 'video/x-matroska';
            else if ($ext === 'mov') $mime_type = 'video/quicktime';
            else if ($ext === 'avi') $mime_type = 'video/x-msvideo';

            header('Content-Type: ' . $mime_type);
            header("Accept-Ranges: bytes");

            if (isset($_SERVER['HTTP_RANGE'])) {
                $c_start = $start;
                $c_end   = $end;
                list(, $range) = explode('=', $_SERVER['HTTP_RANGE'], 2);
                if (strpos($range, ',') !== false) {
                    header('HTTP/1.1 416 Requested Range Not Satisfiable');
                    header("Content-Range: bytes $start-$end/$size");
                    exit;
                }
                if (strpos($range, '-') === 0) {
                    $c_start = $size - (int)substr($range, 1);
                } else {
                    $range  = explode('-', $range);
                    $c_start = (int)$range[0];
                    $c_end   = (isset($range[1]) && is_numeric($range[1])) ? (int)$range[1] : $size - 1;
                }
                $c_end = ($c_end > $end) ? $end : $c_end;
                if ($c_start > $c_end || $c_start > $size - 1 || $c_end >= $size) {
                    header('HTTP/1.1 416 Requested Range Not Satisfiable');
                    header("Content-Range: bytes $start-$end/$size");
                    exit;
                }
                $start  = $c_start;
                $end    = $c_end;
                $length = $end - $start + 1;

                $fp = @fopen($target_file, 'rb');
                if (!$fp) {
                    http_response_code(500);
                    exit('파일을 열 수 없습니다.');
                }
                fseek($fp, $start);
                header('HTTP/1.1 206 Partial Content');
            } else {
                $fp = @fopen($target_file, 'rb');
                if (!$fp) {
                    http_response_code(500);
                    exit('파일을 열 수 없습니다.');
                }
                header('HTTP/1.1 200 OK');
            }
            
            header("Content-Range: bytes $start-$end/$size");
            header("Content-Length: " . $length);
            
            $buffer = 1024 * 64; // 64KB 청크 버퍼
            while(!feof($fp) && ($p = ftell($fp)) <= $end) {
                if ($p + $buffer > $end) {
                    $buffer = $end - $p + 1;
                }
                set_time_limit(0);
                echo fread($fp, $buffer);
                flush();
            }
            fclose($fp);
            exit;
        }
    }

    header('Content-Type: application/json; charset=utf-8');

    function get_visitor_stats() {
        $visitor_file = __DIR__ . '/data/visitors.json';
        $today = date('Y-m-d');
        $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
        
        $res = atomic_json_modify($visitor_file, function($data) use ($today, $ip) {
            if (empty($data)) {
                return [
                    'date' => $today,
                    'today_count' => 1,
                    'total_count' => 1,
                    'ips' => [$ip]
                ];
            }

            $data['date'] = isset($data['date']) ? $data['date'] : $today;
            $data['today_count'] = isset($data['today_count']) ? (int)$data['today_count'] : 0;
            $data['total_count'] = isset($data['total_count']) ? (int)$data['total_count'] : 0;
            $data['ips'] = isset($data['ips']) && is_array($data['ips']) ? $data['ips'] : [];

            if ($data['date'] !== $today) {
                $data['date'] = $today;
                $data['today_count'] = 1;
                $data['total_count']++;
                $data['ips'] = [$ip];
            } else {
                if (!in_array($ip, $data['ips'])) {
                    $data['ips'][] = $ip;
                    $data['today_count']++;
                    $data['total_count']++;
                }
            }
            return $data;
        });

        return [
            'today' => isset($res['today_count']) ? $res['today_count'] : 1,
            'total' => isset($res['total_count']) ? $res['total_count'] : 1
        ];
    }

    if ($action === 'status') {
        $vStats = get_visitor_stats();
        $site_settings = get_site_settings();
        $is_admin = isset($_SESSION['admin']) && $_SESSION['admin'] === true;
        echo json_encode([
            'is_admin' => $is_admin,
            'is_unlocked' => $is_admin,
            'is_private' => (bool)$site_settings['is_private'],
            'today_visitors' => $vStats['today'],
            'total_visitors' => $vStats['total']
        ]);
        exit;
    }

    if ($action === 'visitors') {
        echo json_encode(get_visitor_stats());
        exit;
    }
    
    if ($action === 'unlock_site') {
        $input = json_decode(file_get_contents('php://input'), true);
        $entered_pass = isset($input['password']) ? (string)$input['password'] : '';
        $site_settings = get_site_settings();
        
        if ($entered_pass === $admin_password) {
            $_SESSION['admin'] = true;
            unset($_SESSION['learning_user']); // 사이트 재접속 시 학습자 세션도 초기화
            echo json_encode([
                'success' => true,
                'is_admin' => true,
                'is_unlocked' => true,
                'is_private' => (bool)$site_settings['is_private']
            ]);
            exit;
        } else if ($entered_pass === $gate_password) {
            // 일반 접속자는 일회성으로 통과 (새로고침 시 다시 비번 요구 및 학습자 세션 초기화)
            unset($_SESSION['learning_user']);
            echo json_encode([
                'success' => true,
                'is_admin' => false,
                'is_unlocked' => true,
                'is_private' => (bool)$site_settings['is_private']
            ]);
            exit;
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '비밀번호가 올바르지 않습니다.']);
            exit;
        }
    }

    if ($action === 'login') {
        $input = json_decode(file_get_contents('php://input'), true);
        $entered_pass = isset($input['password']) ? (string)$input['password'] : '';
        if ($entered_pass === $admin_password) {
            $_SESSION['admin'] = true;
            $_SESSION['site_unlocked'] = true;
            $site_settings = get_site_settings();
            echo json_encode([
                'success' => true,
                'is_admin' => true,
                'is_unlocked' => true,
                'is_private' => (bool)$site_settings['is_private']
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '관리자 비밀번호가 올바르지 않습니다.']);
        }
        exit;
    }
    
    if ($action === 'toggle_private') {
        if (!isset($_SESSION['admin']) || $_SESSION['admin'] !== true) {
            http_response_code(403);
            echo json_encode(['error' => '권한이 없습니다.']);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $new_private_state = isset($input['is_private']) ? (bool)$input['is_private'] : true;

        atomic_json_modify($settings_file, function($data) use ($new_private_state) {
            if (!is_array($data)) $data = [];
            $data['is_private'] = $new_private_state;
            return $data;
        });

        echo json_encode(['success' => true, 'is_private' => $new_private_state]);
        exit;
    }

    if ($action === 'logout') {
        unset($_SESSION['admin']);
        // $_SESSION['site_unlocked']는 유지하여 게이트로 튕기지 않고 기본 화면 유지
        echo json_encode(['success' => true]);
        exit;
    }
    
    if ($action === 'videos') {
        $sub_path = isset($_GET['path']) ? $_GET['path'] : '';
        if (strpos($sub_path, '..') !== false) {
            echo json_encode(['error' => '잘못된 경로입니다.']);
            exit;
        }

        $current_dir = $video_dir . ($sub_path ? '/' . $sub_path : '');
        
        if (!is_dir($current_dir)) {
            @mkdir($current_dir, 0777, true);
        }

        if (!is_dir($current_dir)) {
            echo json_encode(['current_path' => $sub_path, 'items' => []]);
            exit;
        }

        $items = [];
        $scanned = array_diff(scandir($current_dir), ['..', '.']);
        
        foreach ($scanned as $item) {
            if ($item === '@eaDir' || $item === '#recycle' || strpos($item, '.') === 0) continue;

            $item_path = $current_dir . '/' . $item;
            $is_dir = is_dir($item_path);
            
            $ext = strtolower(pathinfo($item_path, PATHINFO_EXTENSION));
            $allowed_exts = ['mp4', 'webm', 'ogg', 'avi', 'mkv', 'mov'];
            
            if (!$is_dir && !in_array($ext, $allowed_exts)) continue;

            $items[] = [
                'name' => $item,
                'type' => $is_dir ? 'folder' : 'file',
                'size' => $is_dir ? 0 : filesize($item_path),
                'path' => $sub_path ? $sub_path . '/' . $item : $item
            ];
        }

        usort($items, function($a, $b) {
            if ($a['type'] === $b['type']) return strnatcasecmp($a['name'], $b['name']);
            return $a['type'] === 'folder' ? -1 : 1;
        });

        echo json_encode([
            'grade' => $grade,
            'current_path' => $sub_path,
            'items' => $items
        ]);
        exit;
    }

    // 영상 시청 진도(이어보기, 수강완료, 북마크) 저장 API
    if ($action === 'save_video_progress') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['video_key'])) {
            echo json_encode(['success' => false, 'message' => '잘못된 요청입니다.']);
            exit;
        }

        $video_key = preg_replace('/[^a-zA-Z0-9_\-\.\/]/', '_', $input['video_key']);
        $pos = isset($input['position']) ? floatval($input['position']) : 0;
        $dur = isset($input['duration']) ? floatval($input['duration']) : 0;
        $completed = !empty($input['completed']);
        $bookmarks = isset($input['bookmarks']) && is_array($input['bookmarks']) ? $input['bookmarks'] : [];

        $learning_progress_file = __DIR__ . '/data/learning_progress.json';
        $user_id = isset($_SESSION['learning_user']['id']) ? $_SESSION['learning_user']['id'] : null;

        if ($user_id) {
            atomic_json_modify($learning_progress_file, function($data) use ($user_id, $video_key, $pos, $dur, $completed, $bookmarks) {
                if (!isset($data[$user_id])) {
                    $data[$user_id] = [];
                }
                if (!isset($data[$user_id]['video_progress'])) {
                    $data[$user_id]['video_progress'] = [];
                }
                
                $data[$user_id]['video_progress'][$video_key] = [
                    'position' => $pos,
                    'duration' => $dur,
                    'completed' => $completed,
                    'bookmarks' => $bookmarks,
                    'updated_at' => date('Y-m-d H:i:s')
                ];
                return $data;
            });
        }

        echo json_encode([
            'success' => true,
            'is_logged_in' => !empty($user_id),
            'video_key' => $video_key,
            'position' => $pos,
            'completed' => $completed
        ]);
        exit;
    }

    // 영상 시청 진도 전체 조회 API
    if ($action === 'get_video_progress') {
        $user_id = isset($_SESSION['learning_user']['id']) ? $_SESSION['learning_user']['id'] : null;
        $learning_progress_file = __DIR__ . '/data/learning_progress.json';
        $video_progress = [];

        if ($user_id) {
            $data = atomic_json_read($learning_progress_file);
            if (is_array($data) && isset($data[$user_id]['video_progress'])) {
                $video_progress = $data[$user_id]['video_progress'];
            }
        }

        echo json_encode([
            'success' => true,
            'is_logged_in' => !empty($user_id),
            'video_progress' => $video_progress
        ]);
        exit;
    }

    if ($action === 'delete_video') {
        if (!isset($_SESSION['admin']) || $_SESSION['admin'] !== true) {
            http_response_code(403);
            echo json_encode(['error' => '권한이 없습니다.']);
            exit;
        }
        
        $sub_path = isset($_GET['path']) ? $_GET['path'] : '';
        if (strpos($sub_path, '..') !== false || empty($sub_path)) {
            http_response_code(400);
            echo json_encode(['error' => '잘못된 경로입니다.']);
            exit;
        }

        $target_path = realpath($video_dir . '/' . $sub_path);
        $base_dir = realpath($video_dir);

        if ($target_path === false || strpos($target_path, $base_dir) !== 0 || !file_exists($target_path)) {
            http_response_code(404);
            echo json_encode(['error' => '파일을 찾을 수 없습니다.']);
            exit;
        }

        $dir = dirname($target_path);
        $filename = basename($target_path);
        $deleted_target = $dir . '/.deleted_' . $filename;

        if (rename($target_path, $deleted_target)) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => '삭제(소프트 삭제)에 실패했습니다.']);
        }
        exit;
    }

    if ($action === 'files') {
        $db = read_db($data_file);
        
        $filtered_db = array_filter($db, function($item) {
            return $item['category'] !== 'general' && $item['category'] !== 'drawing';
        });
        
        $general_files = [];
        if (file_exists($general_dir)) {
            $scanned_gen = array_diff(scandir($general_dir), ['..', '.', '@eaDir', '#recycle']);
            foreach ($scanned_gen as $item) {
                if (strpos($item, '.') === 0) continue;
                $item_path = $general_dir . '/' . $item;
                if (!is_dir($item_path)) {
                    $general_files[] = [
                        'id' => 'gen_' . base64_encode($item),
                        'filename' => $item,
                        'saved_filename' => $item,
                        'category' => 'general',
                        'upload_time' => date('Y-m-d H:i:s', filemtime($item_path)),
                        'size' => filesize($item_path)
                    ];
                }
            }
        }

        $drawing_files = [];
        if (file_exists($drawing_dir)) {
            $scanned_draw = array_diff(scandir($drawing_dir), ['..', '.', '@eaDir', '#recycle']);
            foreach ($scanned_draw as $item) {
                if (strpos($item, '.') === 0) continue;
                $item_path = $drawing_dir . '/' . $item;
                if (!is_dir($item_path)) {
                    $drawing_files[] = [
                        'id' => 'draw_' . base64_encode($item),
                        'filename' => $item,
                        'saved_filename' => $item,
                        'category' => 'drawing',
                        'upload_time' => date('Y-m-d H:i:s', filemtime($item_path)),
                        'size' => filesize($item_path)
                    ];
                }
            }
        }
        
        $result = array_merge(array_values($filtered_db), $general_files, $drawing_files);
        
        usort($result, function($a, $b) {
            return strtotime($b['upload_time']) - strtotime($a['upload_time']);
        });

        echo json_encode($result);
        exit;
    }
    
    if ($action === 'upload_drawing') {
        if (!isset($_SESSION['admin']) || $_SESSION['admin'] !== true) {
            http_response_code(403);
            exit(json_encode(['error' => '권한이 없습니다.']));
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['image']) || !isset($input['filename'])) {
            http_response_code(400);
            exit(json_encode(['error' => '데이터가 유효하지 않습니다.']));
        }
        
        $imgData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $input['image']));
        $raw_filename = basename($input['filename']);
        $raw_filename = preg_replace('/[^\w\-\.\s\x{AC00}-\x{D7A3}]/u', '', $raw_filename);
        if (empty($raw_filename)) $raw_filename = 'drawing_' . date('Ymd_His');
        $filename = $raw_filename . '.png';
        $target_path = $drawing_dir . '/' . $filename;
        
        if (file_put_contents($target_path, $imgData)) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => '파일 저장에 실패했습니다.']);
        }
        exit;
    }

    
    if ($action === 'upload') {
        if (!isset($_SESSION['admin']) || $_SESSION['admin'] !== true) {
            http_response_code(403);
            echo json_encode(['error' => '권한이 없습니다.']);
            exit;
        }
        
        if (!isset($_POST['category'])) {
            http_response_code(400);
            echo json_encode(['error' => '잘못된 요청입니다.']);
            exit;
        }
        
        $category = $_POST['category'];
        if (!in_array($category, ['accounting', 'general', 'seohee', 'heera', 'drawing'])) {
            http_response_code(400);
            echo json_encode(['error' => '잘못된 카테고리입니다.']);
            exit;
        }
        
        $chunk = isset($_POST['chunk_index']) ? (int)$_POST['chunk_index'] : 0;
        $total_chunks = isset($_POST['total_chunks']) ? (int)$_POST['total_chunks'] : 1;
        $original_name = isset($_POST['filename']) ? $_POST['filename'] : (isset($_FILES['file']) ? $_FILES['file']['name'] : '');
        
        if (!isset($_FILES['file']) || $original_name === '') {
            http_response_code(400);
            echo json_encode(['error' => '파일이 없습니다.']);
            exit;
        }
        
        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(500);
            echo json_encode(['error' => '업로드 중 오류 발생. 코드: ' . $file['error']]);
            exit;
        }
        
        // Chunk appending logic
        $temp_name = md5($original_name . session_id()) . '.part';
        $temp_path = $upload_dir . '/' . $temp_name;
        
        $out = @fopen($temp_path, $chunk == 0 ? "wb" : "ab");
        if ($out) {
            $in = @fopen($file['tmp_name'], "rb");
            if ($in) {
                while ($buff = fread($in, 4096)) fwrite($out, $buff);
            } else {
                http_response_code(500); echo json_encode(['error' => 'Input stream failed']); exit;
            }
            @fclose($in);
            @fclose($out);
        } else {
            http_response_code(500); echo json_encode(['error' => 'Output stream failed']); exit;
        }
        
        if ($chunk == $total_chunks - 1) {
            // Finalize
            if ($category === 'general') {
                $target_path = $general_dir . '/' . $original_name;
                rename($temp_path, $target_path);
            } else if ($category === 'drawing') {
                $target_path = $drawing_dir . '/' . $original_name;
                rename($temp_path, $target_path);
            } else {
                $file_id = uniqid('', true);
                $saved_name = $original_name;
                $target_path = $upload_dir . '/' . $saved_name;
                rename($temp_path, $target_path);
                
                $db = read_db($data_file);
                $db[] = [
                    'id' => $file_id,
                    'filename' => $original_name,
                    'saved_filename' => $saved_name,
                    'category' => $category,
                    'upload_time' => date('Y-m-d H:i:s'),
                    'size' => filesize($target_path)
                ];
                write_db($data_file, $db);
            }
            echo json_encode(['success' => true, 'complete' => true]);
            exit;
        } else {
            echo json_encode(['success' => true, 'chunk' => $chunk]);
            exit;
        }
    }

    if ($action === 'delete') {
        if (!isset($_SESSION['admin']) || $_SESSION['admin'] !== true) {
            http_response_code(403);
            echo json_encode(['error' => '권한이 없습니다.']);
            exit;
        }
        
        $file_id = isset($_GET['id']) ? $_GET['id'] : '';
        
        if (strpos($file_id, 'gen_') === 0) {
            $filename = basename(base64_decode(substr($file_id, 4)));
            $filepath = $general_dir . '/' . $filename;
            if (file_exists($filepath)) {
                rename($filepath, $general_dir . '/.deleted_' . $filename);
                echo json_encode(['success' => true]);
            } else { http_response_code(404); echo json_encode(['error' => '파일을 찾을 수 없습니다.']); }
            exit;
        }
        
        if (strpos($file_id, 'draw_') === 0) {
            $filename = basename(base64_decode(substr($file_id, 5)));
            $filepath = $drawing_dir . '/' . $filename;
            if (file_exists($filepath)) {
                rename($filepath, $drawing_dir . '/.deleted_' . $filename);
                echo json_encode(['success' => true]);
            } else { http_response_code(404); echo json_encode(['error' => '파일을 찾을 수 없습니다.']); }
            exit;
        }

        $db = read_db($data_file);
        $updated_db = [];
        $found = false;
        
        foreach ($db as $item) {
            if ($item['id'] === $file_id) { $found = true; continue; }
            $updated_db[] = $item;
        }
        
        if (!$found) {
            http_response_code(404);
            echo json_encode(['error' => '파일을 찾을 수 없습니다.']);
            exit;
        }
        
        write_db($data_file, $updated_db);
        echo json_encode(['success' => true]);
        exit;
    }
    
    if ($action === 'download') {
        $file_id = isset($_GET['id']) ? $_GET['id'] : '';
        
        if (strpos($file_id, 'gen_') === 0) {
            $filename = basename(base64_decode(substr($file_id, 4)));
            $target_path = $general_dir . '/' . $filename;
            if (!file_exists($target_path)) { http_response_code(404); echo '실제 파일이 존재하지 않습니다.'; exit; }
            $download_name = $filename;
        } 
        else if (strpos($file_id, 'draw_') === 0) {
            $filename = basename(base64_decode(substr($file_id, 5)));
            $target_path = $drawing_dir . '/' . $filename;
            if (!file_exists($target_path)) { http_response_code(404); echo '실제 파일이 존재하지 않습니다.'; exit; }
            $download_name = $filename;
        }
        else {
            $db = read_db($data_file);
            $file_info = null;
            foreach ($db as $item) {
                if ($item['id'] === $file_id) { $file_info = $item; break; }
            }
            if (!$file_info) { http_response_code(404); echo '파일을 찾을 수 없습니다.'; exit; }
            
            $target_path = $upload_dir . '/' . $file_info['saved_filename'];
            if (!file_exists($target_path)) {
                if (file_exists(__DIR__ . '/uploads/' . $file_info['saved_filename'])) {
                    $target_path = __DIR__ . '/uploads/' . $file_info['saved_filename'];
                } else if (file_exists(__DIR__ . '/uploads/' . $file_info['category'] . '/' . $file_info['saved_filename'])) {
                    $target_path = __DIR__ . '/uploads/' . $file_info['category'] . '/' . $file_info['saved_filename'];
                }
            }
            if (!file_exists($target_path)) { http_response_code(404); echo '실제 파일이 존재하지 않습니다.'; exit; }
            $download_name = $file_info['filename'];
        }
        
        $encoded_name = rawurlencode($download_name);
        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . basename($download_name) . '"; filename*=UTF-8\'\'' . $encoded_name);
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($target_path));
        readfile($target_path);
        exit;
    }

    if ($action === 'view_file') {
        $file_id = isset($_GET['id']) ? $_GET['id'] : '';
        
        if (strpos($file_id, 'gen_') === 0) {
            $filename = basename(base64_decode(substr($file_id, 4)));
            $target_path = $general_dir . '/' . $filename;
            if (!file_exists($target_path)) { http_response_code(404); echo '실제 파일이 존재하지 않습니다.'; exit; }
            $view_name = $filename;
        } 
        else if (strpos($file_id, 'draw_') === 0) {
            $filename = basename(base64_decode(substr($file_id, 5)));
            $target_path = $drawing_dir . '/' . $filename;
            if (!file_exists($target_path)) { http_response_code(404); echo '실제 파일이 존재하지 않습니다.'; exit; }
            $view_name = $filename;
        }
        else {
            $db = read_db($data_file);
            $file_info = null;
            foreach ($db as $item) {
                if ($item['id'] === $file_id) { $file_info = $item; break; }
            }
            if (!$file_info) { http_response_code(404); echo '파일을 찾을 수 없습니다.'; exit; }
            
            $target_path = $upload_dir . '/' . $file_info['saved_filename'];
            if (!file_exists($target_path)) {
                if (file_exists(__DIR__ . '/uploads/' . $file_info['saved_filename'])) {
                    $target_path = __DIR__ . '/uploads/' . $file_info['saved_filename'];
                } else if (file_exists(__DIR__ . '/uploads/' . $file_info['category'] . '/' . $file_info['saved_filename'])) {
                    $target_path = __DIR__ . '/uploads/' . $file_info['category'] . '/' . $file_info['saved_filename'];
                }
            }
            if (!file_exists($target_path)) { http_response_code(404); echo '실제 파일이 존재하지 않습니다.'; exit; }
            $view_name = $file_info['filename'];
        }
        
        $ext = strtolower(pathinfo($view_name, PATHINFO_EXTENSION));
        $mime_type = 'application/octet-stream';
        if ($ext === 'pdf') $mime_type = 'application/pdf';
        else if ($ext === 'png') $mime_type = 'image/png';
        else if ($ext === 'jpg' || $ext === 'jpeg') $mime_type = 'image/jpeg';
        else if ($ext === 'gif') $mime_type = 'image/gif';
        else if ($ext === 'webp') $mime_type = 'image/webp';
        else if ($ext === 'xlsx') $mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if ($ext === 'xls') $mime_type = 'application/vnd.ms-excel';
        else if ($ext === 'hwpx') $mime_type = 'application/hwp+zip';
        else if ($ext === 'hwp') $mime_type = 'application/x-hwp';
        else if ($ext === 'txt') $mime_type = 'text/plain; charset=utf-8';
        
        $encoded_name = rawurlencode($view_name);
        header('Content-Type: ' . $mime_type);
        header('Content-Disposition: inline; filename="' . basename($view_name) . '"; filename*=UTF-8\'\'' . $encoded_name);
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        readfile($target_path);
        exit;
    }

    if ($action === 'download_excel') {
        $file = isset($_GET['file']) ? $_GET['file'] : '';
        if (strpos($file, '..') !== false || strpos($file, '/') !== false || strpos($file, '\\') !== false) {
            http_response_code(403);
            exit('잘못된 접근입니다.');
        }
        
        $target_path = __DIR__ . '/excels/' . $file;
        if (!file_exists($target_path)) {
            // 자소 분리 및 인코딩 호환성을 위한 glob 백업 탐색
            $files = glob(__DIR__ . '/excels/*.xlsx');
            $found = false;
            foreach ($files as $f) {
                $base = basename($f);
                if (function_exists('normalizer_normalize')) {
                    if (normalizer_normalize($base, Normalizer::FORM_C) === normalizer_normalize($file, Normalizer::FORM_C) ||
                        normalizer_normalize($base, Normalizer::FORM_D) === normalizer_normalize($file, Normalizer::FORM_D)) {
                        $target_path = $f;
                        $found = true;
                        break;
                    }
                } else {
                    if (strcasecmp($base, $file) === 0) {
                        $target_path = $f;
                        $found = true;
                        break;
                    }
                }
            }
            if (!$found) {
                http_response_code(404);
                exit('엑셀 파일을 찾을 수 없습니다.');
            }
        }
        
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Length: ' . filesize($target_path));
        header('Content-Disposition: attachment; filename="' . rawurlencode(basename($target_path)) . '"');
        readfile($target_path);
        exit;
    }

    // --- High Score API ---
    $high_score_file = __DIR__ . '/data/high_scores.json';
    $default_scores = [
        'journal_1'          => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'journal_2'          => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'journal_acc1_book'  => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'journal_acc2_book'  => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'journal_acc2_past'  => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'journal_acc1_past'  => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'journal_fat1_book'  => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'theory_1'           => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'theory_2'           => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'theory_fat2'        => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'theory_acc2'        => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'theory_acc1_book'   => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'theory_acc2_book'   => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'theory_acc2_past'   => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'theory_acc1_past'   => ['name' => '기록 없음', 'score' => 0, 'date' => ''],
        'theory_fat1_book'   => ['name' => '기록 없음', 'score' => 0, 'date' => '']
    ];

    if ($action === 'high_score_get') {
        $data = atomic_json_read($high_score_file);
        if (!is_array($data)) $data = $default_scores;
        
        // 기존 2개 키(journal, theory)만 있는 경우 2급으로 마이그레이션 호환
        if (isset($data['journal']) && !isset($data['journal_2'])) {
            $data['journal_2'] = $data['journal'];
        }
        if (isset($data['theory']) && !isset($data['theory_2'])) {
            $data['theory_2'] = $data['theory'];
        }
        
        $merged = array_merge($default_scores, $data);
        echo json_encode($merged, JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'high_score_update') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) { http_response_code(400); exit; }
        
        $type = isset($input['type']) ? trim($input['type']) : '';
        $score = isset($input['score']) ? (int)$input['score'] : 0;
        $name = isset($input['name']) ? trim($input['name']) : '익명';
        if (empty($name)) $name = '익명';
        
        $updated = false;

        // 영문/숫자/언더스코어로 된 유효한 type 키 모두 허용
        if ($type && preg_match('/^[a-zA-Z0-9_]+$/', $type)) {
            atomic_json_modify($high_score_file, function($data) use ($default_scores, $type, $score, $name, &$updated) {
                if (!is_array($data)) $data = $default_scores;
                $current_score = isset($data[$type]['score']) ? (int)$data[$type]['score'] : 0;
                if ($score > $current_score) {
                    $data[$type] = ['name' => $name, 'score' => $score, 'date' => date('Y-m-d H:i:s')];
                    $updated = true;
                }
                return $data;
            });
        }
        echo json_encode(['success' => true, 'updated' => $updated, 'type' => $type, 'score' => $score, 'name' => $name]);
        exit;
    }
    
    // --- Question Stats API ---
    $stats_file = __DIR__ . '/data/question_stats.json';
    if ($action === 'question_stats_get') {
        $type = isset($_GET['type']) ? $_GET['type'] : '';
        $id = isset($_GET['id']) ? $_GET['id'] : '';
        
        $data = atomic_json_read($stats_file);
        $stat = isset($data[$type][$id]) ? $data[$type][$id] : ['correct' => 0, 'wrong' => 0];
        $correct = isset($stat['correct']) ? (int)$stat['correct'] : 0;
        $wrong = isset($stat['wrong']) ? (int)$stat['wrong'] : 0;
        $total = $correct + $wrong;
        $rate = $total > 0 ? round(($correct / $total) * 100) : '-';

        echo json_encode([
            'correct' => $correct,
            'wrong' => $wrong,
            'total' => $total,
            'rate' => $rate
        ]);
        exit;
    }

    if ($action === 'question_stats_record') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) { http_response_code(400); exit; }
        
        $type = isset($input['type']) ? $input['type'] : '';
        $id = isset($input['id']) ? $input['id'] : '';
        $isCorrect = isset($input['is_correct']) ? $input['is_correct'] : (isset($input['isCorrect']) ? $input['isCorrect'] : false);
        
        if ($type && $id) {
            $calcResult = ['rate' => 0, 'total' => 0];
            atomic_json_modify($stats_file, function($data) use ($type, $id, $isCorrect, &$calcResult) {
                if (!is_array($data)) $data = [];
                if (!isset($data[$type])) $data[$type] = [];
                if (!isset($data[$type][$id])) $data[$type][$id] = ['correct' => 0, 'wrong' => 0];
                
                if ($isCorrect) $data[$type][$id]['correct']++;
                else $data[$type][$id]['wrong']++;

                $correct = $data[$type][$id]['correct'];
                $wrong = $data[$type][$id]['wrong'];
                $total = $correct + $wrong;
                $calcResult['total'] = $total;
                $calcResult['rate'] = $total > 0 ? round(($correct / $total) * 100) : 0;

                return $data;
            });

            echo json_encode(['success' => true, 'rate' => $calcResult['rate'], 'total' => $calcResult['total']]);
        } else {
            http_response_code(400); echo json_encode(['success' => false]);
        }
        exit;
    }

    // --- User Streak Persistence API ---
    $streaks_file = __DIR__ . '/data/user_streaks.json';
    if ($action === 'user_streak_get') {
        $name = isset($_GET['name']) ? trim($_GET['name']) : '';
        $type = isset($_GET['type']) ? trim($_GET['type']) : '';
        
        $data = atomic_json_read($streaks_file);
        $streak = 0;
        if ($name && $type && isset($data[$name][$type])) {
            $streak = (int)$data[$name][$type];
        }
        echo json_encode(['streak' => $streak, 'name' => $name, 'type' => $type], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'user_streak_update') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) { http_response_code(400); exit; }
        
        $name = isset($input['name']) ? trim($input['name']) : '';
        $type = isset($input['type']) ? trim($input['type']) : '';
        $streak = isset($input['streak']) ? max(0, (int)$input['streak']) : 0;
        
        if ($name && $type) {
            atomic_json_modify($streaks_file, function($data) use ($name, $type, $streak) {
                if (!is_array($data)) $data = [];
                if (!isset($data[$name])) $data[$name] = [];
                $data[$name][$type] = $streak;
                $data[$name]['_last_active'] = date('Y-m-d H:i:s');
                return $data;
            });
            echo json_encode(['success' => true, 'streak' => $streak]);
        } else {
            http_response_code(400); echo json_encode(['success' => false]);
        }
        exit;
    }

    // --- User Wrong Notes API ---
    $wrong_notes_file = __DIR__ . '/data/user_wrong_notes.json';

    if ($action === 'wrong_notes_get') {
        $name = isset($_GET['name']) ? trim($_GET['name']) : '';
        $type = isset($_GET['type']) ? trim($_GET['type']) : '';
        
        $data = atomic_json_read($wrong_notes_file);
        $userNotes = (isset($data[$name]) && is_array($data[$name])) ? $data[$name] : [];
        $typeNotes = ($type && isset($userNotes[$type]) && is_array($userNotes[$type])) ? $userNotes[$type] : [];

        $wrong_ids = array_keys($typeNotes);
        echo json_encode([
            'success' => true,
            'name' => $name,
            'type' => $type,
            'wrong_ids' => $wrong_ids,
            'total' => count($wrong_ids),
            'details' => $typeNotes
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'wrong_notes_record') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) { http_response_code(400); exit; }

        $name = isset($input['name']) ? trim($input['name']) : '';
        $type = isset($input['type']) ? trim($input['type']) : '';
        $id = isset($input['id']) ? (string)$input['id'] : '';
        $isCorrect = isset($input['is_correct']) ? (bool)$input['is_correct'] : false;
        $isWrongMode = isset($input['is_wrong_mode']) ? (bool)$input['is_wrong_mode'] : false;

        if (!$name || !$type || !$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '필수 항목 누락']);
            exit;
        }

        $remaining = 0;
        $removed = false;

        atomic_json_modify($wrong_notes_file, function($data) use ($name, $type, $id, $isCorrect, $isWrongMode, &$remaining, &$removed) {
            if (!is_array($data)) $data = [];
            if (!isset($data[$name])) $data[$name] = [];
            if (!isset($data[$name][$type])) $data[$name][$type] = [];

            if (!$isCorrect) {
                // 틀린 경우: 오답 노트에 추가 또는 갱신
                $prevCount = isset($data[$name][$type][$id]['wrong_count']) ? (int)$data[$name][$type][$id]['wrong_count'] : 0;
                $data[$name][$type][$id] = [
                    'id' => $id,
                    'wrong_count' => $prevCount + 1,
                    'last_wrong_at' => date('Y-m-d H:i:s')
                ];
            } else {
                // 오답 풀이 모드에서 정답을 맞힌 경우 -> 오답 노트에서 제거 (졸업)
                if ($isWrongMode && isset($data[$name][$type][$id])) {
                    unset($data[$name][$type][$id]);
                    $removed = true;
                }
            }

            $remaining = count($data[$name][$type]);
            return $data;
        });

        echo json_encode([
            'success' => true,
            'remaining' => $remaining,
            'removed' => $removed
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'wrong_notes_clear') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) { http_response_code(400); exit; }

        $name = isset($input['name']) ? trim($input['name']) : '';
        $type = isset($input['type']) ? trim($input['type']) : '';
        $id = isset($input['id']) ? (string)$input['id'] : '';

        if (!$name || !$type) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '필수 항목 누락']);
            exit;
        }

        atomic_json_modify($wrong_notes_file, function($data) use ($name, $type, $id) {
            if (!is_array($data)) $data = [];
            if (isset($data[$name][$type])) {
                if ($id) {
                    unset($data[$name][$type][$id]);
                } else {
                    $data[$name][$type] = [];
                }
            }
            return $data;
        });

        echo json_encode(['success' => true]);
        exit;
    }

    // --- Section Titles Customization API ---
    $titles_file = __DIR__ . '/data/section_titles.json';
    $default_titles = [
        'grade2' => [
            'accounting' => '전산회계 자료',
            'general'    => '일반 자료',
            'drawing'    => '그림 자료',
            'seohee'     => '이서희선생님 자료',
            'heera'      => '우승현선생님 자료 (희라쌤자료)'
        ],
        'grade1' => [
            'accounting' => '전산회계 자료',
            'general'    => '일반 자료',
            'drawing'    => '그림 자료',
            'seohee'     => '이서희선생님 자료',
            'heera'      => '우승현선생님 자료 (희라쌤자료)'
        ]
    ];

    if ($action === 'section_titles_get') {
        $data = atomic_json_read($titles_file);
        if (!is_array($data)) $data = [];
        $res = isset($data[$grade]) && is_array($data[$grade]) ? array_merge($default_titles[$grade], $data[$grade]) : $default_titles[$grade];
        echo json_encode(['success' => true, 'grade' => $grade, 'titles' => $res], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'section_titles_update') {
        if (!isset($_SESSION['admin']) || $_SESSION['admin'] !== true) {
            http_response_code(403);
            exit(json_encode(['error' => '권한이 없습니다.']));
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) { http_response_code(400); exit; }

        $req_grade = isset($input['grade']) && in_array($input['grade'], ['grade1', 'grade2']) ? $input['grade'] : $grade;
        $category = isset($input['category']) ? trim($input['category']) : '';
        $title = isset($input['title']) ? trim($input['title']) : '';

        if (!$category || !$title) {
            http_response_code(400);
            exit(json_encode(['error' => '카테고리와 제목을 모두 입력해주세요.']));
        }

        atomic_json_modify($titles_file, function($data) use ($req_grade, $category, $title, $default_titles) {
            if (!is_array($data)) $data = $default_titles;
            if (!isset($data[$req_grade])) $data[$req_grade] = $default_titles[$req_grade];
            $data[$req_grade][$category] = $title;
            return $data;
        });

        echo json_encode(['success' => true, 'grade' => $req_grade, 'category' => $category, 'title' => $title], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // =========================================================================
    // --- 1급 맞춤 코스 학습 (Learning Course) API ---
    // =========================================================================
    $learning_users_file = __DIR__ . '/data/learning_users.json';
    $learning_progress_file = __DIR__ . '/data/learning_progress.json';

    // 1) 학습자 회원가입
    if ($action === 'learning_register') {
        $input = json_decode(file_get_contents('php://input'), true);
        $username = isset($input['username']) ? trim($input['username']) : '';
        $password = isset($input['password']) ? (string)$input['password'] : '';
        $password_confirm = isset($input['password_confirm']) ? (string)$input['password_confirm'] : '';

        if (mb_strlen($username, 'UTF-8') < 1 || mb_strlen($username, 'UTF-8') > 30) {
            http_response_code(400);
            exit(json_encode(['success' => false, 'message' => '이름(아이디)을 1~30자 이내로 입력해주세요.']));
        }
        if (strlen($password) < 4) {
            http_response_code(400);
            exit(json_encode(['success' => false, 'message' => '비밀번호는 숫자 4자리 이상으로 입력해주세요.']));
        }
        if ($password !== $password_confirm) {
            http_response_code(400);
            exit(json_encode(['success' => false, 'message' => '비밀번호와 비밀번호 확인이 일치하지 않습니다.']));
        }

        if (!$pdo) {
            http_response_code(500);
            exit(json_encode(['success' => false, 'message' => '데이터베이스 연결에 실패했습니다.']));
        }

        // 아이디 중복 체크
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :username");
        $stmt->execute([':username' => $username]);
        if ($stmt->fetch()) {
            http_response_code(409);
            exit(json_encode(['success' => false, 'message' => '이미 등록된 아이디(이름)입니다. 다른 이름을 사용해주세요.']));
        }

        $password_hash = password_hash($password, PASSWORD_BCRYPT);
        // 이우성 또는 admin 이라는 이름으로 가입 시도 시 role='admin' 부여 가능 (혹은 수동부여)
        $role = ($username === '이우성' || $username === 'admin') ? 'admin' : 'user';
        
        $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, role) VALUES (:username, :password_hash, :role)");
        $stmt->execute([
            ':username' => $username,
            ':password_hash' => $password_hash,
            ':role' => $role
        ]);
        
        $user_id = $pdo->lastInsertId();

        // 세션 로그인
        $_SESSION['learning_user'] = [
            'id' => $user_id,
            'username' => $username,
            'is_admin' => ($role === 'admin')
        ];

        // 가입 완료 후 빈 학습 통계 레코드 생성 (선택 사항)
        $stmt = $pdo->prepare("INSERT IGNORE INTO learning_stats (user_id, grade, subject) VALUES (:uid, 'grade1', 'default'), (:uid2, 'grade2', 'default')");
        $stmt->execute([':uid' => $user_id, ':uid2' => $user_id]);

        session_write_close(); // 세션 저장 즉시 완료
        echo json_encode([
            'success' => true,
            'message' => '회원가입이 완료되었습니다!',
            'user' => ['id' => $user_id, 'username' => $username, 'is_admin' => ($role === 'admin')]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 2) 학습자 로그인
    if ($action === 'learning_login') {
        $input = json_decode(file_get_contents('php://input'), true);
        $username = isset($input['username']) ? trim($input['username']) : '';
        $password = isset($input['password']) ? (string)$input['password'] : '';

        if (!$username || !$password) {
            http_response_code(400);
            exit(json_encode(['success' => false, 'message' => '이름과 비밀번호를 입력해주세요.']));
        }

        if (!$pdo) {
            http_response_code(500);
            exit(json_encode(['success' => false, 'message' => '데이터베이스 연결에 실패했습니다.']));
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username");
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch();

        // 1. 아이디 존재 및 비밀번호 검증
        if (!$user || !password_verify($password, $user['password_hash'])) {
            // 특수 관리자(admin) 패스워드 호환성 (환경변수 ADMIN_PASSWORD)
            if (mb_strtolower($username, 'UTF-8') === 'admin' && $password === $admin_password) {
                // 통과
                $user = [
                    'id' => 'admin',
                    'username' => '관리자',
                    'role' => 'admin',
                    'is_blocked' => 0
                ];
            } else {
                http_response_code(401);
                exit(json_encode(['success' => false, 'message' => '이름 또는 비밀번호가 올바르지 않습니다.']));
            }
        }

        // 2. 차단 여부 검증
        if ((int)$user['is_blocked'] === 1) {
            http_response_code(403);
            $reason = $user['block_reason'] ? $user['block_reason'] : '관리자에 의해 로그인이 차단되었습니다.';
            exit(json_encode(['success' => false, 'message' => "차단된 계정입니다.\n사유: " . $reason]));
        }

        // 3. 세션 등록 및 로그인 시간/IP 기록
        $_SESSION['learning_user'] = [
            'id' => $user['id'],
            'username' => $user['username'],
            'is_admin' => ($user['role'] === 'admin')
        ];

        if ($user['id'] !== 'admin') {
            $ip_address = $_SERVER['REMOTE_ADDR'];
            // 마지막 접속 업데이트
            $update_stmt = $pdo->prepare("UPDATE users SET last_login_at = NOW(), last_login_ip = :ip WHERE id = :id");
            $update_stmt->execute([':ip' => $ip_address, ':id' => $user['id']]);

            // 로그인 로그 기록
            $log_stmt = $pdo->prepare("INSERT INTO user_logs (user_id, action, ip_address) VALUES (:uid, 'login', :ip)");
            $log_stmt->execute([':uid' => $user['id'], ':ip' => $ip_address]);
        }

        session_write_close(); // 세션 저장 즉시 완료
        echo json_encode([
            'success' => true,
            'message' => '로그인 성공!',
            'user' => ['id' => $user['id'], 'username' => $user['username'], 'is_admin' => ($user['role'] === 'admin')]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 3) 학습자 로그아웃
    if ($action === 'learning_logout') {
        unset($_SESSION['learning_user']);
        echo json_encode(['success' => true, 'message' => '로그아웃되었습니다.']);
        exit;
    }

    // 4) 학습자 상태 및 진도율 조회
    if ($action === 'learning_status') {
        $cur_user = isset($_SESSION['learning_user']) ? $_SESSION['learning_user'] : null;
        if (!$cur_user) {
            echo json_encode(['is_logged_in' => false], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $progress_data = atomic_json_read($learning_progress_file);
        $user_prog = isset($progress_data[$cur_user['id']]) ? $progress_data[$cur_user['id']] : [
            'completed_steps' => [],
            'section_progress' => [],
            'wrong_notes' => [],
            'stats' => ['solved_count' => 0, 'correct_count' => 0]
        ];

        echo json_encode([
            'is_logged_in' => true,
            'user' => $cur_user,
            'progress' => $user_prog
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 5) 학습 스텝 완료 및 진도 저장
    if ($action === 'learning_save_step') {
        $cur_user = isset($_SESSION['learning_user']) ? $_SESSION['learning_user'] : null;
        if (!$cur_user) {
            http_response_code(401);
            exit(json_encode(['success' => false, 'message' => '로그인이 필요합니다.']));
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) { http_response_code(400); exit; }

        $step_id = isset($input['step_id']) ? trim($input['step_id']) : '';
        $section_id = isset($input['section_id']) ? trim($input['section_id']) : '';
        $is_correct = isset($input['is_correct']) ? (bool)$input['is_correct'] : null;
        $quiz_type = isset($input['quiz_type']) ? trim($input['quiz_type']) : ''; // 'theory' 또는 'journal'
        $is_step_completed = isset($input['is_step_completed']) ? (bool)$input['is_step_completed'] : false;
        $wrong_data = isset($input['wrong_data']) ? $input['wrong_data'] : null;
        $section_pct = isset($input['section_pct']) ? min(100, max(0, (int)$input['section_pct'])) : null;

        $user_id = $cur_user['id'];

        $updated_prog = atomic_json_modify($learning_progress_file, function($data) use ($user_id, $step_id, $section_id, $is_correct, $quiz_type, $is_step_completed, $wrong_data, $section_pct) {
            if (!is_array($data)) $data = [];
            if (!isset($data[$user_id])) {
                $data[$user_id] = [
                    'completed_steps' => [],
                    'correct_counts' => [],
                    'section_progress' => [],
                    'wrong_notes' => [],
                    'stats' => ['solved_count' => 0, 'correct_count' => 0]
                ];
            }

            if (!isset($data[$user_id]['correct_counts'])) {
                $data[$user_id]['correct_counts'] = [];
            }

            // 정답을 맞힌 경우 누적 횟수 기록
            if ($is_correct && $step_id && $quiz_type) {
                if (!isset($data[$user_id]['correct_counts'][$step_id])) {
                    $data[$user_id]['correct_counts'][$step_id] = ['theory' => 0, 'journal' => 0];
                }
                // 기존 데이터에 필드가 없을 수 있으므로 보정
                if (!isset($data[$user_id]['correct_counts'][$step_id]['theory'])) {
                    $data[$user_id]['correct_counts'][$step_id]['theory'] = 0;
                }
                if (!isset($data[$user_id]['correct_counts'][$step_id]['journal'])) {
                    $data[$user_id]['correct_counts'][$step_id]['journal'] = 0;
                }
                $data[$user_id]['correct_counts'][$step_id][$quiz_type]++;
            }

            // 프론트에서 최종 완료 판정 신호가 왔을 때만 완료 목록에 추가
            if ($is_step_completed && $step_id) {
                if (!isset($data[$user_id]['completed_steps'])) {
                    $data[$user_id]['completed_steps'] = [];
                }
                if (!in_array($step_id, $data[$user_id]['completed_steps'])) {
                    $data[$user_id]['completed_steps'][] = $step_id;
                }
            }

            // 섹션 진도율 갱신
            if ($section_id && $section_pct !== null) {
                if (!isset($data[$user_id]['section_progress'])) {
                    $data[$user_id]['section_progress'] = [];
                }
                $data[$user_id]['section_progress'][$section_id] = $section_pct;
            }

            // 통계 및 오답노트
            if ($is_correct !== null) {
                $data[$user_id]['stats']['solved_count']++;
                if ($is_correct) {
                    $data[$user_id]['stats']['correct_count']++;
                } else if ($wrong_data && is_array($wrong_data)) {
                    // 오답노트에 추가 또는 업데이트
                    $prob_key = isset($wrong_data['id']) ? (string)$wrong_data['id'] : $step_id;
                    $found = false;
                    foreach ($data[$user_id]['wrong_notes'] as &$wn) {
                        if ($wn['id'] === $prob_key) {
                            $wn['wrong_count'] = ($wn['wrong_count'] ?? 1) + 1;
                            $wn['last_wrong_at'] = date('Y-m-d H:i:s');
                            $wn['resolved'] = false;
                            $found = true;
                            break;
                        }
                    }
                    if (!$found) {
                        $data[$user_id]['wrong_notes'][] = [
                            'id' => $prob_key,
                            'step_id' => $step_id,
                            'section_id' => $section_id,
                            'section_title' => $wrong_data['section_title'] ?? '',
                            'type' => $wrong_data['type'] ?? 'theory',
                            'question' => $wrong_data['question'] ?? '',
                            'options' => $wrong_data['options'] ?? [],
                            'correct_answer' => $wrong_data['correct_answer'] ?? '',
                            'explanation' => $wrong_data['explanation'] ?? '',
                            'book_reference' => $wrong_data['book_reference'] ?? '',
                            'wrong_count' => 1,
                            'created_at' => date('Y-m-d H:i:s'),
                            'last_wrong_at' => date('Y-m-d H:i:s'),
                            'resolved' => false
                        ];
                    }
                }
            }

            return $data;
        });

        echo json_encode([
            'success' => true,
            'progress' => $updated_prog[$user_id] ?? []
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 6) 오답노트 복습 완료(해결) 또는 삭제
    if ($action === 'learning_resolve_wrong_note') {
        $cur_user = isset($_SESSION['learning_user']) ? $_SESSION['learning_user'] : null;
        if (!$cur_user) {
            http_response_code(401);
            exit(json_encode(['success' => false, 'message' => '로그인이 필요합니다.']));
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $note_id = isset($input['note_id']) ? (string)$input['note_id'] : '';
        $delete = isset($input['delete']) && $input['delete'] === true;

        $user_id = $cur_user['id'];

        $updated_prog = atomic_json_modify($learning_progress_file, function($data) use ($user_id, $note_id, $delete) {
            if (!is_array($data) || !isset($data[$user_id])) return $data;

            if ($delete) {
                $data[$user_id]['wrong_notes'] = array_values(array_filter(
                    $data[$user_id]['wrong_notes'],
                    function($wn) use ($note_id) { return $wn['id'] !== $note_id; }
                ));
            } else {
                foreach ($data[$user_id]['wrong_notes'] as &$wn) {
                    if ($wn['id'] === $note_id) {
                        $wn['resolved'] = true;
                        $wn['resolved_at'] = date('Y-m-d H:i:s');
                        break;
                    }
                }
            }
            return $data;
        });

        echo json_encode([
            'success' => true,
            'wrong_notes' => $updated_prog[$user_id]['wrong_notes'] ?? []
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 7) 관리자용 전체 학습자 진도 현황 통계 API
    if ($action === 'learning_admin_stats') {
        $cur_user = isset($_SESSION['learning_user']) ? $_SESSION['learning_user'] : null;
        $is_admin = (!empty($cur_user['is_admin'])) || (isset($_SESSION['admin']) && $_SESSION['admin'] === true);
        if (!$is_admin) {
            http_response_code(403);
            exit(json_encode(['success' => false, 'message' => '관리자 권한이 필요합니다.']));
        }

        try {
        // DB에서 유저 목록 조회 (is_blocked/block_reason 컬럼이 없을 경우 fallback)
        try {
            $stmt = $pdo->query("SELECT id, username, created_at, last_login_at AS last_login, is_blocked, block_reason FROM users ORDER BY created_at DESC");
        } catch (Exception $e) {
            // is_blocked/block_reason 컬럼이 없는 구버전 DB 대응
            $stmt = $pdo->query("SELECT id, username, created_at, last_login_at AS last_login, 0 AS is_blocked, '' AS block_reason FROM users ORDER BY created_at DESC");
        }
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $progress_data = atomic_json_read($learning_progress_file);
        if (!is_array($progress_data)) $progress_data = [];

        $user_list = [];
        $total_solved = 0;
        $total_correct = 0;
        $total_pct_sum = 0;

        // 9대 단원 목표 가중치
        $section_weights = [
            'sec_asset' => 12,
            'sec_liability' => 12,
            'sec_equity' => 12,
            'sec_revenue_expense' => 12,
            'sec_cost' => 16,
            'sec_vat' => 16,
            'sec_closing' => 18,
            'sec_account_master' => 15,
            'sec_grade1_only' => 20
        ];
        $total_max_score = array_sum($section_weights); // 133점

        foreach ($users as $u) {
            $uid = $u['id'];
            $u_prog = isset($progress_data[$uid]) ? $progress_data[$uid] : [];
            $counts = $u_prog['correct_counts'] ?? [];
            $stats = $u_prog['stats'] ?? ['solved_count' => 0, 'correct_count' => 0];
            $wrong_notes = $u_prog['wrong_notes'] ?? [];

            // 기출문제(일반 퀴즈) 통계 병합
            $q_stmt = $pdo->prepare("SELECT SUM(total_solved) as t_sol, SUM(total_correct) as t_cor FROM learning_stats WHERE user_id = :uid");
            $q_stmt->execute([':uid' => $uid]);
            $q_res = $q_stmt->fetch();
            $quiz_solved = (int)($q_res['t_sol'] ?? 0);
            $quiz_correct = (int)($q_res['t_cor'] ?? 0);
            
            $stats['solved_count'] += $quiz_solved;
            $stats['correct_count'] += $quiz_correct;

            // 정밀 진도율 계산
            $acquired_score = 0;
            $completed_sections = 0;
            $sec_details = [];

            foreach ($section_weights as $s_id => $max_w) {
                $c = $counts[$s_id] ?? ['theory' => 0, 'journal' => 0];
                $reqT = 6; $reqJ = 6;
                if ($s_id === 'sec_cost' || $s_id === 'sec_vat') { $reqT = 8; $reqJ = 8; }
                else if ($s_id === 'sec_closing') { $reqT = 8; $reqJ = 10; }
                else if ($s_id === 'sec_account_master') { $reqT = 15; $reqJ = 0; }
                else if ($s_id === 'sec_grade1_only') { $reqT = 10; $reqJ = 10; }

                $curT = min($reqT, $c['theory'] ?? 0);
                $curJ = min($reqJ, $c['journal'] ?? 0);
                $sec_score = $curT + $curJ;
                $acquired_score += $sec_score;

                $sec_pct = round(($sec_score / $max_w) * 100);
                $is_done = ($curT >= $reqT && ($reqJ === 0 || $curJ >= $reqJ));
                if ($is_done) $completed_sections++;

                $sec_details[$s_id] = [
                    'score' => $sec_score,
                    'max_score' => $max_w,
                    'pct' => $sec_pct,
                    'theory_count' => $c['theory'] ?? 0,
                    'journal_count' => $c['journal'] ?? 0,
                    'is_complete' => $is_done
                ];
            }

            $user_pct = $total_max_score > 0 ? round(($acquired_score / $total_max_score) * 100) : 0;
            $total_pct_sum += $user_pct;

            $unresolved_wrong = count(array_filter($wrong_notes, function($wn) { return empty($wn['resolved']); }));

            $total_solved += ($stats['solved_count'] ?? 0);
            $total_correct += ($stats['correct_count'] ?? 0);

            // 영상 시청 기록 집계
            $v_prog = isset($u_prog['video_progress']) && is_array($u_prog['video_progress']) ? $u_prog['video_progress'] : [];
            $v_items = [];
            $v_completed = 0;
            $v_bookmarks_total = 0;

            foreach ($v_prog as $v_key => $v_data) {
                $is_comp = !empty($v_data['completed']);
                if ($is_comp) $v_completed++;
                $bmarks = isset($v_data['bookmarks']) && is_array($v_data['bookmarks']) ? $v_data['bookmarks'] : [];
                $v_bookmarks_total += count($bmarks);

                $v_items[] = [
                    'video_key' => $v_key,
                    'path' => $v_data['path'] ?? '',
                    'title' => basename($v_data['path'] ?? $v_key),
                    'grade' => $v_data['grade'] ?? 'grade2',
                    'position' => $v_data['position'] ?? 0,
                    'duration' => $v_data['duration'] ?? 0,
                    'completed' => $is_comp,
                    'bookmarks' => $bmarks,
                    'updated_at' => $v_data['updated_at'] ?? ''
                ];
            }

            $user_list[] = [
                'id' => $uid,
                'username' => $u['username'],
                'created_at' => $u['created_at'] ?? '',
                'last_login' => $u['last_login'] ?? '',
                'is_blocked' => (int)($u['is_blocked'] ?? 0),
                'block_reason' => $u['block_reason'] ?? '',
                'total_pct' => $user_pct,
                'completed_sections' => $completed_sections,
                'solved_count' => $stats['solved_count'] ?? 0,
                'correct_count' => $stats['correct_count'] ?? 0,
                'accuracy' => ($stats['solved_count'] ?? 0) > 0 ? round((($stats['correct_count'] ?? 0) / $stats['solved_count']) * 100) : 0,
                'wrong_count' => count($wrong_notes),
                'unresolved_wrong_count' => $unresolved_wrong,
                'wrong_notes' => $wrong_notes,
                'section_details' => $sec_details,
                'video_stats' => [
                    'watched_count' => count($v_items),
                    'completed_count' => $v_completed,
                    'bookmarks_count' => $v_bookmarks_total
                ],
                'video_items' => $v_items
            ];
        }

        $user_count = count($users);
        $avg_pct = $user_count > 0 ? round($total_pct_sum / $user_count) : 0;
        $overall_accuracy = $total_solved > 0 ? round(($total_correct / $total_solved) * 100) : 0;

        $total_video_watched = 0;
        $total_video_completed = 0;
        foreach ($user_list as $u_item) {
            $total_video_watched += $u_item['video_stats']['watched_count'];
            $total_video_completed += $u_item['video_stats']['completed_count'];
        }

        echo json_encode([
            'success' => true,
            'summary' => [
                'total_users' => $user_count,
                'avg_progress' => $avg_pct,
                'total_solved' => $total_solved,
                'overall_accuracy' => $overall_accuracy,
                'total_video_watched' => $total_video_watched,
                'total_video_completed' => $total_video_completed
            ],
            'users' => $user_list
        ], JSON_UNESCAPED_UNICODE);
        exit;
        } catch (Exception $e) {
            http_response_code(500);
            exit(json_encode(['success' => false, 'message' => '통계 조회 중 오류: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE));
        }
    }

    // 8) 관리자: 회원 차단/해제 API
    if ($action === 'admin_block_user') {
        $cur_user = isset($_SESSION['learning_user']) ? $_SESSION['learning_user'] : null;
        $is_admin = (!empty($cur_user['is_admin'])) || (isset($_SESSION['admin']) && $_SESSION['admin'] === true);
        if (!$is_admin) {
            http_response_code(403);
            exit(json_encode(['success' => false, 'message' => '관리자 권한이 필요합니다.']));
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        $target_id = $input['target_id'] ?? '';
        $is_blocked = isset($input['is_blocked']) ? (int)$input['is_blocked'] : 1;
        $block_reason = $input['block_reason'] ?? '';
        
        if (!$target_id) {
            exit(json_encode(['success' => false, 'message' => '대상 ID가 없습니다.']));
        }
        
        try {
            $stmt = $pdo->prepare("UPDATE users SET is_blocked = :blocked, block_reason = :reason WHERE id = :id");
            $stmt->execute([':blocked' => $is_blocked, ':reason' => $block_reason, ':id' => $target_id]);
            exit(json_encode(['success' => true]));
        } catch (Exception $e) {
            exit(json_encode(['success' => false, 'message' => '차단 처리 중 오류: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE));
        }
    }

    // 9) 관리자: 다운로드 내역 조회 API
    if ($action === 'admin_download_logs') {
        $cur_user = isset($_SESSION['learning_user']) ? $_SESSION['learning_user'] : null;
        $is_admin = (!empty($cur_user['is_admin'])) || (isset($_SESSION['admin']) && $_SESSION['admin'] === true);
        if (!$is_admin) {
            http_response_code(403);
            exit(json_encode(['success' => false, 'message' => '권한이 없습니다.']));
        }
        
        try {
            // 신버전 스키마(file_path, downloaded_at) 우선
            $stmt = $pdo->query("SELECT d.id, u.username, d.file_path, d.downloaded_at, d.ip_address FROM download_logs d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.downloaded_at DESC LIMIT 500");
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            try {
                // 구버전 스키마(file_name, created_at) fallback
                $stmt = $pdo->query("SELECT d.id, u.username, d.file_name AS file_path, d.created_at AS downloaded_at, d.ip_address FROM download_logs d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC LIMIT 500");
                $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $e2) {
                $logs = []; // 테이블 없는 경우 빈 배열
            }
        }
        exit(json_encode(['success' => true, 'logs' => $logs]));
    }
}
