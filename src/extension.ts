import { commands, ExtensionContext } from 'vscode';
import { Copy } from './commands/copy.command';
import { LoggerService } from './logger.service';
import { I18nHandler } from './i18nHandler';

export function activate(context: ExtensionContext) {
  const loggerService = new LoggerService();
  const copyCommand = new Copy(loggerService);

  const disposables = [
    commands.registerCommand('frontend-i18n.copy', () =>
      copyCommand.register('default'),
    ),
    commands.registerCommand('frontend-i18n.copy-formatted-1', () =>
      copyCommand.register('1'),
    ),
    commands.registerCommand('frontend-i18n.copy-formatted-2', () =>
      copyCommand.register('2'),
    ),
    commands.registerCommand('frontend-i18n.copy-formatted-3', () =>
      copyCommand.register('3'),
    ),
  ];

  // 注册国际化替换命令
  disposables.push(
    commands.registerCommand('frontend-i18n.replace-i18n-1', () => {
      I18nHandler.replaceWithI18nPath(1);
    }),
  );

  disposables.push(
    commands.registerCommand('frontend-i18n.replace-i18n-2', () => {
      I18nHandler.replaceWithI18nPath(2);
    }),
  );

  disposables.push(
    commands.registerCommand('frontend-i18n.replace-i18n-3', () => {
      I18nHandler.replaceWithI18nPath(3);
    }),
  );

  context.subscriptions.push(...disposables);
}

export function deactivate() { }
