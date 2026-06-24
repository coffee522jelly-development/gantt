<script lang="ts">
    import { appState } from '$lib/store/appState';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Separator } from '$lib/components/ui/separator';
    import { Settings, X, CalendarOff } from 'lucide-svelte';

    let newHolidayDate = '';

    function addHoliday() {
        if (newHolidayDate) {
            appState.addCustomHoliday(newHolidayDate);
            newHolidayDate = '';
        }
    }
</script>

<Dialog>
    <DialogTrigger>
        <button class="px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border-r border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-600 dark:text-gray-300" title="プロジェクト設定">
            <Settings class="h-4 w-4" />
        </button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px] bg-white dark:bg-zinc-950">
        <DialogHeader>
            <DialogTitle>プロジェクト設定</DialogTitle>
        </DialogHeader>

        <div class="py-4 space-y-6">
            <!-- プロジェクト期間 -->
            <div class="space-y-4">
                <h4 class="text-sm font-medium leading-none">期間設定</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label for="project-start" class="text-xs text-gray-500 font-medium">開始日</Label>
                        <Input
                            id="project-start"
                            type="date"
                            class="text-sm"
                            bind:value={$appState.projectStartDate}
                        />
                    </div>
                    <div class="space-y-2">
                        <Label for="project-end" class="text-xs text-gray-500 font-medium">終了日</Label>
                        <Input
                            id="project-end"
                            type="date"
                            class="text-sm"
                            bind:value={$appState.projectEndDate}
                        />
                    </div>
                </div>
            </div>

            <Separator />

            <!-- カスタム休日 -->
            <div class="space-y-4">
                <h4 class="text-sm font-medium leading-none flex items-center gap-2">
                    <CalendarOff class="w-4 h-4 text-gray-500"/>
                    カスタム休日設定
                </h4>
                <div class="flex items-center gap-2">
                    <Input type="date" bind:value={newHolidayDate} class="flex-1 text-sm" />
                    <Button onclick={addHoliday} size="sm">追加</Button>
                </div>

                <div class="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                    {#if $appState.customHolidays.length === 0}
                        <p class="text-xs text-gray-500 text-center py-4">設定されたカスタム休日はありません</p>
                    {/if}
                    {#each $appState.customHolidays.sort() as holiday}
                        <div class="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                            <span class="text-xs font-medium">{holiday.replace(/-/g, '/')}</span>
                            <Button variant="ghost" size="sm" class="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onclick={() => appState.removeCustomHoliday(holiday)}>
                                <X class="h-3 w-3" />
                            </Button>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </DialogContent>
</Dialog>
