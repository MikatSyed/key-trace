const { ipcRenderer } = require('electron');

// Update counts on the UI
ipcRenderer.on('updateCounts', (event, counts) => {
  document.getElementById('mouseClickCount').innerText = counts.mouse_clicks;
  document.getElementById('keyPressCount').innerText = counts.key_presses;
});

// Update activity log
ipcRenderer.on('updateActivityLog', (event, logs) => {
  const logTable = document.getElementById('activityLog').getElementsByTagName('tbody')[0];
  logTable.innerHTML = '';
  logs.forEach(log => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${log.timestamp}</td><td>${log.app_name}</td><td>${log.window_title}</td>`;
    logTable.appendChild(row);
  });
});

// Clear logs on button click
function clearLogs() {
  ipcRenderer.send('clearLogs');
}
