import {
  createContext, useContext, useState, useEffect, useCallback, type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import type { WorkspaceCategory } from '../types/case';
import { DEFAULT_CATEGORIES } from '../types/case';
import { useWorkspace } from './useWorkspaceStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoriesContextType {
  categories: WorkspaceCategory[];
  loading: boolean;
  error: string | null;
  addCategory: (data: { key: string; label: string; icon: string; color?: string }) => Promise<void>;
  updateCategory: (id: string, data: { label?: string; icon?: string; color?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const [categories, setCategories] = useState<WorkspaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const mapRow = (row: any): WorkspaceCategory => ({
    id: row.id,
    workspaceId: row.workspace_id,
    key: row.key,
    label: row.label,
    icon: row.icon,
    color: row.color ?? undefined,
    position: row.position,
    createdAt: row.created_at,
  });

  // ── Seed defaults (client-side fallback) ─────────────────────────────────
  // The migration already seeds existing workspaces, but if for some reason
  // a workspace has no rows we insert the defaults from the client.
  const seedDefaults = useCallback(async (workspaceId: string) => {
    const rows = DEFAULT_CATEGORIES.map((cat) => ({
      workspace_id: workspaceId,
      key: cat.key,
      label: cat.label,
      icon: cat.icon,
      position: cat.position,
    }));

    const { error: seedError } = await supabase
      .from('workspace_categories')
      .upsert(rows, { onConflict: 'workspace_id,key', ignoreDuplicates: true });

    if (seedError) throw seedError;
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    if (!activeWorkspaceId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('workspace_categories')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .order('position', { ascending: true });

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        // No categories yet – seed defaults then reload
        await seedDefaults(activeWorkspaceId);
        const { data: seeded, error: seededError } = await supabase
          .from('workspace_categories')
          .select('*')
          .eq('workspace_id', activeWorkspaceId)
          .order('position', { ascending: true });
        if (seededError) throw seededError;
        setCategories((seeded || []).map(mapRow));
      } else {
        setCategories(data.map(mapRow));
      }

      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, seedDefaults]);

  useEffect(() => {
    if (!wsLoading) {
      fetchCategories();
    }
  }, [wsLoading, fetchCategories]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const addCategory = useCallback(async (data: {
    key: string; label: string; icon: string; color?: string;
  }) => {
    if (!activeWorkspaceId) throw new Error('No active workspace');

    const trimmedKey = data.key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!trimmedKey) throw new Error('El identificador no puede estar vacío.');
    if (!data.label.trim()) throw new Error('El nombre no puede estar vacío.');
    if (!data.icon.trim()) throw new Error('El ícono no puede estar vacío.');

    const nextPosition = categories.length > 0
      ? Math.max(...categories.map((c) => c.position)) + 1
      : 0;

    const { data: inserted, error: insertError } = await supabase
      .from('workspace_categories')
      .insert({
        workspace_id: activeWorkspaceId,
        key: trimmedKey,
        label: data.label.trim(),
        icon: data.icon.trim().toUpperCase().slice(0, 2),
        color: data.color || null,
        position: nextPosition,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') throw new Error('Ya existe una categoría con ese identificador.');
      throw insertError;
    }

    setCategories((prev) => [...prev, mapRow(inserted)]);
  }, [activeWorkspaceId, categories]);

  const updateCategory = useCallback(async (
    id: string,
    data: { label?: string; icon?: string; color?: string },
  ) => {
    const updates: Record<string, any> = {};
    if (data.label !== undefined) updates.label = data.label.trim();
    if (data.icon !== undefined) updates.icon = data.icon.trim().toUpperCase().slice(0, 2);
    if (data.color !== undefined) updates.color = data.color || null;

    const { error: updateError } = await supabase
      .from('workspace_categories')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data, icon: updates.icon ?? c.icon } : c)),
    );
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('workspace_categories')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <CategoriesContext.Provider value={{
      categories,
      loading,
      error,
      addCategory,
      updateCategory,
      deleteCategory,
      refresh: fetchCategories,
    }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
}
