import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from 'react';
import type { Task, TaskStatus } from '../types/case';
import { createTask, deleteTask, fetchWorkspaceTasks, updateTaskStatus } from '../utils/tasks';
import { useWorkspace } from './useWorkspaceStore';

interface TasksContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (input: {
    caseId?: string;
    title: string;
    description?: string;
    executionType: Task['executionType'];
    assigneeUserId?: string;
    assigneeAgent?: string;
    requiredCapability?: string;
  }) => Promise<void>;
  changeTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  getTasksForCase: (caseId: string) => Task[];
}

const TasksContext = createContext<TasksContextType | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { activeWorkspaceId, loading: workspaceLoading } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTasks = useCallback(async () => {
    if (workspaceLoading) {
      setLoading(true);
      return;
    }

    if (!activeWorkspaceId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextTasks = await fetchWorkspaceTasks(activeWorkspaceId);
      setTasks(nextTasks);
      setError(null);
    } catch (taskError: any) {
      setError(taskError.message ?? 'Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, workspaceLoading]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const addTask = useCallback(async (input: {
    caseId?: string;
    title: string;
    description?: string;
    executionType: Task['executionType'];
    assigneeUserId?: string;
    assigneeAgent?: string;
    requiredCapability?: string;
  }) => {
    if (!activeWorkspaceId) throw new Error('No active workspace');
    await createTask({ ...input, workspaceId: activeWorkspaceId });
    await refreshTasks();
  }, [activeWorkspaceId, refreshTasks]);

  const changeTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    await updateTaskStatus(taskId, status);
    setTasks((prev) => prev.map((task) => (
      task.id === taskId
        ? { ...task, status, updatedAt: new Date().toISOString() }
        : task
    )));
  }, []);

  const removeTask = useCallback(async (taskId: string) => {
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  const getTasksForCase = useCallback(
    (caseId: string) => tasks.filter((task) => task.caseId === caseId),
    [tasks],
  );

  return (
    <TasksContext.Provider value={{
      tasks,
      loading,
      error,
      addTask,
      changeTaskStatus,
      removeTask,
      refreshTasks,
      getTasksForCase,
    }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
