'use babel';

import * as meta from '../package.json';
import { existsSync, realpathSync } from 'fs';
import { install as installDeps } from 'atom-package-deps';
import { platform } from 'os';
import { isAbsolute, join, parse } from 'path';
import { nsisDirSync } from 'makensis';

const includeRegExp = /(?:!include|LoadLanguageFile)\s+(?:"([^"]+)"|'([^']+)'|([^\r?\n]+$))/;
const coreLibraries = [
  'Colors.nsh',
  'FileFunc.nsh',
  'InstallOptions.nsh',
  'LangFile.nsh',
  'Library.nsh',
  'LogicLib.nsh',
  'Memento.nsh',
  'MUI.nsh',
  'MUI2.nsh',
  'MultiUser.nsh',
  'nsDialogs.nsh',
  'Sections.nsh',
  'StrFunc.nsh',
  'TextFunc.nsh',
  'UpgradeDLL.nsh',
  'Util.nsh',
  'VB6RunTime.nsh',
  'VPatchLib.nsh',
  'WinCore.nsh',
  'WinMessages.nsh',
  'WinVer.nsh',
  'WordFunc.nsh',
  'x64.nsh'
];
const coreLanguages = [
  'Afrikaans', 'Albanian', 'Arabic', 'Armenian', 'Asturian',
  'Basque', 'Belarusian', 'Bosnian', 'Breton', 'Bulgarian',
  'Catalan', 'Corsican', 'Croatian', 'Czech',
  'Danish', 'Dutch',
  'English', 'Esperanto', 'Estonian',
  'Farsi', 'Finnish', 'French',
  'Galician', 'Georgian', 'German', 'Greek',
  'Hebrew', 'Hungarian',
  'Icelandic', 'Indonesian', 'Irish', 'Italian',
  'Japanese',
  'Korean', 'Kurdish',
  'Latvian', 'Lithuanian', 'Luxembourgish',
  'Macedonian', 'Malay', 'Mongolian',
  'Norwegian', 'NorwegianNynorsk',
  'Pashto', 'Polish', 'Portuguese', 'PortugueseBR',
  'Romanian', 'Russian',
  'ScotsGaelic', 'Serbian', 'SerbianLatin', 'SimpChinese', 'Slovak', 'Slovenian', 'Spanish', 'SpanishInternational', 'Swedish',
  'Tatar', 'Thai', 'TradChinese', 'Turkish',
  'Ukrainian', 'Uzbek',
  'Vietnamese',
  'Welsh'
];

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
  const nsisDir = nsisDirSync();

  // Replace NSIS directory constant
  if (targetPath.includes('${NSISDIR}')) {
    if (platform() !== 'win32' && targetPath.includes('\\')) {
      targetPath = targetPath.replace(/\\/g, '/');
    }
    targetPath = targetPath.replace(/\${NSISDIR}/ig, nsisDir);
  }

  let { dir: currentDir} = parse(currentPath);
  let { dir: targetDir, ext: targetExt, name: targetName } = parse(targetPath);
  let filePath;

  if(isAbsolute(targetDir)) {
    filePath = join(targetDir, targetName + targetExt);
  } else if (coreLibraries.indexOf(targetName + targetExt) !== -1) {
    filePath = join(nsisDir, 'Include', targetName + targetExt);
  } else if (coreLanguages.indexOf(targetName) !== -1) {
    filePath = join(nsisDir, 'Contrib/Language files', targetName + targetExt);
  } else {
    filePath = join(currentDir, targetDir, targetName + targetExt);
  }

  const filePaths = [filePath];

  return filePaths;
};

function satisfyDependencies() {
  let k;
  let v;

  installDeps(meta.name);

  const ref = meta['package-deps'];
  const results = [];

  for (k in ref) {
    if (typeof ref !== 'undefined' && ref !== null) {
      v = ref[k];
      if (atom.packages.isPackageDisabled(v)) {
        if (atom.inDevMode()) {
          console.log('Enabling package \'' + v + '\'');
        }
        results.push(atom.packages.enablePackage(v));
      } else {
        results.push(void 0);
      }
    }
  }
  return results;
}

function showNotification() {
  const notification = atom.notifications.addWarning(
    `${meta.name}`,
    {
      detail: 'Unable detect path for unsaved file. Please save this file and try again.',
      dismissable: true,
      buttons: [
        {
          text: 'Save As…',
          onDidClick: () => {
            notification.dismiss();

            const activeEditor = atom.workspace.getActiveTextEditor();
            const activeView = atom.views.getView(activeEditor);

            atom.commands.dispatch(activeView, 'core:save-as');
          }
        },
        {
          text: 'Cancel',
          onDidClick: () => {
            notification.dismiss();
          }
        }
      ]
    }
  );
}

export const config = {
  manageDependencies: {
    title: 'Manage Dependencies',
    description: 'When enabled, third-party dependencies will be installed automatically',
    type: 'boolean',
    default: true,
    order: 1
  }
};

// This package depends on hyperclick, make sure it's installed
export function activate() {
  if (atom.config.get(`${meta.name}.manageDependencies`) === true) {
    satisfyDependencies();
  }
}

export function getProvider() {
  return {
    priority: 1,
    grammarScopes: ['source.nsis', 'source.nsis.bridle'],
    getSuggestionForWord(textEditor, text, range){
      const { targetRange, targetFile } = getRange(textEditor, range);

      if (targetRange && targetFile) {
        return {
          range: targetRange,
          callback() {
            let filePath, filePaths;

            try {
              filePaths = findFilePaths(textEditor.getPath(), targetFile);
              filePath = filePaths.find(filePath => existsSync(filePath));
            } catch(e) {
              console.error(e);
              return showNotification();
            }

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
