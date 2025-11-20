import * as vscode from 'vscode';
import { clearCache } from '../common/lib/scanner';
import { Command, executeCommand, registerCommand } from '../common/lib/vscode-utils';
import { invalidateCache } from '../common/utils/git-helper';
import { logger } from '../common/utils/logger';

export function createRefreshCommand() {
  return registerCommand(Command.Refresh, async () => {
    await executeCommand(Command.FindIssue);
  });
}

export function createHardScanCommand(isSearchingRef: { current: boolean }) {
  return registerCommand(Command.HardScan, async () => {
    if (isSearchingRef.current) {
      vscode.window.showWarningMessage('Search already in progress');
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    logger.info('Starting hard scan (clearing cache)');

    try {
      await clearCache();
      invalidateCache();
      vscode.window.showInformationMessage('Cache cleared, rescanning...');
      await executeCommand(Command.FindIssue);
    } catch (error) {
      logger.error(`Hard scan failed: ${error}`);
      vscode.window.showErrorMessage(`Hard scan failed: ${error}`);
    }
  });
}
