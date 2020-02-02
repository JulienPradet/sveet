import { dirname } from "path";
import mkdirp from "mkdirp";
import rimraf from "rimraf";
import {
  writeFile as originalWriteFile,
  readFile as originalReadFile
} from "fs";
import { Observable, from } from "rxjs";
import { mergeMap } from "rxjs/operators";
import chokidar from "chokidar";

export const rm = (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    rimraf(path, err => {
      if (err) {
        return reject(err);
      }

      resolve(path);
    });
  });
};

export const mkdir = (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    mkdirp(path, err => {
      if (err) {
        return reject(err);
      }

      resolve(path);
    });
  });
};

export const writeFile = (path: string, content: string): Promise<string> => {
  return mkdir(dirname(path)).then(() => {
    return new Promise((resolve, reject) => {
      originalWriteFile(path, content, err => {
        if (err) {
          return reject(err);
        }
        resolve(path);
      });
    });
  });
};

export const readFile = (path: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    originalReadFile(path, (err, content) => {
      if (err) {
        return reject(err);
      }

      resolve(content);
    });
  });
};

enum WatchEventEnum {
  add,
  change,
  unlink
}
type WatchEvent = {
  path: string;
  action: WatchEventEnum;
};
const watch$ = (path: string) => {
  return new Observable<WatchEvent>(observer => {
    const watcher = chokidar.watch(path);

    // Add event listeners.
    watcher
      .on("add", path => observer.next({ path, action: WatchEventEnum.add }))
      .on("change", path =>
        observer.next({ path, action: WatchEventEnum.change })
      )
      .on("unlink", path =>
        observer.next({ path, action: WatchEventEnum.unlink })
      )
      .on("error", error => observer.error(error));

    return () => {
      watcher.close();
    };
  });
};

export const readFile$ = (path: string) => {
  return watch$(path).pipe(
    mergeMap(({ path, action }) => {
      if (action === WatchEventEnum.unlink) {
        throw new Error(
          `File ${JSON.stringify(
            path
          )} was deleted even though it was being watched.`
        );
      }
      return from(readFile(path));
    })
  );
};
