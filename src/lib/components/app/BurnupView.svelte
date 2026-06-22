<script lang="ts">
    import { appState, calculateBurnUpData } from '$lib/store/appState';
    import { Button } from '$lib/components/ui/button';
    import { onMount, onDestroy } from 'svelte';
    import { Chart, type ChartConfiguration } from 'chart.js/auto';

    let canvas: HTMLCanvasElement;
    let chartInstance: Chart | null = null;

    function renderChart() {
        if (!canvas) return;

        const data = calculateBurnUpData($appState);
        if (!data) return;

        if (chartInstance) {
            chartInstance.destroy();
        }

        const isDark = document.documentElement.classList.contains('dark');
        Chart.defaults.color = isDark ? '#EBEBEB' : '#37352f';
        const gridColor = isDark ? '#2F2F2F' : '#E5E7EB';

        const hexColor = document.documentElement.style.getPropertyValue('--accent-color').trim() || '#3b82f6';

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: '計画 (Plan)',
                        data: data.planData,
                        borderColor: isDark ? '#666' : '#9ca3af',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0,
                        pointRadius: 0
                    },
                    {
                        label: '実績 (Actual)',
                        data: data.actualData,
                        borderColor: hexColor,
                        backgroundColor: hexColor + '80', // semi-transparent
                        borderWidth: 3,
                        fill: true,
                        tension: 0,
                        pointBackgroundColor: isDark ? '#202020' : '#ffffff',
                        pointBorderColor: hexColor,
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: data.maxSubtasks > 0 ? data.maxSubtasks : 10,
                        ticks: { stepSize: 1 },
                        grid: { color: gridColor },
                        title: { display: true, text: '完了サブタスク数', font: { size: 12 } }
                    },
                    x: {
                        grid: { color: gridColor }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: isDark ? '#2A2A2A' : '#ffffff',
                        titleColor: isDark ? '#fff' : '#000',
                        bodyColor: isDark ? '#ccc' : '#333',
                        borderColor: isDark ? '#444' : '#ddd',
                        borderWidth: 1
                    }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        };

        chartInstance = new Chart(canvas, config);
    }

    $: {
        // Re-render when app state changes
        if ($appState) {
            renderChart();
        }
    }

    onMount(() => {
        renderChart();

        const handleColorChange = () => renderChart();
        window.addEventListener('accent-color-changed', handleColorChange);

        // Also watch for theme changes (mutation observer on html class)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    renderChart();
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });

        return () => {
            window.removeEventListener('accent-color-changed', handleColorChange);
            observer.disconnect();
            if (chartInstance) chartInstance.destroy();
        };
    });

    function exportChart() {
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'burnup-chart.png';

        // Set white background for export if needed, but standard is fine
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#09090b' : '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(canvas, 0, 0);
            link.href = tempCanvas.toDataURL('image/png');
            link.click();
        }
    }
</script>

<div class="h-full flex flex-col relative bg-white dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm p-4">
    <div class="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onclick={exportChart}>PNGで保存</Button>
    </div>

    {#if !$appState.projectStartDate || !$appState.projectEndDate}
        <div class="flex-1 flex items-center justify-center text-gray-500 dark:text-zinc-500 flex-col">
            <svg class="w-12 h-12 mb-4 text-gray-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <p>プロジェクトの開始日と終了日を設定してください</p>
        </div>
    {:else}
        <div class="flex-1 min-h-0 relative">
            <canvas bind:this={canvas}></canvas>
        </div>
    {/if}
</div>
