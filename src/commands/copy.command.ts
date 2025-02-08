import { env, window, workspace } from 'vscode';
import { LoggerService } from '../logger.service';
import getJsonPath from '../json.path';
import { Command } from '../decorators/command.decorator';

enum FileType {
  JSON = 'json',
  JSONC = 'jsonc',
}

@Command()
export class Copy {
  constructor(private loggerService: LoggerService) {
    this.loggerService = loggerService;
  }

  private canExecuteCommand(): boolean {
    const fileLanguage = window?.activeTextEditor?.document?.languageId;
    this.loggerService.debug(`File language: ${fileLanguage}`);

    const isJsonFile = Object.values(FileType).includes(
      fileLanguage as FileType,
    );

    if (!isJsonFile) {
      this.loggerService.error(
        'You must be in a json file to execute this command',
      );
    }

    return isJsonFile;
  }

  private getTemplate(type: string): string {
    const config = workspace.getConfiguration('frontend-i18n');
    switch (type) {
      case '1':
        return config.get<string>('outputTemplate1') || '${PATH}';
      case '2':
        return config.get<string>('outputTemplate2') || '${PATH}';
      case '3':
        return config.get<string>('outputTemplate3') || '${PATH}';
      default:
        return config.get<string>('outputTemplateDefault') || '${PATH}';
    }
  }

  register(type: 'default' | '1' | '2' | '3') {
    if (!this.canExecuteCommand()) {
      return;
    }

    const editor = window.activeTextEditor;
    const text = editor?.document.getText();
    const offset = editor?.document.offsetAt(editor?.selection.start);
    const pathOutput = this.getTemplate(type);

    this.loggerService.debug(`PathOutput: ${pathOutput}`);

    if (offset && text) {
      const rawPath: string = getJsonPath(text, offset, editor);
      this.loggerService.debug(`Raw path: ${rawPath}`);

      const path = pathOutput.replace('${PATH}', rawPath);

      env.clipboard
        .writeText(path)
        .then(() => this.loggerService.log('路径复制成功'));
    } else {
      this.loggerService.error('路径复制失败');
    }
  }
}
