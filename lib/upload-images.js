const remark = require('remark');
const visit = require('unist-util-visit');
const url = require('url');
const fs = require('fs');
const Promise = require('bluebird');
const FormData = require('form-data');
const fetch = require('node-fetch');

const readFile = Promise.promisify(require("fs").readFile);

function uploadToMedium(token) {
  return (image) => {
    const form = new FormData();
    form.append('image', image);

    return fetch(
      'https://api.medium.com/v1/images',
      {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json());
  };
}

function imagesTransform(options) {
  const token = options.token;
  const promises = [];

  return (tree) => {
    visit(tree, 'image', (node) => {
      if (url.parse(node.url).protocol) {
        return;
      }

      const promise = readFile(node.url)
            .then(uploadToMedium(token))
            .then((data) => {
              console.log('Image uploaded: ' + data);
              node.url = data.url;
              return node;
            });

      promises.push(promise);
    });

    return Promise.all(promises);
  };
}


/**
 * Upload local images found in markdown
 * @param {string} markdownContent - markdown text
 */
module.exports = function (markdownContent, options) {
  promises = [];

  return remark()
    .use(imagesTransform, { token: options.token })
    .process(markdownContent, (err, result) => {
      if (err) {
        console.log(err);
        return;
      }
      console.log(result);
    });
};
