type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
    [key: string]: any;
}

class Logger {
    private level: LogLevel;
    private levels: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };

    constructor() {
        this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
    }

    private shouldLog(level: LogLevel): boolean {
        return this.levels[level] >= this.levels[this.level];
    }

    private formatMessage(level: LogLevel, message: string, meta?: LogMetadata): string {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    }

    debug(message: string, meta?: LogMetadata): void {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, meta));
        }
    }

    info(message: string, meta?: LogMetadata): void {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message, meta));
        }
    }

    warn(message: string, meta?: LogMetadata): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, meta));
        }
    }

    error(message: string, meta?: any): void {
        if (this.shouldLog('error')) {
            const errorInfo = meta instanceof Error
                ? {
                    message: meta.message,
                    stack: meta.stack,
                    name: meta.name,
                }
                : meta;

            console.error(this.formatMessage('error', message, errorInfo));
        }
    }
}

export const logger = new Logger();
export default logger;
