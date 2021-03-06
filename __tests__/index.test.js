// @flow
import { promises as fs } from 'fs';
import os from 'os';
import axios from 'axios';
import nock from 'nock';
import httpAdapter from 'axios/lib/adapters/http';
import path from 'path';
import url from 'url';
import pageLoader from '../src';

const host = 'https://hexlet.io';

axios.defaults.adapter = httpAdapter;

const fixtures = '__fixtures__';
const paths = {
  original: path.join(__dirname, fixtures, 'original_index.html'),
  modified: path.join(__dirname, fixtures, 'modified_index.html'),
  resources: path.join(__dirname, fixtures, 'resources_index.html'),
  img: path.join(__dirname, fixtures, 'files/img.jpg'),
  script: path.join(__dirname, fixtures, 'files/script.js'),
  style: path.join(__dirname, fixtures, 'files/style.css'),
};

const getData = async (fPaths) => {
  const fTypes = Object.keys(fPaths);
  return fTypes.reduce(async (acc, fType) => {
    const newAcc = await acc;
    const data = await fs.readFile(fPaths[fType], 'utf-8');
    return { ...newAcc, [fType]: data };
  }, Promise.resolve({}));
};

const makeNock = pathName => nock(host)
  .get(pathName)
  .replyWithFile(200, paths.resources)
  .get('/files/img.jpg')
  .replyWithFile(200, paths.img)
  .get('/files/script.js')
  .replyWithFile(200, paths.script)
  .get('/files/style.css')
  .replyWithFile(200, paths.style);

test('download page', async () => {
  const pathName = '/download-test';
  const localData = await fs.readFile(paths.original, 'utf-8');
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '__download-test'));
  const httpPath = url.resolve(host, pathName);

  nock(host)
    .get(pathName)
    .reply(200, localData);

  await pageLoader(httpPath, tempDir);

  const localPath = path.join(tempDir, 'hexlet-io-download-test.html');
  const data = await fs.readFile(localPath, 'utf-8');
  expect(data).toBe(localData);
});

test('download resources', async () => {
  const pathName = '/download-resouce-test';
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '__download-resouces-test'));
  const resourcesDir = path.join(tempDir, 'hexlet-io-download-resouce-test_files');
  const httpPath = url.resolve(host, pathName);

  makeNock(pathName);

  await pageLoader(httpPath, tempDir);

  const resourcesPath = {
    img: path.join(resourcesDir, 'files-img.jpg'),
    script: path.join(resourcesDir, 'files-script.js'),
    style: path.join(resourcesDir, 'files-style.css'),
  };
  const data = await getData(resourcesPath);
  const localData = await getData(paths);
  expect(data.img).toBe(localData.img);
  expect(data.script).toBe(localData.script);
  expect(data.style).toBe(localData.style);
});

test('download & mofyfi page', async () => {
  const pathName = '/download-test';
  const testData = await fs.readFile(paths.modified, 'utf-8');
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '__download-modifi-test'));
  const httpPath = url.resolve(host, pathName);

  makeNock(pathName);

  await pageLoader(httpPath, tempDir);

  const localPath = path.join(tempDir, 'hexlet-io-download-test.html');
  const data = await fs.readFile(localPath, 'utf-8');
  expect(data).toBe(testData);
});

test('404 test', async () => {
  const pathName = '/error-404-test';
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '__download-404-test'));
  const httpPath = url.resolve(host, pathName);
  nock(host)
    .get(pathName)
    .reply(404);

  await expect(pageLoader(httpPath, tempDir)).rejects.toThrowErrorMatchingSnapshot();
});

test('directory is not exist', async () => {
  const pathName = '/dir-not_exist';
  const tempDir = pathName;
  const httpPath = url.resolve(host, pathName);
  nock(host)
    .get(pathName)
    .reply(200, 'not exits');

  await expect(pageLoader(httpPath, tempDir)).rejects.toThrowErrorMatchingSnapshot();
});
