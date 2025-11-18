import { Html5Qrcode } from 'html5-qrcode';
import { BarcodeData } from '../types';

export class BarcodeScanner {
    private scanner: Html5Qrcode | null = null;
    private container: HTMLElement;
    private onScanSuccess: (data: BarcodeData) => void;
    private isScanning: boolean = false;

    constructor(containerId: string, onScanSuccess: (data: BarcodeData) => void) {
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
        this.container = element;
        this.onScanSuccess = onScanSuccess;
    }

    public async initialize(): Promise<void> {
        this.renderUI();
        this.scanner = new Html5Qrcode('barcode-reader');
    }

    private renderUI(): void {
        this.container.innerHTML = `
      <div class="barcode-scanner-container">
        <div class="scanner-header">
          <h2>Scan Barcode to Access Chatbot</h2>
          <p>Point your camera at the QR code or barcode</p>
        </div>
        <div id="barcode-reader" class="barcode-reader"></div>
        <div class="scanner-controls">
          <button id="start-scan-btn" class="btn btn-primary">Start Scanning</button>
          <button id="stop-scan-btn" class="btn btn-secondary" style="display:none;">Stop Scanning</button>
        </div>
        <div class="manual-entry">
          <p>Or enter code manually:</p>
          <input type="text" id="manual-code-input" placeholder="Enter barcode/QR code" />
          <button id="manual-submit-btn" class="btn btn-secondary">Submit</button>
        </div>
      </div>
    `;

        this.attachEventListeners();
    }

    private attachEventListeners(): void {
        const startBtn = document.getElementById('start-scan-btn');
        const stopBtn = document.getElementById('stop-scan-btn');
        const manualSubmitBtn = document.getElementById('manual-submit-btn');
        const manualInput = document.getElementById('manual-code-input') as HTMLInputElement;

        startBtn?.addEventListener('click', () => this.startScanning());
        stopBtn?.addEventListener('click', () => this.stopScanning());
        manualSubmitBtn?.addEventListener('click', () => {
            if (manualInput.value.trim()) {
                this.handleScanSuccess(manualInput.value, 'manual');
            }
        });
    }

    public async startScanning(): Promise<void> {
        if (!this.scanner || this.isScanning) return;

        try {
            await this.scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText, decodedResult) => {
                    this.handleScanSuccess(decodedText, decodedResult.result.format?.formatName || 'unknown');
                },
                (errorMessage) => {
                    // Scanning errors are common and can be ignored
                    console.debug('Scan error:', errorMessage);
                }
            );

            this.isScanning = true;
            this.toggleButtons(true);
        } catch (error) {
            console.error('Failed to start scanning:', error);
            alert('Failed to start camera. Please check permissions.');
        }
    }

    public async stopScanning(): Promise<void> {
        if (!this.scanner || !this.isScanning) return;

        try {
            await this.scanner.stop();
            this.isScanning = false;
            this.toggleButtons(false);
        } catch (error) {
            console.error('Failed to stop scanning:', error);
        }
    }

    private handleScanSuccess(code: string, format: string): void {
        const barcodeData: BarcodeData = {
            code,
            format,
            timestamp: new Date(),
        };

        this.onScanSuccess(barcodeData);
        this.stopScanning();
    }

    private toggleButtons(isScanning: boolean): void {
        const startBtn = document.getElementById('start-scan-btn');
        const stopBtn = document.getElementById('stop-scan-btn');

        if (startBtn && stopBtn) {
            startBtn.style.display = isScanning ? 'none' : 'block';
            stopBtn.style.display = isScanning ? 'block' : 'none';
        }
    }

    public destroy(): void {
        if (this.isScanning) {
            this.stopScanning();
        }
        this.container.innerHTML = '';
    }
}
