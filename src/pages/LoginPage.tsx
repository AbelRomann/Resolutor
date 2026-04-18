import { useState } from 'react';
import { useAuth } from '../store/useAuthStore';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin: _ }: LoginPageProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Completa todos los campos.'); return; }
    setError(''); setSuccess(''); setLoading(true);

    const err = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);
    if (err) { setError(err); return; }
    if (mode === 'signup') {
      setSuccess('¡Cuenta creada! Revisa tu correo para confirmarla, luego inicia sesión.');
      setMode('login');
    }
    // Auth state change handled globally — app re-renders
  };

  return (
    <div className="login-page">
      <div className="login-card animate-in">
        <div className="login-brand">
          <div className="login-brand-icon">🛠️</div>
          <div className="login-brand-text">
            <h1>Resolutor</h1>
            <p>Diario técnico personal</p>
          </div>
        </div>

        <h2 className="login-heading">
          {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
        </h2>
        <p className="login-sub">
          {mode === 'login'
            ? 'Inicia sesión para acceder a tus casos.'
            : 'Crea tu cuenta personal de Resolutor.'}
        </p>

        <form className="login-form" onSubmit={handle}>
          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              className="login-input"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="login-input"
              type="password"
              placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '9px 13px', color: '#16a34a', fontSize: '0.83rem' }}>
              ✅ {success}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? '⏳ Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <div className="login-divider" style={{ marginTop: 20 }} />
        <div className="login-toggle">
          {mode === 'login'
            ? <>¿No tienes cuenta? <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>Regístrate</button></>
            : <>¿Ya tienes cuenta? <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Iniciar sesión</button></>
          }
        </div>
      </div>
    </div>
  );
}
