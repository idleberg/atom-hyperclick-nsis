'use babel';

import { existsSync, realpathSync } from 'fs';
import { isAbsolute, join, parse } from 'path';

const includeRegExp = /!include (?:"([^"]+)"|'([^']+)'|`([^`]+)`)/;

const getRange = (textEditor, range) => {
  const searchStart = [range.start.row, 0];
  const searchEnd = [range.end.row + 1, 0];
  const searchRange = [searchStart, searchEnd];

  let targetRange = null;
  let targetFile = null;

  textEditor.scanInBufferRange(includeRegExp, searchRange, found => {
    targetFile = found.match[1] || found.match[2] || found.match[3];
    targetRange = found.range;
    found.stop();
  });
  return {
    targetFile,
    targetRange
  };
};

const findFilePaths = (currentPath, targetPath) => {
  let { dir: currentDir} = parse(currentPath);
  let { dir: targetDir, ext: targetExt, name: targetName } = parse(targetPath);
  let filePath;

  if(isAbsolute(targetDir)) {
    filePath = join(targetDir, targetName + targetExt)
  } else {
    filePath = join(currentDir, targetDir, targetName + targetExt);
  }

  const filePaths = [filePath];

  return filePaths;
};

// This package depends on hyperclick, make sure it's installed
export function activate() {
  if (atom.config.get(meta.name + '.manageDependencies') === true) {
    satisfyDependencies();
  }
}

export function getProvider() {
  return {
    priority: 1,
    grammarScopes: ['source.nsis', 'source.nsl'],
    getSuggestionForWord(textEditor, text, range){
      const { targetRange, targetFile } = getRange(textEditor, range);

      if (targetRange && targetFile) {
        return {
          range: targetRange,
          callback() {
            let filePaths = findFilePaths(textEditor.getPath(), targetFile);
            let filePath = filePaths.find(filePath => existsSync(filePath));

            if (filePath) {
                filePath = realpathSync(filePath);
                return atom.workspace.open(filePath);
            }

            atom.beep();
          }
        };
      }
    }
  };
}

