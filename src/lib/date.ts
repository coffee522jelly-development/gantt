import type { AppState } from './store/appState';
import { isWorkingDay } from './store/appState';

export function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
    const dates: string[] = [];
    let currentDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    while (currentDate <= endDate) {
        dates.push(formatDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

export function getWorkingDays(state: AppState, startDateStr: string, endDateStr: string): string[] {
    const dates = getDatesInRange(startDateStr, endDateStr);
    return dates.filter(date => isWorkingDay(state, date));
}
