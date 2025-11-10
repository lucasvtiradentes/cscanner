import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

class Logger {
  private logFile: string;

  constructor() {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const logDir = path.join(workspaceRoot, 'ignore');

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    this.logFile = path.join(logDir, `lino-${timestamp}.log`);
  }

  private write(level: string, message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;

    try {
      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  info(message: string) {
    this.write('INFO', message);
  }

  error(message: string) {
    this.write('ERROR', message);
  }

  warn(message: string) {
    this.write('WARN', message);
  }

  debug(message: string) {
    this.write('DEBUG', message);
  }
}

export const logger = new Logger();
