interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  totalCases: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⚡' },
  { id: 'cases', label: 'Mis Casos', icon: '📋' },
  { id: 'new', label: 'Nuevo Caso', icon: '✚' },
];

export function Sidebar({ currentPage, onNavigate, totalCases }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🛠️</div>
        <h1>Resolutor</h1>
        <p>Diario técnico personal</p>
      </div>

      <div className="sidebar-nav">
        <span className="nav-section-label">Menú</span>
        {navItems.map((item, i) => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.id === 'cases' && totalCases > 0 && (
              <span className="nav-badge">{totalCases}</span>
            )}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <span>☁️</span>
        <span>Supabase · v1.0</span>
      </div>
    </aside>
  );
}
