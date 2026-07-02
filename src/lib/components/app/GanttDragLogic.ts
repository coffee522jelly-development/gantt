import { appState } from '$lib/store/appState';
import { getDatesInRange } from '$lib/date';
import { get } from 'svelte/store';

export function setupBarInteractions(node: HTMLElement, params: { taskId: string, subtaskId?: string, dates: string[], cellWidth: number }) {
    let currentParams = params;
    let isDragging = false;
    let isResizingLeft = false;
    let isResizingRight = false;
    let startX = 0;
    let initialLeft = 0;
    let initialWidth = 0;

    function onMouseDown(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (target.classList.contains('resize-left')) {
            isResizingLeft = true;
        } else if (target.classList.contains('resize-right')) {
            isResizingRight = true;
        } else {
            isDragging = true;
        }

        startX = e.clientX;
        initialLeft = parseInt(node.style.left || '0', 10);
        initialWidth = parseInt(node.style.width || '0', 10);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.userSelect = 'none';
    }

    function onMouseMove(e: MouseEvent) {
        const dx = e.clientX - startX;

        if (isDragging) {
            let newLeft = Math.max(0, initialLeft + dx);
            node.style.left = `${newLeft}px`;
        } else if (isResizingLeft) {
            let newLeft = initialLeft + dx;
            let newWidth = initialWidth - dx;
            if (newWidth >= currentParams.cellWidth && newLeft >= 0) {
                node.style.left = `${newLeft}px`;
                node.style.width = `${newWidth}px`;
            }
        } else if (isResizingRight) {
            let newWidth = initialWidth + dx;
            if (newWidth >= currentParams.cellWidth) {
                node.style.width = `${newWidth}px`;
            }
        }
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.userSelect = '';

        const finalLeft = parseInt(node.style.left, 10);
        const finalWidth = parseInt(node.style.width, 10);

        const startIndex = Math.round(finalLeft / currentParams.cellWidth);
        const cellSpan = Math.round(finalWidth / currentParams.cellWidth);
        const endIndex = startIndex + cellSpan - 1;

        if (startIndex >= 0 && endIndex < currentParams.dates.length) {
            const newStart = currentParams.dates[startIndex];
            const newEnd = currentParams.dates[endIndex];

            // Dispatch update to store
            if (currentParams.subtaskId) {
                appState.updateSubtaskPeriod(currentParams.taskId, currentParams.subtaskId, { startDate: newStart, endDate: newEnd });
            } else {
                appState.updateTask(currentParams.taskId, { startDate: newStart, endDate: newEnd });
            }
        } else {
            // Revert visually if out of bounds
            const state = get(appState);
            const task = state.tasks.find(t => t.id === currentParams.taskId);
            if (task) {
                 let oStart = -1, oEnd = -1;
                 if (currentParams.subtaskId) {
                     const subtask = task.subtasks.find(s => s.id === currentParams.subtaskId);
                     if (subtask) {
                         oStart = currentParams.dates.indexOf(subtask.startDate || '');
                         oEnd = currentParams.dates.indexOf(subtask.endDate || '');
                     }
                 } else {
                     oStart = currentParams.dates.indexOf(task.startDate || '');
                     oEnd = currentParams.dates.indexOf(task.endDate || '');
                 }
                 if(oStart !== -1 && oEnd !== -1) {
                     node.style.left = `${oStart * currentParams.cellWidth}px`;
                     node.style.width = `${(oEnd - oStart + 1) * currentParams.cellWidth}px`;
                 }
            }
        }

        isDragging = false;
        isResizingLeft = false;
        isResizingRight = false;
    }

    node.addEventListener('mousedown', onMouseDown);

    return {
        update(newParams: { taskId: string, subtaskId?: string, dates: string[], cellWidth: number }) {
            currentParams = newParams;
        },
        destroy() {
            node.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    };
}
