import { Message, ChatSession, ApiResponse } from '../types';
import ApiService from '../services/ApiService';
import { io, Socket } from 'socket.io-client';

export class ChatWidget {
    private container: HTMLElement;
    private sessionId: string;
    private messages: Message[] = [];
    private socket: Socket | null = null;

    constructor(containerId: string, sessionId: string) {
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
        this.container = element;
        this.sessionId = sessionId;
    }

    public async initialize(): Promise<void> {
        this.renderUI();
        await this.loadChatHistory();
        this.connectWebSocket();
        this.attachEventListeners();
    }

    private renderUI(): void {
        this.container.innerHTML = `
      <div class="chat-widget">
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input-container">
          <input 
            type="text" 
            id="chat-input" 
            class="chat-input" 
            placeholder="Type your message..."
            autocomplete="off"
          />
          <button id="send-btn" class="btn-send">Send</button>
        </div>
        <div class="typing-indicator" id="typing-indicator" style="display:none;">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    }

    private attachEventListeners(): void {
        const input = document.getElementById('chat-input') as HTMLInputElement;
        const sendBtn = document.getElementById('send-btn');

        sendBtn?.addEventListener('click', () => this.sendMessage());
        input?.addEventListener('keypress', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    private async loadChatHistory(): Promise<void> {
        const response = await ApiService.get<ChatSession>(`/api/chat/history/${this.sessionId}`);

        if (response.success && response.data) {
            this.messages = response.data.messages;
            this.renderMessages();
        }
    }

    private connectWebSocket(): void {
        const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
        this.socket = io(baseURL, {
            query: { sessionId: this.sessionId },
        });

        this.socket.on('connect', () => {
            console.log('WebSocket connected');
        });

        this.socket.on('message', (message: Message) => {
            this.addMessage(message);
            this.hideTypingIndicator();
        });

        this.socket.on('typing', () => {
            this.showTypingIndicator();
        });

        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });
    }

    private async sendMessage(): Promise<void> {
        const input = document.getElementById('chat-input') as HTMLInputElement;
        const messageText = input.value.trim();

        if (!messageText) return;

        const userMessage: Message = {
            id: `msg_${Date.now()}`,
            content: messageText,
            sender: 'user',
            timestamp: new Date(),
            type: 'text',
        };

        this.addMessage(userMessage);
        input.value = '';

        // Send to backend
        const response = await ApiService.post<Message>('/api/chat/message', {
            sessionId: this.sessionId,
            message: messageText,
        });

        if (!response.success) {
            this.addMessage({
                id: `error_${Date.now()}`,
                content: 'Sorry, there was an error processing your message. Please try again.',
                sender: 'bot',
                timestamp: new Date(),
                type: 'text',
            });
        }
    }

    private addMessage(message: Message): void {
        this.messages.push(message);
        this.renderMessages();
    }

    private renderMessages(): void {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = this.messages
            .map(
                (msg) => `
        <div class="message message-${msg.sender}">
          <div class="message-content">${this.escapeHtml(msg.content)}</div>
          <div class="message-time">${this.formatTime(msg.timestamp)}</div>
        </div>
      `
            )
            .join('');

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    private showTypingIndicator(): void {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.style.display = 'flex';
        }
    }

    private hideTypingIndicator(): void {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private formatTime(date: Date): string {
        const d = new Date(date);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    public destroy(): void {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.container.innerHTML = '';
    }
}
