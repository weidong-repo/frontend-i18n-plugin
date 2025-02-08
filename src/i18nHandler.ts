import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SparkApi } from './sparkApi';

export class I18nHandler {
  private static async readJsonFile(filePath: string): Promise<any> {
    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            filePath,
          );

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`找不到文件: ${absolutePath}`);
      }

      const content = await fs.promises.readFile(absolutePath, 'utf-8');
      try {
        return JSON.parse(content);
      } catch (e) {
        throw new Error(`JSON 解析错误: ${absolutePath}`);
      }
    } catch (error) {
      throw error;
    }
  }

  private static findPathByValue(
    obj: any,
    searchValue: string,
    currentPath: string = '',
  ): string | null {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;

      if (
        typeof value === 'string' &&
        value.replace(/^"|"$/g, '') === searchValue
      ) {
        return newPath;
      } else if (typeof value === 'object' && value !== null) {
        const result = this.findPathByValue(value, searchValue, newPath);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  private static async searchInFiles(
    searchText: string,
  ): Promise<string | null> {
    const config = vscode.workspace.getConfiguration('frontend-i18n');
    const primaryPath = config.get<string>('i18nPrimaryPath');
    const secondaryPath = config.get<string>('i18nSecondaryPath');

    if (!primaryPath && !secondaryPath) {
      throw new Error('请在设置中配置国际化JSON文件路径');
    }

    try {
      // 搜索主要文件
      if (primaryPath) {
        const primaryJson = await this.readJsonFile(primaryPath);
        if (primaryJson) {
          const path = this.findPathByValue(primaryJson, searchText);
          if (path) {
            return path;
          }
        }
      }

      // 搜索次要文件
      if (secondaryPath) {
        const secondaryJson = await this.readJsonFile(secondaryPath);
        if (secondaryJson) {
          const path = this.findPathByValue(secondaryJson, searchText);
          if (path) {
            return path;
          }
        }
      }

      // 不抛出错误，而是返回 null
      return null;
    } catch (error) {
      // 其他错误（如文件读取错误）仍然抛出
      throw error;
    }
  }

  public static async replaceWithI18nPath(formatNumber: number): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);

    if (!text) {
      vscode.window.showWarningMessage('请先选择要替换的文本');
      return;
    }

    try {
      let searchText = text.trim().replace(/^["']|["']$/g, '');

      // 创建实例来使用非静态方法
      const handler = new I18nHandler();
      const config = vscode.workspace.getConfiguration('frontend-i18n');
      const templateKey = `format${formatNumber}Template`;
      const template = config.get<string>(templateKey) || "t('${PATH}')";

      // 使用 findAndReplaceText 来处理查找和添加新词的逻辑
      const replacement = await handler.findAndReplaceText(
        searchText,
        template,
      );

      if (replacement) {
        await editor.edit((editBuilder) => {
          editBuilder.replace(selection, replacement);
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(error.message);
      } else {
        vscode.window.showErrorMessage('替换文本时发生错误');
      }
    }
  }

  private async handleUnmatchedText(
    selectedText: string,
  ): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('frontend-i18n');
    const fallbackFilePath = config.get<string>('i18nFallbackFilePath');
    const fallbackPath = config.get<string>('i18nFallbackPath');

    if (!fallbackFilePath || !fallbackPath) {
      vscode.window.showErrorMessage(
        '请先在设置中配置 i18nFallbackFilePath 和 i18nFallbackPath',
      );
      return undefined;
    }

    try {
      const fullPath = path.resolve(
        vscode.workspace.workspaceFolders![0].uri.fsPath,
        fallbackFilePath,
      );
      let jsonContent: any = {};

      if (fs.existsSync(fullPath)) {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        jsonContent = JSON.parse(fileContent);
      }

      // 获取目标对象
      const pathParts = fallbackPath.split('.');
      let current = jsonContent;
      for (const part of pathParts) {
        current = current[part] = current[part] || {};
      }

      while (true) {
        const inputBox = vscode.window.createInputBox();
        inputBox.prompt = '请输入国际化key';
        inputBox.placeholder = '例如: submit';

        // 添加两个按钮：AI生成和确认
        inputBox.buttons = [
          {
            iconPath: new vscode.ThemeIcon('sparkle'),
            tooltip: '使用AI生成key',
          },
          {
            iconPath: new vscode.ThemeIcon('check'),
            tooltip: '确认',
          },
        ];

        let i18nKey: string | undefined;

        await new Promise<void>((resolve) => {
          inputBox.onDidAccept(() => {
            i18nKey = inputBox.value;
            inputBox.hide();
            resolve();
          });

          inputBox.onDidTriggerButton(async (button) => {
            if (button.tooltip === '使用AI生成key') {
              try {
                const config =
                  vscode.workspace.getConfiguration('frontend-i18n');
                const apiPassword = config.get<string>('sparkApiPassword');

                if (!apiPassword) {
                  throw new Error('请先在设置中配置星火大模型的 API Password');
                }

                inputBox.busy = true;
                const prompt = config.get<string>('sparkPrompt') || '';
                const suggestedKey = await SparkApi.generateName(
                  selectedText,
                  apiPassword,
                  prompt,
                );
                inputBox.value = suggestedKey;
                inputBox.busy = false;
              } catch (error) {
                inputBox.busy = false;
                vscode.window.showErrorMessage(`AI生成失败: ${error}`);
              }
            } else if (button.tooltip === '确认') {
              i18nKey = inputBox.value;
              inputBox.hide();
              resolve();
            }
          });

          inputBox.onDidHide(() => {
            resolve();
          });

          inputBox.show();
        });

        if (!i18nKey) {
          return undefined;
        } // 用户取消

        // 检查key是否已存在
        if (current[i18nKey]) {
          const result = await vscode.window.showWarningMessage(
            `键 "${i18nKey}" 已存在，其值为 "${current[i18nKey]}"`,
            '重新输入',
            '取消',
          );
          if (result === '取消') {
            return undefined;
          }
          continue; // 重新输入
        }

        // key不存在，添加新值
        current[i18nKey] = selectedText;
        fs.writeFileSync(
          fullPath,
          JSON.stringify(jsonContent, null, 2),
          'utf8',
        );
        vscode.window.showInformationMessage('国际化内容添加成功！');
        return `${fallbackPath}.${i18nKey}`;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`添加国际化内容失败: ${error}`);
      return undefined;
    }
  }

  public async findAndReplaceText(
    selectedText: string,
    formatTemplate: string,
  ): Promise<string | undefined> {
    // 修改这一行，添加 I18nHandler 类名来访问静态方法
    const existingPath = await I18nHandler.searchInFiles(selectedText);

    if (existingPath) {
      return formatTemplate.replace('${PATH}', existingPath);
    }

    // 如果没找到，则调用新方法处理
    const newPath = await this.handleUnmatchedText(selectedText);
    if (newPath) {
      return formatTemplate.replace('${PATH}', newPath);
    }

    return undefined;
  }
}
