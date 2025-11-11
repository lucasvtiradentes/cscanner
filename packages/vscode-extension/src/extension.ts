import * as vscode from 'vscode';
import { SearchResultProvider } from './searchProvider';
import { scanWorkspace, dispose as disposeScanner } from './issueScanner';
import { logger } from './logger';
import { getAllBranches, getChangedFiles, getCurrentBranch, invalidateCache } from './gitHelper';

export function activate(context: vscode.ExtensionContext) {
  logger.info('Lino extension activated');
  const searchProvider = new SearchResultProvider();
  const viewModeKey = context.workspaceState.get<'list' | 'tree'>('lino.viewMode', 'list');
  const groupModeKey = context.workspaceState.get<'default' | 'rule'>('lino.groupMode', 'default');
  const scanModeKey = context.workspaceState.get<'workspace' | 'branch'>('lino.scanMode', 'workspace');
  const compareBranch = context.workspaceState.get<string>('lino.compareBranch', 'main');

  searchProvider.viewMode = viewModeKey;
  searchProvider.groupMode = groupModeKey;

  const cachedResults = context.workspaceState.get<any[]>('lino.cachedResults', []);
  const deserializedResults = cachedResults.map(r => ({
    ...r,
    uri: vscode.Uri.parse(r.uriString)
  }));
  searchProvider.setResults(deserializedResults);

  vscode.commands.executeCommand('setContext', 'linoViewMode', viewModeKey);
  vscode.commands.executeCommand('setContext', 'linoGroupMode', groupModeKey);
  vscode.commands.executeCommand('setContext', 'linoScanMode', scanModeKey);

  const treeView = vscode.window.createTreeView('linoExplorer', {
    treeDataProvider: searchProvider
  });

  const updateBadge = () => {
    const count = searchProvider.getResultCount();
    treeView.badge = count > 0 ? { value: count, tooltip: `${count} issue${count === 1 ? '' : 's'}` } : undefined;
  };

  updateBadge();

  let isSearching = false;
  let currentScanMode = scanModeKey;
  let currentCompareBranch = compareBranch;

  const findAnyCommand = vscode.commands.registerCommand('lino.findAny', async () => {
    if (isSearching) {
      vscode.window.showWarningMessage('Search already in progress');
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    isSearching = true;
    vscode.commands.executeCommand('setContext', 'linoSearching', true);
    treeView.badge = { value: 0, tooltip: 'Searching...' };

    const scanTitle = currentScanMode === 'branch'
      ? `Scanning issues (diff vs ${currentCompareBranch})`
      : 'Searching for issues';

    logger.info(`Starting scan in ${currentScanMode} mode`);

    try {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: scanTitle,
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0 });

        const startTime = Date.now();
        let results;

        if (currentScanMode === 'branch') {
          const gitDiffStart = Date.now();
          const changedFiles = await getChangedFiles(workspaceFolder.uri.fsPath, currentCompareBranch);
          const gitDiffTime = Date.now() - gitDiffStart;
          logger.debug(`Git diff completed in ${gitDiffTime}ms: ${changedFiles.size} files`);

          const scanStart = Date.now();
          const scanResults = await scanWorkspace(changedFiles);
          const scanTime = Date.now() - scanStart;
          logger.debug(`Workspace scan completed in ${scanTime}ms`);

          const filterStart = Date.now();
          const pathCache = new Map<string, string>();

          results = scanResults.filter(result => {
            const uriStr = result.uri.toString();
            let relativePath = pathCache.get(uriStr);

            if (!relativePath) {
              relativePath = vscode.workspace.asRelativePath(result.uri);
              pathCache.set(uriStr, relativePath);
            }

            return changedFiles.has(relativePath);
          });

          const filterTime = Date.now() - filterStart;
          logger.info(`Filtered ${scanResults.length} → ${results.length} issues in ${changedFiles.size} changed files (${filterTime}ms)`);
        } else {
          results = await scanWorkspace();
        }

        const elapsed = Date.now() - startTime;
        logger.info(`Search completed in ${elapsed}ms, found ${results.length} results`);

        progress.report({ increment: 100 });

        searchProvider.setResults(results);

        const serializedResults = results.map(r => {
          const { uri, ...rest } = r;
          return {
            ...rest,
            uriString: uri.toString()
          };
        });
        context.workspaceState.update('lino.cachedResults', serializedResults);
        updateBadge();

        if (searchProvider.viewMode === 'tree') {
          setTimeout(() => {
            const folders = searchProvider.getAllFolderItems();
            folders.forEach(folder => {
              treeView.reveal(folder, { expand: true, select: false, focus: false });
            });
          }, 100);
        }

        if (results.length === 0) {
          vscode.window.showInformationMessage('No issues found!');
        } else {
          vscode.window.showInformationMessage(`Found ${results.length} issue${results.length === 1 ? '' : 's'}`);
        }
      });
    } finally {
      isSearching = false;
      vscode.commands.executeCommand('setContext', 'linoSearching', false);
    }
  });

  const openFileCommand = vscode.commands.registerCommand(
    'lino.openFile',
    (uri: vscode.Uri, line: number, column: number) => {
      vscode.workspace.openTextDocument(uri).then(doc => {
        vscode.window.showTextDocument(doc).then(editor => {
          const position = new vscode.Position(line, column);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
          );
        });
      });
    }
  );

  const setListViewCommand = vscode.commands.registerCommand('lino.setListView', () => {
    searchProvider.viewMode = 'list';
    context.workspaceState.update('lino.viewMode', 'list');
    vscode.commands.executeCommand('setContext', 'linoViewMode', 'list');
  });

  const setTreeViewCommand = vscode.commands.registerCommand('lino.setTreeView', () => {
    searchProvider.viewMode = 'tree';
    context.workspaceState.update('lino.viewMode', 'tree');
    vscode.commands.executeCommand('setContext', 'linoViewMode', 'tree');
  });

  const refreshCommand = vscode.commands.registerCommand('lino.refresh', async () => {
    await vscode.commands.executeCommand('lino.findAny');
  });

  const setGroupByDefaultCommand = vscode.commands.registerCommand('lino.setGroupByDefault', () => {
    searchProvider.groupMode = 'default';
    context.workspaceState.update('lino.groupMode', 'default');
    vscode.commands.executeCommand('setContext', 'linoGroupMode', 'default');
  });

  const setGroupByRuleCommand = vscode.commands.registerCommand('lino.setGroupByRule', () => {
    searchProvider.groupMode = 'rule';
    context.workspaceState.update('lino.groupMode', 'rule');
    vscode.commands.executeCommand('setContext', 'linoGroupMode', 'rule');
  });

  const copyPathCommand = vscode.commands.registerCommand('lino.copyPath', (item: any) => {
    if (item && item.resourceUri) {
      vscode.env.clipboard.writeText(item.resourceUri.fsPath);
      vscode.window.showInformationMessage(`Copied: ${item.resourceUri.fsPath}`);
    }
  });

  const copyRelativePathCommand = vscode.commands.registerCommand('lino.copyRelativePath', (item: any) => {
    if (item && item.resourceUri) {
      const relativePath = vscode.workspace.asRelativePath(item.resourceUri);
      vscode.env.clipboard.writeText(relativePath);
      vscode.window.showInformationMessage(`Copied: ${relativePath}`);
    }
  });

  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx}');
  fileWatcher.onDidChange(() => {
    if (currentScanMode === 'branch') {
      invalidateCache();
    }
  });
  fileWatcher.onDidCreate(() => {
    if (currentScanMode === 'branch') {
      invalidateCache();
    }
  });
  fileWatcher.onDidDelete(() => {
    if (currentScanMode === 'branch') {
      invalidateCache();
    }
  });

  const setScanModeWorkspaceCommand = vscode.commands.registerCommand('lino.setScanModeWorkspace', () => {
    currentScanMode = 'workspace';
    context.workspaceState.update('lino.scanMode', 'workspace');
    vscode.commands.executeCommand('setContext', 'linoScanMode', 'workspace');
    vscode.window.showInformationMessage('Scan mode: Workspace (all files)');
  });

  const setScanModeBranchCommand = vscode.commands.registerCommand('lino.setScanModeBranch', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const currentBranch = await getCurrentBranch(workspaceFolder.uri.fsPath);
    if (!currentBranch) {
      vscode.window.showErrorMessage('Not in a git repository');
      return;
    }

    currentScanMode = 'branch';
    context.workspaceState.update('lino.scanMode', 'branch');
    vscode.commands.executeCommand('setContext', 'linoScanMode', 'branch');
    invalidateCache();
    vscode.window.showInformationMessage(`Scan mode: Branch diff (vs ${currentCompareBranch})`);
  });

  const selectCompareBranchCommand = vscode.commands.registerCommand('lino.selectCompareBranch', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const branches = await getAllBranches(workspaceFolder.uri.fsPath);
    if (branches.length === 0) {
      vscode.window.showErrorMessage('No branches found');
      return;
    }

    const currentBranch = await getCurrentBranch(workspaceFolder.uri.fsPath);
    const otherBranches = branches.filter(b => b !== currentBranch);

    const selected = await vscode.window.showQuickPick(otherBranches, {
      placeHolder: `Select branch to compare against (current: ${currentBranch})`,
      ignoreFocusOut: true
    });

    if (selected) {
      currentCompareBranch = selected;
      context.workspaceState.update('lino.compareBranch', selected);
      invalidateCache();
      vscode.window.showInformationMessage(`Compare branch set to: ${selected}`);
    }
  });

  context.subscriptions.push(
    findAnyCommand,
    openFileCommand,
    setListViewCommand,
    setTreeViewCommand,
    refreshCommand,
    setGroupByDefaultCommand,
    setGroupByRuleCommand,
    setScanModeWorkspaceCommand,
    setScanModeBranchCommand,
    selectCompareBranchCommand,
    copyPathCommand,
    copyRelativePathCommand,
    fileWatcher
  );
}

export function deactivate() {
  disposeScanner();
}
