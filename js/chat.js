document.addEventListener('DOMContentLoaded', function() {
    const chatWidget = document.getElementById('chatWidget');
    const chatBubble = document.getElementById('chatBubble');
    const minimizeChat = document.getElementById('minimizeChat');
    const messageInput = document.getElementById('messageInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');
    const chatBody = document.getElementById('chatBody');

    let isOpen = true;

    // Toggle chat widget
    function toggleChat() {
        isOpen = !isOpen;
        chatBubble.style.display = isOpen ? 'none' : 'flex';
        chatWidget.style.display = isOpen ? 'block' : 'none';
        if (isOpen) {
            messageInput.focus();
        }
    }

    // Show chat widget by default
    chatBubble.style.display = 'none';
    chatWidget.style.display = 'block';

    // Add message to chat
    function addMessage(message, isSent = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const messageP = document.createElement('p');
        messageP.textContent = message;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.appendChild(messageP);
        messageDiv.appendChild(timestamp);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Send message
    function sendChatMessage() {
        const message = messageInput.value.trim();
        if (message) {
            addMessage(message);
            messageInput.value = '';
            
            // Simulate response (replace with actual backend integration)
            setTimeout(() => {
                addMessage("Thanks for your message! Our team will get back to you soon.", false);
            }, 1000);
        }
    }

    // Event listeners
    chatBubble.addEventListener('click', toggleChat);
    minimizeChat.addEventListener('click', toggleChat);
    
    sendMessage.addEventListener('click', sendChatMessage);
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}); 