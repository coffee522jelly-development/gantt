<script lang="ts">
    import { appState } from '$lib/store/appState';
    import { Sheet, SheetContent, SheetHeader, SheetTitle } from '$lib/components/ui/sheet';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Badge } from '$lib/components/ui/badge';
    import { X } from 'lucide-svelte';

    export let isOpen = false;
    export let taskId: string | null = null;

    let newTag = '';

    $: task = $appState.tasks.find(t => t.id === taskId);
    $: taskPeriod = (task && task.startDate && task.endDate)
        ? `${task.startDate.replace(/-/g, '/')} ~ ${task.endDate.replace(/-/g, '/')}`
        : '未設定';

    function handleNameChange(e: Event) {
        if (!taskId) return;
        const val = (e.target as HTMLInputElement).value;
        appState.updateTask(taskId, { name: val });
    }

    function handleNotesChange(e: Event) {
        if (!taskId) return;
        const val = (e.target as HTMLTextAreaElement).value;
        appState.updateTask(taskId, { notes: val });
    }

    function addTag() {
        if (!taskId || !task || !newTag.trim()) return;
        if (!task.tags.includes(newTag.trim())) {
            appState.updateTask(taskId, { tags: [...task.tags, newTag.trim()] });
        }
        newTag = '';
    }

    function removeTag(tagToRemove: string) {
        if (!taskId || !task) return;
        appState.updateTask(taskId, { tags: task.tags.filter(t => t !== tagToRemove) });
    }
</script>

<Sheet bind:open={isOpen}>
    <SheetContent side="right" class="w-[400px] sm:w-[540px] bg-white dark:bg-zinc-950 p-6 flex flex-col gap-6 overflow-y-auto border-l dark:border-zinc-800">
        <SheetHeader>
            <SheetTitle class="text-xl font-semibold">タスク詳細</SheetTitle>
        </SheetHeader>

        {#if task}
            <div class="space-y-6 mt-4">
                <div class="space-y-2">
                    <Label class="text-xs text-gray-500 font-semibold uppercase tracking-wider">タスク名</Label>
                    <Input
                        value={task.name}
                        oninput={handleNameChange}
                        class="text-base font-medium border-0 px-0 rounded-none border-b border-transparent hover:border-gray-300 dark:hover:border-zinc-700 focus-visible:ring-0 focus-visible:border-blue-500 shadow-none"
                    />
                </div>

                <div class="space-y-2">
                    <Label class="text-xs text-gray-500 font-semibold uppercase tracking-wider">期間</Label>
                    <div class="text-sm text-gray-700 dark:text-zinc-300 py-1">
                        {taskPeriod}
                    </div>
                </div>

                <div class="space-y-2">
                    <Label class="text-xs text-gray-500 font-semibold uppercase tracking-wider">タグ</Label>
                    <div class="flex flex-wrap gap-2 mb-2">
                        {#each task.tags || [] as tag}
                            <Badge variant="secondary" class="flex items-center gap-1 font-normal bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700">
                                {tag}
                                <button onclick={() => removeTag(tag)} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none">
                                    <X class="w-3 h-3" />
                                </button>
                            </Badge>
                        {/each}
                    </div>
                    <Input
                        bind:value={newTag}
                        placeholder="タグを追加 (Enter)"
                        onkeydown={(e) => e.key === 'Enter' && addTag()}
                        class="h-8 text-sm bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                    />
                </div>

                <div class="space-y-2 flex-1 flex flex-col">
                    <Label class="text-xs text-gray-500 font-semibold uppercase tracking-wider">備考</Label>
                    <Textarea
                        value={task.notes || ''}
                        oninput={handleNotesChange}
                        placeholder="タスクに関するメモや詳細を入力..."
                        class="flex-1 min-h-[200px] resize-none bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-blue-500 text-sm"
                    />
                </div>
            </div>
        {:else}
            <div class="text-gray-500 text-sm">タスクが見つかりません。</div>
        {/if}
    </SheetContent>
</Sheet>
