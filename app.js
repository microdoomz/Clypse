// Clypse - WebRTC P2P File Sharing + GitHub Gist Clipboard
class Clypse {
    constructor() {
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ],
            chunkSize: 16384,
            codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
            pollInterval: 2000,
            notificationDuration: 15000
        };

        this.files = new Map(); // Active file offers
        this.connections = new Map(); // WebRTC connections
        this.currentRoom = null;
        this.deviceId = this.generateId();
        this.gistId = null;
        this.pollTimer = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderFiles();
        this.updateConnectionStatus();
        this.checkUrlParams();
    }

    // Check URL parameters for direct access
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const connectCode = urlParams.get('connect');
        const roomCode = urlParams.get('room');

        if (connectCode) {
            document.getElementById('accessCode').value = connectCode;
            this.connectToFile();
        }

        if (roomCode) {
            this.switchTab('clipboard');
            document.getElementById('roomCode').value = roomCode;
            setTimeout(() => this.joinRoom(), 100);
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.closest('.nav-tab').dataset.tab;
                this.switchTab(tabName);
            });
        });

        // File upload
        this.setupFileUpload();

        // File access
        const accessBtn = document.getElementById('accessBtn');
        const accessCode = document.getElementById('accessCode');
        
        accessBtn.addEventListener('click', () => this.connectToFile());
        accessCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connectToFile();
        });
        accessCode.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
        });

        // Clipboard room management
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        const createRoomBtn = document.getElementById('createRoomBtn');
        const roomCode = document.getElementById('roomCode');
        
        joinRoomBtn.addEventListener('click', () => this.joinRoom());
        createRoomBtn.addEventListener('click', () => this.createRoom());
        roomCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        roomCode.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
        });

        // Clipboard actions
        const copyBtn = document.getElementById('copyBtn');
        const clearBtn = document.getElementById('clearBtn');
        const clipboardInput = document.getElementById('clipboardInput');
        
        copyBtn.addEventListener('click', () => this.copyToClipboard());
        clearBtn.addEventListener('click', () => this.clearClipboard());
        clipboardInput.addEventListener('input', (e) => this.handleClipboardInput(e));

        // Modal
        const modalClose = document.getElementById('modalClose');
        modalClose.addEventListener('click', () => this.closeModal());
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.onchange = (e) => this.handleFileSelect(e);
            input.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFileSelect(e);
        });
    }

    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');

        if (tabName === 'clipboard') {
            this.renderClipboardHistory();
        }
    }

    // =========================
    // WebRTC P2P FILE SHARING
    // =========================

    async handleFileSelect(e) {
        const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
        for (const file of files) {
            await this.createFileOffer(file);
        }
    }

    async createFileOffer(file) {
        const code = this.generateCode();
        
        try {
            this.showProgress('Creating WebRTC offer...');

            const pc = new RTCPeerConnection({ iceServers: this.config.iceServers });
            
            // Create data channel for file transfer
            const dataChannel = pc.createDataChannel('file', {
                ordered: true,
                maxRetransmits: 3
            });

            // Store file offer
            const fileOffer = {
                code,
                file,
                pc,
                dataChannel,
                created: Date.now(),
                status: 'waiting'
            };

            this.files.set(code, fileOffer);

            // Setup data channel handlers
            dataChannel.onopen = () => {
                console.log('Data channel opened for', code);
                fileOffer.status = 'connected';
                this.sendFile(dataChannel, file);
            };

            dataChannel.onerror = (error) => {
                console.error('Data channel error:', error);
                this.showToast('File transfer failed', 'error');
            };

            // Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Wait for ICE gathering
            await new Promise((resolve) => {
                pc.onicecandidate = (event) => {
                    if (!event.candidate) {
                        resolve(); // ICE gathering complete
                    }
                };
            });

            fileOffer.offer = pc.localDescription;
            
            this.hideProgress();
            this.renderFiles();
            
            const shareUrl = `${window.location.origin}${window.location.pathname}?connect=${code}`;
            this.showToast(`File ready! Code: ${code}\nShare URL: ${shareUrl}`, 'success');

        } catch (error) {
            console.error('Error creating file offer:', error);
            this.hideProgress();
            this.showToast('Failed to create file offer', 'error');
        }
    }

    async connectToFile() {
        const code = document.getElementById('accessCode').value.trim();
        if (!code || code.length !== 4) {
            this.showToast('Please enter a valid 4-digit code', 'error');
            return;
        }

        try {
            this.showProgress('Connecting to peer...');

            // In a real implementation, you'd need a signaling server
            // For demo purposes, we'll simulate finding the offer
            const fileOffer = this.files.get(code);
            if (!fileOffer) {
                this.showToast('No file found with this code. Make sure the sender is online.', 'error');
                this.hideProgress();
                return;
            }

            const pc = new RTCPeerConnection({ iceServers: this.config.iceServers });
            
            // Handle incoming data channel
            pc.ondatachannel = (event) => {
                const dataChannel = event.channel;
                this.receiveFile(dataChannel, code);
            };

            // Set remote description and create answer
            await pc.setRemoteDescription(fileOffer.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // In real implementation, send answer back to offerer via signaling
            // For demo, we'll directly set it
            await fileOffer.pc.setRemoteDescription(answer);

            this.hideProgress();
            this.showToast('Connected! File transfer starting...', 'success');

        } catch (error) {
            console.error('Connection error:', error);
            this.hideProgress();
            this.showToast('Failed to connect to peer', 'error');
        }
    }

    sendFile(dataChannel, file) {
        const chunkSize = this.config.chunkSize;
        let offset = 0;

        // Send metadata first
        dataChannel.send(JSON.stringify({
            type: 'metadata',
            name: file.name,
            size: file.size,
            type: file.type
        }));

        const sendChunk = () => {
            const slice = file.slice(offset, offset + chunkSize);
            const reader = new FileReader();
            
            reader.onload = (e) => {
                dataChannel.send(e.target.result);
                offset += chunkSize;
                
                const progress = Math.min((offset / file.size) * 100, 100);
                this.showProgress(`Sending: ${Math.round(progress)}%`);
                
                if (offset < file.size) {
                    sendChunk();
                } else {
                    dataChannel.send(JSON.stringify({ type: 'complete' }));
                    this.hideProgress();
                    this.showToast('File sent successfully!', 'success');
                }
            };
            
            reader.readAsArrayBuffer(slice);
        };

        sendChunk();
    }

    receiveFile(dataChannel, code) {
        let metadata = null;
        let receivedData = [];
        let receivedSize = 0;

        dataChannel.onmessage = (event) => {
            if (typeof event.data === 'string') {
                const message = JSON.parse(event.data);
                
                if (message.type === 'metadata') {
                    metadata = message;
                    this.showProgress(`Receiving: ${metadata.name}`);
                } else if (message.type === 'complete') {
                    this.downloadReceivedFile(receivedData, metadata);
                    this.hideProgress();
                    this.showToast('File received successfully!', 'success');
                }
            } else {
                receivedData.push(event.data);
                receivedSize += event.data.byteLength;
                
                if (metadata) {
                    const progress = (receivedSize / metadata.size) * 100;
                    this.showProgress(`Receiving: ${Math.round(progress)}%`);
                }
            }
        };
    }

    downloadReceivedFile(chunks, metadata) {
        const blob = new Blob(chunks, { type: metadata.type });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = metadata.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    // =========================
    // GITHUB GIST CLIPBOARD
    // =========================

    async createRoom() {
        const code = this.generateCode();
        
        try {
            this.showProgress('Creating room...');

            const gistData = {
                description: `Clypse Room ${code}`,
                public: false,
                files: {
                    'messages.json': {
                        content: JSON.stringify({
                            roomCode: code,
                            messages: [],
                            created: Date.now()
                        })
                    }
                }
            };

            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(gistData)
            });

            if (!response.ok) {
                throw new Error(`Failed to create room: ${response.status}`);
            }

            const gist = await response.json();
            this.gistId = gist.id;
            this.currentRoom = code;

            document.getElementById('roomCode').value = code;
            this.joinRoom();
            
            this.hideProgress();
            
            const shareUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
            this.showToast(`Room created! Code: ${code}\nShare URL: ${shareUrl}`, 'success');

        } catch (error) {
            console.error('Error creating room:', error);
            this.hideProgress();
            this.showToast('Failed to create room. Using local storage fallback.', 'error');
            this.createLocalRoom(code);
        }
    }

    createLocalRoom(code) {
        // Fallback to localStorage when GitHub API fails
        this.currentRoom = code;
        this.gistId = null;
        document.getElementById('roomCode').value = code;
        this.joinRoom();
        this.showToast(`Room created locally: ${code}`, 'success');
    }

    async joinRoom() {
        const code = document.getElementById('roomCode').value.trim();
        if (!code || code.length !== 4) {
            this.showToast('Please enter a valid 4-digit room code', 'error');
            return;
        }

        if (this.currentRoom) {
            this.leaveRoom();
        }

        this.currentRoom = code;
        
        try {
            // Try to find existing gist
            await this.findRoomGist(code);
        } catch (error) {
            console.log('Using local storage for room:', code);
        }

        this.showRoomStatus();
        this.enableClipboard();
        this.startPolling();
        
        this.showToast(`Joined room: ${code}`, 'success');
    }

    async findRoomGist(code) {
        // Search for public gists with room code
        const response = await fetch('https://api.github.com/gists/public?per_page=100');
        if (!response.ok) throw new Error('Cannot search gists');
        
        const gists = await response.json();
        const roomGist = gists.find(gist => 
            gist.description && gist.description.includes(`Clypse Room ${code}`)
        );

        if (roomGist) {
            this.gistId = roomGist.id;
        }
    }

    leaveRoom() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.currentRoom = null;
        this.gistId = null;
    }

    showRoomStatus() {
        const roomStatus = document.getElementById('roomStatus');
        const currentRoom = document.getElementById('currentRoom');
        
        roomStatus.classList.remove('hidden');
        currentRoom.textContent = this.currentRoom;
        this.updateDeviceCount();
    }

    enableClipboard() {
        const clipboardInput = document.getElementById('clipboardInput');
        const copyBtn = document.getElementById('copyBtn');
        const clearBtn = document.getElementById('clearBtn');

        clipboardInput.disabled = false;
        clipboardInput.placeholder = 'Type or paste content to sync across devices...';
        copyBtn.disabled = false;
        clearBtn.disabled = false;

        // Load current content
        this.loadClipboardContent();
    }

    async loadClipboardContent() {
        if (this.gistId) {
            try {
                const gist = await this.getGist();
                const data = JSON.parse(gist.files['messages.json'].content);
                const lastMessage = data.messages[data.messages.length - 1];
                
                if (lastMessage) {
                    document.getElementById('clipboardInput').value = lastMessage.text;
                }
            } catch (error) {
                console.log('Loading from localStorage fallback');
                this.loadFromLocalStorage();
            }
        } else {
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        const content = localStorage.getItem(`clypse_clipboard_${this.currentRoom}`) || '';
        document.getElementById('clipboardInput').value = content;
    }

    startPolling() {
        this.pollTimer = setInterval(async () => {
            try {
                if (this.gistId) {
                    await this.pollGist();
                } else {
                    this.pollLocalStorage();
                }
                this.updateDeviceCount();
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, this.config.pollInterval);
    }

    async pollGist() {
        const gist = await this.getGist();
        const data = JSON.parse(gist.files['messages.json'].content);
        
        // Update clipboard if content changed
        const clipboardInput = document.getElementById('clipboardInput');
        const lastMessage = data.messages[data.messages.length - 1];
        
        if (lastMessage && lastMessage.text !== clipboardInput.value) {
            clipboardInput.value = lastMessage.text;
        }
        
        this.renderMessages(data.messages);
    }

    pollLocalStorage() {
        const content = localStorage.getItem(`clypse_clipboard_${this.currentRoom}`) || '';
        const clipboardInput = document.getElementById('clipboardInput');
        
        if (content !== clipboardInput.value) {
            clipboardInput.value = content;
        }
        
        const messages = JSON.parse(localStorage.getItem(`clypse_messages_${this.currentRoom}`) || '[]');
        this.renderMessages(messages);
    }

    async handleClipboardInput(e) {
        if (!this.currentRoom) return;

        const content = e.target.value;
        
        if (this.gistId) {
            await this.sendMessageToGist(content);
        } else {
            this.sendMessageToLocalStorage(content);
        }
    }

    async sendMessageToGist(text) {
        try {
            const gist = await this.getGist();
            const data = JSON.parse(gist.files['messages.json'].content);
            
            data.messages.push({
                id: Date.now(),
                text: text,
                timestamp: Date.now(),
                device: this.getDeviceName()
            });

            await this.updateGist(data);
        } catch (error) {
            console.error('Failed to send to gist:', error);
            this.sendMessageToLocalStorage(text);
        }
    }

    sendMessageToLocalStorage(text) {
        localStorage.setItem(`clypse_clipboard_${this.currentRoom}`, text);
        
        const messages = JSON.parse(localStorage.getItem(`clypse_messages_${this.currentRoom}`) || '[]');
        messages.push({
            id: Date.now(),
            text: text,
            timestamp: Date.now(),
            device: this.getDeviceName()
        });
        
        // Keep only last 50 messages
        if (messages.length > 50) {
            messages.splice(0, messages.length - 50);
        }
        
        localStorage.setItem(`clypse_messages_${this.currentRoom}`, JSON.stringify(messages));
    }

    async getGist() {
        const response = await fetch(`https://api.github.com/gists/${this.gistId}`);
        if (!response.ok) throw new Error('Failed to get gist');
        return await response.json();
    }

    async updateGist(data) {
        const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                files: {
                    'messages.json': {
                        content: JSON.stringify(data)
                    }
                }
            })
        });

        if (!response.ok) throw new Error('Failed to update gist');
        return await response.json();
    }

    async copyToClipboard() {
        const content = document.getElementById('clipboardInput').value;
        if (!content.trim()) {
            this.showToast('No content to copy', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(content);
            this.showToast('Copied to system clipboard!', 'success');
        } catch (error) {
            // Fallback for older browsers
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
        clipboardInput.value = '';
        
        if (this.gistId) {
            this.sendMessageToGist('');
        } else {
            this.sendMessageToLocalStorage('');
        }
        
        this.showToast('Clipboard cleared', 'info');
    }

    // =========================
    // RENDERING METHODS
    // =========================

    renderFiles() {
        const filesList = document.getElementById('filesList');
        
        if (this.files.size === 0) {
            filesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <p>No files shared yet</p>
                    <p style="font-size: var(--font-size-sm); margin-top: var(--space-8);">Upload files to get started</p>
                </div>
            `;
            return;
        }

        filesList.innerHTML = Array.from(this.files.entries()).map(([code, fileOffer]) => `
            <div class="file-item">
                <div class="file-info">
                    <h4>${fileOffer.file.name}</h4>
                    <div class="file-meta">
                        ${this.formatFileSize(fileOffer.file.size)} • ${this.getRelativeTime(new Date(fileOffer.created))}
                    </div>
                </div>
                <div class="file-code" onclick="clypse.copyFileCode('${code}')">
                    ${code}
                </div>
            </div>
        `).join('');
    }

    renderMessages(messages) {
        this.renderClipboardHistory(messages);
    }

    renderClipboardHistory(messages = null) {
        const historyList = document.getElementById('historyList');
        
        if (!this.currentRoom) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <p>Join a room to see message history</p>
                </div>
            `;
            return;
        }

        if (!messages) {
            if (this.gistId) {
                // Will be loaded by polling
                return;
            } else {
                messages = JSON.parse(localStorage.getItem(`clypse_messages_${this.currentRoom}`) || '[]');
            }
        }

        if (messages.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <p>No messages yet</p>
                    <p style="font-size: var(--font-size-sm); margin-top: var(--space-8);">Start typing to create history</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = messages.slice(-10).reverse().map(message => `
            <div class="history-item" onclick="clypse.selectMessage('${message.id}')">
                <div class="history-content">${this.truncateText(message.text, 100)}</div>
                <div class="history-meta">
                    <span>${this.getRelativeTime(new Date(message.timestamp))}</span>
                    <span>${message.device}</span>
                </div>
            </div>
        `).join('');
    }

    async selectMessage(messageId) {
        const messages = this.gistId ? 
            (await this.getGist()).files['messages.json'].content :
            localStorage.getItem(`clypse_messages_${this.currentRoom}`) || '[]';
        
        const parsedMessages = JSON.parse(messages);
        const message = parsedMessages.find(m => m.id == messageId);
        
        if (message) {
            document.getElementById('clipboardInput').value = message.text;
            await this.copyToClipboard();
        }
    }

    updateDeviceCount() {
        const deviceCount = document.getElementById('deviceCount');
        if (deviceCount) {
            // Simulate device count (in real app, track via heartbeat)
            deviceCount.textContent = '1';
        }
    }

    // =========================
    // UTILITY METHODS
    // =========================

    generateCode() {
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += this.config.codeChars.charAt(Math.floor(Math.random() * this.config.codeChars.length));
        }
        return code;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
        return date.toLocaleDateString();
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    async copyFileCode(code) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?connect=${code}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            this.showToast(`Share URL copied: ${shareUrl}`, 'success');
        } catch (error) {
            await navigator.clipboard.writeText(code);
            this.showToast(`Code copied: ${code}`, 'success');
        }
    }

    updateConnectionStatus() {
        const statusText = document.getElementById('statusText');
        statusText.textContent = navigator.onLine ? 'Online' : 'Offline';
    }

    showProgress(text) {
        const uploadProgress = document.getElementById('uploadProgress');
        const progressText = document.getElementById('progressText');
        
        uploadProgress.classList.remove('hidden');
        progressText.textContent = text;
    }

    hideProgress() {
        const uploadProgress = document.getElementById('uploadProgress');
        uploadProgress.classList.add('hidden');
    }

    showModal(title, content) {
        const modal = document.getElementById('transferModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.classList.remove('hidden');
    }

    closeModal() {
        const modal = document.getElementById('transferModal');
        modal.classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, this.config.notificationDuration);
    }
}

// Initialize the application
const clypse = new Clypse();

// Handle online/offline events
window.addEventListener('online', () => clypse.updateConnectionStatus());
window.addEventListener('offline', () => clypse.updateConnectionStatus());

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (clypse.currentRoom) {
        clypse.leaveRoom();
    }
});

console.log('Clypse WebRTC P2P + GitHub Gist application loaded!');