import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';
import url from 'url';

const saveFile = (pageURL, data, dir) => {
  const dirName = path.normalize(dir);
  const fileName = path.join(pageURL.host, pageURL.pathname).replace(/\W/g, '-');
  const fullPath = path.join(dirName, fileName.concat('.html'));
  return fs.writeFile(fullPath, data).catch((error) => {
    throw new Error(error);
  });
};

export default (urlPage, dir) => {
  const pageURL = new URL(urlPage);

  return axios.get(pageURL.href)
    .then(response => saveFile(pageURL, response.data, dir))
    .catch((error) => {
      throw new Error(error);
    });
};
