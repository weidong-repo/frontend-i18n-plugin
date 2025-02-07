import { commands, ExtensionContext } from 'vscode';
import { Copy } from './commands/copy.command';
import { LoggerService } from './logger.service';

export function activate(context: ExtensionContext) {
  const loggerService = new LoggerService();
  const copyCommand = new Copy(loggerService);

  const disposables = [
    commands.registerCommand('copy-json-path.copy', () => copyCommand.register()),
    commands.registerCommand('copy-json-path.copy-formatted-1', () => copyCommand.registerFormatted1()),
    commands.registerCommand('copy-json-path.copy-formatted-2', () => copyCommand.registerFormatted2()),
    commands.registerCommand('copy-json-path.copy-formatted-3', () => copyCommand.registerFormatted3())
  ];

  context.subscriptions.push(...disposables);
}

export function deactivate() {}
