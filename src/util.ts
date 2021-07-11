import { isAbsolute, join, parse } from 'path';
import { name } from '../package.json';
import { platform } from 'os';
import config from './config';

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

async function findFilePaths(currentPath, targetPath) {
  const { nsisDir } = await import('makensis');
  const pathToMakensis = config.get(`${name}.pathToMakensis`);
  const options = pathToMakensis && pathToMakensis.trim().length ? {pathToMakensis: pathToMakensis} : {};

  let nsisDirectory;

  try {
    nsisDirectory = await nsisDir(options);
  } catch (e) {
    console.error(e);
    return pathErrorNotification();
  }

  // Replace NSIS directory constant
  if (targetPath.includes('${NSISDIR}')) {
    if (platform() !== 'win32' && targetPath.includes('\\')) {
      targetPath = targetPath.replace(/\\/g, '/');
    }
    targetPath = targetPath.replace(/\${NSISDIR}/ig, nsisDirectory);
  }

  let { dir: currentDir} = parse(currentPath);
  let { dir: targetDir, ext: targetExt, name: targetName } = parse(targetPath);
  let filePath;

  if(isAbsolute(targetDir)) {
    filePath = join(targetDir, targetName + targetExt);
  } else if (coreLibraries.indexOf(targetName + targetExt)) {
    filePath = join(nsisDirectory, 'Include', targetName + targetExt);
  } else if (coreLanguages.indexOf(targetName)) {
    filePath = join(nsisDirectory, 'Contrib/Language files', targetName + targetExt);
  } else {
    filePath = join(currentDir, targetDir, targetName + targetExt);
  }

  const filePaths = [filePath];

  return filePaths;
}

function pathErrorNotification() {
  atom.notifications.addError(
    `${name}`,
    {
      detail: '`makensis.exe` is not in your PATH [environmental variable](http://superuser.com/a/284351/195953)',
      dismissable: true
    }
  );
}

function saveAsNotification() {
  const notification = atom.notifications.addWarning(
    `${name}`,
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

export {
  getRange,
  findFilePaths,
  saveAsNotification
};
