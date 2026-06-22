<script lang="ts">
    import { appState } from '$lib/store/appState';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import GanttView from '$lib/components/app/GanttView.svelte';
    import BurnupView from '$lib/components/app/BurnupView.svelte';
    import Header from '$lib/components/app/Header.svelte';
</script>

<div class="h-screen flex flex-col bg-gray-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 overflow-hidden font-sans transition-colors duration-200">
    <Header />

    <Tabs value="gantt" class="flex-1 flex flex-col overflow-hidden w-full max-w-full">
        <div class="px-4 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center">
            <TabsList class="bg-transparent h-12 w-full justify-start rounded-none border-b-0 p-0">
                <TabsTrigger value="gantt" class="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent data-[state=active]:shadow-none px-4 h-full">ガントチャート</TabsTrigger>
                <TabsTrigger value="burnup" class="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent data-[state=active]:shadow-none px-4 h-full">バーンアップチャート</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="gantt" class="flex-1 overflow-hidden m-0 p-0 border-0 flex flex-col focus-visible:outline-none">
            <GanttView />
        </TabsContent>

        <TabsContent value="burnup" class="flex-1 overflow-hidden m-0 p-4 border-0 focus-visible:outline-none">
            <BurnupView />
        </TabsContent>
    </Tabs>
</div>
