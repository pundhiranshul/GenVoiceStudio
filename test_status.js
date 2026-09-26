const fs = require('fs');
const partialLog = "114.9s 34 CELL_PROGRESS: 1/8\nGenerating 1/4\n";
const chunkMatches = [...partialLog.matchAll(/Generating (\d+)\/(\d+)/g)];
const cellMatches = [...partialLog.matchAll(/CELL_PROGRESS: (\d+)\/(\d+)/g)];
console.log("chunkMatches", chunkMatches.length);
console.log("cellMatches", cellMatches.length);
