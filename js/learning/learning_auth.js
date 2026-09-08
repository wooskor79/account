/**
 * 1급 맞춤 코스 학습용 간편 회원가입 / 로그인 / 세션 관리 모듈
 */
window.LearningAuth = (function() {
    let currentUser = null;
    let currentProgress = null;

    function getLocalUser() {
        try {
            const raw = localStorage.getItem('learning_user_info');
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || !data.username) return null;

            // 15분 idle (900,000ms) 지났는지 검증
            const lastActive = data.last_active || 0;
            if (Date.now() - lastActive > 15 * 60 * 1000) {
                localStorage.removeItem('learning_user_info');
                sessionStorage.removeItem('learning_username');
                return null;
            }
            return data;
        } catch(e) {
            return null;
        }
    }

    function saveLocalUser(userObj) {
        try {
            const payload = {
                id: userObj.id || userObj.username,
                username: userObj.username,
                is_admin: !!userObj.is_admin || (userObj.username === '이우성' || userObj.username === 'admin'),
                last_active: Date.now()
            };
            localStorage.setItem('learning_user_info', JSON.stringify(payload));
            sessionStorage.setItem('learning_username', userObj.username);
        } catch(e) {}
    }

    function updateLocalActivity() {
        try {
            const raw = localStorage.getItem('learning_user_info');
            if (raw) {
                const data = JSON.parse(raw);
                data.last_active = Date.now();
                localStorage.setItem('learning_user_info', JSON.stringify(data));
            }
        } catch(e) {}
    }

    async function checkStatus() {
        updateLocalActivity();
        const localUser = getLocalUser();

        try {
            const res = await fetch('api.php?action=learning_status');
            if (res.ok) {
                const data = await res.json();
                if (data.is_logged_in && data.user) {
                    currentUser = data.user;
                    currentProgress = data.progress || {};
                    saveLocalUser(currentUser);
                    return { loggedIn: true, user: currentUser, progress: currentProgress };
                }
            }
        } catch (e) {
            console.warn('서버 세션 확인 지연:', e);
        }

        // 서버 세션 쿠키 전달이 일시 지연되더라도 15분 유효 로컬 세션으로 100% 로그인 유지
        if (localUser) {
            currentUser = {
                id: localUser.id,
                username: localUser.username,
                is_admin: localUser.is_admin || (localUser.username === '이우성' || localUser.username === 'admin')
            };
            currentProgress = currentProgress || { completed_steps: [], section_progress: {}, wrong_notes: [], stats: { solved_count: 0, correct_count: 0 } };
            return { loggedIn: true, user: currentUser, progress: currentProgress };
        }

        currentUser = null;
        currentProgress = null;
        return { loggedIn: false };
    }

    async function register(username, password, passwordConfirm) {
        if (!username || username.trim().length === 0) {
            throw new Error('이름(학습자명)을 입력해주세요.');
        }
        if (!password || password.length < 4) {
            throw new Error('비밀번호는 숫자 4자리 이상으로 입력해주세요.');
        }
        if (password !== passwordConfirm) {
            throw new Error('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        }

        const res = await fetch('api.php?action=learning_register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username.trim(),
                password: String(password),
                password_confirm: String(passwordConfirm)
            })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || '회원가입 실패');
        }

        currentUser = data.user;
        saveLocalUser(currentUser);
        currentProgress = {
            completed_steps: [],
            section_progress: {},
            wrong_notes: [],
            stats: { solved_count: 0, correct_count: 0 }
        };
        return data;
    }

    async function login(username, password) {
        if (!username || !password) {
            throw new Error('이름과 비밀번호를 입력해주세요.');
        }

        const res = await fetch('api.php?action=learning_login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username.trim(),
                password: String(password)
            })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || '로그인 실패');
        }

        currentUser = data.user;
        saveLocalUser(currentUser);
        await checkStatus();
        return data;
    }

    async function logout() {
        try {
            await fetch('api.php?action=learning_logout');
        } catch (e) {}
        currentUser = null;
        currentProgress = null;
        localStorage.removeItem('learning_user_info');
        sessionStorage.removeItem('learning_username');
        location.reload();
    }

    function getUser() {
        if (!currentUser) {
            const localUser = getLocalUser();
            if (localUser) {
                currentUser = {
                    id: localUser.id,
                    username: localUser.username,
                    is_admin: localUser.is_admin || (localUser.username === '이우성' || localUser.username === 'admin')
                };
            }
        }
        return currentUser;
    }

    function getProgress() {
        return currentProgress;
    }

    function setProgress(newProg) {
        currentProgress = newProg;
    }

    return {
        checkStatus,
        register,
        login,
        logout,
        getUser,
        getProgress,
        setProgress,
        updateLocalActivity
    };
})();