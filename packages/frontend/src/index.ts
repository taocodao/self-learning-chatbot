import { LandingPage } from './components/LandingPage';
import './styles/main.css';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    const app = new LandingPage('app');
    app.initialize().catch((error) => {
        console.error('Failed to initialize app:', error);
    });
});
