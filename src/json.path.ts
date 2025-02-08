import * as jsonc from 'jsonc-parser';
import { TextEditor } from 'vscode';

export default function getJsonPath(
  jsonText: string,
  offsetPosition: number,
  editor: TextEditor | undefined,
) {
  const location = jsonc.getLocation(jsonText, offsetPosition);

  const locationPath = location.path;

  const path: string = locationPath.reduce(
    (
      accumulated: string,
      propertyName: jsonc.Segment,
      index: number,
    ): string => {
      const isFirst = index === 0;
      const propertyPath = getPropertyPath(propertyName, isFirst);
      if (!isFirst) {
        return accumulated + propertyPath;
      }
      return propertyPath;
    },
    '',
  );
  return path;
}

function getPropertyPath(
  propertyName: jsonc.Segment,
  isFirst: boolean,
): string {
  if (Number.isInteger(propertyName)) {
    return `[${propertyName}]`;
  }
  if (isFirst) {
    return propertyName.toString();
  }
  return '.' + propertyName;
}
