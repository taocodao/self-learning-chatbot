import { BarcodeScanner } from './BarcodeScanner';
import { ChatWidget } from './ChatWidget';
import { BarcodeData } from '../types';
import WhatsAppService from '../services/WhatsAppService';
import ApiService from '../services/ApiService';

export class LandingPage {
    private container: HTMLElement;
    private scanner: BarcodeScanner | null = null;
    private chatWidget: ChatWidget | null = null;
    private currentView: 'scanner' | 'chat' = 'scanner';

    constructor(containerId: string) {
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
        this.container = element;
    }

    public async initialize(): Promise<void> {
        // Check if user has already scanned (session exists)
        const sessionId = this.getSessionId();

        if (sessionId) {
            await this.showChatInterface(sessionId);
        } else {
            this.showScannerInterface();
        }
    }

    private showScannerInterface(): void {
        this.currentView = 'scanner';
        this.container.innerHTML = `
      <div class="landing-page">
        <header class="header">
          <h1>Welcome to Self-Learning Chatbot</h1>
          <p>Scan the code to get started</p>
        </header>
        <div id="scanner-container"></div>
      </div>
    `;

        this.scanner = new BarcodeScanner('scanner-container', (data: BarcodeData) => {
            this.handleBarcodeScanned(data);
        });

        this.scanner.initialize();
    }

    private async handleBarcodeScanned(data: BarcodeData): Promise<void> {
        console.log('Barcode scanned:', data);

        // Validate and register barcode
        const response = await ApiService.post<{ sessionId: string; phoneNumber: string }>('/api/session/create', {
            barcodeData: data.code,
        });

        if (response.success && response.data) {
            const { sessionId, phoneNumber } = response.data;
            this.setSessionId(sessionId);

            // Initialize WhatsApp session
            await WhatsAppService.initializeSession(sessionId);

            // Show chat interface
            await this.showChatInterface(sessionId);
        } else {
            alert('Invalid barcode or session creation failed. Please try again.');
        }
    }

    private async showChatInterface(sessionId: string): Promise<void> {
        this.currentView = 'chat';

        if (this.scanner) {
            this.scanner.destroy();
            this.scanner = null;
        }

        this.container.innerHTML = `
      <div class="landing-page">
        <header class="header">
          <h1>Chat with AI Assistant</h1>
          <button id="logout-btn" class="btn-logout">New Session</button>
        </header>
        <div id="chat-container"></div>
        <div class="whatsapp-section">
          <h3>Continue on WhatsApp</h3>
          <p>Get instant responses on WhatsApp Business</p>
          <button id="whatsapp-btn" class="btn btn-whatsapp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Open WhatsApp Chat
          </button>
        </div>
      </div>
    `;

        // Initialize chat widget
        this.chatWidget = new ChatWidget('chat-container', sessionId);
        await this.chatWidget.initialize();

        // Attach event listeners
        const logoutBtn = document.getElementById('logout-btn');
        const whatsappBtn = document.getElementById('whatsapp-btn');

        logoutBtn?.addEventListener('click', () => this.handleLogout());
        whatsappBtn?.addEventListener('click', () => this.handleWhatsAppRedirect());
    }

    private handleLogout(): void {
        this.clearSessionId();
        window.location.reload();
    }

    private async handleWhatsAppRedirect(): Promise<void> {
        const config = WhatsAppService.getConfig();
        if (config) {
            const message = 'Hi, I would like to continue our chat';
            WhatsAppService.openWhatsAppChat(config.phoneNumber, message);
        } else {
            alert('WhatsApp configuration not found. Please scan the code again.');
        }
    }

    private getSessionId(): string | null {
        return localStorage.getItem('chatSessionId');
    }

    private setSessionId(sessionId: string): void {
        localStorage.setItem('chatSessionId', sessionId);
    }

    private clearSessionId(): void {
        localStorage.removeItem('chatSessionId');
        localStorage.removeItem('whatsappConfig');
    }
}
