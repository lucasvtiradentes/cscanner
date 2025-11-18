import * as vscode from 'vscode';
import { getCommandId, getContextKey } from '../common/constants';
import { SearchResultProvider } from '../sidebar/search-provider';

export function createSetListViewCommand(searchProvider: SearchResultProvider, context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand(getCommandId('setListView'), () => {
    searchProvider.viewMode = 'list';
    context.workspaceState.update('lino.viewMode', 'list');
    vscode.commands.executeCommand('setContext', getContextKey('linoViewMode'), 'list');
  });
}

export function createSetTreeViewCommand(searchProvider: SearchResultProvider, context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand(getCommandId('setTreeView'), () => {
    searchProvider.viewMode = 'tree';
    context.workspaceState.update('lino.viewMode', 'tree');
    vscode.commands.executeCommand('setContext', getContextKey('linoViewMode'), 'tree');
  });
}

export function createSetGroupByDefaultCommand(searchProvider: SearchResultProvider, context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand(getCommandId('setGroupByDefault'), () => {
    searchProvider.groupMode = 'default';
    context.workspaceState.update('lino.groupMode', 'default');
    vscode.commands.executeCommand('setContext', getContextKey('linoGroupMode'), 'default');
  });
}

export function createSetGroupByRuleCommand(searchProvider: SearchResultProvider, context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand(getCommandId('setGroupByRule'), () => {
    searchProvider.groupMode = 'rule';
    context.workspaceState.update('lino.groupMode', 'rule');
    vscode.commands.executeCommand('setContext', getContextKey('linoGroupMode'), 'rule');
  });
}
