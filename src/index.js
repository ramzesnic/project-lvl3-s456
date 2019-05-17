// @flow
import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import debug from 'debug';
import Listr from 'listr';

const log = debug('page-loader');

const tagType = {
  link: 'href',
  img: 'src',
  script: 'src',
};

const getError = (error) => {
  const err = {};
  if (error.errno) {
    err.code = error.errno;
    err.message = error.message;
  } else {
    err.code = error.response.status;
    err.message = `Error: ${error.response.statusText} url ${error.response.config.url}`;
  }
  return err;
};

const getLocalPath = (pageURL) => {
  const { host, pathname } = pageURL;
  if (pathname === '/') {
    return host.replace(/\W/g, '-');
  }
  return path.join(host, pathname).replace(/\W/g, '-');
};

const formatLocalFileName = (fileName) => {
  const clearFileName = fileName[0] === '/' ? fileName.slice(1) : fileName;
  return clearFileName.replace(/\//g, '-');
};

const getDomWithLocalUrls = (dom, dir, baseUrl) => {
  const links = dom(Object.keys(tagType).join(','))
    .filter((i, el) => {
      const node = dom(el);
      const [{ name }] = node.get();
      const urlType = tagType[name];
      const fileUrl = node.attr(urlType);
      if (!fileUrl) {
        return false;
      }
      const { hostname } = url.parse(fileUrl);

      log('fileUrl = %o', fileUrl);
      const isLocalUrl = !hostname && fileUrl[1] !== '/';
      return isLocalUrl;
    })
    .map((i, el) => {
      const node = dom(el);
      const [{ name }] = node.get();
      const urlType = tagType[name];
      const remoteUrl = new URL(node.attr(urlType), baseUrl).href;
      const formatedUrl = formatLocalFileName(node.attr(urlType));
      const localUrl = path.join(dir, formatedUrl);

      node.attr(urlType, localUrl);
      return { remoteUrl, localUrl };
    });
  return { dom, links };
};

const saveResources = (links, dir) => {
  const urls = links.reduce((acc, e) => ({ ...acc, [e.remoteUrl]: e.localUrl }), {});

  const tasks = new Listr(Object.keys(urls).map(link => ({
    title: link,
    task: (noop, task) => axios.get(link, { responseType: 'arraybuffer' })
      .then((response) => {
        log('File %o loaded;', link);
        return fs.writeFile(path.join(dir, urls[link]), response.data);
      })
      .then(() => {
        log('File saved to %o;', urls[link]);
      })
      .catch((error) => {
        task.title = getError(error).message; // eslint-disable-line
        task.skip();
      }),
  })), { concurrent: true });
  return tasks.run();
};

export default (urlPage, dir) => {
  const pageURL = new URL(urlPage);
  const dirName = path.normalize(dir);
  const formatedUrl = getLocalPath(pageURL);
  const basePath = path.join(dirName, formatedUrl);
  const resourcesPath = basePath.concat('_files');
  const baseUrl = `${pageURL.protocol}//${pageURL.host}`;
  const htmlPath = basePath.concat('.html');
  let resLinks;

  return axios.get(pageURL.href)
    .then((response) => {
      log('Page %o loaded;', urlPage);
      const $ = cheerio.load(response.data);
      const { dom: newDom, links } = getDomWithLocalUrls($, formatedUrl.concat('_files'), baseUrl);
      resLinks = links.get();

      return fs.writeFile(htmlPath, newDom.html());
    })
    .then(() => {
      log('Saved to %o', htmlPath);
      return fs.mkdir(resourcesPath);
    })
    .then(() => {
      log('Files path %o created;', resourcesPath);
      return saveResources(resLinks, dirName);
    })
    .catch((error) => {
      log('Error: %j', error);
      throw getError(error);
    });
};
