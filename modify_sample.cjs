const fs = require('fs');
const data = JSON.parse(fs.readFileSync('example-project.json', 'utf8'));

// Give some dates to subtasks
data.tasks[0].subtasks[0].startDate = "2026-06-01";
data.tasks[0].subtasks[0].endDate = "2026-06-01";

data.tasks[0].subtasks[1].startDate = "2026-06-02";
data.tasks[0].subtasks[1].endDate = "2026-06-02";

data.tasks[0].subtasks[2].startDate = "2026-06-03";
data.tasks[0].subtasks[2].endDate = "2026-06-04";

data.tasks[0].subtasks[3].startDate = "2026-06-05";
data.tasks[0].subtasks[3].endDate = "2026-06-08";

data.tasks[0].subtasks[4].startDate = "2026-06-09";
data.tasks[0].subtasks[4].endDate = "2026-06-09";

fs.writeFileSync('example-project.json', JSON.stringify(data, null, 2));
