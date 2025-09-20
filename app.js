// DeviceShare Application JavaScript

class DeviceShareApp {
    constructor() {
        this.files = JSON.parse(localStorage.getItem('deviceShareFiles')) || [];
        this.clipboardHistory = JSON.parse(localStorage.getItem('clipboardHistory')) || [];
        this.currentRoom = null;
        this.connectedDevices = ['Desktop', 'Mobile'];
        this.websocketConnected = true;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.setupWebSocketSimulation();
        this.renderFiles();
        this.renderClipboardHistory();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Code access
        document.getElementById('accessBtn').addEventListener('click', this.accessFile.bind(this));
        document.getElementById('accessCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.accessFile();
        });

        // Clipboard room management
        document.getElementById('joinRoomBtn').addEventListener('click', this.joinRoom.bind(this));
        document.getElementById('createRoomBtn').addEventListener('click', this.createRoom.bind(this));
        document.getElementById('roomCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        // Clipboard actions
        document.getElementById('copyBtn').addEventListener('click', this.copyToClipboard.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clearClipboard.bind(this));
        document.getElementById('clipboardInput').addEventListener('input', this.handleClipboardInput.bind(this));

        // Modal
        document.getElementById('modalClose').addEventListener('click', this.closeModal.bind(this));
        document.getElementById('modalOverlay').addEventListener('click', this.closeModal.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    loadInitialData() {
        // Load sample data if no files exist
        if (this.files.length === 0) {
            this.files = [
                {
                    code: "A7K9",
                    fileName: "presentation.pptx",
                    size: "2.5MB",
                    uploadTime: this.getRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000)),
                    downloadUrl: "https://file.io/abc123",
                    id: this.generateId()
                },
                {
                    code: "M3X8",
                    fileName: "project-files.zip",
                    size: "15.2MB",
                    uploadTime: this.getRelativeTime(new Date(Date.now() - 24 * 60 * 60 * 1000)),
                    downloadUrl: "https://file.io/def456",
                    id: this.generateId()
                }
            ];
            this.saveFiles();
        }

        // Load sample clipboard history
        if (this.clipboardHistory.length === 0) {
            this.clipboardHistory = [
                {
                    id: "1",
                    content: "Meeting at 3 PM today in the conference room",
                    timestamp: this.getRelativeTime(new Date(Date.now() - 2 * 60 * 1000)),
                    type: "text",
                    deviceSource: "Desktop"
                },
                {
                    id: "2",
                    content: "https://github.com/user/project-repo",
                    timestamp: this.getRelativeTime(new Date(Date.now() - 5 * 60 * 1000)),
                    type: "url",
                    deviceSource: "Mobile"
                }
            ];
            this.saveClipboardHistory();
        }
    }

    setupWebSocketSimulation() {
        // Simulate WebSocket connection status
        setInterval(() => {
            this.updateConnectionStatus();
        }, 5000);

        // Simulate clipboard sync from other devices
        if (this.currentRoom) {
            setInterval(() => {
                if (Math.random() < 0.1) { // 10% chance every 3 seconds
                    this.simulateIncomingClipboard();
                }
            }, 3000);
        }
    }

    // Tab Management
    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    // File Upload Management
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.uploadFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.uploadFiles(files);
    }

    async uploadFiles(files) {
        for (const file of files) {
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const code = this.generateFileCode();
        
        // Show upload progress
        this.showUploadProgress();
        
        // Simulate upload process
        for (let progress = 0; progress <= 100; progress += 10) {
            await this.delay(100);
            this.updateUploadProgress(progress, file.name);
        }

        // Add file to storage
        const fileData = {
            id: this.generateId(),
            code: code,
            fileName: file.name,
            size: this.formatFileSize(file.size),
            uploadTime: this.getRelativeTime(new Date()),
            downloadUrl: `https://file.io/${this.generateId()}`
        };

        this.files.unshift(fileData);
        this.saveFiles();
        this.renderFiles();
        this.hideUploadProgress();

        // Show success notification with code
        this.showToast(`File uploaded! Code: ${code}`, 'success');
    }

    showUploadProgress() {
        document.getElementById('uploadProgress').classList.remove('hidden');
    }

    hideUploadProgress() {
        document.getElementById('uploadProgress').classList.add('hidden');
    }

    updateUploadProgress(progress, fileName) {
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = 
            `Uploading ${fileName}... ${progress}%`;
    }

    accessFile() {
        const code = document.getElementById('accessCode').value.trim().toUpperCase();
        if (!code) {
            this.showToast('Please enter a 4-digit code', 'error');
            return;
        }

        const file = this.files.find(f => f.code === code);
        if (file) {
            this.showFileModal(file);
            document.getElementById('accessCode').value = '';
        } else {
            this.showToast('File not found with this code', 'error');
        }
    }

    showFileModal(file) {
        document.getElementById('modalTitle').textContent = file.fileName;
        document.getElementById('modalBody').innerHTML = `
            <div class="file-details">
                <div class="file-detail-item">
                    <strong>File Name:</strong> ${file.fileName}
                </div>
                <div class="file-detail-item">
                    <strong>Size:</strong> ${file.size}
                </div>
                <div class="file-detail-item">
                    <strong>Code:</strong> <code>${file.code}</code>
                </div>
                <div class="file-detail-item">
                    <strong>Uploaded:</strong> ${file.uploadTime}
                </div>
                <div class="file-actions-modal">
                    <button class="btn btn--primary btn--full-width" onclick="app.downloadFile('${file.id}')">
                        Download File
                    </button>
                    <button class="btn btn--secondary btn--full-width" onclick="app.copyFileCode('${file.code}')">
                        Copy Code
                    </button>
                </div>
            </div>
        `;
        document.getElementById('fileModal').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('fileModal').classList.add('hidden');
    }

    downloadFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            // Simulate download
            this.showToast(`Downloading ${file.fileName}...`, 'info');
            
            // In a real implementation, this would open the file.io URL
            setTimeout(() => {
                this.showToast('Download completed!', 'success');
                // Remove file after download (File.io behavior)
                this.files = this.files.filter(f => f.id !== fileId);
                this.saveFiles();
                this.renderFiles();
                this.closeModal();
            }, 2000);
        }
    }

    copyFileCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            this.showToast(`Code ${code} copied to clipboard!`, 'success');
        }).catch(() => {
            this.showToast('Failed to copy code', 'error');
        });
    }

    // Clipboard Management
    createRoom() {
        const roomCode = `ROOM-${this.generateFileCode()}`;
        document.getElementById('roomCode').value = roomCode;
        this.joinRoom();
    }

    joinRoom() {
        const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
        if (!roomCode) {
            this.showToast('Please enter a room code', 'error');
            return;
        }

        this.currentRoom = roomCode;
        this.showRoomStatus();
        this.enableClipboard();
        this.showToast(`Joined room: ${roomCode}`, 'success');
        
        // Simulate other devices joining
        setTimeout(() => {
            this.connectedDevices = ['Desktop', 'Mobile', 'Tablet'];
            this.updateDevicesList();
        }, 2000);
    }

    showRoomStatus() {
        const roomStatus = document.getElementById('roomStatus');
        roomStatus.classList.remove('hidden');
        document.getElementById('currentRoom').textContent = this.currentRoom;
        this.updateDevicesList();
    }

    updateDevicesList() {
        document.getElementById('deviceCount').textContent = this.connectedDevices.length;
        document.getElementById('devicesList').textContent = 
            `(${this.connectedDevices.join(', ')})`;
    }

    enableClipboard() {
        const clipboardInput = document.getElementById('clipboardInput');
        const copyBtn = document.getElementById('copyBtn');
        const clearBtn = document.getElementById('clearBtn');

        clipboardInput.disabled = false;
        copyBtn.disabled = false;
        clearBtn.disabled = false;
    }

    handleClipboardInput(e) {
        if (!this.currentRoom) return;

        const content = e.target.value;
        if (content.trim()) {
            // Simulate sending to other devices
            this.addToClipboardHistory(content, 'text', 'Desktop');
            this.simulateClipboardSync(content);
        }
    }

    copyToClipboard() {
        const content = document.getElementById('clipboardInput').value;
        if (!content.trim()) {
            this.showToast('No content to copy', 'error');
            return;
        }

        navigator.clipboard.writeText(content).then(() => {
            this.showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy to clipboard', 'error');
        });
    }

    clearClipboard() {
        document.getElementById('clipboardInput').value = '';
        this.showToast('Clipboard cleared', 'info');
    }

    addToClipboardHistory(content, type, deviceSource) {
        const historyItem = {
            id: this.generateId(),
            content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            timestamp: this.getRelativeTime(new Date()),
            type: type,
            deviceSource: deviceSource
        };

        this.clipboardHistory.unshift(historyItem);
        
        // Keep only last 20 items
        if (this.clipboardHistory.length > 20) {
            this.clipboardHistory = this.clipboardHistory.slice(0, 20);
        }

        this.saveClipboardHistory();
        this.renderClipboardHistory();
    }

    simulateClipboardSync(content) {
        // Simulate receiving the content on other devices
        setTimeout(() => {
            this.showToast(`Synced to ${this.connectedDevices.length - 1} devices`, 'success');
        }, 500);
    }

    simulateIncomingClipboard() {
        const sampleContents = [
            'https://example.com/shared-link',
            'New message from teammate',
            'Conference call at 2 PM',
            'Don\'t forget to submit the report'
        ];
        
        const content = sampleContents[Math.floor(Math.random() * sampleContents.length)];
        const devices = ['Mobile', 'Tablet'];
        const device = devices[Math.floor(Math.random() * devices.length)];
        
        document.getElementById('clipboardInput').value = content;
        this.addToClipboardHistory(content, 'text', device);
        this.showToast(`New clipboard content from ${device}`, 'info');
    }

    // Rendering Methods
    renderFiles() {
        const filesList = document.getElementById('filesList');
        
        if (this.files.length === 0) {
            filesList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                        <polyline points="13,2 13,9 20,9"/>
                    </svg>
                    <p>No files shared yet</p>
                </div>
            `;
            return;
        }

        filesList.innerHTML = this.files.map(file => `
            <div class="file-item" tabindex="0" onclick="app.showFileModal(${JSON.stringify(file).replace(/"/g, '&quot;')})">
                <div class="file-info">
                    <div class="file-name">${file.fileName}</div>
                    <div class="file-meta">
                        <span>Size: ${file.size}</span>
                        <span>Uploaded: ${file.uploadTime}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <div class="file-code" onclick="event.stopPropagation(); app.copyFileCode('${file.code}')">
                        ${file.code}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderClipboardHistory() {
        const historyList = document.getElementById('historyList');
        
        if (this.clipboardHistory.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    </svg>
                    <p>No clipboard history yet</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = this.clipboardHistory.map(item => `
            <div class="history-item" onclick="app.copyHistoryItem('${item.id}')">
                <div class="history-content">${item.content}</div>
                <div class="history-meta">
                    <span class="history-type">
                        ${item.type === 'url' ? '🔗' : '📝'} ${item.type}
                    </span>
                    <span>${item.timestamp} • ${item.deviceSource}</span>
                </div>
            </div>
        `).join('');
    }

    copyHistoryItem(itemId) {
        const item = this.clipboardHistory.find(h => h.id === itemId);
        if (item) {
            navigator.clipboard.writeText(item.content).then(() => {
                this.showToast('Copied to clipboard!', 'success');
                document.getElementById('clipboardInput').value = item.content;
            }).catch(() => {
                this.showToast('Failed to copy to clipboard', 'error');
            });
        }
    }

    // Utility Methods
    generateFileCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Ensure uniqueness
        if (this.files.some(f => f.code === code)) {
            return this.generateFileCode();
        }
        
        return code;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getRelativeTime(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    saveFiles() {
        localStorage.setItem('deviceShareFiles', JSON.stringify(this.files));
    }

    saveClipboardHistory() {
        localStorage.setItem('clipboardHistory', JSON.stringify(this.clipboardHistory));
    }

    updateConnectionStatus() {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (this.websocketConnected) {
            statusDot.style.background = 'var(--color-success)';
            statusText.textContent = 'Connected';
        } else {
            statusDot.style.background = 'var(--color-error)';
            statusText.textContent = 'Disconnected';
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K to focus on file code input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('accessCode').focus();
        }
        
        // Escape to close modal
        if (e.key === 'Escape') {
            this.closeModal();
        }
    }
}

// Add slideOut animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .file-detail-item {
        margin-bottom: var(--space-12);
        padding-bottom: var(--space-8);
        border-bottom: 1px solid var(--color-border);
    }
    
    .file-detail-item:last-child {
        border-bottom: none;
    }
    
    .file-actions-modal {
        display: flex;
        flex-direction: column;
        gap: var(--space-12);
        margin-top: var(--space-16);
    }
`;
document.head.appendChild(style);

// Initialize the application
const app = new DeviceShareApp();

// Service Worker registration for PWA functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // In a real app, you'd register a service worker here
        console.log('DeviceShare app loaded successfully');
    });
}