import Sortable from 'sortablejs';
import { appState } from '$lib/store/appState';
import { get } from 'svelte/store';

export function setupSortable(node: HTMLElement) {
    let sortable = new Sortable(node, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: (evt) => {
            const state = get(appState);
            const newTasks = [...state.tasks];
            const [movedItem] = newTasks.splice(evt.oldIndex as number, 1);
            newTasks.splice(evt.newIndex as number, 0, movedItem);
            appState.reorderTasks(newTasks);
        }
    });

    return {
        destroy() {
            sortable.destroy();
        }
    };
}
