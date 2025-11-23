export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}
class Logger {
  private logLevel: LogLevel;
  constructor() {
    const level = process.env.LOG_LEVEL || 'INFO';
    this.logLevel = LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO;
  }
  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }
  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }
  debug(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, meta));
    }
  }
  info(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message, meta));
    }
  }
  warn(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }
  error(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }
  success(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log('?', this.formatMessage('SUCCESS', message, meta));
    }
  }
}
export const logger = new Logger();
export default logger;
