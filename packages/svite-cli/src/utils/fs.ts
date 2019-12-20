import { dirname } from "path";
import mkdirp from "mkdirp";
import rimraf from "rimraf";
import { writeFile as originalWriteFile } from "fs";

export const rm = path => {
  return new Promise((resolve, reject) => {
    rimraf(path, err => {
      if (err) {
        return reject(err);
      }

      resolve(path);
    });
  });
};

export const mkdir = path => {
  return new Promise((resolve, reject) => {
    mkdirp(path, err => {
      if (err) {
        return reject(err);
      }

      resolve(path);
    });
  });
};

export const writeFile = (path, content) => {
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
