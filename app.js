// Clypse - Bulletproof Cross-Device File & Clipboard Sharing

class Clypse {
    constructor() {
        this.config = {
            maxFileSize: 2000000000, // 2GB
            codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
            codeLength: 4,
            notificationDuration: 15000, // 15 seconds as required
            pollInterval: 1000, // Poll every second for cross-device sync
            urlCheckInterval: 500 // Check URL changes every 500ms
        };

        this.files = [];
        this.currentRoom = null;
        this.currentMessages = [];
        this.deviceId = this.generateDeviceId();
        this.deviceName = this.getDeviceName();
        this.pollTimer = null;
        this.urlCheckTimer = null;
        this.lastHash = '';

        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApplication());
        } else {
            this.setupApplication();
        }
    }

    setupApplication() {
        this.setupEventListeners();
        this.loadLocalFiles();
        this.checkURLOnLoad();
        this.renderFiles();
        this.startURLMonitoring();
        this.updateConnectionStatus();
        
        console.log('Clypse application initialized successfully!');
    }

    // ============ URL Fragment Cross-Device System ============

    encodeFileToURL(fileData) {
        try {
            const compressed = btoa(JSON.stringify(fileData));
            return `#file-${fileData.code}-${compressed}`;
        } catch (error) {
            console.error('Failed to encode file to URL:', error);
            return null;
        }
    }

    decodeFileFromURL(code) {
        try {
            const hash = window.location.hash;
            const filePrefix = `#file-${code}-`;
            if (hash.includes(filePrefix)) {
                const compressed = hash.split(filePrefix)[1];
                return JSON.parse(atob(compressed));
            }
            return null;
        } catch (error) {
            console.error('Failed to decode file from URL:', error);
            return null;
        }
    }

    encodeRoomToURL(roomCode, messages) {
        try {
            const roomData = { 
                code: roomCode, 
                messages: messages,
                lastUpdate: Date.now()
            };
            const compressed = btoa(JSON.stringify(roomData));
            const newHash = `#room-${roomCode}-${compressed}`;
            
            // Only update if different to avoid infinite loops
            if (window.location.hash !== newHash) {
                history.replaceState(null, null, newHash);
            }
        } catch (error) {
            console.error('Failed to encode room to URL:', error);
        }
    }

    decodeRoomFromURL(roomCode) {
        try {
            const hash = window.location.hash;
            const roomPrefix = `#room-${roomCode}-`;
            if (hash.includes(roomPrefix)) {
                const compressed = hash.split(roomPrefix)[1];
                return JSON.parse(atob(compressed));
            }
            return null;
        } catch (error) {
            console.error('Failed to decode room from URL:', error);
            return null;
        }
    }

    checkURLOnLoad() {
        const hash = window.location.hash;
        
        if (hash.startsWith('#file-')) {
            // Extract file code and try to show file
            const parts = hash.substring(6).split('-');
            if (parts.length >= 1) {
                const code = parts[0];
                this.showToast(`File link detected! Code: ${code}`, 'info', this.config.notificationDuration);
                
                // Switch to files tab and populate code
                this.switchTab('files');
                setTimeout(() => {
                    const accessCode = document.getElementById('accessCode');
                    if (accessCode) {
                        accessCode.value = code;
                    }
                }, 100);
            }
        } else if (hash.startsWith('#room-')) {
            // Extract room code and join room
            const parts = hash.substring(6).split('-');
            if (parts.length >= 1) {
                const code = parts[0];
                this.showToast(`Room link detected! Joining room: ${code}`, 'info', this.config.notificationDuration);
                
                // Switch to clipboard tab and join room
                this.switchTab('clipboard');
                setTimeout(() => {
                    const roomCode = document.getElementById('roomCode');
                    if (roomCode) {
                        roomCode.value = code;
                        this.joinRoom();
                    }
                }, 100);
            }
        }
    }

    startURLMonitoring() {
        // Monitor URL changes for real-time sync
        this.urlCheckTimer = setInterval(() => {
            const currentHash = window.location.hash;
            if (currentHash !== this.lastHash) {
                this.lastHash = currentHash;
                this.handleURLChange(currentHash);
            }
        }, this.config.urlCheckInterval);

        // Also listen for hash changes
        window.addEventListener('hashchange', () => {
            this.handleURLChange(window.location.hash);
        });
    }

    handleURLChange(hash) {
        if (this.currentRoom && hash.startsWith(`#room-${this.currentRoom}-`)) {
            // Room data changed - update messages
            const roomData = this.decodeRoomFromURL(this.currentRoom);
            if (roomData && roomData.messages) {
                const newMessages = roomData.messages.filter(msg => 
                    !this.currentMessages.find(existing => existing.id === msg.id)
                );
                
                if (newMessages.length > 0) {
                    this.currentMessages = roomData.messages;
                    this.renderMessages();
                    
                    // Show notification for new messages from other devices
                    const otherDeviceMessages = newMessages.filter(msg => msg.device !== this.deviceName);
                    if (otherDeviceMessages.length > 0) {
                        this.showToast(`${otherDeviceMessages.length} new message(s) received`, 'info');
                    }
                }
            }
        }
    }

    // ============ Event Listeners ============

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Tab navigation - FIXED
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tabButton = e.target.closest('.nav-tab');
                if (tabButton?.dataset.tab) {
                    console.log('Tab clicked:', tabButton.dataset.tab);
                    this.switchTab(tabButton.dataset.tab);
                }
            });
        });

        // File upload - FIXED
        this.setupFileUpload();

        // File access
        const accessBtn = document.getElementById('accessBtn');
        const accessCode = document.getElementById('accessCode');
        
        if (accessBtn) {
            accessBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Access button clicked');
                this.accessFile();
            });
        }
        
        if (accessCode) {
            accessCode.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.accessFile();
                }
            });
            
            accessCode.addEventListener('input', (e) => {
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length > 4) value = value.substring(0, 4);
                e.target.value = value;
            });
        }

        // Room management
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        const createRoomBtn = document.getElementById('createRoomBtn');
        const roomCode = document.getElementById('roomCode');
        
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.joinRoom();
            });
        }
        
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.createRoom();
            });
        }
        
        if (roomCode) {
            roomCode.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.joinRoom();
                }
            });
            
            roomCode.addEventListener('input', (e) => {
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length > 4) value = value.substring(0, 4);
                e.target.value = value;
            });
        }

        // Messaging
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        console.log('Event listeners setup complete');
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        console.log('Setting up file upload...', uploadArea, fileInput);

        if (!uploadArea) {
            console.error('Upload area not found');
            return;
        }

        // FIXED: Click to upload with proper event handling
        uploadArea.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Upload area clicked - creating file input');
            
            // Create fresh file input each time to ensure it works
            const tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.multiple = true;
            tempInput.style.position = 'absolute';
            tempInput.style.left = '-9999px';
            tempInput.style.opacity = '0';
            tempInput.style.pointerEvents = 'none';
            
            tempInput.addEventListener('change', (e) => {
                console.log('Files selected:', e.target.files);
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    this.uploadFiles(files);
                }
                // Clean up
                if (document.body.contains(tempInput)) {
                    document.body.removeChild(tempInput);
                }
            });
            
            // Add to DOM, trigger click, then remove
            document.body.appendChild(tempInput);
            tempInput.click();
        });

        // Drag and drop handlers
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('dragover');
            
            console.log('Files dropped:', e.dataTransfer.files);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.uploadFiles(files);
            }
        });
        
        console.log('File upload setup complete');
    }

    // ============ Tab Management - FIXED ============

    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            console.log('Active tab set:', activeTab);
        }

        // Update tab content - FIXED
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        const activeContent = document.getElementById(`${tabName}Tab`);
        if (activeContent) {
            activeContent.classList.add('active');
            activeContent.style.display = 'block';
            console.log('Active content set:', activeContent);
        }

        // Re-render content based on active tab
        if (tabName === 'files') {
            this.renderFiles();
        } else if (tabName === 'clipboard') {
            this.renderMessages();
        }
    }

    // ============ File Management ============

    async uploadFiles(files) {
        console.log('Uploading files:', files);
        
        for (const file of files) {
            if (file.size > this.config.maxFileSize) {
                this.showToast(`File ${file.name} is too large (max 2GB)`, 'error', this.config.notificationDuration);
                continue;
            }
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const code = this.generateCode();
        
        console.log('Processing file:', file.name, 'with code:', code);
        
        try {
            this.showUploadProgress();
            
            // Convert file to base64
            const base64 = await this.fileToBase64(file);
            
            const fileData = {
                id: this.generateId(),
                code: code,
                name: file.name,
                size: this.formatFileSize(file.size),
                base64: base64,
                uploadTime: new Date().toISOString(),
                mimeType: file.type
            };

            // Store locally for same device
            this.files.unshift(fileData);
            this.saveLocalFiles();

            // Generate shareable URL with file data
            const fileURL = this.encodeFileToURL(fileData);
            const shareableURL = `${window.location.origin}${window.location.pathname}${fileURL}`;

            this.hideUploadProgress();
            this.renderFiles();

            // Show success modal with both code and URL
            this.showSuccessModal(code, shareableURL, file.name);

        } catch (error) {
            console.error('Upload error:', error);
            this.hideUploadProgress();
            this.showToast(`Upload failed: ${error.message}`, 'error', this.config.notificationDuration);
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
        const accessCodeInput = document.getElementById('accessCode');
        if (!accessCodeInput) return;
        
        const code = accessCodeInput.value.trim().toUpperCase();
        console.log('Accessing file with code:', code);
        
        if (!code || code.length !== 4) {
            this.showToast('Please enter a valid 4-digit code', 'error', this.config.notificationDuration);
            return;
        }

        // First check local files
        let fileData = this.files.find(f => f.code === code);
        console.log('Local file found:', fileData ? 'Yes' : 'No');
        
        // If not found locally, check URL fragment (cross-device)
        if (!fileData) {
            fileData = this.decodeFileFromURL(code);
            console.log('URL file found:', fileData ? 'Yes' : 'No');
        }

        if (fileData) {
            this.downloadFile(fileData);
            accessCodeInput.value = '';
            this.showToast(`File found: ${fileData.name}. Starting download...`, 'success', this.config.notificationDuration);
        } else {
            this.showToast('No file found with this code. Make sure you have the correct 4-digit code or try using the full shareable URL.', 'error', this.config.notificationDuration);
            console.log('File not found for code:', code);
        }
    }

    downloadFile(fileData) {
        try {
            console.log('Downloading file:', fileData.name);
            
            // Create download link
            const link = document.createElement('a');
            link.href = fileData.base64;
            link.download = fileData.name;
            
            // Add to DOM, click, then remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showToast(`Downloaded: ${fileData.name}`, 'success', this.config.notificationDuration);

        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Download failed. Please try again.', 'error', this.config.notificationDuration);
        }
    }

    // ============ Room/Clipboard Management ============

    createRoom() {
        const roomCode = this.generateCode();
        const roomCodeInput = document.getElementById('roomCode');
        
        console.log('Creating room with code:', roomCode);
        
        if (roomCodeInput) {
            roomCodeInput.value = roomCode;
        }
        
        this.joinRoom();
    }

    joinRoom() {
        const roomCodeInput = document.getElementById('roomCode');
        if (!roomCodeInput) return;
        
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        console.log('Joining room with code:', roomCode);
        
        if (!roomCode || roomCode.length !== 4) {
            this.showToast('Please enter a valid 4-digit room code', 'error', this.config.notificationDuration);
            return;
        }

        // Leave current room if any
        if (this.currentRoom) {
            this.leaveRoom();
        }

        this.currentRoom = roomCode;
        this.currentMessages = [];
        
        // Load existing room data if available
        const existingRoomData = this.decodeRoomFromURL(roomCode);
        if (existingRoomData && existingRoomData.messages) {
            this.currentMessages = existingRoomData.messages;
        }

        this.showRoomStatus();
        this.enableMessaging();
        this.renderMessages();
        this.startRoomPolling();

        // Generate shareable room URL
        this.encodeRoomToURL(roomCode, this.currentMessages);
        const roomURL = `${window.location.origin}${window.location.pathname}#room-${roomCode}-${btoa(JSON.stringify({code: roomCode, messages: this.currentMessages}))}`;
        
        this.showToast(`Joined room: ${roomCode}. Share this room code OR this URL with others: ${roomURL}`, 'success', this.config.notificationDuration);
    }

    leaveRoom() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }
        this.currentRoom = null;
        this.currentMessages = [];
        this.hideRoomStatus();
        this.disableMessaging();
    }

    startRoomPolling() {
        // Poll for room updates every second
        this.pollTimer = setInterval(() => {
            if (this.currentRoom) {
                const roomData = this.decodeRoomFromURL(this.currentRoom);
                if (roomData && roomData.messages && roomData.messages.length !== this.currentMessages.length) {
                    this.currentMessages = roomData.messages;
                    this.renderMessages();
                }
            }
        }, this.config.pollInterval);
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput || !this.currentRoom) return;
        
        const text = messageInput.value.trim();
        if (!text) {
            this.showToast('Please enter a message', 'error');
            return;
        }

        console.log('Sending message:', text);

        const message = {
            id: this.generateId(),
            text: text,
            device: this.deviceName,
            timestamp: Date.now()
        };

        this.currentMessages.push(message);
        this.encodeRoomToURL(this.currentRoom, this.currentMessages);
        this.renderMessages();

        messageInput.value = '';
        this.showToast('Message sent to all devices in room!', 'success');
    }

    // ============ UI Management ============

    showSuccessModal(code, url, fileName) {
        const modal = document.getElementById('successModal');
        const title = document.getElementById('successTitle');
        const content = document.getElementById('successContent');
        
        if (!modal || !title || !content) return;
        
        title.textContent = `File "${fileName}" Uploaded!`;
        content.innerHTML = `
            <div class="success-content">
                <p><strong>Your file has been uploaded successfully!</strong></p>
                <p>Share either the 4-digit code OR the complete URL below:</p>
                
                <div class="success-code">${code}</div>
                
                <p><strong>OR copy this shareable URL:</strong></p>
                <div class="success-url">${url}</div>
                
                <div class="copy-buttons">
                    <button class="btn btn--secondary" onclick="clypse.copyToClipboard('${code}')">
                        Copy Code
                    </button>
                    <button class="btn btn--secondary" onclick="clypse.copyToClipboard('${url}')">
                        Copy URL
                    </button>
                </div>
                
                <p style="margin-top: var(--space-16); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                    <strong>Instructions:</strong><br>
                    1. Share the 4-digit code OR the complete URL with anyone<br>
                    2. They can enter the code or visit the URL on any device<br>
                    3. The file will download automatically
                </p>
            </div>
        `;
        
        modal.classList.remove('hidden');
        
        // Auto-hide after 20 seconds but keep it visible long enough to read
        setTimeout(() => {
            if (modal && !modal.classList.contains('hidden')) {
                this.showToast('Success modal will stay open - close it when ready', 'info');
            }
        }, 5000);
    }

    showRoomStatus() {
        const roomStatus = document.getElementById('roomStatus');
        const currentRoom = document.getElementById('currentRoom');
        
        if (roomStatus && currentRoom) {
            roomStatus.classList.remove('hidden');
            currentRoom.textContent = this.currentRoom;
        }
    }

    hideRoomStatus() {
        const roomStatus = document.getElementById('roomStatus');
        if (roomStatus) {
            roomStatus.classList.add('hidden');
        }
    }

    enableMessaging() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');

        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = 'Type a message and press Enter...';
        }

        if (sendBtn) {
            sendBtn.disabled = false;
        }
    }

    disableMessaging() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');

        if (messageInput) {
            messageInput.disabled = true;
            messageInput.placeholder = 'Join a room to start messaging...';
            messageInput.value = '';
        }

        if (sendBtn) {
            sendBtn.disabled = true;
        }
    }

    renderMessages() {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;

        if (this.currentMessages.length === 0) {
            messagesList.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>No messages yet</p>
                    <p style="font-size: var(--font-size-sm); margin-top: var(--space-8);">Start typing to send the first message</p>
                </div>
            `;
            return;
        }

        messagesList.innerHTML = this.currentMessages.map(message => `
            <div class="message-item">
                <div class="message-header">
                    <span class="message-device">${this.escapeHtml(message.device)}</span>
                    <span class="message-time">${this.getRelativeTime(new Date(message.timestamp))}</span>
                </div>
                <div class="message-content">${this.escapeHtml(message.text)}</div>
            </div>
        `).join('');

        // Auto scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
    }

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
                    <p style="font-size: var(--font-size-sm); margin-top: var(--space-8);">Upload files to get started</p>
                </div>
            `;
            return;
        }

        filesList.innerHTML = this.files.map(file => `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-name">${this.escapeHtml(file.name)}</div>
                    <div class="file-meta">
                        <span>${file.size}</span>
                        <span>${this.getRelativeTime(new Date(file.uploadTime))}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <div class="file-code" onclick="clypse.copyToClipboard('${file.code}')" title="Click to copy code">
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

    // ============ Progress and Notifications ============

    showUploadProgress() {
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) {
            uploadProgress.classList.remove('hidden');
            this.simulateProgress();
        }
    }

    hideUploadProgress() {
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) {
            setTimeout(() => {
                uploadProgress.classList.add('hidden');
            }, 500);
        }
    }

    simulateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 95) progress = 95;
            
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `Processing... ${Math.round(progress)}%`;
            
            if (progress >= 95) {
                clearInterval(interval);
                if (progressFill) progressFill.style.width = '100%';
                if (progressText) progressText.textContent = 'Complete!';
            }
        }, 100);
    }

    showToast(message, type = 'info', duration = 4000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            console.log('Toast (no container):', message);
            return;
        }
        
        console.log(`Toast (${type}):`, message);
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, duration);
    }

    // ============ Utility Functions ============

    generateCode() {
        let code = '';
        for (let i = 0; i < this.config.codeLength; i++) {
            code += this.config.codeChars.charAt(Math.floor(Math.random() * this.config.codeChars.length));
        }
        return code;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateDeviceId() {
        return 'device-' + this.generateId();
    }

    getDeviceName() {
        const userAgent = navigator.userAgent;
        if (/iPhone/.test(userAgent)) return '📱 iPhone';
        if (/iPad/.test(userAgent)) return '📱 iPad';
        if (/Android/.test(userAgent)) return '📱 Android';
        if (/Mac/.test(userAgent)) return '💻 Mac';
        if (/Windows/.test(userAgent)) return '💻 Windows';
        if (/Linux/.test(userAgent)) return '💻 Linux';
        return '💻 Device';
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
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Copied to clipboard!', 'success');
        }
    }

    updateConnectionStatus() {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot && statusText) {
            if (navigator.onLine) {
                statusDot.style.background = 'var(--color-success)';
                statusText.textContent = 'Online';
            } else {
                statusDot.style.background = 'var(--color-error)';
                statusText.textContent = 'Offline';
            }
        }
    }

    // ============ Storage Management ============

    loadLocalFiles() {
        try {
            const stored = localStorage.getItem('clypse_files');
            this.files = stored ? JSON.parse(stored) : [];
            console.log('Loaded files from storage:', this.files.length);
        } catch (error) {
            console.error('Failed to load local files:', error);
            this.files = [];
        }
    }

    saveLocalFiles() {
        try {
            localStorage.setItem('clypse_files', JSON.stringify(this.files));
            console.log('Saved files to storage:', this.files.length);
        } catch (error) {
            console.error('Failed to save local files:', error);
        }
    }
}

// Global functions for inline event handlers
function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Initialize the application
let clypse;

document.addEventListener('DOMContentLoaded', () => {
    clypse = new Clypse();
});

// Handle online/offline events
window.addEventListener('online', () => {
    if (clypse) {
        clypse.updateConnectionStatus();
        clypse.showToast('Connection restored', 'success');
    }
});

window.addEventListener('offline', () => {
    if (clypse) {
        clypse.updateConnectionStatus();
        clypse.showToast('Connection lost - files and rooms may not sync', 'error', clypse.config.notificationDuration);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (clypse && clypse.currentRoom) {
        clypse.leaveRoom();
    }
});

console.log('Clypse application loaded successfully!');