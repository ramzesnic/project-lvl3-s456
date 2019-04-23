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

const originalPagePath = path.join(__dirname, '__fixtures__', 'original_index.html');

test('download page', async () => {
  const pathName = '/test';
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
