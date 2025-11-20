import * as vscode from 'vscode';
import { Command, registerCommand } from '../common/lib/vscode-utils';

export function createOpenFileCommand() {
  return registerCommand(Command.OpenFile, (uri: vscode.Uri, line: number, column: number) => {
    vscode.workspace.openTextDocument(uri).then((doc) => {
      vscode.window.showTextDocument(doc).then((editor) => {
        const position = new vscode.Position(line, column);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
      });
    });
  });
}

export function createCopyPathCommand() {
  return registerCommand(Command.CopyPath, (item: any) => {
    if (item && item.resourceUri) {
      vscode.env.clipboard.writeText(item.resourceUri.fsPath);
      vscode.window.showInformationMessage(`Copied: ${item.resourceUri.fsPath}`);
    }
  });
}

export function createCopyRelativePathCommand() {
  return registerCommand(Command.CopyRelativePath, (item: any) => {
    if (item && item.resourceUri) {
      const relativePath = vscode.workspace.asRelativePath(item.resourceUri);
      vscode.env.clipboard.writeText(relativePath);
      vscode.window.showInformationMessage(`Copied: ${relativePath}`);
    }
  });
}
