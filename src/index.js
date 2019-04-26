import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';

const tagType = {
  link: 'href',
  img: 'src',
  script: 'src',
};

const getLocalPath = (pageURL) => {
  const { host, pathname } = pageURL;
  const fileName = path.join(host, pathname).replace(/\W/g, '-');
  return fileName;
};

// const testfunc = text => console.log(text);

const formatLocalFileName = fileName => fileName.replace(/\//g, '-');

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

      return !hostname;
    })
    .map((i, el) => {
      const node = dom(el);
      const [{ name }] = node.get();
      const urlType = tagType[name];
      const remoteUrl = new URL(node.attr(urlType), baseUrl).href;
      const formatedUrl = formatLocalFileName(node.attr(urlType));
      const localUrl = path.join(dir, formatedUrl);

      dom(el).attr(urlType, localUrl);
      return { remoteUrl, localUrl };
    });
  return { dom, links };
};

const saveResources = (links, dir) => {
  const urls = links.reduce((acc, e) => ({ ...acc, [e.remoteUrl]: e.localUrl }), {});
  const fnPromise = Object.keys(urls).map(link => axios.get(link, { responseType: 'arraybuffer' })
    .then(response => fs.writeFile(path.join(dir, urls[link]), response.data)));
  return Promise.all(fnPromise);
};

export default (urlPage, dir) => {
  const pageURL = new URL(urlPage);
  const dirName = path.normalize(dir);
  const formatedUrl = getLocalPath(pageURL);
  const basePath = path.join(dirName, formatedUrl);
  const baseUrl = `${pageURL.protocol}//${pageURL.host}`;
  const htmlPath = basePath.concat('.html');
  let resLinks;

  return axios.get(pageURL.href)
    .then((response) => {
      const $ = cheerio.load(response.data);
      const { dom: newDom, links } = getDomWithLocalUrls($, formatedUrl.concat('_files'), baseUrl);
      resLinks = links.get();

      return fs.writeFile(htmlPath, newDom.html());
    })
    .then(() => fs.mkdir(basePath.concat('_files')))
    .then(() => saveResources(resLinks, dirName))
    .catch((error) => {
      throw error;
    });
};
