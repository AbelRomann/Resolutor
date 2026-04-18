import {
  createContext, useContext, useState, useCallback, useEffect, type ReactNode,
} from 'react';
import type { Case, CaseStatus } from '../types/case';
import {
  fetchAllCases, insertCase, updateCaseInDb, deleteCaseFromDb,
  buildNewCase, applyStatusChange,
} from '../utils/storage';

interface CasesContextType {
  cases: Case[];
  loading: boolean;
  error: string | null;
  addCase: (data: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>) => Promise<Case>;
  updateCase: (id: string, data: Partial<Omit<Case, 'id' | 'createdAt' | 'statusHistory'>>) => Promise<void>;
  changeStatus: (id: string, status: CaseStatus, note?: string) => Promise<void>;
  deleteCase: (id: string) => Promise<void>;
  getCase: (id: string) => Case | undefined;
}

const CasesContext = createContext<CasesContextType | null>(null);

export function CasesProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load on mount
  useEffect(() => {
    fetchAllCases()
      .then(setCases)
      .catch(e => setError(e.message ?? 'Error al cargar casos'))
      .finally(() => setLoading(false));
  }, []);

  const addCase = useCallback(async (
    data: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>
  ) => {
    const newCase = buildNewCase(data);
    await insertCase(newCase);
    setCases(prev => [newCase, ...prev]);
    return newCase;
  }, []);

  const updateCase = useCallback(async (
    id: string,
    data: Partial<Omit<Case, 'id' | 'createdAt' | 'statusHistory'>>
  ) => {
    await updateCaseInDb(id, data);
    setCases(prev => prev.map(c =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    ));
  }, []);

  const changeStatus = useCallback(async (id: string, status: CaseStatus, note?: string) => {
    const c = cases.find(x => x.id === id);
    if (!c) return;
    const updated = applyStatusChange(c, status, note);
    await updateCaseInDb(id, { status: updated.status, statusHistory: updated.statusHistory });
    setCases(prev => prev.map(x => x.id === id ? updated : x));
  }, [cases]);

  const deleteCase = useCallback(async (id: string) => {
    await deleteCaseFromDb(id);
    setCases(prev => prev.filter(c => c.id !== id));
  }, []);

  const getCase = useCallback((id: string) => cases.find(c => c.id === id), [cases]);

  return (
    <CasesContext.Provider value={{ cases, loading, error, addCase, updateCase, changeStatus, deleteCase, getCase }}>
      {children}
    </CasesContext.Provider>
  );
}

export function useCases() {
  const ctx = useContext(CasesContext);
  if (!ctx) throw new Error('useCases must be used within CasesProvider');
  return ctx;
}
