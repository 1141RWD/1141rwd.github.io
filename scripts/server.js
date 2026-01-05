const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

// Run immediately on start
runGenerator();

// Run every 1 minute (60 * 1000 ms)
setInterval(runGenerator, 60 * 1000); // 1 minute interval


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
