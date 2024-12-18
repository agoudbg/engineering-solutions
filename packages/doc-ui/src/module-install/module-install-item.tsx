import { AppTabContent, type AppTabContentProps } from './app-tab-content';
import type { SupportedApp } from './constants';

export const ModuleInstallItem: React.FC<
  {
    // biome-ignore lint/style/useNamingConvention: <explanation>
    __appType: SupportedApp;
    // biome-ignore lint/style/useNamingConvention: <explanation>
    __urlPrefix?: string;
  } & Omit<AppTabContentProps, 'appType'>
> = ({ __appType, __urlPrefix = '', url, ...rest }) => {
  return <AppTabContent {...rest} appType={__appType} url={`${__urlPrefix}${url}`} />;
};

ModuleInstallItem.displayName = 'ModuleInstallItem';
