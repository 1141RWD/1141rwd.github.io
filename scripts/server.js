const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// --- Manual .env Parsing (Dependency-free) ---
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log("Loading .env file...");
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        // Match KEY=VALUE, ignoring comments #
        const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    });
} else {
    // console.log("No .env file found.");
}

// Pterodactyl puts the assigned port in SERVER_PORT or PORT
const PORT = process.env.SERVER_PORT || process.env.PORT || 14105;
const FILE_PATH = path.join(__dirname, 'data.json'); 

// Check for Token
if (!process.env.GITHUB_TOKEN) {
    console.warn("WARNING: GITHUB_TOKEN is missing. Data generation might hit rate limits.");
}

// --- Scheduler Logic ---
function runGenerator() {
    console.log(`[${new Date().toISOString()}] Starting data generation...`);
    
    // Assumes generate-data.js is in the same directory
    // Inherits process.env (so GITHUB_TOKEN is passed down)
    const genScript = path.join(__dirname, 'generate-data.js');
    
    exec(`node "${genScript}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Generation Error: ${error.message}`);
            return;
        }
        if (stderr) console.error(`Generation Stderr: ${stderr}`);
        console.log(`Generation Output: ${stdout.trim()}`);
    });
}

// --- Precise Scheduler Logic ---
function scheduleNextRun() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // Calculate minutes to next 5-minute mark
    // Example: currently 12:03:30. Next mark is 12:05:00.
    // remainder 3. 5 - 3 = 2 minutes. difference.
    // We want to land on (minutes % 5 === 0)
    
    // Next mark minute:
    const nextMarkMinute = Math.ceil((minutes + 1) / 5) * 5;
    const diffMinutes = nextMarkMinute - minutes;
    
    // Total delay in ms
    // (minutes diff * 60 * 1000) - (current seconds * 1000) - milliseconds
    // Easier: Create date object for target time
    const target = new Date(now);
    target.setMinutes(nextMarkMinute);
    target.setSeconds(0);
    target.setMilliseconds(0);
    
    let delay = target.getTime() - now.getTime();
    
    // Safety check: if delay is somehow negative or 0 (shouldn't be with +1 logic), run in 5 mins
    if (delay <= 0) delay = 5 * 60 * 1000;
    
    console.log(`[Scheduler] Next run scheduled at ${target.toLocaleTimeString()} (in ${Math.round(delay/1000)}s)`);
    
    setTimeout(() => {
        runGenerator();
        scheduleNextRun(); // Recurse
    }, delay);
}

// Run immediately on start
runGenerator();
// Start the aligned scheduler
scheduleNextRun();


// --- Web Server Logic ---
const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    fs.readFile(FILE_PATH, (err, data) => { 
        if (err) {
            console.error('Read Error:', err);
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Data not waiting or generated yet.' }));
            return;
        }
        res.writeHead(200);
        res.end(data);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}/`);
    console.log(`Serving data.json with CORS enabled.`);
    console.log(`Internal Scheduler: Running generate-data.js every 1 minute.`);
});
