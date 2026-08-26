/**
 * 1급 맞춤 코스 학습용 간편 회원가입 / 로그인 / 세션 관리 모듈
 */
window.LearningAuth = (function() {
    let currentUser = null;
    let currentProgress = null;

    async function checkStatus() {
        try {
            const res = await fetch('?action=learning_status');
            const data = await res.json();
            if (data.is_logged_in && data.user) {
                currentUser = data.user;
                currentProgress = data.progress || {};
                return { loggedIn: true, user: currentUser, progress: currentProgress };
            } else {
                currentUser = null;
                currentProgress = null;
                return { loggedIn: false };
            }
        } catch (e) {
            console.error('학습자 상태 확인 실패:', e);
            return { loggedIn: false };
        }
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

        const res = await fetch('?action=learning_register', {
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

        const res = await fetch('?action=learning_login', {
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
        await checkStatus();
        return data;
    }

    async function logout() {
        try {
            await fetch('?action=learning_logout');
        } catch (e) {}
        currentUser = null;
        currentProgress = null;
    }

    function getUser() {
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
        setProgress
    };
})();