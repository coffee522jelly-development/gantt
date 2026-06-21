// Application State
let appState = {
    projectStartDate: null,
    projectEndDate: null,
    tasks: [], // Array of task objects
    holidays: {}, // Object map: 'YYYY-MM-DD' -> 'Holiday Name'
    customHolidays: [] // Array of 'YYYY-MM-DD' strings
};

// DOM Elements
const tabGantt = document.getElementById('tab-gantt');
const tabBurnup = document.getElementById('tab-burnup');
const viewGantt = document.getElementById('view-gantt');
const viewBurnup = document.getElementById('view-burnup');
const burnupChartCanvas = document.getElementById('burnupChart');
let burnupChartInstance = null;
const exportChartBtn = document.getElementById('export-chart-btn');
const projectStartInput = document.getElementById('project-start');
const projectEndInput = document.getElementById('project-end');
const taskListContainer = document.getElementById('task-list-container');
const ganttChartContainer = document.getElementById('gantt-chart-container');
const ganttScrollArea = document.getElementById('gantt-scroll-area');
const newTaskNameInput = document.getElementById('new-task-name');
const addTaskBtn = document.getElementById('add-task-btn');
const projectProgressEl = document.getElementById('project-progress');

// Custom Holiday DOM Elements
const openHolidayModalBtn = document.getElementById('open-holiday-modal-btn');
const closeHolidayModalBtn = document.getElementById('close-holiday-modal-btn');
const customHolidayModal = document.getElementById('custom-holiday-modal');
const newCustomHolidayInput = document.getElementById('new-custom-holiday');
const addCustomHolidayBtn = document.getElementById('add-custom-holiday-btn');
const customHolidayList = document.getElementById('custom-holiday-list');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const accentColorPicker = document.getElementById('accent-color-picker');

// Gantt Config
const GANTT_CELL_WIDTH = 40; // px
const ROW_HEIGHT = 48; // px (3rem)
const HEADER_HEIGHT = 32; // px (2rem)

// Detail View Global State
let currentDetailTaskId = null;

// Data Persistence
function saveData() {
    const dataToSave = {
        projectStartDate: appState.projectStartDate,
        projectEndDate: appState.projectEndDate,
        tasks: appState.tasks,
        customHolidays: appState.customHolidays
    };
    localStorage.setItem('ganttApp_data', JSON.stringify(dataToSave));
}

function loadData() {
    const savedData = localStorage.getItem('ganttApp_data');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            appState.projectStartDate = parsedData.projectStartDate || null;
            appState.projectEndDate = parsedData.projectEndDate || null;
            appState.tasks = parsedData.tasks || [];
            appState.customHolidays = parsedData.customHolidays || [];

            if (appState.projectStartDate) {
                projectStartInput.value = appState.projectStartDate;
            }
            if (appState.projectEndDate) {
                projectEndInput.value = appState.projectEndDate;
            }
        } catch (e) {
            console.error("Error loading data from local storage", e);
        }
    } else {
        // Default to a 1 month project if no data
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + 1);

        appState.projectStartDate = formatDate(today);
        appState.projectEndDate = formatDate(nextMonth);
        projectStartInput.value = appState.projectStartDate;
        projectEndInput.value = appState.projectEndDate;
    }
}

// Date Logic
async function fetchHolidays() {
    try {
        const response = await fetch('https://holidays-jp.github.io/api/v1/date.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        appState.holidays = data;
        console.log("Holidays fetched:", Object.keys(appState.holidays).length);
    } catch (error) {
        console.error("Failed to fetch holidays:", error);
    }
}

// Format date to YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// Check if a given date is a working day (not weekend, not holiday)
function isWorkingDay(dateStr) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    // Check if it's a public holiday
    if (appState.holidays[dateStr]) return false;
    // Check if it's a custom holiday
    if (appState.customHolidays.includes(dateStr)) return false;

    return true;
}

// Get array of dates between start and end (inclusive)
function getDatesInRange(startDateStr, endDateStr) {
    const dates = [];
    let currentDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    while (currentDate <= endDate) {
        dates.push(formatDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

// Get array of *working* dates between start and end (inclusive)
function getWorkingDays(startDateStr, endDateStr) {
    const dates = getDatesInRange(startDateStr, endDateStr);
    return dates.filter(date => isWorkingDay(date));
}

// Get a valid completion date (today if valid, otherwise closest past valid working day)
function getValidCompletionDate() {
    if (!appState.projectStartDate || !appState.projectEndDate) return null;

    let targetDateStr = formatDate(new Date());

    // Cap at project end date
    if (targetDateStr > appState.projectEndDate) {
        targetDateStr = appState.projectEndDate;
    }

    // Find closest working day looking backwards
    let currentDate = new Date(targetDateStr);
    const startDate = new Date(appState.projectStartDate);

    while (currentDate >= startDate) {
        const dateStr = formatDate(currentDate);
        if (isWorkingDay(dateStr)) {
            return dateStr;
        }
        currentDate.setDate(currentDate.getDate() - 1);
    }

    // If no valid day in past, try forward from start date up to target date
    currentDate = new Date(appState.projectStartDate);
    const targetDateObj = new Date(targetDateStr);
    while (currentDate <= targetDateObj) {
        const dateStr = formatDate(currentDate);
        if (isWorkingDay(dateStr)) {
            return dateStr;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return null; // Fallback if absolutely no working days exist
}

// Add N working days to a start date and return the resulting date string
function addWorkingDays(startDateStr, daysToAdd) {
    let currentDate = new Date(startDateStr);
    let addedDays = 0;

    // If we add 0 days, just return the start date if it's a working day,
    // or the next available working day.
    while (!isWorkingDay(formatDate(currentDate)) || addedDays < daysToAdd) {
        if (isWorkingDay(formatDate(currentDate)) && addedDays < daysToAdd) {
            addedDays++;
        }
        if (addedDays < daysToAdd || !isWorkingDay(formatDate(currentDate))) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    return formatDate(currentDate);
}


// Initialization
async function init() {
    initTheme();
    await fetchHolidays();
    loadData();
    setupProjectSettings();
    setupTabs();
    syncScroll();
    renderApp();
    console.log("App initialized.");
}

// Theme Logic
function initTheme() {
    const isDark = localStorage.getItem('ganttApp_theme') === 'dark';
    if (isDark) {
        document.documentElement.classList.add('dark');
    }

    const savedAccentColor = localStorage.getItem('ganttApp_accent_color') || '#3b82f6';
    accentColorPicker.value = savedAccentColor;
    document.documentElement.style.setProperty('--accent-color', savedAccentColor);
}

themeToggleBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('ganttApp_theme', isDark ? 'dark' : 'light');
    renderApp(); // Re-render to update chart colors
});

accentColorPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    document.documentElement.style.setProperty('--accent-color', color);
    localStorage.setItem('ganttApp_accent_color', color);
    if (!viewBurnup.classList.contains('hidden')) {
        renderBurnUpChart(); // Update chart color instantly
    }
});

function setupProjectSettings() {
    projectStartInput.addEventListener('change', (e) => {
        appState.projectStartDate = e.target.value;
        saveData();
        renderApp();
    });

    projectEndInput.addEventListener('change', (e) => {
        appState.projectEndDate = e.target.value;
        saveData();
        renderApp();
    });
}

// Render Functions
function renderApp() {
    renderTaskList();
    renderGantt();
    updateProgressDisplay();
    if (!viewBurnup.classList.contains('hidden')) {
        renderBurnUpChart();
    }
}

function updateProgressDisplay() {
    let totalSubtasksCount = 0;
    let completedSubtasksCount = 0;

    appState.tasks.forEach(task => {
        if (task.subtasks) {
            totalSubtasksCount += task.subtasks.length;
            task.subtasks.forEach(st => {
                if (st.completed) {
                    completedSubtasksCount++;
                }
            });
        }
    });

    let percentage = 0;
    if (totalSubtasksCount > 0) {
        percentage = Math.round((completedSubtasksCount / totalSubtasksCount) * 100);
    }

    projectProgressEl.textContent = `${percentage}%`;
}

function renderTaskList() {
    taskListContainer.innerHTML = '';
    appState.tasks.forEach((task, index) => {
        // Main task container (includes main row and subtasks)
        const taskWrapper = document.createElement('div');
        taskWrapper.className = 'border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202020] task-wrapper transition-colors';
        taskWrapper.dataset.id = task.id;

        // --- Main Task Row ---
        const mainRow = document.createElement('div');
        mainRow.className = 'flex items-center justify-between px-4 hover:bg-gray-50 dark:hover:bg-[#2A2A2A] group transition-colors cursor-pointer';
        mainRow.style.height = `${ROW_HEIGHT}px`;
        mainRow.addEventListener('dblclick', () => {
            openTaskDetail(task.id);
        });

        const dragHandle = document.createElement('span');
        dragHandle.className = 'text-gray-400 cursor-grab mr-2 px-1 drag-handle flex-shrink-0';
        dragHandle.innerHTML = '⋮⋮';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'truncate flex-1 font-medium dark:text-[#EBEBEB]';
        nameSpan.textContent = task.name;

        const nameContainer = document.createElement('div');
        nameContainer.className = 'flex items-center flex-1 overflow-hidden';
        nameContainer.appendChild(nameSpan);

        const leftWrapper = document.createElement('div');
        leftWrapper.className = 'flex items-center flex-1 overflow-hidden';
        leftWrapper.appendChild(dragHandle);
        leftWrapper.appendChild(nameContainer);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-2 flex-shrink-0';
        deleteBtn.innerHTML = '✕';
        deleteBtn.title = '削除';
        deleteBtn.onclick = () => deleteTask(task.id);

        mainRow.appendChild(leftWrapper);
        mainRow.appendChild(deleteBtn);
        taskWrapper.appendChild(mainRow);

        // --- Subtasks List ---
        const subtasksContainer = document.createElement('div');
        subtasksContainer.className = 'px-8 pb-2 bg-gray-50 dark:bg-[#1A1A1A] transition-colors border-t border-dashed border-gray-200 dark:border-gray-700'; // Indented area for subtasks

        const subtaskListEl = document.createElement('ul');
        if (task.subtasks) {
            task.subtasks.forEach(subtask => {
                const li = document.createElement('li');
                li.className = 'py-1 flex items-center justify-between text-sm dark:text-[#EBEBEB]';

                const stLeft = document.createElement('div');
                stLeft.className = 'flex items-center truncate';

                const stCheckbox = document.createElement('input');
                stCheckbox.type = 'checkbox';
                stCheckbox.className = 'mr-2 h-3 w-3 text-blue-600 rounded';
                stCheckbox.checked = subtask.completed;
                stCheckbox.onchange = () => toggleSubtaskStatus(task.id, subtask.id, stCheckbox.checked);

                const stName = document.createElement('span');
                stName.textContent = subtask.name;
                if (subtask.completed) {
                    stName.classList.add('line-through', 'text-gray-500', 'dark:text-gray-400');
                }

                stLeft.appendChild(stCheckbox);
                stLeft.appendChild(stName);

                if (subtask.completed && subtask.completedAt) {
                    const stDateInput = document.createElement('input');
                    stDateInput.type = 'date';
                    stDateInput.className = 'text-xs border border-gray-300 dark:border-gray-600 bg-transparent rounded px-1 ml-2 text-gray-500 dark:text-gray-400 w-28 dark:[color-scheme:dark]';
                    stDateInput.value = subtask.completedAt;
                    stDateInput.min = appState.projectStartDate;
                    stDateInput.max = appState.projectEndDate;

                    stDateInput.onchange = (e) => {
                        const newDate = e.target.value;
                        if (!newDate) {
                            e.target.value = subtask.completedAt;
                            return;
                        }
                        if (!isWorkingDay(newDate)) {
                            alert('選択した日付は休日です。営業日を選択してください。');
                            e.target.value = subtask.completedAt;
                            return;
                        }
                        if (newDate < appState.projectStartDate || newDate > appState.projectEndDate) {
                            alert('プロジェクト期間内の日付を選択してください。');
                            e.target.value = subtask.completedAt;
                            return;
                        }
                        subtask.completedAt = newDate;
                        saveData();
                        renderApp();
                    };
                    stLeft.appendChild(stDateInput);
                }

                const stDeleteBtn = document.createElement('button');
                stDeleteBtn.className = 'text-red-500 text-xs hover:underline ml-2';
                stDeleteBtn.textContent = '削除';
                stDeleteBtn.onclick = () => deleteSubtask(task.id, subtask.id);

                li.appendChild(stLeft);
                li.appendChild(stDeleteBtn);
                subtaskListEl.appendChild(li);
            });
        }
        subtasksContainer.appendChild(subtaskListEl);

        // --- Add Subtask Input ---
        const addSubtaskRow = document.createElement('div');
        addSubtaskRow.className = 'flex mt-1 gap-2';

        const subtaskInput = document.createElement('input');
        subtaskInput.type = 'text';
        subtaskInput.placeholder = '新しいサブタスク';
        subtaskInput.className = 'bg-transparent border border-gray-300 dark:border-gray-700 p-1 rounded flex-1 text-sm dark:text-[#EBEBEB] focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors';

        const subtaskAddBtn = document.createElement('button');
        subtaskAddBtn.className = 'bg-white dark:bg-[#2F2F2F] hover:bg-gray-100 dark:hover:bg-[#3F3F3F] text-gray-800 dark:text-[#EBEBEB] border border-gray-300 dark:border-gray-700 font-medium px-2 rounded text-xs transition-colors';
        subtaskAddBtn.textContent = '追加';

        const handleAddSubtask = () => {
            const name = subtaskInput.value.trim();
            if (name) {
                addSubtaskInline(task.id, name);
            }
        };

        subtaskAddBtn.onclick = handleAddSubtask;
        subtaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAddSubtask();
        });

        addSubtaskRow.appendChild(subtaskInput);
        addSubtaskRow.appendChild(subtaskAddBtn);
        subtasksContainer.appendChild(addSubtaskRow);

        taskWrapper.appendChild(subtasksContainer);
        taskListContainer.appendChild(taskWrapper);
    });

    // Initialize Sortable
    if (window.taskListSortable) {
        window.taskListSortable.destroy();
    }
    window.taskListSortable = Sortable.create(taskListContainer, {
        handle: '.drag-handle',
        animation: 150,
        onEnd: (evt) => {
            const itemEl = evt.item;
            const newIndex = evt.newIndex;
            const oldIndex = evt.oldIndex;

            // Reorder array
            const movedTask = appState.tasks.splice(oldIndex, 1)[0];
            appState.tasks.splice(newIndex, 0, movedTask);

            saveData();
            renderGantt(); // Re-render gantt to match new order
        }
    });
}

function renderGantt() {
    if (!appState.projectStartDate || !appState.projectEndDate) return;

    ganttChartContainer.innerHTML = '';
    const dates = getDatesInRange(appState.projectStartDate, appState.projectEndDate);
    const numColumns = dates.length;

    if (numColumns <= 0) return;

    // Calculate dynamic row heights based on rendered task wrappers
    const taskWrappers = taskListContainer.querySelectorAll('.task-wrapper');
    const rowHeights = Array.from(taskWrappers).map(el => el.offsetHeight);

    // Set grid template
    ganttChartContainer.style.gridTemplateColumns = `repeat(${numColumns}, ${GANTT_CELL_WIDTH}px)`;

    let gridTemplateRows = `${HEADER_HEIGHT}px `;
    rowHeights.forEach(h => {
        gridTemplateRows += `${h}px `;
    });
    ganttChartContainer.style.gridTemplateRows = gridTemplateRows;

    // 1. Render Headers
    dates.forEach((dateStr, index) => {
        const headerCell = document.createElement('div');
        headerCell.className = 'gantt-header-cell';
        headerCell.style.gridColumn = index + 1;
        headerCell.style.gridRow = 1;

        const d = new Date(dateStr);
        const day = d.getDate();
        headerCell.textContent = `${d.getMonth()+1}/${day}`;

        if (!isWorkingDay(dateStr)) {
            headerCell.classList.add('bg-red-50', 'dark:bg-red-900/20', 'text-red-600', 'dark:text-red-400');
        }

        ganttChartContainer.appendChild(headerCell);
    });

    // 2. Render Grid Background (columns x rows)
    for (let r = 0; r < appState.tasks.length; r++) {
        for (let c = 0; c < numColumns; c++) {
            const cell = document.createElement('div');
            cell.className = 'gantt-cell';
            cell.style.gridColumn = c + 1;
            cell.style.gridRow = r + 2; // +2 because row 1 is header

            if (!isWorkingDay(dates[c])) {
                cell.classList.add('holiday');
            }
            ganttChartContainer.appendChild(cell);
        }
    }

    // 3. Render Task Bars
    appState.tasks.forEach((task, index) => {
        // Calculate start position
        const startIndex = dates.indexOf(task.startDate);
        const endIndex = dates.indexOf(task.endDate);

        if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
            const bar = document.createElement('div');
            bar.className = 'gantt-bar flex items-center px-2 overflow-hidden text-white text-xs font-semibold';
            bar.textContent = task.name;
            bar.dataset.id = task.id;

            // Positioning within the grid row
            bar.style.gridRow = index + 2;

            // Calculate top position dynamically based on accumulated row heights
            let accumulatedHeight = HEADER_HEIGHT;
            for (let i = 0; i < index; i++) {
                accumulatedHeight += rowHeights[i];
            }

            // Use absolute positioning relative to the container for the bar
            // so it can span across grid cells smoothly during drag
            bar.style.gridColumn = '1 / -1'; // Span full row to allow absolute positioning within it
            bar.style.position = 'absolute';
            bar.style.left = `${startIndex * GANTT_CELL_WIDTH}px`;
            bar.style.width = `${(endIndex - startIndex + 1) * GANTT_CELL_WIDTH}px`;

            // We want to center the 32px bar within the main row height (48px) of this task wrapper.
            // The task wrapper height is rowHeights[index]. The top of the wrapper is accumulatedHeight.
            // Center within the first ROW_HEIGHT (48px):
            bar.style.top = `${accumulatedHeight + (ROW_HEIGHT - 32)/2}px`;
            bar.style.height = '32px';

            // Add resize handles
            const leftHandle = document.createElement('div');
            leftHandle.className = 'gantt-bar-resize-handle left';

            const rightHandle = document.createElement('div');
            rightHandle.className = 'gantt-bar-resize-handle right';

            bar.appendChild(leftHandle);
            bar.appendChild(rightHandle);

            setupBarInteractions(bar, task, index, dates);

            ganttChartContainer.appendChild(bar);
        }
    });

}

// Sync scroll
function syncScroll() {
    const taskListParent = taskListContainer.parentElement;
    taskListParent.addEventListener('scroll', () => {
        ganttScrollArea.scrollTop = taskListParent.scrollTop;
    });
    ganttScrollArea.addEventListener('scroll', () => {
        taskListParent.scrollTop = ganttScrollArea.scrollTop;
    });
}

// Task Interaction (Drag & Resize)
function setupBarInteractions(barEl, task, taskIndex, dates) {
    let isDragging = false;
    let isResizingLeft = false;
    let isResizingRight = false;
    let startX = 0;
    let initialLeft = 0;
    let initialWidth = 0;

    const onMouseDown = (e) => {
        if (e.target.classList.contains('gantt-bar-resize-handle')) {
            if (e.target.classList.contains('left')) isResizingLeft = true;
            if (e.target.classList.contains('right')) isResizingRight = true;
        } else {
            isDragging = true;
        }

        startX = e.clientX;
        initialLeft = parseInt(barEl.style.left || 0, 10);
        initialWidth = parseInt(barEl.style.width || 0, 10);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e) => {
        const dx = e.clientX - startX;

        if (isDragging) {
            let newLeft = initialLeft + dx;
            // Bound to container
            newLeft = Math.max(0, newLeft);
            barEl.style.left = `${newLeft}px`;
        } else if (isResizingLeft) {
            let newLeft = initialLeft + dx;
            let newWidth = initialWidth - dx;

            // Constrain
            if (newWidth >= GANTT_CELL_WIDTH && newLeft >= 0) {
                barEl.style.left = `${newLeft}px`;
                barEl.style.width = `${newWidth}px`;
            }
        } else if (isResizingRight) {
            let newWidth = initialWidth + dx;
            if (newWidth >= GANTT_CELL_WIDTH) {
                barEl.style.width = `${newWidth}px`;
            }
        }
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.userSelect = '';

        // Calculate new dates based on final position/width
        const finalLeft = parseInt(barEl.style.left, 10);
        const finalWidth = parseInt(barEl.style.width, 10);

        // Round to nearest cell index
        const startIndex = Math.round(finalLeft / GANTT_CELL_WIDTH);
        const cellSpan = Math.round(finalWidth / GANTT_CELL_WIDTH);
        const endIndex = startIndex + cellSpan - 1;

        // Apply new dates if within bounds
        if (startIndex >= 0 && endIndex < dates.length) {
            // Update task dates. Note: We snap to the exact grid cell date,
            // even if it falls on a non-working day visually, but you can adjust logic to skip holidays if needed.
            // For simplicity, dropping it sets the start/end date exactly to the column date.
            task.startDate = dates[startIndex];
            task.endDate = dates[endIndex];
            saveData();
        }

        renderGantt(); // Re-render to snap to grid

        isDragging = false;
        isResizingLeft = false;
        isResizingRight = false;
    };

    barEl.addEventListener('mousedown', onMouseDown);
}

// --- Task Detail View Logic ---
function openTaskDetail(taskId) {
    currentDetailTaskId = taskId;
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Ensure data exists for older tasks
    if (task.notes === undefined) task.notes = "";
    if (task.tags === undefined) task.tags = [];

    // Populate Data
    document.getElementById('detail-task-name').value = task.name;

    // Format dates nicely: YYYY-MM-DD -> YYYY/MM/DD
    const formatStr = (dStr) => dStr ? dStr.replace(/-/g, '/') : '';
    document.getElementById('detail-task-dates').textContent = `${formatStr(task.startDate)} 〜 ${formatStr(task.endDate)}`;

    document.getElementById('detail-task-notes').value = task.notes;

    renderDetailTags();

    // Slide panel in
    const panel = document.getElementById('task-detail-panel');
    panel.classList.remove('translate-x-full');
    panel.classList.add('translate-x-0');
}

function closeTaskDetail() {
    currentDetailTaskId = null;
    const panel = document.getElementById('task-detail-panel');
    panel.classList.remove('translate-x-0');
    panel.classList.add('translate-x-full');
}

function renderDetailTags() {
    const task = appState.tasks.find(t => t.id === currentDetailTaskId);
    if (!task) return;

    const tagsList = document.getElementById('detail-task-tags-list');
    tagsList.innerHTML = '';

    if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'inline-flex items-center gap-1 bg-gray-100 dark:bg-[#333333] border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded text-xs text-gray-700 dark:text-gray-300';
            tagEl.textContent = tag;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-gray-400 hover:text-red-500 transition-colors leading-none';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = () => {
                task.tags = task.tags.filter(t => t !== tag);
                saveData();
                renderDetailTags();
                // We might want to re-render the task list if we decide to show tags there later
            };

            tagEl.appendChild(removeBtn);
            tagsList.appendChild(tagEl);
        });
    }
}

document.getElementById('close-detail-panel-btn').addEventListener('click', closeTaskDetail);

// Detail View Input Event Listeners
document.getElementById('detail-task-name').addEventListener('change', (e) => {
    if (!currentDetailTaskId) return;
    const task = appState.tasks.find(t => t.id === currentDetailTaskId);
    if (task) {
        task.name = e.target.value.trim() || "Untitled Task";
        saveData();
        renderApp(); // Update task list and gantt bar texts
    }
});

document.getElementById('detail-task-notes').addEventListener('input', (e) => {
    if (!currentDetailTaskId) return;
    const task = appState.tasks.find(t => t.id === currentDetailTaskId);
    if (task) {
        task.notes = e.target.value;
        saveData();
    }
});

document.getElementById('detail-task-tag-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (!currentDetailTaskId) return;
        const task = appState.tasks.find(t => t.id === currentDetailTaskId);
        if (!task) return;

        const tag = e.target.value.trim();
        if (tag && !task.tags.includes(tag)) {
            task.tags.push(tag);
            saveData();
            renderDetailTags();
        }
        e.target.value = '';
    }
});


// Task Management Logic
function addTask() {
    const name = newTaskNameInput.value.trim();
    if (!name) return;

    if (!appState.projectStartDate) {
        alert("まずプロジェクトの開始日を設定してください。");
        return;
    }

    const newTask = {
        id: 'task_' + Date.now(),
        name: name,
        startDate: appState.projectStartDate,
        endDate: addWorkingDays(appState.projectStartDate, 2), // Default 3 working days duration (start + 2)
        subtasks: [],
        notes: "",
        tags: []
    };

    appState.tasks.push(newTask);
    saveData();
    renderApp();
    newTaskNameInput.value = '';
}

function deleteTask(taskId) {
    if (confirm('このタスクを削除してもよろしいですか？')) {
        appState.tasks = appState.tasks.filter(t => t.id !== taskId);
        saveData();
        renderApp();
    }
}

// Task & Subtask Management Logic
function addSubtaskInline(taskId, subtaskName) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.subtasks) task.subtasks = [];

    task.subtasks.push({
        id: 'sub_' + Date.now(),
        name: subtaskName,
        completed: false,
        completedAt: null
    });

    saveData();
    renderApp();
}

function deleteSubtask(taskId, subtaskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
    saveData();
    renderApp();
}

function toggleSubtaskStatus(taskId, subtaskId, isCompleted) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;

    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;

    subtask.completed = isCompleted;
    if (isCompleted) {
        subtask.completedAt = getValidCompletionDate() || formatDate(new Date());
    } else {
        subtask.completedAt = null;
    }

    saveData();
    renderApp();
}

// Custom Holiday Management Logic
function openHolidayModal() {
    renderHolidayList();
    customHolidayModal.classList.remove('hidden');
}

function closeHolidayModal() {
    customHolidayModal.classList.add('hidden');
    newCustomHolidayInput.value = '';
}

function renderHolidayList() {
    customHolidayList.innerHTML = '';

    // Sort holidays chronologically
    const sortedHolidays = [...appState.customHolidays].sort();

    sortedHolidays.forEach(dateStr => {
        const li = document.createElement('li');
        li.className = 'py-3 flex items-center justify-between';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = dateStr;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-500 text-sm hover:underline';
        deleteBtn.textContent = '削除';
        deleteBtn.onclick = () => deleteCustomHoliday(dateStr);

        li.appendChild(nameSpan);
        li.appendChild(deleteBtn);
        customHolidayList.appendChild(li);
    });
}

function addCustomHoliday() {
    const dateStr = newCustomHolidayInput.value;
    if (!dateStr) return;

    if (!appState.customHolidays.includes(dateStr)) {
        appState.customHolidays.push(dateStr);
        saveData();
        renderHolidayList();
        renderApp(); // Re-render to reflect new holidays on grid and burnup
    }
    newCustomHolidayInput.value = '';
}

function deleteCustomHoliday(dateStr) {
    appState.customHolidays = appState.customHolidays.filter(d => d !== dateStr);
    saveData();
    renderHolidayList();
    renderApp();
}

// Event Listeners setup
addTaskBtn.addEventListener('click', addTask);
newTaskNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

openHolidayModalBtn.addEventListener('click', openHolidayModal);
closeHolidayModalBtn.addEventListener('click', closeHolidayModal);
addCustomHolidayBtn.addEventListener('click', addCustomHoliday);

customHolidayModal.addEventListener('click', (e) => {
    if (e.target === customHolidayModal) {
        closeHolidayModal();
    }
});


// Export Chart Logic
exportChartBtn.addEventListener('click', () => {
    if (!burnupChartInstance) return;

    // Create a temporary link
    const link = document.createElement('a');
    link.download = 'burnup-chart.png';
    // Get image data from canvas. Note: Chart.js uses white background if not specified,
    // but sometimes it's transparent. To ensure a white background, we could draw it on a temp canvas,
    // but typically Chart.js background can be configured or the default is fine.
    link.href = burnupChartCanvas.toDataURL('image/png');
    link.click();
});


// Burn-up Chart Logic
function calculateBurnUpData() {
    if (!appState.projectStartDate || !appState.projectEndDate) return null;

    const workingDays = getWorkingDays(appState.projectStartDate, appState.projectEndDate);
    if (workingDays.length === 0) return null;

    // Gather all subtasks
    let totalSubtasksCount = 0;
    const completedSubtasks = []; // { date: 'YYYY-MM-DD' }

    appState.tasks.forEach(task => {
        if (task.subtasks) {
            totalSubtasksCount += task.subtasks.length;
            task.subtasks.forEach(st => {
                if (st.completed && st.completedAt) {
                    completedSubtasks.push(st.completedAt);
                }
            });
        }
    });

    // Ideal plan line (linear from 0 to total over working days)
    const planData = [];
    const actualData = [];
    let cumulativeCompleted = 0;

    // To properly calculate actuals over time, we count how many were completed ON or BEFORE each working day.
    // However, since completedAt might be a holiday, we just accumulate totals day by day.

    // Sort completed subtasks dates
    completedSubtasks.sort();

    // Determine the max date to draw the actual line up to.
    // Usually today, but if user set a completion date in the future, we draw up to that.
    const todayStr = formatDate(new Date());
    let maxActualDateStr = todayStr;
    if (completedSubtasks.length > 0) {
        const latestSubtaskCompletion = completedSubtasks[completedSubtasks.length - 1];
        if (latestSubtaskCompletion > maxActualDateStr) {
            maxActualDateStr = latestSubtaskCompletion;
        }
    }

    workingDays.forEach((day, index) => {
        // Plan line
        const idealPace = (totalSubtasksCount / (workingDays.length - 1 || 1)) * index;
        planData.push(Math.round(idealPace * 10) / 10);

        // Actual line
        // Count subtasks completed on or before this day
        const completedCount = completedSubtasks.filter(date => date <= day).length;

        // Push actual data up to maxActualDateStr
        if (day <= maxActualDateStr) {
            actualData.push(completedCount);
        } else {
            actualData.push(null); // Don't draw actual line beyond max actual date
        }
    });

    return {
        labels: workingDays,
        planData,
        actualData,
        maxSubtasks: totalSubtasksCount
    };
}

function renderBurnUpChart() {
    const data = calculateBurnUpData();
    if (!data) return;

    if (burnupChartInstance) {
        burnupChartInstance.destroy();
    }

    const isDark = document.documentElement.classList.contains('dark');
    Chart.defaults.color = isDark ? '#EBEBEB' : '#37352f';
    const gridColor = isDark ? '#2F2F2F' : '#E5E7EB';

    // Convert hex accent color to rgba for background
    // document.documentElement.style is more reliable than getComputedStyle immediately after switching
    const hexColor = document.documentElement.style.getPropertyValue('--accent-color').trim() || localStorage.getItem('ganttApp_accent_color') || '#3b82f6';
    const r = parseInt(hexColor.slice(1, 3), 16) || 59;
    const g = parseInt(hexColor.slice(3, 5), 16) || 130;
    const b = parseInt(hexColor.slice(5, 7), 16) || 246;
    const rgbaColor = `rgba(${r}, ${g}, ${b}, 0.5)`;

    const ctx = burnupChartCanvas.getContext('2d');
    burnupChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels.map(date => {
                const d = new Date(date);
                return `${d.getMonth()+1}/${d.getDate()}`;
            }),
            datasets: [
                {
                    label: '実績（完了サブタスク数）',
                    data: data.actualData,
                    borderColor: hexColor,
                    backgroundColor: rgbaColor,
                    tension: 0.1,
                    spanGaps: true
                },
                {
                    label: '計画（理想線）',
                    data: data.planData,
                    borderColor: 'rgb(156, 163, 175)', // Gray-400
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'バーンアップチャート'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
            },
            // Custom plugin to draw white background before export
            animation: false,
            layout: {
                padding: 20
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: Math.max(data.maxSubtasks, 1) + 1, // Add a bit of padding to top
                    title: {
                        display: true,
                        text: 'サブタスク数'
                    },
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '営業日'
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        },
        plugins: [{
            id: 'customCanvasBackgroundColor',
            beforeDraw: (chart, args, options) => {
                const {ctx} = chart;
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                // Handle dark mode export explicitly
                ctx.fillStyle = isDark ? '#191919' : (options.color || '#ffffff');
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        }]
    });
}

// Tab Switching Logic
function setupTabs() {
    tabGantt.addEventListener('click', () => {
        tabGantt.classList.add('text-blue-500', 'border-b-2', 'border-blue-500');
        tabGantt.classList.remove('text-gray-500', 'hover:text-blue-800');

        tabBurnup.classList.remove('text-blue-500', 'border-b-2', 'border-blue-500');
        tabBurnup.classList.add('text-gray-500', 'hover:text-blue-800');

        viewGantt.classList.remove('hidden');
        viewBurnup.classList.add('hidden');
    });

    tabBurnup.addEventListener('click', () => {
        tabBurnup.classList.add('text-blue-500', 'border-b-2', 'border-blue-500');
        tabBurnup.classList.remove('text-gray-500', 'hover:text-blue-800');

        tabGantt.classList.remove('text-blue-500', 'border-b-2', 'border-blue-500');
        tabGantt.classList.add('text-gray-500', 'hover:text-blue-800');

        viewBurnup.classList.remove('hidden');
        viewGantt.classList.add('hidden');

        renderBurnUpChart();
    });
}

// Run init when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
