const fs = require('fs');
async function test() {
  const username = process.env.KAGGLE_USERNAME;
  const token = process.env.KAGGLE_KEY;
  const authHeader = 'Basic ' + Buffer.from(`${username}:${token}`).toString('base64');
  
  // Need to get a real slug that is running or recently finished.
  // We don't have one right now, so we can't test unless we start one.
}
test();
