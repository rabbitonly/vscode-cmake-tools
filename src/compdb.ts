import * as vscode from 'vscode';

import * as fs from 'fs';
import * as path from 'path';

import {util} from './util';

export interface CompilationInfo {
  file: string;
  directory: string;
  command: string;
}

export class CompilationDatabase {
  private _info_by_filepath: Map<string, CompilationInfo>;
  constructor(infos: CompilationInfo[]) {
    this._info_by_filepath = infos.reduce((acc, cur) => {
      acc.set(cur.file, cur);
      return acc;
    }, new Map<string, CompilationInfo>());
  }

  private _normalizeFilePath(fspath: string): string {
    const no_detail = util.removeAllPatterns(fspath, [
      'source/', 'src/', 'include/', 'inc/', '.cpp', '.hpp', '.c', '.h', '.cc',
      '.hh', '.cxx', '.hxx', '.c++', '.h++', 'build/', '.m'
    ]);
    return util.replaceAll(no_detail, path.sep, path.posix.sep);
  }

  public getCompilationInfoForUri(uri: vscode.Uri): CompilationInfo | null {
    const fspath = uri.fsPath;
    const plain = this._info_by_filepath.get(fspath);
    if (plain) {
      return plain;
    }
    const fsnorm = this._normalizeFilePath(fspath);
    const matching_key =
        Array.from(this._info_by_filepath.keys())
            .find(key => this._normalizeFilePath(key) == fsnorm);
    return !matching_key ? null : this._info_by_filepath.get(matching_key) !;
  }

  public static fromFilePath(dbpath: string): Promise<CompilationDatabase | null> {
    return new Promise<CompilationDatabase | null>(resolve => {
      fs.exists(dbpath, exists => {
        if (!exists) {
          resolve(null);
        } else {
          fs.readFile(dbpath, (err, data) => {
            if (err) {
              console.warn(
                  `Error reading file "${dbpath}", ${err.message}`);
              resolve(null);
            } else {
              try {
                const content = JSON.parse(data.toString());
                resolve(
                    new CompilationDatabase(content as CompilationInfo[]));
              } catch (e) {
                console.warn(
                    `Error parsing compilation database "${dbpath}": ${e}`);
                resolve(null);
              }
            }
          })
        }
      })
    });
  }
}