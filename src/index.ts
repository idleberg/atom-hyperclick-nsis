import meta from '../package.json';
import { constants, promises as fs } from 'fs';
import config from './config';
import { findFilePaths, getRange, saveAsNotification } from './util';


export default {
  config: config.schema,

  // This package depends on hyperclick, make sure it's installed
  async activate() {
    if (atom.config.get(`${meta.name}.manageDependencies`) === true) {
      const { satisfyDependencies } = await import('atom-satisfy-dependencies');
      satisfyDependencies('hyperclick-nsis');
    }
  },

  getProvider() {
    return {
      priority: 1,
      grammarScopes: ['source.nsis', 'source.nsis.bridle'],
      getSuggestionForWord(textEditor, text, range){
        const { targetRange, targetFile } = getRange(textEditor, range);

        if (targetRange && targetFile) {
          return {
            range: targetRange,
            async callback() {
              let filePath, filePaths;

              try {
                filePaths = await findFilePaths(textEditor.getPath(), targetFile);
                filePath = await filePaths.find(async filePath => await fs.access(filePath, constants.F_OK));
              } catch(e) {
                console.error(e);
                return saveAsNotification();
              }

              if (filePath) {
                  filePath = await fs.realpath(filePath);
                  return atom.workspace.open(filePath);
              }

              atom.beep();
              return;
            }
          };
        }
      }
    };
  }
};
