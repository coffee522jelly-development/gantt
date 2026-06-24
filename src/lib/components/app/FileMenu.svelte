<script lang="ts">
    import { appState } from '$lib/store/appState';
    import { Button } from '$lib/components/ui/button';
    import { FolderOpen, Save } from 'lucide-svelte';
    import { save, open } from '@tauri-apps/plugin-dialog';
    import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
    import { get } from 'svelte/store';

    async function handleSaveProject() {
        try {
            const state = get(appState);
            let defaultName = "project.json";

            // Try to generate a meaningful filename if dates exist
            const safeProjectName = state.projectName ? state.projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'project';
            if (state.projectStartDate && state.projectEndDate) {
                defaultName = `${safeProjectName}_${state.projectStartDate.replace(/-/g, '')}-${state.projectEndDate.replace(/-/g, '')}.json`;
            } else {
                defaultName = `${safeProjectName}.json`;
            }

            const filePath = await save({
                defaultPath: defaultName,
                filters: [{
                    name: 'Gantt Project',
                    extensions: ['json']
                }]
            });
            if (filePath) {
                const dataToSave = JSON.stringify(get(appState), null, 2);
                await writeTextFile(filePath, dataToSave);
                alert("プロジェクトを保存しました。");
            }
        } catch (err) {
            console.error(err);
            alert("保存に失敗しました。");
        }
    }

    async function handleOpenProject() {
        try {
            const filePath = await open({
                multiple: false,
                filters: [{
                    name: 'Gantt Project',
                    extensions: ['json']
                }]
            });
            if (filePath && !Array.isArray(filePath)) {
                const contents = await readTextFile(filePath);
                const parsed = JSON.parse(contents);
                appState.set(parsed);
                alert("プロジェクトを読み込みました。");
            }
        } catch (err) {
            console.error(err);
            alert("読み込みに失敗しました。");
        }
    }
</script>

<div class="flex items-center rounded border border-gray-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
    <button onclick={handleOpenProject} class="px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border-r border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-600 dark:text-gray-300" title="プロジェクトを開く">
        <FolderOpen class="h-4 w-4" />
    </button>
    <button onclick={handleSaveProject} class="px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border-r border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-600 dark:text-gray-300" title="プロジェクトを保存">
        <Save class="h-4 w-4" />
    </button>
</div>
