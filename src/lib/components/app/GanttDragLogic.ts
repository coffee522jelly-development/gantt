import { appState } from '$lib/store/appState';
import { getDatesInRange } from '$lib/date';
import { get } from 'svelte/store';

export function setupBarInteractions(node: HTMLElement, { taskId, subtaskId, dates, cellWidth }: { taskId: string, subtaskId?: string, dates: string[], cellWidth: number }) {
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
            if (newWidth >= cellWidth && newLeft >= 0) {
                node.style.left = `${newLeft}px`;
                node.style.width = `${newWidth}px`;
            }
        } else if (isResizingRight) {
            let newWidth = initialWidth + dx;
            if (newWidth >= cellWidth) {
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

        const startIndex = Math.round(finalLeft / cellWidth);
        const cellSpan = Math.round(finalWidth / cellWidth);
        const endIndex = startIndex + cellSpan - 1;

        if (startIndex >= 0 && endIndex < dates.length) {
            const newStart = dates[startIndex];
            const newEnd = dates[endIndex];

            // Dispatch update to store
            if (subtaskId) {
                appState.updateSubtaskPeriod(taskId, subtaskId, { startDate: newStart, endDate: newEnd });
            } else {
                appState.updateTask(taskId, { startDate: newStart, endDate: newEnd });
            }
        } else {
            // Revert visually if out of bounds (Svelte reactivity will naturally fix it on next render, but just in case)
            const state = get(appState);
            const task = state.tasks.find(t => t.id === taskId);
            if (task) {
                 let oStart = -1, oEnd = -1;
                 if (subtaskId) {
                     const subtask = task.subtasks.find(s => s.id === subtaskId);
                     if (subtask) {
                         oStart = dates.indexOf(subtask.startDate || '');
                         oEnd = dates.indexOf(subtask.endDate || '');
                     }
                 } else {
                     oStart = dates.indexOf(task.startDate || '');
                     oEnd = dates.indexOf(task.endDate || '');
                 }
                 if(oStart !== -1 && oEnd !== -1) {
                     node.style.left = `${oStart * cellWidth}px`;
                     node.style.width = `${(oEnd - oStart + 1) * cellWidth}px`;
                 }
            }
        }

        isDragging = false;
        isResizingLeft = false;
        isResizingRight = false;
    }

    node.addEventListener('mousedown', onMouseDown);

    return {
        destroy() {
            node.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    };
}
