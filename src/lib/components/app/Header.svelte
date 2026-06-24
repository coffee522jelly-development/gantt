<script lang="ts">
    import { appState } from '$lib/store/appState';
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { Label } from '$lib/components/ui/label';
    import { Moon, Sun, Flame, AlignLeft } from 'lucide-svelte';
    import ProjectSettings from './ProjectSettings.svelte';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    let progress = 0;

    $: {
        let total = 0;
        let completed = 0;
        $appState.tasks.forEach(t => {
            if (t.subtasks) {
                total += t.subtasks.length;
                t.subtasks.forEach(s => {
                    if (s.completed) completed++;
                });
            }
        });
        progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    let isDark = false;
    let accentColor = '#3b82f6';

    onMount(() => {
        isDark = document.documentElement.classList.contains('dark');
        const storedColor = localStorage.getItem('ganttApp_accent_color');
        if (storedColor) {
            accentColor = storedColor;
            document.documentElement.style.setProperty('--accent-color', accentColor);
        }
    });

    function toggleTheme() {
        isDark = !isDark;
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('ganttApp_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('ganttApp_theme', 'light');
        }
    }

    function handleColorChange(e: Event) {
        const input = e.target as HTMLInputElement;
        accentColor = input.value;
        document.documentElement.style.setProperty('--accent-color', accentColor);
        localStorage.setItem('ganttApp_accent_color', accentColor);
        // Force refresh for chart by dispatching custom event if needed
        if (browser) {
            window.dispatchEvent(new Event('accent-color-changed'));
        }
    }
</script>

<svelte:head>
    <script>
        if (localStorage.getItem('ganttApp_theme') === 'dark' || (!('ganttApp_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        const storedColor = localStorage.getItem('ganttApp_accent_color');
        if (storedColor) {
            document.documentElement.style.setProperty('--accent-color', storedColor);
        } else {
            document.documentElement.style.setProperty('--accent-color', '#3b82f6');
        }
    </script>
</svelte:head>

<div class="h-14 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between px-4 shrink-0 transition-colors shadow-sm z-20 relative">
    <div class="flex items-center space-x-4">
        <h1 class="text-lg font-bold tracking-tight">プロジェクト管理</h1>
        <div class="text-xs font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded">
            進捗: {progress}%
        </div>
    </div>

    <div class="flex items-center space-x-4 text-sm">
        <!-- View Toggle Buttons -->
        <div class="flex items-center rounded border border-gray-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900 mr-2">
            <button
                class="px-3 py-1.5 transition-colors border-r border-gray-200 dark:border-zinc-700 flex items-center justify-center gap-1.5 font-medium {$appState.currentView === 'gantt' ? 'bg-gray-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-500'}"
                onclick={() => appState.setView('gantt')}
                title="ガントチャート"
            >
                <AlignLeft class="h-4 w-4" />
                <span class="text-xs hidden sm:inline">ガント</span>
            </button>
            <button
                class="px-3 py-1.5 transition-colors flex items-center justify-center gap-1.5 font-medium {$appState.currentView === 'burnup' ? 'bg-gray-100 dark:bg-zinc-800 text-orange-500 dark:text-orange-400' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-500'}"
                onclick={() => appState.setView('burnup')}
                title="バーンアップチャート"
            >
                <Flame class="h-4 w-4" />
                <span class="text-xs hidden sm:inline">バーンアップ</span>
            </button>
        </div>

        <div class="flex items-center rounded border border-gray-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
            <input
                type="color"
                value={accentColor}
                oninput={handleColorChange}
                class="w-8 h-8 p-0 border-0 border-r border-gray-200 dark:border-zinc-700 cursor-pointer bg-transparent block"
                title="アクセントカラーを変更"
            />
            <button onclick={toggleTheme} class="px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center" title="テーマ切り替え">
                {#if isDark}
                    <Sun class="h-4 w-4" />
                {:else}
                    <Moon class="h-4 w-4" />
                {/if}
            </button>
        </div>

        <ProjectSettings />
    </div>
</div>
