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
const subtaskModal = document.getElementById('subtask-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalTaskTitle = document.getElementById('modal-task-title');
const newSubtaskNameInput = document.getElementById('new-subtask-name');
const addSubtaskBtn = document.getElementById('add-subtask-btn');
const subtaskList = document.getElementById('subtask-list');
const projectProgressEl = document.getElementById('project-progress');

// Custom Holiday DOM Elements
const openHolidayModalBtn = document.getElementById('open-holiday-modal-btn');
const closeHolidayModalBtn = document.getElementById('close-holiday-modal-btn');
const customHolidayModal = document.getElementById('custom-holiday-modal');
const newCustomHolidayInput = document.getElementById('new-custom-holiday');
const addCustomHolidayBtn = document.getElementById('add-custom-holiday-btn');
const customHolidayList = document.getElementById('custom-holiday-list');

let currentEditingTaskId = null;

// Gantt Config
const GANTT_CELL_WIDTH = 40; // px
const ROW_HEIGHT = 48; // px (3rem)
const HEADER_HEIGHT = 32; // px (2rem)

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
    await fetchHolidays();
    loadData();
    setupProjectSettings();
    setupTabs();
    console.log("App initialized.");
}

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
        const taskEl = document.createElement('div');
        taskEl.className = 'flex items-center justify-between px-4 border-b border-gray-200 bg-white hover:bg-gray-50 group';
        taskEl.style.height = `${ROW_HEIGHT}px`;
        taskEl.dataset.id = task.id;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'truncate flex-1 cursor-pointer hover:underline text-blue-600';
        nameSpan.textContent = task.name;
        nameSpan.addEventListener('click', () => openSubtaskModal(task.id));

        const dragHandle = document.createElement('span');
        dragHandle.className = 'text-gray-400 cursor-grab mr-2 px-1 drag-handle';
        dragHandle.innerHTML = '⋮⋮';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1';
        deleteBtn.innerHTML = '✕';
        deleteBtn.title = '削除';
        deleteBtn.onclick = () => deleteTask(task.id);

        const leftWrapper = document.createElement('div');
        leftWrapper.className = 'flex items-center flex-1 overflow-hidden';
        leftWrapper.appendChild(dragHandle);
        leftWrapper.appendChild(nameSpan);

        taskEl.appendChild(leftWrapper);
        taskEl.appendChild(deleteBtn);
        taskListContainer.appendChild(taskEl);
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

    // Set grid template
    ganttChartContainer.style.gridTemplateColumns = `repeat(${numColumns}, ${GANTT_CELL_WIDTH}px)`;
    ganttChartContainer.style.gridTemplateRows = `${HEADER_HEIGHT}px repeat(${appState.tasks.length}, ${ROW_HEIGHT}px)`;

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
            headerCell.classList.add('bg-red-50', 'text-red-600');
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

            // Use absolute positioning relative to the container for the bar
            // so it can span across grid cells smoothly during drag
            bar.style.gridColumn = '1 / -1'; // Span full row to allow absolute positioning within it
            bar.style.position = 'absolute';
            bar.style.left = `${startIndex * GANTT_CELL_WIDTH}px`;
            bar.style.width = `${(endIndex - startIndex + 1) * GANTT_CELL_WIDTH}px`;
            bar.style.top = `${index * ROW_HEIGHT + HEADER_HEIGHT + (ROW_HEIGHT - 32)/2}px`; // center vertically in row, 32 is bar height
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

    // Sync scroll
    // But vertical scrolling needs to be synced if they scroll independently.
    // In our design, task list and gantt scroll together vertically within flex container?
    // Actually, it's better to let them scroll independently and sync them, or wrap them in one scroller.
    // Let's implement vertical sync
    syncScroll();
}

function syncScroll() {
    taskListContainer.addEventListener('scroll', () => {
        ganttScrollArea.scrollTop = taskListContainer.scrollTop;
    });
    ganttScrollArea.addEventListener('scroll', () => {
        taskListContainer.scrollTop = ganttScrollArea.scrollTop;
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
        subtasks: []
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

// Subtask Management Logic
function openSubtaskModal(taskId) {
    currentEditingTaskId = taskId;
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;

    modalTaskTitle.textContent = `${task.name} のサブタスク`;
    renderSubtaskList(task);

    subtaskModal.classList.remove('hidden');
    newSubtaskNameInput.focus();
}

function closeSubtaskModal() {
    subtaskModal.classList.add('hidden');
    currentEditingTaskId = null;
    newSubtaskNameInput.value = '';
}

function renderSubtaskList(task) {
    subtaskList.innerHTML = '';

    if (!task.subtasks) {
        task.subtasks = [];
    }

    task.subtasks.forEach(subtask => {
        const li = document.createElement('li');
        li.className = 'py-3 flex items-center justify-between';

        const leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'mr-3 h-4 w-4 text-blue-600 rounded';
        checkbox.checked = subtask.completed;
        checkbox.onchange = () => toggleSubtaskStatus(task.id, subtask.id, checkbox.checked);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = subtask.name;
        if (subtask.completed) {
            nameSpan.className = 'line-through text-gray-500';
        }

        leftDiv.appendChild(checkbox);
        leftDiv.appendChild(nameSpan);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-500 text-sm hover:underline';
        deleteBtn.textContent = '削除';
        deleteBtn.onclick = () => deleteSubtask(task.id, subtask.id);

        li.appendChild(leftDiv);
        li.appendChild(deleteBtn);
        subtaskList.appendChild(li);
    });
}

function addSubtask() {
    if (!currentEditingTaskId) return;
    const name = newSubtaskNameInput.value.trim();
    if (!name) return;

    const task = appState.tasks.find(t => t.id === currentEditingTaskId);
    if (!task) return;

    if (!task.subtasks) task.subtasks = [];

    task.subtasks.push({
        id: 'sub_' + Date.now(),
        name: name,
        completed: false,
        completedAt: null
    });

    saveData();
    renderSubtaskList(task);
    updateProgressDisplay();
    if (!viewBurnup.classList.contains('hidden')) renderBurnUpChart();
    newSubtaskNameInput.value = '';
}

function deleteSubtask(taskId, subtaskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
    saveData();
    renderSubtaskList(task);
    updateProgressDisplay();
    if (!viewBurnup.classList.contains('hidden')) renderBurnUpChart();
}

function toggleSubtaskStatus(taskId, subtaskId, isCompleted) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;

    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;

    subtask.completed = isCompleted;
    if (isCompleted) {
        // Record completion date as today, formatted as YYYY-MM-DD
        subtask.completedAt = formatDate(new Date());
    } else {
        subtask.completedAt = null;
    }

    saveData();
    renderSubtaskList(task);
    updateProgressDisplay();
    if (!viewBurnup.classList.contains('hidden')) renderBurnUpChart();
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

closeModalBtn.addEventListener('click', closeSubtaskModal);
addSubtaskBtn.addEventListener('click', addSubtask);
newSubtaskNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSubtask();
});

// Close modal when clicking outside
subtaskModal.addEventListener('click', (e) => {
    if (e.target === subtaskModal) {
        closeSubtaskModal();
    }
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

    workingDays.forEach((day, index) => {
        // Plan line
        const idealPace = (totalSubtasksCount / (workingDays.length - 1 || 1)) * index;
        planData.push(Math.round(idealPace * 10) / 10);

        // Actual line
        // Count subtasks completed on or before this day
        const completedCount = completedSubtasks.filter(date => date <= day).length;

        // Only push actual data up to "today" (so the line stops at today if project is ongoing)
        const todayStr = formatDate(new Date());
        if (day <= todayStr) {
            actualData.push(completedCount);
        } else {
            actualData.push(null); // Don't draw actual line in the future
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
                    borderColor: 'rgb(59, 130, 246)', // Blue-500
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
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
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '営業日'
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
                ctx.fillStyle = options.color || '#ffffff';
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
