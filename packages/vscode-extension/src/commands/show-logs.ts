import * as vscode from 'vscode';
import { getCommandId } from '../common/constants';
import { LOG_FILE_PATH } from '../common/utils/logger';

export function createShowLogsCommand() {
  return vscode.commands.registerCommand(getCommandId('showLogs'), async () => {
    try {
      const doc = await vscode.workspace.openTextDocument(LOG_FILE_PATH);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open logs: ${error}`);
    }
  });
}
