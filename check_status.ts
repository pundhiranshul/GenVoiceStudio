import fs from 'fs';

async function run() {
  const code = fs.readFileSync('src/app/api/status/route.ts', 'utf8');
  console.log("Ready");
}
run();
