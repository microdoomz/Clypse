// SIMPLE CLIPBOARD SYNC - BASIC VERSION THAT ACTUALLY WORKS
console.log('🚀 Starting Simple Clypse...');

let currentRoom = null;
let deviceId = null;
let deviceName = 'Desktop';

// Generate device info
function initDevice() {
    deviceId = localStorage.getItem('clypse_device') || 'dev_' + Date.now();
    localStorage.setItem('clypse_device', deviceId);
    
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(ua)) deviceName = 'Mobile';
    else if (/Mac/.test(ua)) deviceName = 'Mac';
    else if (/Windows/.test(ua)) deviceName = 'Windows';
    
    console.log('📱 Device:', deviceName, deviceId);
}

// Generate random 4-digit code
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    console.log('🎲 Generated code:', code);
    return code;
}

// Show notification
function showNotification(message, type = 'success') {
    console.log(`📢 ${message}`);
    
    const notifications = document.getElementById('notifications');
    if (!notifications) return;
    
    const div = document.createElement('div');
    div.className = `notification ${type} show`;
    div.textContent = message;
    
    notifications.appendChild(div);
    
    setTimeout(() => {
        if (div.parentNode) div.parentNode.removeChild(div);
    }, 4000);
}

// Switch tabs
function switchTab(tabName) {
    console.log('🔄 Switching to:', tabName);
    
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Create room
function createRoom() {
    console.log('🏗️ Creating room...');
    
    const btn = document.getElementById('createBtn');
    btn.textContent = 'Creating...';
    btn.disabled = true;
    
    setTimeout(() => {
        const code = generateCode();
        
        // Fill join form and switch
        document.getElementById('roomCode').value = code;
        switchTab('join');
        
        // Join the room
        setTimeout(() => {
            joinRoom();
            showNotification(`Room ${code} created! Share this code: ${code}`, 'success');
        }, 500);
        
        btn.textContent = '🏗️ Create New Room';
        btn.disabled = false;
    }, 800);
}

// Join room
function joinRoom() {
    const roomCodeInput = document.getElementById('roomCode');
    const code = roomCodeInput.value.trim().toUpperCase();
    
    console.log('🚪 Joining room:', code);
    
    if (!code || code.length !== 4) {
        showNotification('Please enter a valid 4-digit code', 'error');
        return;
    }
    
    const btn = document.getElementById('joinBtn');
    btn.textContent = 'Joining...';
    btn.disabled = true;
    
    setTimeout(() => {
        currentRoom = code;
        
        // Show room status
        document.getElementById('roomStatus').classList.remove('hidden');
        document.getElementById('currentRoomCode').textContent = code;
        document.getElementById('deviceCount').textContent = '1';
        
        // Enable message input
        const messageInput = document.getElementById('messageInput');
        messageInput.disabled = false;
        messageInput.placeholder = 'Type your message here...';
        
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('pasteBtn').disabled = false;
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('room', code);
        window.history.pushState({}, '', url);
        
        // Load messages
        loadMessages();
        
        showNotification(`Joined room ${code}!`, 'success');
        
        btn.textContent = 'Join';
        btn.disabled = false;
    }, 800);
}

// Leave room
function leaveRoom() {
    console.log('👋 Leaving room');
    
    currentRoom = null;
    
    // Hide room status
    document.getElementById('roomStatus').classList.add('hidden');
    
    // Disable input
    const messageInput = document.getElementById('messageInput');
    messageInput.disabled = true;
    messageInput.placeholder = 'Join a room to start sharing text...';
    messageInput.value = '';
    
    document.getElementById('sendBtn').disabled = true;
    document.getElementById('pasteBtn').disabled = true;
    document.getElementById('roomCode').value = '';
    
    // Clear URL
    const url = new URL(window.location);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url);
    
    // Clear messages
    document.getElementById('messagesList').innerHTML = '<div class="empty-state"><p>Join a room to see messages</p></div>';
    
    showNotification('Left the room', 'info');
}

// Send message
function sendMessage() {
    if (!currentRoom) {
        showNotification('Please join a room first!', 'error');
        return;
    }
    
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    console.log('📤 Sending message:', content);
    
    if (!content) {
        showNotification('Please enter a message!', 'error');
        return;
    }
    
    const btn = document.getElementById('sendBtn');
    btn.innerHTML = 'Sending...';
    btn.disabled = true;
    
    setTimeout(() => {
        // Create message
        const message = {
            id: Date.now(),
            content: content,
            timestamp: Date.now(),
            device: deviceName,
            deviceId: deviceId
        };
        
        // Save to localStorage
        const key = `clypse_room_${currentRoom}`;
        let messages = JSON.parse(localStorage.getItem(key) || '[]');
        messages.unshift(message);
        if (messages.length > 50) messages.splice(50);
        localStorage.setItem(key, JSON.stringify(messages));
        
        // Clear input
        messageInput.value = '';
        
        // Reload messages
        loadMessages();
        
        showNotification('Message sent!', 'success');
        
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22,2 15,22 11,13 2,9"/>
        </svg> Send to Room`;
        btn.disabled = false;
    }, 500);
}

// Load and display messages
function loadMessages() {
    if (!currentRoom) return;
    
    console.log('📝 Loading messages for room:', currentRoom);
    
    const key = `clypse_room_${currentRoom}`;
    const messages = JSON.parse(localStorage.getItem(key) || '[]');
    
    const messagesList = document.getElementById('messagesList');
    
    if (messages.length === 0) {
        messagesList.innerHTML = '<div class="empty-state"><p>No messages yet. Send the first one!</p></div>';
        return;
    }
    
    const html = messages.map(msg => {
        const time = formatTime(msg.timestamp);
        return `
            <div class="message-item" onclick="copyMessage('${escapeHtml(msg.content)}')">
                <div class="message-content">${escapeHtml(msg.content)}</div>
                <div class="message-meta">
                    <span>${time}</span>
                    <span>${escapeHtml(msg.device)}</span>
                </div>
            </div>
        `;
    }).join('');
    
    messagesList.innerHTML = html;
    console.log('✅ Loaded', messages.length, 'messages');
}

// Copy message to input
async function copyMessage(content) {
    console.log('📋 Copying message');
    
    try {
        await navigator.clipboard.writeText(content);
        document.getElementById('messageInput').value = content;
        showNotification('Message copied!', 'success');
    } catch (error) {
        // Fallback
        document.getElementById('messageInput').value = content;
        showNotification('Message copied to input!', 'success');
    }
}

// Paste from clipboard
async function pasteFromClipboard() {
    console.log('📋 Pasting from clipboard');
    
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('messageInput').value = text;
        showNotification('Pasted from clipboard!', 'success');
    } catch (error) {
        showNotification('Please paste manually with Ctrl+V', 'info');
    }
}

// Format timestamp
function formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Check URL for room code
function checkURL() {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode && roomCode.length === 4) {
        console.log('🔗 Auto-joining from URL:', roomCode);
        document.getElementById('roomCode').value = roomCode;
        switchTab('join');
        setTimeout(() => joinRoom(), 1000);
    }
}

// Setup event listeners
function setupEvents() {
    console.log('🎧 Setting up events...');
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
    
    // Room code input
    const roomCodeInput = document.getElementById('roomCode');
    roomCodeInput.addEventListener('input', (e) => {
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length > 4) value = value.substring(0, 4);
        e.target.value = value;
    });
    
    roomCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.value.length === 4) {
            joinRoom();
        }
    });
    
    // Buttons
    document.getElementById('createBtn').addEventListener('click', createRoom);
    document.getElementById('joinBtn').addEventListener('click', joinRoom);
    document.getElementById('leaveBtn').addEventListener('click', leaveRoom);
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('pasteBtn').addEventListener('click', pasteFromClipboard);
    
    // Message input shortcuts
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Initialize app
function init() {
    console.log('🚀 Initializing app...');
    
    initDevice();
    setupEvents();
    checkURL();
    
    // Update connection status
    document.querySelector('.status-indicator span').textContent = 'Local Mode';
    document.querySelector('.status-indicator').className = 'status-indicator offline';
    
    showNotification('Clypse ready! Create or join a room to start.', 'success');
    
    console.log('✅ App initialized!');
}

// Global functions for onclick handlers
window.copyMessage = copyMessage;

// Start when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('✅ Script loaded!');