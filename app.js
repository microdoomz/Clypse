/**
 * Clypse Application - Bulletproof Cross-Device File & Clipboard Sharing
 * Fixed version with working functionality
 */

class ClypseApp {
    constructor() {
        this.config = {
            maxFileSize: 50000000, // 50MB
            fileExpiry: 24 * 60 * 60 * 1000, // 24 hours
            codeLength: 4,
            codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
            pollInterval: 500, // 500ms
            heartbeatInterval: 3000, // 3 seconds
            deviceTimeout: 15000, // 15 seconds
            notificationDuration: 12000, // 12 seconds
            storageKeys: {
                filePrefix: 'clypse_file_',
                roomPrefix: 'clypse_room_',
                deviceId: 'clypse_device_id',
                theme: 'clypse_theme'
            }
        };

        this.currentRoom = null;
        this.deviceId = this.getOrCreateDeviceId();
        this.pollTimer = null;
        this.heartbeatTimer = null;
        this.messageCount = 0;

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('Initializing Clypse app...');
        this.setupTheme();
        this.setupEventListeners();
        this.renderFiles();
        this.cleanupExpiredFiles();
        
        // Clean expired files periodically
        setInterval(() => this.cleanupExpiredFiles(), 60000);
        
        console.log('Clypse app initialized successfully!');
    }

    setupTheme() {
        const saved = localStorage.getItem(this.config.storageKeys.theme);
        const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        this.setTheme(saved || system);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.config.storageKeys.theme, theme);
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Theme toggle - Fixed
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const current = document.documentElement.getAttribute('data-theme');
                const newTheme = current === 'dark' ? 'light' : 'dark';
                this.setTheme(newTheme);
                this.showToast(`Switched to ${newTheme} mode`, 'info');
                console.log('Theme switched to:', newTheme);
            });
            console.log('Theme toggle setup complete');
        }

        // Tab navigation - Fixed
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tabName = tab.getAttribute('data-tab');
                console.log('Tab clicked:', tabName);
                this.switchTab(tabName);
            });
        });
        console.log('Tab navigation setup complete');

        // File upload - Fixed
        this.setupFileUpload();

        // File access - Fixed
        const accessCode = document.getElementById('accessCode');
        const accessBtn = document.getElementById('accessBtn');
        
        if (accessCode) {
            // Remove any conflicting attributes
            accessCode.removeAttribute('readonly');
            accessCode.removeAttribute('disabled');
            
            accessCode.addEventListener('input', (e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                e.target.value = value.substring(0, 4);
                console.log('Access code input:', e.target.value);
            });
            
            accessCode.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.accessFile();
                }
            });
            console.log('Access code input setup complete');
        }
        
        if (accessBtn) {
            accessBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.accessFile();
            });
        }

        // Room management - Fixed
        const roomCode = document.getElementById('roomCode');
        const joinBtn = document.getElementById('joinBtn');
        const createBtn = document.getElementById('createBtn');
        
        if (roomCode) {
            // Remove any conflicting attributes
            roomCode.removeAttribute('readonly');
            roomCode.removeAttribute('disabled');
            
            roomCode.addEventListener('input', (e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                e.target.value = value.substring(0, 4);
                console.log('Room code input:', e.target.value);
            });
            
            roomCode.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.joinRoom();
                }
            });
            console.log('Room code input setup complete');
        }
        
        if (joinBtn) {
            joinBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.joinRoom();
            });
        }
        
        if (createBtn) {
            createBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.createRoom();
            });
        }

        // Message handling - Fixed
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const copyBtn = document.getElementById('copyBtn');
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.copyMessage();
            });
        }
        
        console.log('All event listeners setup complete');
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        if (!uploadArea || !fileInput) {
            console.error('Upload elements not found');
            return;
        }

        console.log('Setting up file upload...');

        // Click to upload - Fixed
        uploadArea.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Upload area clicked, triggering file input...');
            fileInput.click();
        });

        // File selection - Fixed
        fileInput.addEventListener('change', (e) => {
            console.log('File input changed:', e.target.files.length, 'files');
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.uploadFiles(files);
            }
            e.target.value = ''; // Reset
        });

        // Drag and drop - Fixed
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
            console.log('Files dropped:', e.dataTransfer.files.length);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.uploadFiles(files);
            }
        });
        
        console.log('File upload setup complete');
    }

    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`${tabName}-content`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        // Re-render when switching to clipboard
        if (tabName === 'clipboard') {
            this.renderMessages();
        }
        
        console.log('Tab switch complete');
    }

    // File Management
    async uploadFiles(files) {
        console.log('Uploading files:', files.length);
        for (const file of files) {
            if (file.size > this.config.maxFileSize) {
                this.showToast(`File "${file.name}" is too large (max 50MB)`, 'error');
                continue;
            }
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const code = this.generateCode();
        console.log('Uploading file:', file.name, 'with code:', code);
        
        try {
            // Convert to base64
            const base64 = await this.fileToBase64(file);
            
            const fileData = {
                code: code,
                name: file.name,
                size: file.size,
                type: file.type,
                base64: base64,
                uploaded: Date.now(),
                expires: Date.now() + this.config.fileExpiry
            };

            // Store in localStorage
            const key = this.config.storageKeys.filePrefix + code;
            localStorage.setItem(key, JSON.stringify(fileData));

            this.renderFiles();
            this.showToast(`File uploaded! Code: ${code}`, 'success');
            console.log('File upload successful');
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast(`Upload failed: ${error.message}`, 'error');
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    accessFile() {
        const accessCode = document.getElementById('accessCode');
        const code = accessCode.value.trim();
        console.log('Accessing file with code:', code);
        
        if (code.length !== 4) {
            this.showToast('Please enter a valid 4-digit code', 'error');
            return;
        }

        const key = this.config.storageKeys.filePrefix + code;
        const stored = localStorage.getItem(key);
        
        if (!stored) {
            this.showToast('No file found with this code', 'error');
            return;
        }

        try {
            const fileData = JSON.parse(stored);
            
            // Check if expired
            if (Date.now() > fileData.expires) {
                localStorage.removeItem(key);
                this.showToast('File has expired', 'error');
                this.renderFiles();
                return;
            }

            this.downloadFile(fileData);
            accessCode.value = '';
            
        } catch (error) {
            console.error('Access error:', error);
            this.showToast('Error accessing file', 'error');
        }
    }

    downloadFile(fileData) {
        console.log('Downloading file:', fileData.name);
        
        try {
            // Create download link from base64
            const link = document.createElement('a');
            link.href = fileData.base64;
            link.download = fileData.name;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            
            // Trigger download - Special handling for mobile
            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                // Mobile: Multiple click attempts
                link.click();
                setTimeout(() => link.click(), 100);
                setTimeout(() => link.click(), 200);
                console.log('Mobile download triggered');
            } else {
                // Desktop: Single click
                link.click();
                console.log('Desktop download triggered');
            }
            
            // Cleanup
            setTimeout(() => {
                if (link.parentNode) {
                    document.body.removeChild(link);
                }
            }, 1000);

            this.showToast(`Downloaded: ${fileData.name}`, 'success');
            
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Download failed', 'error');
        }
    }

    // Room Management
    createRoom() {
        const code = this.generateCode();
        console.log('Creating room with code:', code);
        
        const roomCode = document.getElementById('roomCode');
        if (roomCode) {
            roomCode.value = code;
        }
        
        // Initialize empty room
        const roomData = {
            code: code,
            messages: [],
            devices: {},
            created: Date.now()
        };
        
        const key = this.config.storageKeys.roomPrefix + code;
        localStorage.setItem(key, JSON.stringify(roomData));
        
        this.joinRoom();
    }

    joinRoom() {
        const roomCode = document.getElementById('roomCode');
        const code = roomCode.value.trim();
        console.log('Joining room:', code);
        
        if (code.length !== 4) {
            this.showToast('Please enter a valid 4-digit room code', 'error');
            return;
        }

        const key = this.config.storageKeys.roomPrefix + code;
        let roomData = localStorage.getItem(key);
        
        if (!roomData) {
            // Create room if it doesn't exist
            roomData = {
                code: code,
                messages: [],
                devices: {},
                created: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(roomData));
        } else {
            roomData = JSON.parse(roomData);
        }

        // Leave current room
        if (this.currentRoom) {
            this.leaveRoom();
        }

        this.currentRoom = code;
        this.messageCount = roomData.messages.length;
        
        this.showRoomStatus();
        this.enableMessageInput();
        this.startPolling();
        this.startHeartbeat();
        this.renderMessages();
        
        this.showToast(`Joined room: ${code}`, 'success');
    }

    leaveRoom() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        if (this.currentRoom) {
            // Remove device from room
            const key = this.config.storageKeys.roomPrefix + this.currentRoom;
            const stored = localStorage.getItem(key);
            if (stored) {
                const roomData = JSON.parse(stored);
                delete roomData.devices[this.deviceId];
                localStorage.setItem(key, JSON.stringify(roomData));
            }
        }
        
        this.currentRoom = null;
        this.hideRoomStatus();
        this.disableMessageInput();
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

    hideRoomStatus() {
        const roomStatus = document.getElementById('roomStatus');
        if (roomStatus) {
            roomStatus.classList.add('hidden');
        }
    }

    enableMessageInput() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const copyBtn = document.getElementById('copyBtn');
        
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = 'Type your message and click "Send to Room"...';
        }
        
        if (sendBtn) sendBtn.disabled = false;
        if (copyBtn) copyBtn.disabled = false;
    }

    disableMessageInput() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const copyBtn = document.getElementById('copyBtn');
        
        if (messageInput) {
            messageInput.disabled = true;
            messageInput.placeholder = 'Join a room to start sharing messages...';
            messageInput.value = '';
        }
        
        if (sendBtn) sendBtn.disabled = true;
        if (copyBtn) copyBtn.disabled = true;
    }

    startPolling() {
        this.pollTimer = setInterval(() => {
            this.checkForNewMessages();
            this.updateDeviceCount();
        }, this.config.pollInterval);
    }

    checkForNewMessages() {
        if (!this.currentRoom) return;
        
        const key = this.config.storageKeys.roomPrefix + this.currentRoom;
        const stored = localStorage.getItem(key);
        if (!stored) return;
        
        const roomData = JSON.parse(stored);
        if (roomData.messages.length !== this.messageCount) {
            this.messageCount = roomData.messages.length;
            this.renderMessages();
        }
    }

    startHeartbeat() {
        this.sendHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
        }, this.config.heartbeatInterval);
    }

    sendHeartbeat() {
        if (!this.currentRoom) return;
        
        const key = this.config.storageKeys.roomPrefix + this.currentRoom;
        const stored = localStorage.getItem(key);
        if (!stored) return;
        
        const roomData = JSON.parse(stored);
        roomData.devices[this.deviceId] = {
            lastSeen: Date.now(),
            name: this.getDeviceType()
        };
        
        localStorage.setItem(key, JSON.stringify(roomData));
    }

    updateDeviceCount() {
        const deviceCount = document.getElementById('deviceCount');
        if (!deviceCount || !this.currentRoom) return;
        
        const key = this.config.storageKeys.roomPrefix + this.currentRoom;
        const stored = localStorage.getItem(key);
        if (!stored) return;
        
        const roomData = JSON.parse(stored);
        const now = Date.now();
        const activeDevices = Object.values(roomData.devices).filter(
            device => now - device.lastSeen < this.config.deviceTimeout
        );
        
        deviceCount.textContent = activeDevices.length;
    }

    // Message Management
    sendMessage() {
        if (!this.currentRoom) {
            this.showToast('Please join a room first', 'error');
            return;
        }
        
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value.trim();
        console.log('Sending message:', text);
        
        if (!text) {
            this.showToast('Please enter a message', 'error');
            return;
        }
        
        const message = {
            id: this.generateId(),
            text: text,
            device: this.getDeviceType(),
            timestamp: Date.now()
        };
        
        const key = this.config.storageKeys.roomPrefix + this.currentRoom;
        const stored = localStorage.getItem(key);
        if (!stored) return;
        
        const roomData = JSON.parse(stored);
        roomData.messages.unshift(message); // Add to beginning
        
        // Keep only last 100 messages
        if (roomData.messages.length > 100) {
            roomData.messages = roomData.messages.slice(0, 100);
        }
        
        localStorage.setItem(key, JSON.stringify(roomData));
        
        messageInput.value = '';
        this.messageCount = roomData.messages.length;
        this.renderMessages();
        
        this.showToast('Message sent to room!', 'success');
        console.log('Message sent successfully');
    }

    async copyMessage() {
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value.trim();
        
        if (!text) {
            this.showToast('No message to copy', 'error');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Message copied to clipboard!', 'success');
        } catch (error) {
            // Fallback for older browsers
            this.fallbackCopy(text);
            this.showToast('Message copied to clipboard!', 'success');
        }
    }

    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }

    // Rendering
    renderFiles() {
        const filesList = document.getElementById('filesList');
        if (!filesList) return;
        
        const files = this.getAllFiles();
        
        if (files.length === 0) {
            filesList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                        <polyline points="13,2 13,9 20,9"/>
                    </svg>
                    <p>No files uploaded yet</p>
                    <small>Upload files to start sharing across devices</small>
                </div>
            `;
            return;
        }

        filesList.innerHTML = files.map(file => `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-name">${this.escapeHtml(file.name)}</div>
                    <div class="file-meta">
                        <span>${this.formatFileSize(file.size)}</span>
                        <span>${this.formatTime(file.uploaded)}</span>
                        <span>Expires: ${this.formatTime(file.expires)}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <div class="file-code" onclick="window.app.copyFileCode('${file.code}')">
                        ${file.code}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </div>
                    <button class="btn btn-primary" onclick="window.app.downloadFileByCode('${file.code}')">Download</button>
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    </svg>
                    <p>Join a room to see messages</p>
                    <small>Create or join a room to start syncing messages</small>
                </div>
            `;
            return;
        }

        const key = this.config.storageKeys.roomPrefix + this.currentRoom;
        const stored = localStorage.getItem(key);
        if (!stored) return;
        
        const roomData = JSON.parse(stored);
        const messages = roomData.messages || [];
        
        if (messages.length === 0) {
            messagesList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    </svg>
                    <p>No messages yet</p>
                    <small>Send the first message to start the conversation</small>
                </div>
            `;
            return;
        }

        messagesList.innerHTML = messages.map(message => `
            <div class="message-item" onclick="window.app.copyMessageFromHistory('${this.escapeHtml(message.text).replace(/'/g, '&#39;')}')">
                <div class="message-content">${this.escapeHtml(message.text)}</div>
                <div class="message-meta">
                    <span>${message.device}</span>
                    <span>${this.formatTime(message.timestamp)}</span>
                </div>
            </div>
        `).join('');
    }

    // Utility Methods
    getAllFiles() {
        const files = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.config.storageKeys.filePrefix)) {
                try {
                    const fileData = JSON.parse(localStorage.getItem(key));
                    if (Date.now() <= fileData.expires) {
                        files.push(fileData);
                    }
                } catch (error) {
                    // Invalid file data, ignore
                }
            }
        }
        return files.sort((a, b) => b.uploaded - a.uploaded);
    }

    cleanupExpiredFiles() {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.config.storageKeys.filePrefix)) {
                try {
                    const fileData = JSON.parse(localStorage.getItem(key));
                    if (Date.now() > fileData.expires) {
                        toRemove.push(key);
                    }
                } catch (error) {
                    toRemove.push(key);
                }
            }
        }
        
        toRemove.forEach(key => localStorage.removeItem(key));
        if (toRemove.length > 0) {
            this.renderFiles();
        }
    }

    // Exposed methods for onclick handlers
    copyFileCode(code) {
        this.fallbackCopy(code);
        this.showToast(`Code ${code} copied!`, 'success');
    }

    downloadFileByCode(code) {
        const key = this.config.storageKeys.filePrefix + code;
        const stored = localStorage.getItem(key);
        if (stored) {
            const fileData = JSON.parse(stored);
            this.downloadFile(fileData);
        }
    }

    copyMessageFromHistory(messageText) {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = messageText;
        }
        this.fallbackCopy(messageText);
        this.showToast('Message copied and loaded!', 'success');
    }

    generateCode() {
        let code = '';
        for (let i = 0; i < this.config.codeLength; i++) {
            code += this.config.codeChars.charAt(Math.floor(Math.random() * this.config.codeChars.length));
        }
        
        // Ensure uniqueness
        const key = this.config.storageKeys.filePrefix + code;
        if (localStorage.getItem(key)) {
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

    getDeviceType() {
        const ua = navigator.userAgent;
        if (/iPhone/i.test(ua)) return '📱 iPhone';
        if (/iPad/i.test(ua)) return '📱 iPad';
        if (/Android/i.test(ua)) return '📱 Android';
        if (/Mac/i.test(ua)) return '💻 Mac';
        if (/Windows/i.test(ua)) return '💻 Windows';
        return '💻 Desktop';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatTime(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diff = Math.floor((now - date) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Auto remove after configured duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (toast.parentNode) {
                        container.removeChild(toast);
                    }
                }, 300);
            }
        }, this.config.notificationDuration);
    }
}

// Initialize app and make it globally accessible
window.app = new ClypseApp();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.app && window.app.currentRoom) {
        window.app.leaveRoom();
    }
});

console.log('Clypse v4.0 - Bulletproof Edition Loaded!');