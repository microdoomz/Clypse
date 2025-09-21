/**
 * Clypse - Complete Cross-Device File & Clipboard Sharing
 * Telegraph.ph for file hosting + Firebase for real-time clipboard sync
 * FIXED VERSION - Theme toggle and message input bugs resolved
 */

class ClypseApp {
    constructor() {
        this.config = {
            telegraph: {
                uploadUrl: 'https://telegra.ph/upload',
                baseUrl: 'https://telegra.ph',
                maxFileSize: 1610612736 // 1.5GB
            },
            firebase: {
                databaseURL: 'https://clypse-app-default-rtdb.firebaseio.com/'
            },
            codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
            codeLength: 4,
            notificationDuration: 15000,
            maxMessages: 100,
            cleanupDays: 7
        };

        this.currentRoom = null;
        this.currentTheme = 'light'; // Track current theme
        this.deviceId = this.generateId();
        this.database = null;
        this.roomRef = null;
        this.messagesListener = null;

        // Initialize Firebase
        this.initFirebase();
        
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    initFirebase() {
        try {
            // Initialize Firebase
            const firebaseConfig = {
                databaseURL: this.config.firebase.databaseURL
            };
            
            if (typeof firebase !== 'undefined') {
                firebase.initializeApp(firebaseConfig);
                this.database = firebase.database();
                console.log('Firebase initialized successfully');
            } else {
                console.error('Firebase not loaded');
            }
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }

    init() {
        console.log('Initializing Clypse app...');
        this.setupTheme();
        this.setupEventListeners();
        this.checkUrlParams();
        this.loadUserFiles();
        console.log('Clypse app initialized successfully!');
    }

    setupTheme() {
        const saved = localStorage.getItem('clypse_theme');
        const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const theme = saved || system;
        this.currentTheme = theme;
        this.setTheme(theme);
    }

    setTheme(theme) {
        console.log('Setting theme to:', theme);
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-color-scheme', theme);
        localStorage.setItem('clypse_theme', theme);
    }

    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const fileCode = params.get('file');
        const roomCode = params.get('room');

        if (fileCode) {
            document.getElementById('downloadCode').value = fileCode;
            this.switchTab('files');
            this.downloadFile();
        } else if (roomCode) {
            document.getElementById('roomCode').value = roomCode;
            this.switchTab('clipboard');
            this.joinRoom();
        }
    }

    setupEventListeners() {
        // Theme toggle - FIXED
        document.getElementById('themeToggle').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle between themes
            const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            console.log('Theme toggle clicked. Current:', this.currentTheme, 'New:', newTheme);
            
            this.setTheme(newTheme);
            this.showToast(`Switched to ${newTheme} mode`, 'info');
        });

        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // File upload
        this.setupFileUpload();

        // File download
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadFile());
        document.getElementById('downloadCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.downloadFile();
        });
        document.getElementById('downloadCode').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
        });

        // Room management
        document.getElementById('createRoomBtn').addEventListener('click', () => this.createRoom());
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.joinRoom());
        document.getElementById('leaveRoomBtn').addEventListener('click', () => this.leaveRoom());
        document.getElementById('roomCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        document.getElementById('roomCode').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
        });

        // Message handling - FIXED
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendMessageBtn');
        const copyBtn = document.getElementById('copyMessageBtn');
        
        // Ensure message input is visible and functional
        if (messageInput) {
            // Force visibility styles
            messageInput.style.color = 'var(--color-text)';
            messageInput.style.backgroundColor = 'var(--color-surface)';
            
            messageInput.addEventListener('input', (e) => {
                console.log('Message input changed:', e.target.value);
            });
            
            messageInput.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyMessage());
        }

        // Share modal
        document.getElementById('closeShareModal').addEventListener('click', () => this.closeShareModal());
        document.getElementById('copyCodeBtn').addEventListener('click', () => this.copyShareCode());
        document.getElementById('copyUrlBtn').addEventListener('click', () => this.copyShareUrl());
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.uploadFiles(files);
            }
            e.target.value = '';
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.uploadFiles(files);
            }
        });
    }

    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-content`).classList.add('active');

        // Update URL without reload
        const url = new URL(window.location);
        url.searchParams.delete('file');
        url.searchParams.delete('room');
        history.replaceState(null, '', url.toString());
    }

    // FILE SHARING METHODS

    async uploadFiles(files) {
        for (const file of files) {
            if (file.size > this.config.telegraph.maxFileSize) {
                this.showToast(`File "${file.name}" exceeds 1.5GB limit`, 'error');
                continue;
            }
            await this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const code = this.generateCode();
        console.log('Uploading file:', file.name, 'Code:', code);

        // Show progress
        this.showUploadProgress(code, file.name);

        try {
            // Upload to Telegraph
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(this.config.telegraph.uploadUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const result = await response.json();

            if (result && result[0] && result[0].src) {
                const fileUrl = this.config.telegraph.baseUrl + result[0].src;

                // Save file metadata to Firebase for cross-device access
                const fileData = {
                    code: code,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: fileUrl,
                    uploaded: Date.now(),
                    expires: Date.now() + (this.config.cleanupDays * 24 * 60 * 60 * 1000)
                };

                await this.saveFileToFirebase(code, fileData);
                
                // Also save locally
                localStorage.setItem(`clypse_file_${code}`, JSON.stringify(fileData));

                this.hideUploadProgress();
                this.showUploadSuccess(code, fileUrl, file);
                this.loadUserFiles();

                return { code, url: fileUrl };
            } else {
                throw new Error('Invalid response from Telegraph');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.hideUploadProgress();
            this.showToast(`Upload failed: ${error.message}`, 'error');
        }
    }

    async saveFileToFirebase(code, fileData) {
        if (!this.database) return;
        
        try {
            await this.database.ref(`files/${code}`).set(fileData);
            console.log('File metadata saved to Firebase');
        } catch (error) {
            console.error('Firebase save error:', error);
        }
    }

    async getFileFromFirebase(code) {
        if (!this.database) return null;
        
        try {
            const snapshot = await this.database.ref(`files/${code}`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Firebase get error:', error);
            return null;
        }
    }

    async downloadFile() {
        const code = document.getElementById('downloadCode').value.trim();
        
        if (code.length !== 4) {
            this.showToast('Please enter a valid 4-digit code', 'error');
            return;
        }

        console.log('Downloading file with code:', code);

        try {
            // Try Firebase first
            let fileData = await this.getFileFromFirebase(code);
            
            // Fallback to localStorage
            if (!fileData) {
                const stored = localStorage.getItem(`clypse_file_${code}`);
                if (stored) {
                    fileData = JSON.parse(stored);
                }
            }

            if (!fileData) {
                this.showToast('File not found or expired', 'error');
                return;
            }

            // Check if expired
            if (Date.now() > fileData.expires) {
                this.showToast('File has expired', 'error');
                return;
            }

            // Direct download from Telegraph
            const link = document.createElement('a');
            link.href = fileData.url;
            link.download = fileData.name;
            link.target = '_blank';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showToast(`Downloading: ${fileData.name}`, 'success');
            document.getElementById('downloadCode').value = '';

        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Download failed', 'error');
        }
    }

    // CLIPBOARD SYNC METHODS

    async createRoom() {
        const code = this.generateCode();
        console.log('Creating room:', code);

        document.getElementById('roomCode').value = code;
        await this.joinRoom();
    }

    async joinRoom() {
        if (!this.database) {
            this.showToast('Firebase not available', 'error');
            return;
        }

        const code = document.getElementById('roomCode').value.trim();
        
        if (code.length !== 4) {
            this.showToast('Please enter a valid 4-digit room code', 'error');
            return;
        }

        console.log('Joining room:', code);

        // Leave current room first
        if (this.currentRoom) {
            this.leaveRoom();
        }

        this.currentRoom = code;
        this.roomRef = this.database.ref(`rooms/${code}`);

        // Initialize room if it doesn't exist
        try {
            await this.roomRef.child('created').transaction((current) => {
                if (current === null) {
                    return Date.now();
                }
                return current;
            });

            // Listen for messages
            this.messagesListener = this.roomRef.child('messages').on('value', (snapshot) => {
                this.renderMessages(snapshot.val() || {});
            });

            this.showRoomStatus(code);
            this.enableMessageInput();
            this.showToast(`Joined room: ${code}`, 'success');

        } catch (error) {
            console.error('Join room error:', error);
            this.showToast('Failed to join room', 'error');
        }
    }

    leaveRoom() {
        if (this.messagesListener && this.roomRef) {
            this.roomRef.child('messages').off('value', this.messagesListener);
            this.messagesListener = null;
        }
        
        this.roomRef = null;
        this.currentRoom = null;
        this.hideRoomStatus();
        this.disableMessageInput();
        this.showToast('Left room', 'info');
        this.renderMessages({});
    }

    async sendMessage() {
        if (!this.currentRoom || !this.roomRef) {
            this.showToast('Please join a room first', 'error');
            return;
        }

        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value.trim();

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

        try {
            await this.roomRef.child('messages').push(message);
            messageInput.value = '';
            this.showToast('Message sent!', 'success');
        } catch (error) {
            console.error('Send message error:', error);
            this.showToast('Failed to send message', 'error');
        }
    }

    async copyMessage() {
        const text = document.getElementById('messageInput').value.trim();
        
        if (!text) {
            this.showToast('No message to copy', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Message copied to clipboard!', 'success');
        } catch (error) {
            this.fallbackCopy(text);
            this.showToast('Message copied to clipboard!', 'success');
        }
    }

    // UI METHODS

    showUploadProgress(code, fileName) {
        const progress = document.getElementById('uploadProgress');
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        
        progress.classList.remove('hidden');
        progressText.textContent = `Uploading ${fileName}...`;
        progressFill.style.width = '50%';
        
        // Simulate progress
        setTimeout(() => {
            progressFill.style.width = '90%';
        }, 500);
    }

    hideUploadProgress() {
        const progress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        
        progressFill.style.width = '100%';
        setTimeout(() => {
            progress.classList.add('hidden');
            progressFill.style.width = '0%';
        }, 500);
    }

    showUploadSuccess(code, url, file) {
        // Show share modal
        document.getElementById('shareCode').textContent = code;
        document.getElementById('shareUrl').textContent = `${window.location.origin}/?file=${code}`;
        document.getElementById('shareModal').classList.remove('hidden');
        
        this.showToast(`File uploaded! Code: ${code}`, 'success');
    }

    closeShareModal() {
        document.getElementById('shareModal').classList.add('hidden');
    }

    async copyShareCode() {
        const code = document.getElementById('shareCode').textContent;
        try {
            await navigator.clipboard.writeText(code);
            this.showToast('Code copied!', 'success');
        } catch (error) {
            this.fallbackCopy(code);
            this.showToast('Code copied!', 'success');
        }
    }

    async copyShareUrl() {
        const url = document.getElementById('shareUrl').textContent;
        try {
            await navigator.clipboard.writeText(url);
            this.showToast('URL copied!', 'success');
        } catch (error) {
            this.fallbackCopy(url);
            this.showToast('URL copied!', 'success');
        }
    }

    showRoomStatus(code) {
        document.getElementById('roomStatus').classList.remove('hidden');
        document.getElementById('currentRoomCode').textContent = code;
    }

    hideRoomStatus() {
        document.getElementById('roomStatus').classList.add('hidden');
    }

    enableMessageInput() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendMessageBtn');
        const copyBtn = document.getElementById('copyMessageBtn');
        
        messageInput.disabled = false;
        messageInput.placeholder = 'Type your message and press Ctrl+Enter or click Send...';
        sendBtn.disabled = false;
        copyBtn.disabled = false;
        
        // Force refresh text visibility
        messageInput.style.color = 'var(--color-text)';
    }

    disableMessageInput() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendMessageBtn');
        const copyBtn = document.getElementById('copyMessageBtn');
        
        messageInput.disabled = true;
        messageInput.placeholder = 'Join a room to start sharing messages...';
        messageInput.value = '';
        sendBtn.disabled = true;
        copyBtn.disabled = true;
    }

    loadUserFiles() {
        const filesList = document.getElementById('filesList');
        const files = this.getUserFiles();

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
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-code" onclick="app.copyFileCode('${file.code}')">
                        ${file.code}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                    <a href="${file.url}" target="_blank" class="btn btn--primary">Download</a>
                </div>
            </div>
        `).join('');
    }

    renderMessages(messagesData) {
        const messagesList = document.getElementById('messagesList');
        const messages = Object.values(messagesData || {}).sort((a, b) => b.timestamp - a.timestamp);

        if (!this.currentRoom) {
            messagesList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    </svg>
                    <p>Join a room to see messages</p>
                    <small>Create or join a room to start syncing messages</small>
                </div>
            `;
            return;
        }

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

        messagesList.innerHTML = messages.slice(0, this.config.maxMessages).map(message => `
            <div class="message-item" onclick="app.copyMessageText('${this.escapeHtml(message.text).replace(/'/g, '&#39;')}')">
                <div class="message-content">${this.escapeHtml(message.text)}</div>
                <div class="message-meta">
                    <span>${message.device || 'Unknown Device'}</span>
                    <span>${this.formatTime(message.timestamp)}</span>
                </div>
            </div>
        `).join('');
    }

    // PUBLIC METHODS FOR ONCLICK HANDLERS

    copyFileCode(code) {
        this.fallbackCopy(code);
        this.showToast(`Code ${code} copied!`, 'success');
    }

    copyMessageText(text) {
        const messageInput = document.getElementById('messageInput');
        messageInput.value = text;
        messageInput.focus();
        this.fallbackCopy(text);
        this.showToast('Message copied and loaded!', 'success');
    }

    // UTILITY METHODS

    getUserFiles() {
        const files = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('clypse_file_')) {
                try {
                    const fileData = JSON.parse(localStorage.getItem(key));
                    if (Date.now() <= fileData.expires) {
                        files.push(fileData);
                    } else {
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    localStorage.removeItem(key);
                }
            }
        }
        return files.sort((a, b) => b.uploaded - a.uploaded);
    }

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

    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
        } catch (error) {
            console.error('Copy failed:', error);
        }
        
        document.body.removeChild(textArea);
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
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

// Initialize app
const app = new ClypseApp();

// Make app globally accessible for onclick handlers
window.app = app;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (app.currentRoom) {
        app.leaveRoom();
    }
});

console.log('Clypse Complete Edition - FIXED VERSION - File Sharing + Clipboard Sync Ready!');