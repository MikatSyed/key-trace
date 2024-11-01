import { app, BrowserWindow, ipcMain } from 'electron';
import { activeWindow } from 'active-win';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
const dataFilePath = path.join(__dirname, 'activityData.json');

// Initialize JSON data file if it doesn’t exist
function initializeDataFile() {
    if (!fs.existsSync(dataFilePath)) {
        const initialData = {
            mouse_clicks: 0,
            key_presses: 0,
            activity_log: []
        };
        fs.writeFileSync(dataFilePath, JSON.stringify(initialData, null, 2));
    }
}

// Helper function to read JSON data
function readDataFile() {
    const rawData = fs.readFileSync(dataFilePath);
    return JSON.parse(rawData);
}

// Helper function to write JSON data
function writeDataFile(data) {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

// Create the main application window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    });

    mainWindow.loadFile('index.html');

    mainWindow.webContents.on('did-finish-load', () => {
        // Send initial counts and activity log to renderer
        sendCountsToRenderer();
        sendActivityLogToRenderer();
    });
}

// Fetch active application and add it to activity log if needed
async function logActiveWindow() {
    const win = await activeWindow();
    if (win) {
        const { owner: { name }, title } = win;

        // Format timestamp to a readable format
        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const data = readDataFile();
        data.activity_log.unshift({ timestamp, app_name: name, window_title: title });
        writeDataFile(data);
        sendActivityLogToRenderer();
    }
}

// Send recent activity log to the renderer
function sendActivityLogToRenderer() {
    const data = readDataFile();
    mainWindow.webContents.send('updateActivityLog', data.activity_log.slice(0, 10));
}

// Handle mouse click updates from the renderer
ipcMain.on('mouseClick', async () => {
    const data = readDataFile();
    data.mouse_clicks += 1;
    writeDataFile(data);
    sendCountsToRenderer();
    await logActiveWindow();
});

// Handle key press updates from the renderer
ipcMain.on('keyPress', async () => {
    const data = readDataFile();
    data.key_presses += 1;
    writeDataFile(data);
    sendCountsToRenderer();
    await logActiveWindow();
});

// Send counts to the renderer
function sendCountsToRenderer() {
    const data = readDataFile();
    mainWindow.webContents.send('updateCounts', {
        mouse_clicks: data.mouse_clicks,
        key_presses: data.key_presses,
    });
}

// Clear logs on request from renderer
ipcMain.on('clearLogs', () => {
    const data = readDataFile();
    data.activity_log = [];
    writeDataFile(data);
    sendActivityLogToRenderer();
});

// Application event listeners
app.whenReady().then(() => {
    initializeDataFile();
    createWindow();
});

// Handle all windows closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Recreate a window in the app when the dock icon is clicked in macOS
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
