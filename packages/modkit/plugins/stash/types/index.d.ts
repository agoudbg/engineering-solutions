import '@iringo/modkit-shared';

declare module '@iringo/modkit-shared' {
  interface ModkitPluginName {
    stash: 'stash';
  }
  interface PluginArgumentType {
    stash?: 'exclude';
  }
}
