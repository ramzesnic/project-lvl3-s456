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

const getLocalPath = (pageURL, dir) => {
  const dirName = path.normalize(dir);
  const fileName = path.join(pageURL.host, pageURL.pathname).replace(/\W/g, '-');
  return path.join(dirName, fileName);
};

const formatLocalFileName = fileName => fileName.replace(/\//g, '-');

const getDomWithLocalUrls = (dom, dir, baseUrl) => {
  const links = dom(Object.keys(tagType).join(','))
    .filter((i, el) => {
      const node = dom(el);
      const [{ name }] = node.get();
      const urlType = tagType[name];
      const fileUrl = node.attr(urlType);
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

const saveResources = (links) => {
  const urls = links.reduce((acc, e) => ({ ...acc, [e.remoteUrl]: e.localUrl }), {});
  const fnPromise = Object.keys(urls).map(link => axios.get(link, { responseType: 'arraybufer' })
    .then(response => fs.writeFile(urls[link], response.data)));
  return Promise.all(fnPromise);
};

export default (urlPage, dir) => {
  const pageURL = new URL(urlPage);
  const basePath = getLocalPath(pageURL, dir);
  const baseUrl = `${pageURL.protocol}//${pageURL.host}`;
  const htmlPath = basePath.concat('.html');
  const localResDir = basePath.concat('_files');
  let resLinks;

  return axios.get(pageURL.href)
    .then((response) => {
      const $ = cheerio.load(response.data);
      const { dom: newDom, links } = getDomWithLocalUrls($, localResDir, baseUrl);
      resLinks = links.map((i, el) => el).get();

      return fs.writeFile(htmlPath, newDom.html());
    })
    .then(() => fs.mkdir(localResDir))
    .then(() => saveResources(resLinks))
    .catch((error) => {
      throw error;
    });
};
