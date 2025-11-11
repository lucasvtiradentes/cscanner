import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { RustClient } from './rustClient';
import { logger } from './logger';

export interface AnyUsageResult {
  uri: vscode.Uri;
  line: number;
  column: number;
  text: string;
  type: 'colonAny' | 'asAny';
}

let rustClient: RustClient | null = null;

function getRustBinaryPath(): string | null {
  const extensionPath = vscode.extensions.getExtension('lucasvtiradentes.lino-vscode')?.extensionPath;
  if (!extensionPath) {
    logger.error('Extension path not found');
    return null;
  }

  logger.debug(`Extension path: ${extensionPath}`);

  const binaryName = process.platform === 'win32' ? 'lino-server.exe' : 'lino-server';

  const bundledBinary = path.join(extensionPath, 'binaries', binaryName);
  logger.debug(`Checking bundled binary: ${bundledBinary}`);
  if (fs.existsSync(bundledBinary)) {
    logger.info(`Found bundled binary: ${bundledBinary}`);
    return bundledBinary;
  }

  const devBinaryRelease = path.join(extensionPath, '..', '..', 'lino-core', 'target', 'release', binaryName);
  logger.debug(`Checking dev release binary: ${devBinaryRelease}`);
  if (fs.existsSync(devBinaryRelease)) {
    logger.info(`Found dev release binary: ${devBinaryRelease}`);
    return devBinaryRelease;
  }

  const devBinaryDebug = path.join(extensionPath, '..', '..', 'lino-core', 'target', 'debug', binaryName);
  logger.debug(`Checking dev debug binary: ${devBinaryDebug}`);
  if (fs.existsSync(devBinaryDebug)) {
    logger.info(`Found dev debug binary: ${devBinaryDebug}`);
    return devBinaryDebug;
  }

  logger.error(`Rust binary not found. Searched: ${bundledBinary}, ${devBinaryRelease}, ${devBinaryDebug}`);
  return null;
}

async function processFileFallback(fileUri: vscode.Uri): Promise<AnyUsageResult[]> {
  const results: AnyUsageResult[] = [];
  const document = await vscode.workspace.openTextDocument(fileUri);
  const text = document.getText();

  const colonAnyRegex = /:\s*any\b/g;
  let match;
  while ((match = colonAnyRegex.exec(text)) !== null) {
    const position = document.positionAt(match.index);
    results.push({
      uri: fileUri,
      line: position.line,
      column: position.character,
      text: document.lineAt(position.line).text.trim(),
      type: 'colonAny'
    });
  }

  const asAnyRegex = /\bas\s+any\b/g;
  while ((match = asAnyRegex.exec(text)) !== null) {
    const position = document.positionAt(match.index);
    results.push({
      uri: fileUri,
      line: position.line,
      column: position.character,
      text: document.lineAt(position.line).text.trim(),
      type: 'asAny'
    });
  }

  return results;
}

async function findAnyTypesFallback(): Promise<AnyUsageResult[]> {
  const files = await vscode.workspace.findFiles(
    '**/*.{ts,tsx}',
    '**/node_modules/**'
  );

  const chunkSize = 10;
  const allResults: AnyUsageResult[] = [];

  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processFileFallback));
    allResults.push(...chunkResults.flat());
  }

  return allResults;
}

export async function findAnyTypes(): Promise<AnyUsageResult[]> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return [];
  }

  const binaryPath = getRustBinaryPath();

  if (!binaryPath) {
    vscode.window.showErrorMessage(
      'Lino: Rust binary not found. Please build the Rust core:\n\n' +
      'cd packages/lino-core && cargo build --release\n\n' +
      'Check logs at /tmp/linologs.txt for details.',
      'Open Logs'
    ).then(selection => {
      if (selection === 'Open Logs') {
        vscode.workspace.openTextDocument('/tmp/linologs.txt').then(doc => {
          vscode.window.showTextDocument(doc);
        });
      }
    });
    throw new Error('Rust binary not found');
  }

  try {
    logger.info('Using Rust backend for scanning');

    if (!rustClient) {
      rustClient = new RustClient(binaryPath);
      await rustClient.start();
    }

    const results = await rustClient.scan(workspaceFolder.uri.fsPath);
    return results;
  } catch (error) {
    logger.error(`Rust backend failed: ${error}`);
    vscode.window.showErrorMessage(
      `Lino: Rust backend error: ${error}\n\nCheck logs at /tmp/linologs.txt`,
      'Open Logs'
    ).then(selection => {
      if (selection === 'Open Logs') {
        vscode.workspace.openTextDocument('/tmp/linologs.txt').then(doc => {
          vscode.window.showTextDocument(doc);
        });
      }
    });
    throw error;
  }
}

export function dispose() {
  if (rustClient) {
    rustClient.stop();
    rustClient = null;
  }
}
