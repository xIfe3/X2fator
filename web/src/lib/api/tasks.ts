import { api } from "../api-client";
import type { Task, TaskCompletion } from "../types";

export const tasksApi = {
  list: () => api.get<Task[]>("/tasks"),
  get: (id: string) => api.get<Task>(`/tasks/${id}`),
  myCompletions: () => api.get<TaskCompletion[]>("/tasks/my/completions"),
  complete: (taskId: string, body: { submissionData?: Record<string, unknown>; screenshotUrl: string }) =>
    api.post<TaskCompletion>(`/tasks/${taskId}/complete`, body),
};
