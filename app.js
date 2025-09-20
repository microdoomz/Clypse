// Simple Clypse Application - NO over-engineering, just basic functionality that works

// Global variables
let currentRoom = null;
let pollInterval = null;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Clypse loading...');
    
    // Check URL parameters for auto-fill
    checkURLParameters();
    
    // Setup file upload
    setupFileUpload();
    
    // Load existing files
    loadFiles();
    
    console.log('Clypse loaded successfully');
});

// Check URL parameters and auto-fill codes
function checkURLParameters() {
    const params = new URLSearchParams(window.location.search);
    
    // File sharing auto-fill
    if (params.has('file')) {
        const code = params.get('file');
        document.getElementById('accessCode').value = code;
        switchTab('files');
        showNotification('File code auto-filled from URL', 'info');
    }
    
    // Room sharing auto-fill
    if (params.has('room')) {
        const code = params.get('room');
        document.getElementById('joinCode').value = code;
        switchTab('clipboard');
        showNotification('Room code auto-filled from URL', 'info');
    }
}

// Tab switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Hide all nav tabs
    document.querySelectorAll('.nav-tab').forEach(nav => {
        nav.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Highlight nav tab
    event.target.classList.add('active');
    
    // Load clipboard messages if switching to clipboard
    if (tabName === 'clipboard' && currentRoom) {
        loadMessages();
    }
}

// Generate simple 4-digit code
function generateCode() {
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    return code;
}

// === FILE SHARING ===

// Setup file upload
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', handleFileSelect);
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        showNotification('File too large! Maximum 2GB allowed.', 'error');
        return;
    }
    
    uploadFile(file);
}

// Upload file to localStorage
function uploadFile(file) {
    const code = generateCode();
    
    showNotification('Uploading file...', 'info');
    showProgress(0);
    
    // Convert file to base64
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const fileData = {
                code: code,
                name: file.name,
                size: formatFileSize(file.size),
                data: e.target.result,
                uploadTime: new Date().toISOString(),
                type: file.type
            };
            
            // Store in localStorage
            localStorage.setItem('clypse_file_' + code, JSON.stringify(fileData));
            
            // Add to files list
            addToFilesList(fileData);
            
            // Show share URL
            const shareURL = shareFile(code);
            showNotification(`File uploaded! Share URL: ${shareURL}`, 'success');
            
            hideProgress();
            
            // Clear file input
            document.getElementById('fileInput').value = '';
            
        } catch (error) {
            console.error('Upload error:', error);
            showNotification('Upload failed: ' + error.message, 'error');
            hideProgress();
        }
    };
    
    reader.onerror = function() {
        showNotification('Failed to read file', 'error');
        hideProgress();
    };
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 10;
        showProgress(progress);
        if (progress >= 90) {
            clearInterval(progressInterval);
        }
    }, 100);
    
    reader.readAsDataURL(file);
}

// Generate shareable URL for file
function shareFile(code) {
    return `${window.location.origin}${window.location.pathname}?file=${code}`;
}

// Access file with code
function accessFile() {
    const code = document.getElementById('accessCode').value.trim().toUpperCase();
    
    if (!code || code.length !== 4) {
        showNotification('Please enter a valid 4-digit code', 'error');
        return;
    }
    
    // Look for file in localStorage
    const fileData = localStorage.getItem('clypse_file_' + code);
    
    if (!fileData) {
        showNotification('File not found with code: ' + code, 'error');
        return;
    }
    
    try {
        const file = JSON.parse(fileData);
        downloadFile(file);
        document.getElementById('accessCode').value = '';
    } catch (error) {
        showNotification('Error accessing file: ' + error.message, 'error');
    }
}

// Download file
function downloadFile(fileData) {
    try {
        // Create download link
        const link = document.createElement('a');
        link.href = fileData.data;
        link.download = fileData.name;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Downloading: ' + fileData.name, 'success');
        
    } catch (error) {
        showNotification('Download failed: ' + error.message, 'error');
    }
}

// Load and display files
function loadFiles() {
    const filesList = document.getElementById('filesList');
    filesList.innerHTML = '';
    
    let hasFiles = false;
    
    // Check all localStorage keys for files
    for (let key in localStorage) {
        if (key.startsWith('clypse_file_')) {
            try {
                const fileData = JSON.parse(localStorage.getItem(key));
                addToFilesList(fileData);
                hasFiles = true;
            } catch (error) {
                console.error('Error loading file:', error);
            }
        }
    }
    
    if (!hasFiles) {
        filesList.innerHTML = '<p class="empty-state">No files uploaded yet</p>';
    }
}

// Add file to files list
function addToFilesList(fileData) {
    const filesList = document.getElementById('filesList');
    
    // Remove empty state
    const emptyState = filesList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    const fileElement = document.createElement('div');
    fileElement.className = 'file-item';
    fileElement.innerHTML = `
        <div class="file-info">
            <div class="file-name">${fileData.name}</div>
            <div class="file-meta">${fileData.size} • ${formatTime(fileData.uploadTime)}</div>
        </div>
        <div class="file-code" onclick="copyCode('${fileData.code}')" title="Click to copy code">
            ${fileData.code}
        </div>
    `;
    
    fileElement.addEventListener('click', function() {
        downloadFile(fileData);
    });
    
    filesList.prepend(fileElement);
}

// Copy file code to clipboard
function copyCode(code) {
    event.stopPropagation();
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
            showNotification('Code copied: ' + code, 'success');
        });
    } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Code copied: ' + code, 'success');
    }
}

// === CLIPBOARD SHARING ===

// Create new room
function createRoom() {
    const code = generateCode();
    document.getElementById('joinCode').value = code;
    joinRoom();
}

// Join room
function joinRoom() {
    const code = document.getElementById('joinCode').value.trim().toUpperCase();
    
    if (!code || code.length !== 4) {
        showNotification('Please enter a valid 4-digit room code', 'error');
        return;
    }
    
    // Leave current room
    if (currentRoom) {
        leaveRoom();
    }
    
    currentRoom = code;
    
    // Show room status
    document.getElementById('roomStatus').classList.remove('hidden');
    document.getElementById('currentRoomCode').textContent = code;
    
    // Enable clipboard
    const clipboardContent = document.getElementById('clipboardContent');
    clipboardContent.disabled = false;
    clipboardContent.placeholder = 'Type or paste content to share...';
    
    // Enable buttons
    document.getElementById('copyBtn').disabled = false;
    document.getElementById('clearBtn').disabled = false;
    
    // Load current content
    loadClipboardContent();
    
    // Start polling
    startPolling();
    
    // Load messages
    loadMessages();
    
    showNotification('Joined room: ' + code, 'success');
}

// Leave current room
function leaveRoom() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
    
    currentRoom = null;
    
    // Hide room status
    document.getElementById('roomStatus').classList.add('hidden');
    
    // Disable clipboard
    const clipboardContent = document.getElementById('clipboardContent');
    clipboardContent.disabled = true;
    clipboardContent.value = '';
    clipboardContent.placeholder = 'Join a room to start sharing...';
    
    // Disable buttons
    document.getElementById('copyBtn').disabled = true;
    document.getElementById('clearBtn').disabled = true;
    
    // Clear messages
    document.getElementById('messageList').innerHTML = '<p class="empty-state">Join a room to see messages</p>';
}

// Copy room link
function copyRoomLink() {
    if (!currentRoom) return;
    
    const roomURL = shareRoom(currentRoom);
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(roomURL).then(() => {
            showNotification('Room link copied!', 'success');
        });
    } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = roomURL;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Room link copied!', 'success');
    }
}

// Generate shareable URL for room
function shareRoom(code) {
    return `${window.location.origin}${window.location.pathname}?room=${code}`;
}

// Load clipboard content
function loadClipboardContent() {
    if (!currentRoom) return;
    
    const content = localStorage.getItem('clypse_clipboard_' + currentRoom) || '';
    document.getElementById('clipboardContent').value = content;
}

// Start polling for changes
function startPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
    }
    
    pollInterval = setInterval(() => {
        if (currentRoom) {
            loadClipboardContent();
            loadMessages();
        }
    }, 2000); // Poll every 2 seconds
}

// Handle clipboard content changes
document.addEventListener('DOMContentLoaded', function() {
    const clipboardContent = document.getElementById('clipboardContent');
    if (clipboardContent) {
        clipboardContent.addEventListener('input', function() {
            if (currentRoom) {
                const content = this.value;
                localStorage.setItem('clypse_clipboard_' + currentRoom, content);
                
                // Add to message history if substantial content
                if (content.trim() && content.trim().length > 2) {
                    addMessage(content.trim());
                }
            }
        });
    }
});

// Copy to system clipboard
function copyToSystemClipboard() {
    const content = document.getElementById('clipboardContent').value;
    
    if (!content.trim()) {
        showNotification('No content to copy', 'error');
        return;
    }
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(content).then(() => {
            showNotification('Copied to system clipboard!', 'success');
        });
    } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Copied to system clipboard!', 'success');
    }
}

// Clear clipboard
function clearClipboard() {
    if (currentRoom) {
        document.getElementById('clipboardContent').value = '';
        localStorage.setItem('clypse_clipboard_' + currentRoom, '');
        showNotification('Clipboard cleared', 'info');
    }
}

// Add message to history
function addMessage(content) {
    if (!currentRoom || !content.trim()) return;
    
    const messagesKey = 'clypse_messages_' + currentRoom;
    let messages = [];
    
    try {
        messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
    } catch (error) {
        messages = [];
    }
    
    // Avoid duplicates
    if (messages.length > 0 && messages[0].content === content) {
        return;
    }
    
    const message = {
        content: content,
        time: new Date().toISOString(),
        id: Date.now()
    };
    
    messages.unshift(message);
    
    // Keep only last 50 messages
    if (messages.length > 50) {
        messages = messages.slice(0, 50);
    }
    
    localStorage.setItem(messagesKey, JSON.stringify(messages));
}

// Load and display messages
function loadMessages() {
    if (!currentRoom) return;
    
    const messageList = document.getElementById('messageList');
    const messagesKey = 'clypse_messages_' + currentRoom;
    
    let messages = [];
    try {
        messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
    } catch (error) {
        messages = [];
    }
    
    if (messages.length === 0) {
        messageList.innerHTML = '<p class="empty-state">No messages yet</p>';
        return;
    }
    
    messageList.innerHTML = messages.map(message => `
        <div class="message-item">
            <div class="message-content">${escapeHtml(message.content)}</div>
            <div class="message-time">${formatTime(message.time)}</div>
        </div>
    `).join('');
}

// === UTILITY FUNCTIONS ===

// Show progress bar
function showProgress(percent) {
    const progressBar = document.getElementById('uploadProgress');
    const progressFill = progressBar.querySelector('.progress-fill');
    const progressText = progressBar.querySelector('.progress-text');
    
    progressBar.classList.remove('hidden');
    progressFill.style.width = percent + '%';
    progressText.textContent = `Uploading... ${percent}%`;
}

// Hide progress bar
function hideProgress() {
    setTimeout(() => {
        document.getElementById('uploadProgress').classList.add('hidden');
    }, 500);
}

// Show notification
function showNotification(message, type = 'info') {
    const notifications = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notifications.appendChild(notification);
    
    // Auto remove after 15 seconds (as requested)
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 15000);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format time
function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Enter key in code inputs
    if (e.key === 'Enter') {
        if (e.target.id === 'accessCode') {
            accessFile();
        } else if (e.target.id === 'joinCode') {
            joinRoom();
        }
    }
    
    // Auto-uppercase and limit code inputs
    if (e.target.id === 'accessCode' || e.target.id === 'joinCode') {
        setTimeout(() => {
            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (value.length > 4) value = value.substring(0, 4);
            e.target.value = value;
        }, 0);
    }
});

console.log('Clypse JavaScript loaded - Simple version that actually works!');