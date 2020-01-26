const config = {
  pathToMakensis: {
    title: 'Path to MakeNSIS',
    description: 'Specify the full path to `makensis`',
    type: 'string',
    default: 'makensis',
    order: 1
  },
  manageDependencies: {
    title: 'Manage Dependencies',
    description: 'When enabled, third-party dependencies will be installed automatically',
    type: 'boolean',
    default: true,
    order: 2
  }
};

export {
  config
};
