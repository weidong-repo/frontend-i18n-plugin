import { EXTENSION_NAME } from '../constants';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Command = () => {
  return (target: any) => {
    const name = target.name;
    Object.defineProperty(target, 'name', {
      get: () => `${EXTENSION_NAME}.${name.toLowerCase()}`,
    });
  };
};
