// Clypse Application - Cross-Device File & Clipboard Sharing

class Clypse {
    constructor() {
        // Configuration from provided data
        this.config = {
            fileIoAPI: 'https://file.io/',
            maxFileSize: 2147483648, // 2GB
            codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // Excluding confusing chars like O, I, 0, 1
            codeLength: 4,
            storageKeys: {
                files: 'clypse_files',
                clipboard: 'clypse_clipboard_',
                theme: 'clypse_theme',
                deviceId: 'clypse_device_id'
            },
            pollInterval: 1000, // 1 second for clipboard polling
            heartbeatInterval: 5000, // 5 seconds for device heartbeat
            maxDeviceInactivity: 30000 // 30 seconds before device considered inactive
        };

        // Initialize empty arrays (no fake data)
        this.files = this.loadFiles();
        this.currentRoom = null;
        this.deviceId = this.getOrCreateDeviceId();
        this.clipboardPollTimer = null;
        this.heartbeatTimer = null;
        
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupApplication();
            });
        } else {
            this.setupApplication();
        }
    }

    setupApplication() {
        this.setupTheme();
        this.setupEventListeners();
        this.renderFiles();
        this.renderClipboardHistory();
        this.updateConnectionStatus();
    }

    // Theme Management
    setupTheme() {
        const savedTheme = localStorage.getItem(this.config.storageKeys.theme);
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const theme = savedTheme || systemTheme;
        
        this.setTheme(theme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.config.storageKeys.theme)) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.config.storageKeys.theme, theme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        this.showToast(`Switched to ${newTheme} mode`, 'info');
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Tab navigation - Fixed to handle clicks on child elements
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Find the actual tab button even if user clicked on child element
                const tabButton = e.target.closest('.nav-tab');
                if (tabButton && tabButton.dataset.tab) {
                    this.switchTab(tabButton.dataset.tab);
                }
            });
        });

        // File upload - Fixed event binding with proper file input setup
        this.setupFileUpload();

        // Code access - Fixed input handling
        const accessBtn = document.getElementById('accessBtn');
        const accessCode = document.getElementById('accessCode');
        
        if (accessBtn) {
            accessBtn.addEventListener('click', () => this.accessFile());
        }
        
        if (accessCode) {
            // Ensure input works by removing any conflicting attributes
            accessCode.removeAttribute('readonly');
            accessCode.removeAttribute('disabled');
            
            accessCode.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.accessFile();
                }
            });
            
            // Force uppercase and limit to 4 chars
            accessCode.addEventListener('input', (e) => {
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length > 4) value = value.substring(0, 4);
                e.target.value = value;
            });
        }

        // Clipboard room management - Fixed button handlers and input field
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        const createRoomBtn = document.getElementById('createRoomBtn');
        const roomCode = document.getElementById('roomCode');
        
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', () => this.joinRoom());
        }
        
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.createRoom();
            });
        }
        
        if (roomCode) {
            // Ensure room code input works - remove all blocking attributes
            roomCode.removeAttribute('readonly');
            roomCode.removeAttribute('disabled');
            roomCode.style.pointerEvents = 'auto';
            roomCode.style.userSelect = 'text';
            
            // Clear any existing value and reset
            roomCode.value = '';
            roomCode.placeholder = 'Enter 4-digit code';
            
            roomCode.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.joinRoom();
                }
            });
            
            // Allow editing and force uppercase, limit to 4 chars
            roomCode.addEventListener('input', (e) => {
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length > 4) value = value.substring(0, 4);
                e.target.value = value;
            });
        }

        // Clipboard actions
        const copyBtn = document.getElementById('copyBtn');
        const clearBtn = document.getElementById('clearBtn');
        const clipboardInput = document.getElementById('clipboardInput');
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyToClipboard());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearClipboard());
        }
        
        if (clipboardInput) {
            clipboardInput.addEventListener('input', (e) => this.handleClipboardInput(e));
        }

        // Modal
        const modalClose = document.getElementById('modalClose');
        const modalOverlay = document.getElementById('modalOverlay');
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        if (!uploadArea || !fileInput) {
            console.error('Upload elements not found');
            return;
        }

        // Ensure file input is properly configured and visible for debugging
        fileInput.setAttribute('type', 'file');
        fileInput.setAttribute('multiple', 'true');
        fileInput.style.position = 'absolute';
        fileInput.style.left = '-9999px';
        fileInput.style.visibility = 'hidden';
        fileInput.style.opacity = '0';

        // Create a new file input to ensure it's fresh
        const newFileInput = document.createElement('input');
        newFileInput.type = 'file';
        newFileInput.multiple = true;
        newFileInput.style.position = 'absolute';
        newFileInput.style.left = '-9999px';
        newFileInput.style.visibility = 'hidden';
        newFileInput.style.opacity = '0';
        newFileInput.id = 'fileInputFresh';
        
        // Replace the old input
        fileInput.parentNode.replaceChild(newFileInput, fileInput);

        // Click handler for upload area - force file dialog
        uploadArea.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Upload area clicked'); // Debug
            
            // Create a temporary file input to ensure it works
            const tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.multiple = true;
            tempInput.style.display = 'none';
            
            tempInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    console.log('Files selected:', files); // Debug
                    this.uploadFiles(files);
                }
                document.body.removeChild(tempInput);
            });
            
            document.body.appendChild(tempInput);
            tempInput.click();
        });

        // Drag and drop handlers
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // File selection handler for the main input as backup
        newFileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.uploadFiles(files);
            }
        });
    }

    // Tab Management - Fixed to ensure proper switching
    switchTab(tabName) {
        console.log('Switching to tab:', tabName); // Debug log
        
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const activeContent = document.getElementById(`${tabName}Tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        // Re-render content when switching to clipboard tab
        if (tabName === 'clipboard') {
            this.renderClipboardHistory();
        }
    }

    // File Upload Management
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            console.log('Files dropped:', files); // Debug
            this.uploadFiles(files);
        }
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.uploadFiles(files);
        }
        e.target.value = ''; // Clear input
    }

    async uploadFiles(files) {
        console.log('Uploading files:', files); // Debug
        for (const file of files) {
            if (file.size > this.config.maxFileSize) {
                this.showToast(`File ${file.name} is too large (max 2GB)`, 'error');
                continue;
            }
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const code = this.generateCode();
        console.log('Uploading file:', file.name, 'with code:', code); // Debug
        
        try {
            this.showUploadProgress();
            
            // Create FormData for File.io API
            const formData = new FormData();
            formData.append('file', file);

            // Make actual HTTP request to File.io
            const response = await fetch(this.config.fileIoAPI, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error('Upload failed: File.io returned error');
            }

            // Store file mapping
            const fileData = {
                id: this.generateId(),
                code: code,
                fileName: file.name,
                size: this.formatFileSize(file.size),
                uploadTime: new Date().toISOString(),
                downloadUrl: data.link,
                fileKey: data.key || null
            };

            this.files.unshift(fileData);
            this.saveFiles();
            this.renderFiles();
            this.hideUploadProgress();

            this.showToast(`File uploaded! Code: ${code}`, 'success');
            
        } catch (error) {
            console.error('Upload error:', error);
            this.hideUploadProgress();
            this.showToast(`Upload failed: ${error.message}`, 'error');
        }
    }

    showUploadProgress() {
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) {
            uploadProgress.classList.remove('hidden');
            
            // Simulate progress for visual feedback
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 20;
                if (progress > 90) progress = 90;
                this.updateUploadProgress(progress);
            }, 200);
            
            // Store interval to clear it later
            this.uploadProgressInterval = interval;
        }
    }

    hideUploadProgress() {
        if (this.uploadProgressInterval) {
            clearInterval(this.uploadProgressInterval);
        }
        this.updateUploadProgress(100);
        setTimeout(() => {
            const uploadProgress = document.getElementById('uploadProgress');
            if (uploadProgress) {
                uploadProgress.classList.add('hidden');
            }
        }, 500);
    }

    updateUploadProgress(progress) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Uploading... ${Math.round(progress)}%`;
        }
    }

    accessFile() {
        const accessCodeInput = document.getElementById('accessCode');
        if (!accessCodeInput) return;
        
        const code = accessCodeInput.value.trim().toUpperCase();
        if (!code || code.length !== 4) {
            this.showToast('Please enter a valid 4-digit code', 'error');
            return;
        }

        const file = this.files.find(f => f.code === code);
        if (file) {
            this.showFileModal(file);
            accessCodeInput.value = '';
        } else {
            this.showToast('No file found with this code', 'error');
        }
    }

    showFileModal(file) {
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalOverlay = document.getElementById('modalOverlay');
        
        if (!modalTitle || !modalBody || !modalOverlay) return;
        
        modalTitle.textContent = file.fileName;
        modalBody.innerHTML = `
            <div class="file-details">
                <div class="file-detail-item">
                    <strong>File Name:</strong> <span>${file.fileName}</span>
                </div>
                <div class="file-detail-item">
                    <strong>Size:</strong> <span>${file.size}</span>
                </div>
                <div class="file-detail-item">
                    <strong>Code:</strong> <code>${file.code}</code>
                </div>
                <div class="file-detail-item">
                    <strong>Uploaded:</strong> <span>${this.getRelativeTime(new Date(file.uploadTime))}</span>
                </div>
                <div class="file-actions-modal">
                    <button class="access-button" style="width: 100%; margin-bottom: 12px;" onclick="clypse.downloadFile('${file.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download File
                    </button>
                    <button class="create-room-button" style="width: 100%;" onclick="clypse.copyFileCode('${file.code}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy Code
                    </button>
                </div>
            </div>
        `;
        modalOverlay.classList.remove('hidden');
    }

    closeModal() {
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.classList.add('hidden');
        }
    }

    async downloadFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        try {
            // Create a download link and trigger it
            const link = document.createElement('a');
            link.href = file.downloadUrl;
            link.download = file.fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showToast(`Downloading ${file.fileName}...`, 'info');
            this.closeModal();

            // File.io deletes files after download, so remove from our storage
            setTimeout(() => {
                this.files = this.files.filter(f => f.id !== fileId);
                this.saveFiles();
                this.renderFiles();
                this.showToast('File downloaded successfully!', 'success');
            }, 2000);

        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Download failed', 'error');
        }
    }

    async copyFileCode(code) {
        try {
            await navigator.clipboard.writeText(code);
            this.showToast(`Code ${code} copied to clipboard!`, 'success');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast(`Code ${code} copied to clipboard!`, 'success');
        }
    }

    // Clipboard Management - Fixed to properly switch tabs and create rooms
    createRoom() {
        const roomCode = this.generateCode();
        const roomCodeInput = document.getElementById('roomCode');
        
        // Switch to clipboard tab first
        this.switchTab('clipboard');
        
        // Small delay to ensure tab switch, then set room code
        setTimeout(() => {
            if (roomCodeInput) {
                // Clear any existing value first
                roomCodeInput.value = '';
                // Set the new room code
                roomCodeInput.value = roomCode;
                // Enable the input if it was disabled
                roomCodeInput.removeAttribute('readonly');
                roomCodeInput.removeAttribute('disabled');
            }
            
            // Join the room
            this.joinRoom();
        }, 100);
    }

    joinRoom() {
        const roomCodeInput = document.getElementById('roomCode');
        if (!roomCodeInput) return;
        
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        if (!roomCode || roomCode.length !== 4) {
            this.showToast('Please enter a valid 4-digit room code', 'error');
            return;
        }

        // Leave current room if any
        if (this.currentRoom) {
            this.leaveRoom();
        }

        this.currentRoom = roomCode;
        this.showRoomStatus();
        this.enableClipboard();
        this.startClipboardSync();
        this.startHeartbeat();

        this.showToast(`Joined room: ${roomCode}`, 'success');
    }

    leaveRoom() {
        if (this.clipboardPollTimer) {
            clearInterval(this.clipboardPollTimer);
        }
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        
        // Remove device from room
        if (this.currentRoom) {
            const deviceKey = `${this.config.storageKeys.clipboard}${this.currentRoom}_devices`;
            const devices = JSON.parse(localStorage.getItem(deviceKey) || '{}');
            delete devices[this.deviceId];
            localStorage.setItem(deviceKey, JSON.stringify(devices));
        }
    }

    showRoomStatus() {
        const roomStatus = document.getElementById('roomStatus');
        const currentRoom = document.getElementById('currentRoom');
        
        if (roomStatus && currentRoom) {
            roomStatus.classList.remove('hidden');
            currentRoom.textContent = this.currentRoom;
            this.updateDeviceCount();
        }
    }

    enableClipboard() {
        const clipboardInput = document.getElementById('clipboardInput');
        const copyBtn = document.getElementById('copyBtn');
        const clearBtn = document.getElementById('clearBtn');

        if (clipboardInput) {
            clipboardInput.disabled = false;
            clipboardInput.placeholder = 'Type or paste content to sync across devices...';
            
            // Load current clipboard content for this room
            const clipboardKey = `${this.config.storageKeys.clipboard}${this.currentRoom}`;
            const currentContent = localStorage.getItem(clipboardKey) || '';
            clipboardInput.value = currentContent;
        }

        if (copyBtn) copyBtn.disabled = false;
        if (clearBtn) clearBtn.disabled = false;
    }

    startClipboardSync() {
        const clipboardKey = `${this.config.storageKeys.clipboard}${this.currentRoom}`;
        const clipboardInput = document.getElementById('clipboardInput');
        
        if (!clipboardInput) return;
        
        let lastContent = clipboardInput.value;

        this.clipboardPollTimer = setInterval(() => {
            // Check for changes from other devices
            const currentContent = localStorage.getItem(clipboardKey) || '';
            if (currentContent !== lastContent && currentContent !== clipboardInput.value) {
                clipboardInput.value = currentContent;
                this.addToClipboardHistory(currentContent);
                lastContent = currentContent;
            }
        }, this.config.pollInterval);
    }

    startHeartbeat() {
        const deviceKey = `${this.config.storageKeys.clipboard}${this.currentRoom}_devices`;
        
        // Send initial heartbeat
        this.sendHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
            this.updateDeviceCount();
        }, this.config.heartbeatInterval);
    }

    sendHeartbeat() {
        const deviceKey = `${this.config.storageKeys.clipboard}${this.currentRoom}_devices`;
        const devices = JSON.parse(localStorage.getItem(deviceKey) || '{}');
        devices[this.deviceId] = {
            timestamp: Date.now(),
            name: this.getDeviceName()
        };
        localStorage.setItem(deviceKey, JSON.stringify(devices));
    }

    updateDeviceCount() {
        const deviceCountEl = document.getElementById('deviceCount');
        if (!deviceCountEl) return;
        
        const deviceKey = `${this.config.storageKeys.clipboard}${this.currentRoom}_devices`;
        const devices = JSON.parse(localStorage.getItem(deviceKey) || '{}');
        const now = Date.now();
        
        // Filter out inactive devices
        const activeDevices = Object.entries(devices).filter(([id, device]) => 
            now - device.timestamp < this.config.maxDeviceInactivity
        );

        deviceCountEl.textContent = activeDevices.length;
    }

    handleClipboardInput(e) {
        if (!this.currentRoom) return;

        const content = e.target.value;
        const clipboardKey = `${this.config.storageKeys.clipboard}${this.currentRoom}`;
        
        // Update storage for other devices
        localStorage.setItem(clipboardKey, content);
        
        // Add to history if it's substantial content
        if (content.trim() && content.length > 3) {
            this.addToClipboardHistory(content.trim());
        }
    }

    async copyToClipboard() {
        const clipboardInput = document.getElementById('clipboardInput');
        if (!clipboardInput) return;
        
        const content = clipboardInput.value;
        if (!content.trim()) {
            this.showToast('No content to copy', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(content);
            this.showToast('Copied to system clipboard!', 'success');
        } catch (error) {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Copied to system clipboard!', 'success');
        }
    }

    clearClipboard() {
        const clipboardInput = document.getElementById('clipboardInput');
        if (clipboardInput) {
            clipboardInput.value = '';
        }
        
        if (this.currentRoom) {
            const clipboardKey = `${this.config.storageKeys.clipboard}${this.currentRoom}`;
            localStorage.setItem(clipboardKey, '');
        }
        this.showToast('Clipboard cleared', 'info');
    }

    addToClipboardHistory(content) {
        if (!content || content.length < 4) return;
        
        const historyKey = `clypse_clipboard_history_${this.currentRoom}`;
        let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        // Avoid duplicates
        if (history.some(item => item.content === content)) return;
        
        const historyItem = {
            id: this.generateId(),
            content: content.substring(0, 200), // Limit content length
            timestamp: new Date().toISOString(),
            deviceSource: this.getDeviceName()
        };

        history.unshift(historyItem);
        
        // Keep only last 50 items
        if (history.length > 50) {
            history = history.slice(0, 50);
        }

        localStorage.setItem(historyKey, JSON.stringify(history));
        this.renderClipboardHistory();
    }

    // Rendering Methods
    renderFiles() {
        const filesList = document.getElementById('filesList');
        if (!filesList) return;
        
        if (this.files.length === 0) {
            filesList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                        <polyline points="13,2 13,9 20,9"/>
                    </svg>
                    <p>No files uploaded yet</p>
                    <p style="font-size: 0.875rem; margin-top: 8px;">Upload files to get started</p>
                </div>
            `;
            return;
        }

        filesList.innerHTML = this.files.map(file => `
            <div class="file-item" onclick="clypse.showFileModal(${JSON.stringify(file).replace(/"/g, '&quot;')})">
                <div class="file-info">
                    <div class="file-name">${file.fileName}</div>
                    <div class="file-meta">
                        <span>${file.size}</span>
                        <span>${this.getRelativeTime(new Date(file.uploadTime))}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <div class="file-code" onclick="event.stopPropagation(); clypse.copyFileCode('${file.code}')">
                        ${file.code}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        if (!historyList) return;
        
        if (!this.currentRoom) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    </svg>
                    <p>Join a room to see clipboard history</p>
                </div>
            `;
            return;
        }

        const historyKey = `clypse_clipboard_history_${this.currentRoom}`;
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    </svg>
                    <p>No clipboard history yet</p>
                    <p style="font-size: 0.875rem; margin-top: 8px;">Start typing to create history</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item" onclick="clypse.copyHistoryItem('${item.id}')">
                <div class="history-content">${item.content}</div>
                <div class="history-meta">
                    <span>${this.getRelativeTime(new Date(item.timestamp))}</span>
                    <span>${item.deviceSource}</span>
                </div>
            </div>
        `).join('');
    }

    async copyHistoryItem(itemId) {
        const historyKey = `clypse_clipboard_history_${this.currentRoom}`;
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        const item = history.find(h => h.id === itemId);
        
        if (item) {
            try {
                await navigator.clipboard.writeText(item.content);
                
                const clipboardInput = document.getElementById('clipboardInput');
                if (clipboardInput) {
                    clipboardInput.value = item.content;
                }
                
                // Update shared clipboard
                const clipboardKey = `${this.config.storageKeys.clipboard}${this.currentRoom}`;
                localStorage.setItem(clipboardKey, item.content);
                
                this.showToast('Copied to clipboard!', 'success');
            } catch (error) {
                this.showToast('Failed to copy', 'error');
            }
        }
    }

    // Utility Methods
    generateCode() {
        let code = '';
        for (let i = 0; i < this.config.codeLength; i++) {
            code += this.config.codeChars.charAt(Math.floor(Math.random() * this.config.codeChars.length));
        }
        
        // Ensure uniqueness for files
        if (this.files.some(f => f.code === code)) {
            return this.generateCode();
        }
        
        return code;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getOrCreateDeviceId() {
        let deviceId = localStorage.getItem(this.config.storageKeys.deviceId);
        if (!deviceId) {
            deviceId = this.generateId();
            localStorage.setItem(this.config.storageKeys.deviceId, deviceId);
        }
        return deviceId;
    }

    getDeviceName() {
        const userAgent = navigator.userAgent;
        if (/Mobile/.test(userAgent)) return 'Mobile';
        if (/Tablet/.test(userAgent)) return 'Tablet';
        if (/Mac/.test(userAgent)) return 'Mac';
        if (/Windows/.test(userAgent)) return 'Windows';
        return 'Desktop';
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
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    // Storage Methods
    loadFiles() {
        const stored = localStorage.getItem(this.config.storageKeys.files);
        return stored ? JSON.parse(stored) : [];
    }

    saveFiles() {
        localStorage.setItem(this.config.storageKeys.files, JSON.stringify(this.files));
    }

    // Connection Status
    updateConnectionStatus() {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot && statusText) {
            // Simple online/offline detection
            if (navigator.onLine) {
                statusDot.style.background = 'var(--success)';
                statusText.textContent = 'Online';
            } else {
                statusDot.style.background = 'var(--error)';
                statusText.textContent = 'Offline';
            }
        }
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, 4000);
    }

    // Keyboard Shortcuts
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K to focus on file code input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const activeTab = document.querySelector('.nav-tab.active');
            if (activeTab && activeTab.dataset.tab === 'files') {
                const accessCode = document.getElementById('accessCode');
                if (accessCode) {
                    accessCode.focus();
                }
            }
        }
        
        // Escape to close modal
        if (e.key === 'Escape') {
            this.closeModal();
        }

        // Ctrl/Cmd + T to toggle theme
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            this.toggleTheme();
        }
    }
}

// Add slideOut animation and additional styles
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
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--glass-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .file-detail-item:last-of-type {
        border-bottom: none;
        margin-bottom: 24px;
    }
    
    .file-detail-item code {
        background: rgba(0, 122, 255, 0.1);
        color: var(--accent-primary);
        padding: 4px 8px;
        border-radius: 4px;
        font-family: 'SF Mono', Monaco, monospace;
        font-weight: 600;
    }
    
    .file-actions-modal {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    /* Ensure inputs are properly styled and functional */
    input[type="text"] {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        pointer-events: auto !important;
        user-select: text !important;
    }
    
    .code-input, .room-input {
        border: none;
        outline: none;
    }
    
    /* Force input field functionality */
    #roomCode {
        pointer-events: auto !important;
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        cursor: text !important;
    }
`;
document.head.appendChild(style);

// Initialize the application
let clypse;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        clypse = new Clypse();
    });
} else {
    clypse = new Clypse();
}

// Handle online/offline events
window.addEventListener('online', () => {
    if (clypse) clypse.updateConnectionStatus();
});

window.addEventListener('offline', () => {
    if (clypse) clypse.updateConnectionStatus();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (clypse && clypse.currentRoom) {
        clypse.leaveRoom();
    }
});

console.log('Clypse application loaded successfully!');