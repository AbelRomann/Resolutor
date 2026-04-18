import { useAuth } from '../store/useAuthStore';

type Page = 'dashboard' | 'cases' | 'categories' | 'statistics' | string;

interface TopNavProps {
  currentPage: Page;
  onNavigate: (page: string) => void;
}

const navLinks = [
  { id: 'dashboard', label: 'Inicio' },
  { id: 'cases', label: 'Mis Casos' },
  { id: 'categories', label: 'Categorías' },
  { id: 'statistics', label: 'Estadísticas' },
];

export function TopNav({ currentPage, onNavigate }: TopNavProps) {
  const { user, signOut } = useAuth();

  const activeRoot = currentPage === 'detail' || currentPage === 'edit' || currentPage === 'new'
    ? 'cases'
    : currentPage;

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';
  const emailShort = user?.email ?? '';

  return (
    <nav className="top-nav">
      <button className="nav-brand" onClick={() => onNavigate('dashboard')}>
        <div className="nav-brand-icon">🛠️</div>
        Resolutor
      </button>

      <div className="nav-links">
        {navLinks.map(link => (
          <button
            key={link.id}
            className={`nav-link ${activeRoot === link.id ? 'active' : ''}`}
            onClick={() => onNavigate(link.id)}
          >
            {link.label}
          </button>
        ))}
      </div>

      <div className="nav-spacer" />

      <div className="nav-user" onClick={signOut} title="Cerrar sesión">
        <div className="nav-user-avatar">{initials}</div>
        <span className="nav-user-email">{emailShort}</span>
        <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>↩</span>
      </div>
    </nav>
  );
}
