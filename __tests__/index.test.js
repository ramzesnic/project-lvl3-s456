import { promises as fs } from 'fs';
import os from 'os';
import axios from 'axios';
import nock from 'nock';
import httpAdapter from 'axios/lib/adapters/http';
import path from 'path';
import url from 'url';
import pageLoader from '../src';

const host = 'https://hexlet.io';

axios.defaults.host = host;
axios.defaults.adapter = httpAdapter;

const fixtures = '__fixtures__';
const originalPagePath = path.join(__dirname, fixtures, 'original_index.html');
const modifiedPagePath = path.join(__dirname, fixtures, 'modified_index.html');
const resourcesPagePath = path.join(__dirname, fixtures, 'resources_index.html');
const resources = {
  img: path.join(__dirname, fixtures, 'files/img.jpg'),
  script: path.join(__dirname, fixtures, 'files/script.js'),
  style: path.join(__dirname, fixtures, 'files/style.css'),
};

const getLocalData = async () => ({
  html: await fs.readFile(resourcesPagePath, 'utf-8'),
  img: await fs.readFile(resources.img, 'utf-8'),
  script: await fs.readFile(resources.script, 'utf-8'),
  style: await fs.readFile(resources.style, 'utf-8'),
});

const nocker = (pathName, localData) => nock(host)
  .get(pathName)
  .reply(200, localData.html)
  .get('/files/img.jpg')
  .reply(200, localData.img)
  .get('/files/script.js')
  .reply(200, localData.script)
  .get('/files/style.css')
  .reply(200, localData.style);

test('download page', async () => {
  const pathName = '/download-test';
  const testData = await fs.readFile(originalPagePath, 'utf-8');
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '__download-test'));
  const httpPath = url.resolve(host, pathName);

  nock(host)
    .get(pathName)
    .reply(200, testData);

  await pageLoader(httpPath, tempDir);

  const files = await fs.readdir(tempDir);
  const localPath = path.join(tempDir, files.find(fileName => path.extname(fileName) === '.html'));
  const data = await fs.readFile(localPath, 'utf-8');
  expect(data).toBe(testData);
});

test('download resources', async () => {
  const pathName = '/download-resouce-test';
  const localData = await getLocalData();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '__download-resouces-test'));
  const resourcesDir = path.join(tempDir, 'hexlet-io-download-resouce-test_files');
  const httpPath = url.resolve(host, pathName);

  nocker(pathName, localData);

  await pageLoader(httpPath, tempDir);

  const files = await fs.readdir(resourcesDir);
  const resourcesPath = {
    img: path.join(resourcesDir, files.find(fileName => path.extname(fileName) === '.jpg')),
    script: path.join(resourcesDir, files.find(fileName => path.extname(fileName) === '.js')),
    style: path.join(resourcesDir, files.find(fileName => path.extname(fileName) === '.css')),
  };
  const data = {
    img: await fs.readFile(resourcesPath.img, 'utf-8'),
    script: await fs.readFile(resourcesPath.script, 'utf-8'),
    style: await fs.readFile(resourcesPath.style, 'utf-8'),
  };
  expect(data.img).toBe(localData.img);
  expect(data.script).toBe(localData.script);
  expect(data.style).toBe(localData.style);
});

test('download & mofyfi page', async () => {
  const pathName = '/download-test';
  const testData = await fs.readFile(modifiedPagePath, 'utf-8');
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), '__download-modifi-test'));
  const httpPath = url.resolve(host, pathName);
  const localData = await getLocalData();

  nocker(pathName, localData);

  await pageLoader(httpPath, tempDir);

  const files = await fs.readdir(tempDir);
  const localPath = path.join(tempDir, files.find(fileName => path.extname(fileName) === '.html'));
  const data = await fs.readFile(localPath, 'utf-8');
  expect(data).toBe(testData);
});
