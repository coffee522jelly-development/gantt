import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { getWorkingDays, formatDate, getDatesInRange } from '$lib/date';

export type SubTask = {
    id: string;
    name: string;
    completed: boolean;
    completedAt: string | null;
};

export type Task = {
    id: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    subtasks: SubTask[];
    tags: string[];
    notes: string;
};

export type AppState = {
    projectStartDate: string | null;
    projectEndDate: string | null;
    tasks: Task[];
    holidays: Record<string, string>;
    customHolidays: string[];
};

const initialAppState: AppState = {
    projectStartDate: null,
    projectEndDate: null,
    tasks: [],
    holidays: {},
    customHolidays: []
};

// Create a custom store that syncs with localStorage
function createAppState() {
    const { subscribe, set, update } = writable<AppState>(initialAppState);

    if (browser) {
        const stored = localStorage.getItem('ganttApp_data');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Ensure new fields exist for backward compatibility
                parsed.tasks.forEach((t: Task) => {
                    if (!t.tags) t.tags = [];
                    if (!t.notes) t.notes = "";
                });
                set(parsed);
            } catch (e) {
                console.error("Failed to parse stored data", e);
            }
        }
    }

    return {
        subscribe,
        set: (value: AppState) => {
            if (browser) {
                localStorage.setItem('ganttApp_data', JSON.stringify(value));
            }
            set(value);
        },
        update: (updater: (value: AppState) => AppState) => {
            update(state => {
                const newState = updater(state);
                if (browser) {
                    localStorage.setItem('ganttApp_data', JSON.stringify(newState));
                }
                return newState;
            });
        },
        addTask: (name: string) => update(state => {
            const newTask: Task = {
                id: 'task_' + Date.now(),
                name: name.trim() || 'Untitled Task',
                startDate: state.projectStartDate,
                endDate: state.projectEndDate,
                subtasks: [],
                tags: [],
                notes: ""
            };
            return { ...state, tasks: [...state.tasks, newTask] };
        }),
        deleteTask: (taskId: string) => update(state => {
            return { ...state, tasks: state.tasks.filter(t => t.id !== taskId) };
        }),
        updateTask: (taskId: string, payload: Partial<Task>) => update(state => {
            return {
                ...state,
                tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...payload } : t)
            };
        }),
        reorderTasks: (newTasks: Task[]) => update(state => ({ ...state, tasks: newTasks })),
        addSubtask: (taskId: string, name: string) => update(state => {
            const newSubtask: SubTask = {
                id: 'sub_' + Date.now(),
                name: name.trim() || 'Untitled Subtask',
                completed: false,
                completedAt: null
            };
            return {
                ...state,
                tasks: state.tasks.map(t => {
                    if (t.id === taskId) {
                        return { ...t, subtasks: [...t.subtasks, newSubtask] };
                    }
                    return t;
                })
            };
        }),
        deleteSubtask: (taskId: string, subtaskId: string) => update(state => {
            return {
                ...state,
                tasks: state.tasks.map(t => {
                    if (t.id === taskId) {
                        return { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) };
                    }
                    return t;
                })
            };
        }),
        toggleSubtask: (taskId: string, subtaskId: string) => update(state => {
            const todayStr = formatDate(new Date());
            return {
                ...state,
                tasks: state.tasks.map(t => {
                    if (t.id === taskId) {
                        return {
                            ...t,
                            subtasks: t.subtasks.map(s => {
                                if (s.id === subtaskId) {
                                    const completed = !s.completed;
                                    // Only allow completion on valid working days up to today
                                    let completedAt = null;
                                    if (completed) {
                                        // This replicates getValidCompletionDate logic from original
                                        completedAt = state.projectStartDate && state.projectEndDate
                                            ? getValidCompletionDate(state, todayStr)
                                            : todayStr;
                                    }
                                    return { ...s, completed, completedAt };
                                }
                                return s;
                            })
                        };
                    }
                    return t;
                })
            };
        }),
        updateSubtaskDate: (taskId: string, subtaskId: string, dateStr: string) => update(state => {
            return {
                ...state,
                tasks: state.tasks.map(t => {
                    if (t.id === taskId) {
                        return {
                            ...t,
                            subtasks: t.subtasks.map(s => {
                                if (s.id === subtaskId) {
                                    return { ...s, completedAt: dateStr };
                                }
                                return s;
                            })
                        };
                    }
                    return t;
                })
            };
        }),
        addCustomHoliday: (dateStr: string) => update(state => {
             if (dateStr && !state.customHolidays.includes(dateStr)) {
                 return { ...state, customHolidays: [...state.customHolidays, dateStr] };
             }
             return state;
        }),
        removeCustomHoliday: (dateStr: string) => update(state => {
             return { ...state, customHolidays: state.customHolidays.filter(d => d !== dateStr) };
        }),
        setHolidays: (holidays: Record<string, string>) => update(state => ({ ...state, holidays }))
    };
}

export const appState = createAppState();

// Helper replicating original logic
function getValidCompletionDate(state: AppState, targetDateStr: string): string {
    let target = targetDateStr;
    if (state.projectEndDate && target > state.projectEndDate) {
        target = state.projectEndDate;
    }

    if (!state.projectStartDate) return target;

    let currentDate = new Date(target);
    const startDate = new Date(state.projectStartDate);

    while (currentDate >= startDate) {
        const dStr = formatDate(currentDate);
        if (isWorkingDay(state, dStr)) {
            return dStr;
        }
        currentDate.setDate(currentDate.getDate() - 1);
    }

    // Fallback if no valid date found
    currentDate = new Date(target);
    const endDate = new Date(state.projectEndDate!);
    while (currentDate <= endDate) {
        const dStr = formatDate(currentDate);
        if (isWorkingDay(state, dStr)) {
            return dStr;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return target;
}

export function isWorkingDay(state: AppState, dateStr: string): boolean {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    if (state.holidays[dateStr]) return false;
    if (state.customHolidays.includes(dateStr)) return false;
    return true;
}

// Calculate Burn Up Data - derived store or function
export function calculateBurnUpData(state: AppState) {
    if (!state.projectStartDate || !state.projectEndDate) return null;

    const workingDays = getWorkingDays(state, state.projectStartDate, state.projectEndDate);
    if (workingDays.length === 0) return null;

    let totalSubtasksCount = 0;
    const completedSubtasks: string[] = [];

    state.tasks.forEach(task => {
        if (task.subtasks) {
            totalSubtasksCount += task.subtasks.length;
            task.subtasks.forEach(st => {
                if (st.completed && st.completedAt) {
                    completedSubtasks.push(st.completedAt);
                }
            });
        }
    });

    const planData: number[] = [];
    const actualData: number[] = [];

    completedSubtasks.sort();

    const todayStr = formatDate(new Date());
    let maxActualDateStr = todayStr;
    if (completedSubtasks.length > 0) {
        const latestSubtaskCompletion = completedSubtasks[completedSubtasks.length - 1];
        if (latestSubtaskCompletion > maxActualDateStr) {
            maxActualDateStr = latestSubtaskCompletion;
        }
    }

    workingDays.forEach((day, index) => {
        let idealPace = 0;
        if (workingDays.length === 1) {
            idealPace = totalSubtasksCount;
        } else {
            idealPace = (totalSubtasksCount / (workingDays.length - 1)) * index;
        }
        planData.push(idealPace);

        const completedCount = completedSubtasks.filter(date => date <= day).length;

        if (day <= maxActualDateStr) {
            actualData.push(completedCount);
        }
    });

    return {
        labels: workingDays.map(d => d.substring(5).replace('-', '/')),
        planData,
        actualData,
        maxSubtasks: totalSubtasksCount
    };
}
