import * as vscode from 'vscode';
import { Command, registerCommand, updateState } from '../common/lib/vscode-utils';
import { SearchResultProvider } from '../sidebar/search-provider';

export function createSetListViewCommand(searchProvider: SearchResultProvider, context: vscode.ExtensionContext) {
  return registerCommand(Command.SetListView, () => {
    searchProvider.viewMode = 'list';
    updateState(context, 'viewMode', 'list');
  });
}

export function createSetTreeViewCommand(searchProvider: SearchResultProvider, context: vscode.ExtensionContext) {
  return registerCommand(Command.SetTreeView, () => {
    searchProvider.viewMode = 'tree';
    updateState(context, 'viewMode', 'tree');
  });
}

export function createSetGroupByDefaultCommand(searchProvider: SearchResultProvider, context: vscode.ExtensionContext) {
  return registerCommand(Command.SetGroupByDefault, () => {
    searchProvider.groupMode = 'default';
    updateState(context, 'groupMode', 'default');
  });
}

export function createSetGroupByRuleCommand(searchProvider: SearchResultProvider, context: vscode.ExtensionContext) {
  return registerCommand(Command.SetGroupByRule, () => {
    searchProvider.groupMode = 'rule';
    updateState(context, 'groupMode', 'rule');
  });
}
