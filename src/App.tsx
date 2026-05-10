import './index.css';
import { useState } from 'react';
import { AuthProvider, useAuth } from './store/useAuthStore';
import { WorkspaceProvider } from './store/useWorkspaceStore';
import { CategoriesProvider } from './store/useCategoriesStore';
import { CasesProvider, useCases } from './store/useCasesStore';
import { TasksProvider } from './store/useTasksStore';
import { TopNav } from './components/TopNav';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { CaseList } from './pages/CaseList';
import { CaseFormPage } from './pages/CaseFormPage';
import { CaseDetail } from './pages/CaseDetail';
import { TasksPage } from './pages/TasksPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { CategoriesPage } from './pages/CategoriesPage';

type Page = 'dashboard' | 'cases' | 'tasks' | 'categories' | 'statistics' | 'new' | 'detail' | 'edit';

function AppInner() {
  const { getCase } = useCases();
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const navigate = (p: string, id?: string) => {
    setPage(p as Page);
    setSelectedId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeNavPage = page === 'detail' || page === 'edit' || page === 'new' ? 'cases' : page;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />;
      case 'cases': return <CaseList onNavigate={navigate} initialCategory={selectedId} />;
      case 'tasks': return <TasksPage onNavigate={navigate} />;
      case 'categories': return <CategoriesPage onNavigate={navigate} />;
      case 'statistics': return <StatisticsPage onNavigate={navigate} />;
      case 'new': return <CaseFormPage onNavigate={navigate} />;
      case 'edit': return selectedId
        ? <CaseFormPage editingCase={getCase(selectedId)} onNavigate={navigate} />
        : <CaseList onNavigate={navigate} />;
      case 'detail': return selectedId
        ? <CaseDetail caseId={selectedId} onNavigate={navigate} />
        : <CaseList onNavigate={navigate} />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="app-layout">
      <TopNav currentPage={activeNavPage} onNavigate={navigate} />
      <div className="page-content">
        {renderPage()}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      flexDirection: 'column',
      gap: 14,
    }}
    >
      <div style={{
        width: 44,
        height: 44,
        background: 'var(--accent)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        fontWeight: 800,
        boxShadow: '0 4px 12px rgba(201,101,52,0.3)',
      }}
      >
        RS
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Cargando Resolutor...</div>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage onLogin={() => {}} />;

  return (
    <WorkspaceProvider>
      <CategoriesProvider>
        <CasesProvider>
          <TasksProvider>
            <AppInner />
          </TasksProvider>
        </CasesProvider>
      </CategoriesProvider>
    </WorkspaceProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App;
