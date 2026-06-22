<script lang="ts">
    import { appState } from '$lib/store/appState';
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { getDatesInRange } from '$lib/date';
    import { isWorkingDay } from '$lib/store/appState';
    import { MoreVertical, X } from 'lucide-svelte';
    import TaskDetailPanel from './TaskDetailPanel.svelte';
    import { setupBarInteractions } from './GanttDragLogic';
    import { setupSortable } from './GanttSortableLogic';

    let newTaskName = '';
    let newSubtaskNames: Record<string, string> = {};

    function addTask() {
        if (newTaskName.trim()) {
            appState.addTask(newTaskName);
            newTaskName = '';
        }
    }

    function addSubtask(taskId: string) {
        const name = newSubtaskNames[taskId];
        if (name && name.trim()) {
            appState.addSubtask(taskId, name);
            newSubtaskNames[taskId] = '';
        }
    }

    let detailTaskId: string | null = null;
    let isDetailOpen = false;

    function openDetail(taskId: string) {
        detailTaskId = taskId;
        isDetailOpen = true;
    }

    $: dates = ($appState.projectStartDate && $appState.projectEndDate)
        ? getDatesInRange($appState.projectStartDate, $appState.projectEndDate)
        : [];

    const GANTT_CELL_WIDTH = 40;
    const HEADER_HEIGHT = 32;

    let wrappers: Record<string, HTMLDivElement> = {};
    let rowHeights: Record<string, number> = {};

    // Reactively update row heights when tasks change (using svelte action or reactive statement on wrapper bindings)
    $: {
        if (Object.keys(wrappers).length > 0) {
            // Need to wait for DOM to update after tasks change to measure accurately.
            // We can approximate by listening to changes in $appState.tasks, but a simple tick or timeout works.
            setTimeout(() => {
                let newHeights: Record<string, number> = {};
                for (const [id, el] of Object.entries(wrappers)) {
                    if (el) newHeights[id] = el.offsetHeight;
                }
                rowHeights = newHeights;
            }, 0);
        }
    }

    $: gridTemplateRows = `${HEADER_HEIGHT}px ` + $appState.tasks.map(t => `${rowHeights[t.id] || 48}px`).join(' ');

</script>

<div class="flex flex-col h-full bg-gray-50 dark:bg-zinc-950">
    <div class="p-4 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex gap-2">
        <Input
            bind:value={newTaskName}
            placeholder="新しいタスク名"
            class="max-w-xs"
            onkeydown={(e) => e.key === 'Enter' && addTask()}
        />
        <Button variant="secondary" onclick={addTask}>タスク追加</Button>
    </div>

    <div class="flex flex-1 overflow-hidden">
        <!-- Task List Sidebar -->
        <div class="w-1/4 min-w-[250px] border-r border-gray-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-950 overflow-y-auto shadow-[2px_0_10px_-3px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_10px_-3px_rgba(0,0,0,0.5)] z-10 relative">
            <div class="h-8 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex items-center px-4 font-medium text-xs text-gray-500 sticky top-0 z-10 shrink-0 shadow-sm">
                タスク
            </div>

            <div class="flex-1 pb-16" use:setupSortable>
                {#each $appState.tasks as task (task.id)}
                    <div
                        bind:this={wrappers[task.id]}
                        class="border-b border-gray-200 dark:border-zinc-800 transition-colors"
                    >
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                            class="flex items-center justify-between px-4 h-12 hover:bg-gray-50 dark:hover:bg-zinc-900 group cursor-pointer"
                            ondblclick={() => openDetail(task.id)}
                        >
                            <div class="flex items-center flex-1 min-w-0">
                                <span class="text-gray-400 cursor-grab mr-2 px-1 flex-shrink-0 drag-handle">
                                    <MoreVertical class="w-4 h-4 pointer-events-none" />
                                </span>
                                <span class="font-medium text-sm truncate">{task.name}</span>
                            </div>
                            <button
                                class="text-red-500 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-all"
                                onclick={(e) => { e.stopPropagation(); appState.deleteTask(task.id); }}
                            >
                                <X class="w-4 h-4" />
                            </button>
                        </div>

                        {#if task.subtasks}
                            {#each task.subtasks as subtask (subtask.id)}
                                <div class="flex items-center pl-10 pr-4 py-1.5 border-t border-dashed border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 group text-sm">
                                    <input
                                        type="checkbox"
                                        checked={subtask.completed}
                                        onchange={() => appState.toggleSubtask(task.id, subtask.id)}
                                        class="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-zinc-800 h-3.5 w-3.5 cursor-pointer accent-[var(--accent-color)]"
                                    />
                                    <span class="flex-1 truncate {subtask.completed ? 'line-through text-gray-400 dark:text-zinc-600' : 'text-gray-700 dark:text-zinc-300'}">
                                        {subtask.name}
                                    </span>
                                    {#if subtask.completed && subtask.completedAt}
                                        <input
                                            type="date"
                                            value={subtask.completedAt}
                                            onchange={(e) => appState.updateSubtaskDate(task.id, subtask.id, e.target.value)}
                                            class="ml-2 h-6 text-[10px] bg-transparent border border-gray-200 dark:border-zinc-700 rounded px-1 text-gray-500"
                                        />
                                    {/if}
                                    <button
                                        class="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                                        onclick={() => appState.deleteSubtask(task.id, subtask.id)}
                                    >
                                        削除
                                    </button>
                                </div>
                            {/each}
                        {/if}

                        <div class="px-10 py-2 border-t border-dashed border-gray-100 dark:border-zinc-800 bg-gray-50/20 dark:bg-zinc-900/20 flex gap-2">
                            <Input
                                bind:value={newSubtaskNames[task.id]}
                                placeholder="新しいサブタスク"
                                class="h-7 text-xs"
                                onkeydown={(e) => e.key === 'Enter' && addSubtask(task.id)}
                            />
                            <Button variant="outline" size="sm" class="h-7 text-xs px-2" onclick={() => addSubtask(task.id)}>追加</Button>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Gantt Chart Area -->
        <div class="w-3/4 overflow-auto relative bg-white dark:bg-zinc-950">
            {#if dates.length > 0}
                <div class="grid relative pb-16 min-w-max" style="grid-template-columns: repeat({dates.length}, {GANTT_CELL_WIDTH}px); grid-template-rows: {gridTemplateRows};">

                    <!-- Headers -->
                    {#each dates as date, i}
                        {@const isWork = isWorkingDay($appState, date)}
                        <div class="h-8 border-r border-b border-gray-200 dark:border-zinc-800 flex items-center justify-center text-[10px] font-medium sticky top-0 z-10
                            {isWork ? 'bg-white dark:bg-zinc-950 text-gray-600 dark:text-zinc-400' : 'bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400'}"
                             style="grid-column: {i + 1}; grid-row: 1;"
                        >
                            {date.substring(5).replace('-', '/')}
                        </div>

                        <!-- Grid lines -->
                        <div class="border-r border-b border-gray-100 dark:border-zinc-800/50 {isWork ? '' : 'bg-red-50/50 dark:bg-red-950/10'}"
                             style="grid-column: {i + 1}; grid-row: 2 / -1;"
                        ></div>
                    {/each}

                    <!-- Bars -->
                    {#each $appState.tasks as task, tIndex}
                        {@const startIdx = dates.indexOf(task.startDate || '')}
                        {@const endIdx = dates.indexOf(task.endDate || '')}

                        {#if startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx}
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                use:setupBarInteractions={{ taskId: task.id, dates, cellWidth: GANTT_CELL_WIDTH }}
                                class="absolute h-8 flex items-center px-2 overflow-hidden text-white text-xs font-semibold rounded cursor-pointer transition-all hover:brightness-110 shadow-md group/bar ring-1 ring-black/10 dark:ring-white/10"
                                style="
                                    background: linear-gradient(135deg, var(--accent-color, #3b82f6) 0%, color-mix(in srgb, var(--accent-color, #3b82f6) 80%, black 20%) 100%);
                                    grid-row: {tIndex + 2};
                                    grid-column: 1 / -1;
                                    left: {startIdx * GANTT_CELL_WIDTH}px;
                                    width: {(endIdx - startIdx + 1) * GANTT_CELL_WIDTH}px;
                                    margin-top: 8px;
                                "
                                ondblclick={(e) => { e.stopPropagation(); openDetail(task.id); }}
                            >
                                <div class="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize resize-left hover:bg-white/30 transition-colors z-10 hidden group-hover/bar:block"></div>
                                <span class="truncate relative z-0">{task.name}</span>
                                <div class="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize resize-right hover:bg-white/30 transition-colors z-10 hidden group-hover/bar:block"></div>
                            </div>
                        {/if}
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

<TaskDetailPanel bind:isOpen={isDetailOpen} taskId={detailTaskId} />
