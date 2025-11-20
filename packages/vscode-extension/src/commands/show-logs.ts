import * as vscode from 'vscode';
import { Command, registerCommand } from '../common/lib/vscode-utils';
import { LOG_FILE_PATH } from '../common/utils/logger';

export function createShowLogsCommand() {
  return registerCommand(Command.ShowLogs, async () => {
    try {
      const doc = await vscode.workspace.openTextDocument(LOG_FILE_PATH);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open logs: ${error}`);
    }
  });
}
