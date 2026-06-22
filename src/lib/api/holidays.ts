import { appState } from '$lib/store/appState';
import { get } from 'svelte/store';

export async function fetchJapaneseHolidays() {
    try {
        const response = await fetch('https://holidays-jp.github.io/api/v1/date.json');
        const data = await response.json();

        // Data format: { "2023-01-01": "元日", "2023-01-09": "成人の日", ... }
        if (data && typeof data === 'object') {
            appState.setHolidays(data);
            return true;
        }
    } catch (error) {
        console.error("Failed to fetch Japanese holidays:", error);
    }
    return false;
}
