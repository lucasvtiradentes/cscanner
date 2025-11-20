import * as vscode from 'vscode';
import { z } from 'zod';
import { getCommandId, getContextKey } from '../constants';

const workspaceStateSchema = z.object({
  viewMode: z.enum(['list', 'tree']),
  groupMode: z.enum(['default', 'rule']),
  scanMode: z.enum(['workspace', 'branch']),
  compareBranch: z.string(),
  cachedResults: z.array(z.any()),
});

type WorkspaceStateSchema = z.infer<typeof workspaceStateSchema>;
type WorkspaceStateKey = keyof WorkspaceStateSchema;

const defaultValues: WorkspaceStateSchema = {
  viewMode: 'list',
  groupMode: 'default',
  scanMode: 'workspace',
  compareBranch: 'main',
  cachedResults: [],
};

const keyMapping: Record<WorkspaceStateKey, string> = {
  viewMode: 'cscanner.viewMode',
  groupMode: 'cscanner.groupMode',
  scanMode: 'cscanner.scanMode',
  compareBranch: 'cscanner.compareBranch',
  cachedResults: 'cscanner.cachedResults',
};

export enum ContextKey {
  ViewMode = 'cscannerViewMode',
  GroupMode = 'cscanGroupMode',
  ScanMode = 'cscannerScanMode',
  Searching = 'cscannerSearching',
}

export enum Command {
  FindIssue = 'findIssue',
  ManageRules = 'manageRules',
  OpenSettingsMenu = 'openSettingsMenu',
  SetListView = 'setListView',
  SetTreeView = 'setTreeView',
  SetGroupByDefault = 'setGroupByDefault',
  SetGroupByRule = 'setGroupByRule',
  OpenFile = 'openFile',
  CopyPath = 'copyPath',
  CopyRelativePath = 'copyRelativePath',
  Refresh = 'refresh',
  HardScan = 'hardScan',
  GoToNextIssue = 'goToNextIssue',
  GoToPreviousIssue = 'goToPreviousIssue',
  ShowLogs = 'showLogs',
}

const contextKeyMapping: Partial<Record<WorkspaceStateKey, ContextKey>> = {
  viewMode: ContextKey.ViewMode,
  groupMode: ContextKey.GroupMode,
  scanMode: ContextKey.ScanMode,
};

export function getWorkspaceState<K extends WorkspaceStateKey>(
  context: vscode.ExtensionContext,
  key: K,
): WorkspaceStateSchema[K] {
  const storageKey = keyMapping[key];
  const value = context.workspaceState.get(storageKey);
  const defaultValue = defaultValues[key];

  if (value === undefined) {
    return defaultValue;
  }

  const schema = workspaceStateSchema.shape[key];
  const result = schema.safeParse(value);

  return (result.success ? result.data : defaultValue) as WorkspaceStateSchema[K];
}

export function setWorkspaceState<K extends WorkspaceStateKey>(
  context: vscode.ExtensionContext,
  key: K,
  value: WorkspaceStateSchema[K],
): Thenable<void> {
  const storageKey = keyMapping[key];
  return context.workspaceState.update(storageKey, value);
}

export function setContextKey(key: ContextKey, value: unknown): Thenable<unknown> {
  return vscode.commands.executeCommand('setContext', getContextKey(key), value);
}

export function updateState<K extends WorkspaceStateKey>(
  context: vscode.ExtensionContext,
  key: K,
  value: WorkspaceStateSchema[K],
): void {
  setWorkspaceState(context, key, value);
  const contextKey = contextKeyMapping[key];
  if (contextKey) {
    setContextKey(contextKey, value);
  }
}

export function executeCommand(command: Command, ...args: any[]): Thenable<unknown> {
  return vscode.commands.executeCommand(getCommandId(command), ...args);
}

export function registerCommand(command: Command, callback: (...args: any[]) => any): vscode.Disposable {
  return vscode.commands.registerCommand(getCommandId(command), callback);
}

export enum ToastKind {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

export function showToastMessage(kind: ToastKind, message: string, ...items: string[]): Thenable<string | undefined> {
  switch (kind) {
    case ToastKind.Info:
      return vscode.window.showInformationMessage(message, ...items);
    case ToastKind.Warning:
      return vscode.window.showWarningMessage(message, ...items);
    case ToastKind.Error:
      return vscode.window.showErrorMessage(message, ...items);
  }
}

export function openTextDocument(uri: vscode.Uri): Thenable<vscode.TextDocument> {
  return vscode.workspace.openTextDocument(uri);
}
