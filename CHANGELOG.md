#Released

## 0.3.7
* Added support to include the files that fail to file the next target of the compilation failure.
  watchのコンパイルが失敗した時に、次回のコンパイル対象に含めるように対応
* Fixed a bug that it had failed to check the update date and time in the file deletion.
  watchでファイル削除時に更新日時の取得に失敗していた不具合を修正

## 0.3.6
* Add support TypeScript version 1.0.0 and 1.0.1

## 0.3.5
* Added watch.atBegin option to run tasks when watcher starts
  watch.atBeginオプションを追加。watchが開始された時にコンパイルを実行します。
* Corresponding to delete files from the cache when a file is deleted
  ファイルが削除された時に、ファイルキャッシュからも削除してコンパイル対象にならないように対応

## 0.3.3 / 0.3.4
* Compilation with watch option is more fast.

## 0.3.1 / 0.3.2
* Added watch option

## 0.3.0
* Update to TypeScript `1.0.0`.
* Remove `base_path`, `sourcemap` and `nolib` options. (Changed to `basePath`, `sourceMap` and `noLib`)
* Remove `ignoreTypeCheck` option.
* **Breaking Changes**: `ignoreError:true` is now the default.
