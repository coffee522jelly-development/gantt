<script lang="ts">
    import { appState } from '$lib/store/appState';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { X, CalendarOff } from 'lucide-svelte';

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
        <Button variant="outline" size="sm" class="gap-2">
            <CalendarOff class="h-4 w-4" />
            休日設定
        </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px] bg-white dark:bg-zinc-950">
        <DialogHeader>
            <DialogTitle>カスタム休日設定</DialogTitle>
        </DialogHeader>
        <div class="py-4 space-y-4">
            <div class="flex items-center gap-2">
                <Input type="date" bind:value={newHolidayDate} class="flex-1" />
                <Button onclick={addHoliday}>追加</Button>
            </div>

            <div class="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {#if $appState.customHolidays.length === 0}
                    <p class="text-sm text-gray-500 text-center py-4">設定されたカスタム休日はありません</p>
                {/if}
                {#each $appState.customHolidays.sort() as holiday}
                    <div class="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                        <span class="text-sm font-medium">{holiday.replace(/-/g, '/')}</span>
                        <Button variant="ghost" size="sm" class="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onclick={() => appState.removeCustomHoliday(holiday)}>
                            <X class="h-4 w-4" />
                        </Button>
                    </div>
                {/each}
            </div>
        </div>
    </DialogContent>
</Dialog>
