import { Suspense, lazy, useEffect, useState } from 'react';
import { SvgIcon } from '../icons';
import {
  fetchStudentAdminGate,
  loginStudentAdmin,
  setupStudentAdmin,
} from '../api/client';
import './superadmin-auth.css';

const AdminApp = lazy(() => import('./AdminApp.tsx'));

const ICON = '/entrance-icon.png';

interface Props {
  /** 当前学生 id(取自 ?id=) */
  studentId: string;
  /** 学生标题,用于文案;拿不到就给通用文案 */
  studentTitle?: string;
}

type Phase = 'loading' | 'setup' | 'login' | 'ok' | 'error';

/**
 * 学生端 /admin 的密码闸门。
 *
 * 与超管不同:这里没有账号,只有"这个学生"的一把密码。
 * - 从没设过 → 引导设置密码(setup)
 * - 设过但本机没通过校验 → 输入密码(login)
 * - 通过 → 渲染 AdminApp
 * 会话由服务端用独立 Cookie 记住,关浏览器即失效;超管可在后台重置该密码。
 */
export default function AdminGate({ studentId, studentTitle }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const gate = await fetchStudentAdminGate(studentId);
        if (!alive) return;
        if (gate.authed) setPhase('ok');
        else setPhase(gate.initialized ? 'login' : 'setup');
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : '无法连接服务器');
        setPhase('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(
        `link[rel="${rel}"]`,
      ) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };
    setLink('icon', ICON);
    setLink('apple-touch-icon', ICON);
  }, []);

  if (phase === 'loading') {
    return (
      <div className="boot-screen">
        <div className="boot-spinner" />
        <p className="boot-text">正在载入…</p>
      </div>
    );
  }

  if (phase === 'ok') {
    return (
      <Suspense
        fallback={
          <div className="boot-screen">
            <div className="boot-spinner" />
            <p className="boot-text">正在载入…</p>
          </div>
        }
      >
        <AdminApp />
      </Suspense>
    );
  }

  const isSetup = phase === 'setup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!password) {
      setError('请输入密码');
      return;
    }
    if (isSetup) {
      if (password.length < 4) {
        setError('密码至少 4 位');
        return;
      }
      if (password !== confirm) {
        setError('两次输入的密码不一致');
        return;
      }
    }
    setBusy(true);
    try {
      if (isSetup) {
        try {
          await setupStudentAdmin(studentId, password);
        } catch (err) {
          // 409:别的设备已设过密码,切到登录
          if (/已设置/.test(String(err))) {
            setPhase('login');
            setError('密码已在其他设备上设置,请直接输入');
          } else {
            setError(err instanceof Error ? err.message : '设置失败');
          }
          return;
        }
      } else {
        try {
          await loginStudentAdmin(studentId, password);
        } catch (err) {
          const msg = err instanceof Error ? err.message : '登录失败';
          if (/尚未设置/.test(msg)) {
            setPhase('setup');
            setError('尚未设置密码,请先设置');
          } else {
            setError(msg);
          }
          return;
        }
      }
      setPhase('ok');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sa-page">
      <div className="sa-bg" aria-hidden>
        <span className="sa-blob sa-blob-a" />
        <span className="sa-blob sa-blob-b" />
        <div className="sa-grid" />
      </div>
      <form className="sa-card" onSubmit={handleSubmit}>
        <div className="sa-ribbon" aria-hidden />
        <div className="sa-icon">
          <img src={ICON} alt="课程表" />
        </div>
        <div className="sa-title">
          <h1>{isSetup ? '设置家长密码' : '家长管理'}</h1>
          <p>
            {isSetup
              ? '首次进入家长后台,请先设置一个密码'
              : studentTitle
                ? `${studentTitle} · 请输入密码`
                : '请输入家长密码'}
          </p>
        </div>

        <div className="sa-field">
          <label className="sa-label" htmlFor="pg-password">
            密码
          </label>
          <input
            id="pg-password"
            type="password"
            className="sa-input"
            value={password}
            maxLength={40}
            placeholder={isSetup ? '至少 4 位' : '请输入密码'}
            autoComplete={isSetup ? 'new-password' : 'current-password'}
            autoFocus
            onChange={e => {
              setPassword(e.target.value);
              setError('');
            }}
          />
        </div>

        {isSetup && (
          <div className="sa-field">
            <label className="sa-label" htmlFor="pg-confirm">
              确认密码
            </label>
            <input
              id="pg-confirm"
              type="password"
              className="sa-input"
              value={confirm}
              maxLength={40}
              placeholder="再次输入密码"
              autoComplete="new-password"
              onChange={e => {
                setConfirm(e.target.value);
                setError('');
              }}
            />
          </div>
        )}

        {error && <div className="sa-error">{error}</div>}

        <button type="submit" className="sa-btn" disabled={busy}>
          <span>
            {busy
              ? isSetup
                ? '设置中…'
                : '登录中…'
              : isSetup
                ? '设置并进入'
                : '进入家长后台'}
          </span>
          <SvgIcon name={isSetup ? 'sparkles' : 'backpack'} size={16} />
        </button>

        <div className="sa-hint">
          <SvgIcon name="sparkles" size={13} />
          <span>
            {isSetup
              ? '此密码用于进入本学生的家长后台,忘记后可由超管重置'
              : '关闭浏览器后需要重新输入'}
          </span>
        </div>
      </form>
    </div>
  );
}
