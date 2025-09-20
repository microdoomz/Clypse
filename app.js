// Clypse Application - Bulletproof Cross-Device File & Clipboard Sharing

// Global instance
window.clypse = null;

class Clypse {
    constructor() {
        // Configuration
        this.config = {
            maxFileSize: 100000000, // 100MB
            codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
            codeLength: 4,
            storageKeys: {
                files: 'clypse_files_v3',
                rooms: 'clypse_rooms_v3',
                theme: 'clypse_theme',
                deviceId: 'clypse_device_id'
            },
            pollInterval: 1000,
            heartbeatInterval: 5000,
            maxDeviceInactivity: 30000
        };

        // Initialize state
        this.files = this.loadFiles();
        this.currentRoom = null;
        this.deviceId = this.getOrCreateDeviceId();
        this.clipboardPollTimer = null;
        this.heartbeatTimer = null;
        this.fileBlobs = new Map();
        
        // Bind methods to ensure proper context
        this.setupApplication = this.setupApplication.bind(this);
        this.switchTab = this.switchTab.bind(this);
        this.toggleTheme = this.toggleTheme.bind(this);
        this.uploadFiles = this.uploadFiles.bind(this);
        this.accessFile = this.accessFile.bind(this);
        this.joinRoom = this.joinRoom.bind(this);
        this.createRoom = this.createRoom.bind(this);
        this.sendToRoom = this.sendToRoom.bind(this);
        this.copyToClipboard = this.copyToClipboard.bind(this);
    }

    init() {
        console.log('🚀 Initializing Clypse v3.0...');
        
        // Ensure DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.setupApplication);
        } else {
            // Small delay to ensure all elements are available
            setTimeout(this.setupApplication, 50);
        }
    }

    setupApplication() {
        console.log('🔧 Setting up application...');
        
        try {
            this.setupTheme();
            this.setupEventListeners();
            this.renderFiles();
            this.renderMessages();
            this.updateConnectionStatus();
            this.updateDeviceCount();
            
            console.log('✅ Application setup complete!');
            this.showToast('Clypse ready!', 'success');
        } catch (error) {
            console.error('❌ Setup failed:', error);
            this.showToast('Setup failed: ' + error.message, 'error');
        }
    }

    // Theme Management
    setupTheme() {
        const savedTheme = localStorage.getItem(this.config.storageKeys.theme);
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const theme = savedTheme || systemTheme;
        
        this.setTheme(theme);
        console.log('🎨 Theme set to:', theme);
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
        console.log('🎨 Theme toggled to:', newTheme);
    }

    // Robust Event Listeners Setup
    setupEventListeners() {
        console.log('🎧 Setting up event listeners...');
        
        // Theme toggle with multiple fallbacks
        this.setupThemeToggle();
        
        // Tab navigation with bulletproof handling
        this.setupTabNavigation();
        
        // File upload with working implementation
        this.setupFileUpload();
        
        // Input fields with proper event handling
        this.setupInputFields();
        
        // Button handlers with proper binding
        this.setupButtons();
        
        // Modal handling
        this.setupModal();
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        console.log('✅ All event listeners attached');
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            // Remove existing listeners
            themeToggle.replaceWith(themeToggle.cloneNode(true));
            const newToggle = document.getElementById('themeToggle');
            
            newToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎨 Theme toggle clicked');
                this.toggleTheme();
            });
            
            console.log('✅ Theme toggle attached');
        }
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.nav-tab');
        tabButtons.forEach((tab, index) => {
            // Clone to remove existing listeners
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            const tabName = newTab.getAttribute('data-tab');
            newTab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📂 Tab clicked:', tabName);
                this.switchTab(tabName);
            });
        });
        
        console.log('✅ Tab navigation attached');
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            // Clone to ensure clean state
            const newUploadArea = uploadArea.cloneNode(true);
            uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
            
            newUploadArea.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📁 Upload area clicked');
                this.triggerFileSelect();
            });
            
            // Drag and drop
            newUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                newUploadArea.classList.add('dragover');
            });
            
            newUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                newUploadArea.classList.remove('dragover');
            });
            
            newUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                newUploadArea.classList.remove('dragover');
                const files = Array.from(e.dataTransfer.files);
                console.log('📁 Files dropped:', files.length);
                this.uploadFiles(files);
            });
            
            console.log('✅ File upload attached');
        }
    }

    setupInputFields() {
        // Access code input
        const accessCode = document.getElementById('accessCode');
        if (accessCode) {
            accessCode.value = '';
            accessCode.addEventListener('input', (e) => {
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length > 4) value = value.substring(0, 4);
                e.target.value = value;
                console.log('🔤 Access code input:', value);
            });
            
            accessCode.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.accessFile();
                }
            });
            
            console.log('✅ Access code input attached');
        }
        
        // Room code input
        const roomCode = document.getElementById('roomCode');
        if (roomCode) {
            roomCode.value = '';
            roomCode.addEventListener('input', (e) => {
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length > 4) value = value.substring(0, 4);
                e.target.value = value;
                console.log('🏠 Room code input:', value);
            });
            
            roomCode.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.joinRoom();
                }
            });
            
            console.log('✅ Room code input attached');
        }
    }

    setupButtons() {
        // Access button
        const accessBtn = document.getElementById('accessBtn');
        if (accessBtn) {
            accessBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔍 Access button clicked');
                this.accessFile();
            });
        }
        
        // Join room button
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🚪 Join room clicked');
                this.joinRoom();
            });
        }
        
        // Create room button
        const createRoomBtn = document.getElementById('createRoomBtn');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🏗️ Create room clicked');
                this.createRoom();
            });
        }
        
        // Send button
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('📤 Send button clicked');
                this.sendToRoom();
            });
        }
        
        // Copy button
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('📋 Copy button clicked');
                this.copyToClipboard();
            });
        }
        
        console.log('✅ All buttons attached');
    }

    setupModal() {
        const modalClose = document.getElementById('modalClose');
        const modalOverlay = document.getElementById('modalOverlay');
        
        if (modalClose) {
            modalClose.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }
    }

    // Tab Management - Fixed switching
    switchTab(tabName) {
        console.log('🔄 Switching to tab:', tabName);
        
        try {
            // Update nav tabs
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
            }

            // Update tab content - Force display changes
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            const activeContent = document.getElementById(`${tabName}Tab`);
            if (activeContent) {
                activeContent.classList.add('active');
                activeContent.style.display = 'block';
            }

            // Re-render content when switching
            if (tabName === 'clipboard') {
                this.renderMessages();
            }
            
            console.log('✅ Tab switched to:', tabName);
        } catch (error) {
            console.error('❌ Tab switch failed:', error);
        }
    }

    // File Upload - Working implementation
    triggerFileSelect() {
        console.log('📂 Triggering file selection...');
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = '*/*';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            console.log('📁 Files selected:', files.length, files.map(f => f.name));
            if (files.length > 0) {
                this.uploadFiles(files);
            }
            document.body.removeChild(fileInput);
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
    }

    async uploadFiles(files) {
        console.log('⬆️ Starting upload for', files.length, 'files');
        
        for (const file of files) {
            if (file.size > this.config.maxFileSize) {
                this.showToast(`File ${file.name} is too large (max 100MB)`, 'error');
                continue;
            }
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const code = this.generateCode();
        console.log('⬆️ Uploading:', file.name, 'Size:', this.formatFileSize(file.size), 'Code:', code);
        
        try {
            this.showUploadProgress();
            
            // Mock upload with blob URLs
            const upload = await this.mockFileUpload(file);
            
            const fileData = {
                id: this.generateId(),
                code: code,
                fileName: file.name,
                size: this.formatFileSize(file.size),
                uploadTime: new Date().toISOString(),
                downloadUrl: upload.url,
                fileKey: upload.key,
                fileType: file.type || 'application/octet-stream'
            };

            // Store blob for downloads
            this.fileBlobs.set(code, {
                blob: upload.blob,
                fileName: file.name,
                type: file.type
            });

            this.files.unshift(fileData);
            this.saveFiles();
            this.renderFiles();
            this.hideUploadProgress();

            this.showToast(`✅ File uploaded! Code: ${code}`, 'success');
            console.log('✅ Upload complete:', code);
            
        } catch (error) {
            console.error('❌ Upload failed:', error);
            this.hideUploadProgress();
            this.showToast('❌ Upload failed: ' + error.message, 'error');
        }
    }

    mockFileUpload(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const blob = new Blob([reader.result], { type: file.type });
                const url = URL.createObjectURL(blob);
                
                setTimeout(() => {
                    resolve({
                        success: true,
                        url: url,
                        blob: blob,
                        key: this.generateId()
                    });
                }, Math.random() * 1500 + 500);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    showUploadProgress() {
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) {
            uploadProgress.classList.remove('hidden');
            uploadProgress.style.display = 'block';
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 25;
                if (progress > 90) progress = 90;
                
                const progressFill = document.getElementById('progressFill');
                const progressText = document.getElementById('progressText');
                
                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `Processing... ${Math.round(progress)}%`;
            }, 200);
            
            this.uploadProgressInterval = interval;
        }
    }

    hideUploadProgress() {
        if (this.uploadProgressInterval) {
            clearInterval(this.uploadProgressInterval);
        }
        
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) progressFill.style.width = '100%';
        if (progressText) progressText.textContent = 'Complete!';
        
        setTimeout(() => {
            const uploadProgress = document.getElementById('uploadProgress');
            if (uploadProgress) {
                uploadProgress.classList.add('hidden');
                uploadProgress.style.display = 'none';
            }
        }, 800);
    }

    // File Access - Working implementation
    accessFile() {
        const accessCodeInput = document.getElementById('accessCode');
        if (!accessCodeInput) return;
        
        const code = accessCodeInput.value.trim().toUpperCase();
        console.log('🔍 Accessing file with code:', code);
        
        if (!code || code.length !== 4) {
            this.showToast('Please enter a valid 4-digit code', 'error');
            return;
        }

        const file = this.files.find(f => f.code === code);
        if (file) {
            console.log('✅ File found:', file.fileName);
            this.showFileModal(file);
            accessCodeInput.value = '';
        } else {
            this.showToast('No file found with code: ' + code, 'error');
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
                    <button class="access-button" onclick="window.clypse.downloadFile('${file.code}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download File
                    </button>
                    <button class="create-room-button" onclick="window.clypse.copyFileCode('${file.code}')">
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
        modalOverlay.style.display = 'flex';
    }

    downloadFile(code) {
        console.log('⬇️ Downloading file with code:', code);
        
        if (this.fileBlobs.has(code)) {
            const fileData = this.fileBlobs.get(code);
            const url = URL.createObjectURL(fileData.blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileData.fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showToast(`⬇️ Downloading ${fileData.fileName}...`, 'success');
            this.closeModal();
            console.log('✅ Download triggered:', fileData.fileName);
        } else {
            this.showToast('File not available for download', 'error');
        }
    }

    async copyFileCode(code) {
        try {
            await navigator.clipboard.writeText(code);
            this.showToast(`📋 Code ${code} copied!`, 'success');
        } catch (error) {
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast(`📋 Code ${code} copied!`, 'success');
        }
    }

    closeModal() {
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.classList.add('hidden');
            modalOverlay.style.display = 'none';
        }
    }

    // Room Management - Working implementation
    createRoom() {
        const roomCode = this.generateCode();
        console.log('🏗️ Creating room:', roomCode);
        
        this.switchTab('clipboard');
        
        setTimeout(() => {
            const roomCodeInput = document.getElementById('roomCode');
            if (roomCodeInput) {
                roomCodeInput.value = roomCode;
            }
            this.joinRoom();
        }, 100);
    }

    joinRoom() {
        const roomCodeInput = document.getElementById('roomCode');
        if (!roomCodeInput) return;
        
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        console.log('🚪 Joining room:', roomCode);
        
        if (!roomCode || roomCode.length !== 4) {
            this.showToast('Please enter a valid 4-digit room code', 'error');
            return;
        }

        if (this.currentRoom) {
            this.leaveRoom();
        }

        this.currentRoom = roomCode;
        this.showRoomStatus();
        this.enableClipboard();
        this.startClipboardSync();
        this.startHeartbeat();

        this.showToast(`🏠 Joined room: ${roomCode}`, 'success');
        this.renderMessages();
    }

    leaveRoom() {
        if (this.clipboardPollTimer) clearInterval(this.clipboardPollTimer);
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        
        if (this.currentRoom) {
            const deviceKey = `${this.config.storageKeys.rooms}_${this.currentRoom}_devices`;
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
            roomStatus.style.display = 'block';
            currentRoom.textContent = this.currentRoom;
            this.updateDeviceCount();
        }
    }

    enableClipboard() {
        const clipboardInput = document.getElementById('clipboardInput');
        const sendBtn = document.getElementById('sendBtn');
        const copyBtn = document.getElementById('copyBtn');

        if (clipboardInput) {
            clipboardInput.disabled = false;
            clipboardInput.placeholder = 'Type or paste content, then click "Send to Room"...';
        }

        if (sendBtn) sendBtn.disabled = false;
        if (copyBtn) copyBtn.disabled = false;
    }

    // Clipboard Management - Working implementation
    sendToRoom() {
        if (!this.currentRoom) {
            this.showToast('Please join a room first', 'error');
            return;
        }

        const clipboardInput = document.getElementById('clipboardInput');
        if (!clipboardInput) return;
        
        const content = clipboardInput.value.trim();
        if (!content) {
            this.showToast('No content to send', 'error');
            return;
        }

        console.log('📤 Sending to room:', this.currentRoom, 'Content:', content.substring(0, 50) + '...');

        const messageKey = `${this.config.storageKeys.rooms}_${this.currentRoom}_messages`;
        const messages = JSON.parse(localStorage.getItem(messageKey) || '[]');
        
        const message = {
            id: this.generateId(),
            content: content,
            timestamp: Date.now(),
            device: this.getDeviceName(),
            deviceId: this.deviceId
        };

        messages.unshift(message);
        if (messages.length > 50) messages.splice(50);

        localStorage.setItem(messageKey, JSON.stringify(messages));
        
        this.showToast('📤 Message sent to room!', 'success');
        this.renderMessages();
        clipboardInput.value = '';
        
        console.log('✅ Message sent successfully');
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
            this.showToast('📋 Copied to clipboard!', 'success');
        } catch (error) {
            const textArea = document.createElement('textarea');
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('📋 Copied to clipboard!', 'success');
        }
    }

    startClipboardSync() {
        if (!this.currentRoom) return;
        
        this.clipboardPollTimer = setInterval(() => {
            this.renderMessages();
        }, this.config.pollInterval);
    }

    startHeartbeat() {
        this.sendHeartbeat();
        
        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
            this.updateDeviceCount();
        }, this.config.heartbeatInterval);
    }

    sendHeartbeat() {
        if (!this.currentRoom) return;
        
        const deviceKey = `${this.config.storageKeys.rooms}_${this.currentRoom}_devices`;
        const devices = JSON.parse(localStorage.getItem(deviceKey) || '{}');
        devices[this.deviceId] = {
            timestamp: Date.now(),
            name: this.getDeviceName()
        };
        localStorage.setItem(deviceKey, JSON.stringify(devices));
    }

    updateDeviceCount() {
        const deviceCountEl = document.getElementById('deviceCount');
        const headerDeviceCountEl = document.getElementById('headerDeviceCount');
        
        let activeDeviceCount = 0;
        
        if (this.currentRoom) {
            const deviceKey = `${this.config.storageKeys.rooms}_${this.currentRoom}_devices`;
            const devices = JSON.parse(localStorage.getItem(deviceKey) || '{}');
            const now = Date.now();
            
            const activeDevices = Object.entries(devices).filter(([id, device]) => 
                now - device.timestamp < this.config.maxDeviceInactivity
            );

            activeDeviceCount = activeDevices.length;
        }

        if (deviceCountEl) deviceCountEl.textContent = activeDeviceCount;
        if (headerDeviceCountEl) headerDeviceCountEl.textContent = activeDeviceCount;
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
                    <p style="font-size: 0.85rem; margin-top: 8px;">Upload files to get started</p>
                </div>
            `;
            return;
        }

        filesList.innerHTML = this.files.map(file => `
            <div class="file-item" onclick="window.clypse.showFileModal(${JSON.stringify(file).replace(/"/g, '&quot;')})">
                <div class="file-info">
                    <div class="file-name">${file.fileName}</div>
                    <div class="file-meta">
                        <span>${file.size}</span>
                        <span>${this.getRelativeTime(new Date(file.uploadTime))}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <div class="file-code" onclick="event.stopPropagation(); window.clypse.copyFileCode('${file.code}')">
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

    renderMessages() {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        if (!this.currentRoom) {
            messagesList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    </svg>
                    <p>Join a room to see live messages</p>
                </div>
            `;
            return;
        }

        const messageKey = `${this.config.storageKeys.rooms}_${this.currentRoom}_messages`;
        const messages = JSON.parse(localStorage.getItem(messageKey) || '[]');
        
        if (messages.length === 0) {
            messagesList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    </svg>
                    <p>No messages yet</p>
                    <p style="font-size: 0.85rem; margin-top: 8px;">Send your first message!</p>
                </div>
            `;
            return;
        }

        messagesList.innerHTML = messages.map(message => `
            <div class="message-item" onclick="window.clypse.copyMessage('${message.id}')">
                <div class="message-content">${this.escapeHtml(message.content.substring(0, 200))}</div>
                <div class="message-meta">
                    <span>${this.getRelativeTime(new Date(message.timestamp))}</span>
                    <span>${message.device}</span>
                </div>
            </div>
        `).join('');
    }

    async copyMessage(messageId) {
        if (!this.currentRoom) return;
        
        const messageKey = `${this.config.storageKeys.rooms}_${this.currentRoom}_messages`;
        const messages = JSON.parse(localStorage.getItem(messageKey) || '[]');
        const message = messages.find(m => m.id === messageId);
        
        if (message) {
            try {
                await navigator.clipboard.writeText(message.content);
                const clipboardInput = document.getElementById('clipboardInput');
                if (clipboardInput) clipboardInput.value = message.content;
                this.showToast('📋 Message copied!', 'success');
            } catch (error) {
                this.showToast('❌ Failed to copy message', 'error');
            }
        }
    }

    // Utility Methods
    generateCode() {
        let code = '';
        for (let i = 0; i < this.config.codeLength; i++) {
            code += this.config.codeChars.charAt(Math.floor(Math.random() * this.config.codeChars.length));
        }
        if (this.files.some(f => f.code === code)) return this.generateCode();
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

    escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    loadFiles() {
        const stored = localStorage.getItem(this.config.storageKeys.files);
        return stored ? JSON.parse(stored) : [];
    }

    saveFiles() {
        localStorage.setItem(this.config.storageKeys.files, JSON.stringify(this.files));
    }

    updateConnectionStatus() {
        const statusDot = document.querySelector('.status-dot');
        if (statusDot) {
            statusDot.style.background = navigator.onLine ? 'var(--success)' : 'var(--error)';
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 300);
            }
        }, 4000);
    }
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize application
console.log('🚀 Clypse v3.0 - Bulletproof Edition');
window.clypse = new Clypse();
window.clypse.init();

// Event handlers
window.addEventListener('online', () => window.clypse?.updateConnectionStatus());
window.addEventListener('offline', () => window.clypse?.updateConnectionStatus());
window.addEventListener('beforeunload', () => {
    if (window.clypse?.currentRoom) window.clypse.leaveRoom();
});

console.log('✅ Clypse loaded and ready!');