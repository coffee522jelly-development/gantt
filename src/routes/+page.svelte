<script lang="ts">
    import { appState } from '$lib/store/appState';
    import GanttView from '$lib/components/app/GanttView.svelte';
    import BurnupView from '$lib/components/app/BurnupView.svelte';
    import Header from '$lib/components/app/Header.svelte';
</script>

<div class="h-screen flex flex-col bg-gray-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 overflow-hidden font-sans transition-colors duration-200">
    <Header />

    <div class="flex-1 flex flex-col overflow-hidden w-full max-w-full">
        {#if $appState.currentView === 'gantt'}
            <div class="flex-1 overflow-hidden flex flex-col">
                <GanttView />
            </div>
        {:else if $appState.currentView === 'burnup'}
            <div class="flex-1 overflow-hidden p-4">
                <BurnupView />
            </div>
        {/if}
    </div>
</div>
