import { renderToString } from 'react-dom/server';
import * as React from 'react';
import { ServerStyleSheet } from 'styled-components';
import { Redoc, createStore } from '../../';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const yaml = require('yaml-js');
const http = require('http');
const url = require('url');
const fs = require('fs');

const PORT = 9999;

const server = http.createServer(async (request, response) => {
  console.time('request ' + request.url);
  if (request.url === '/redoc.standalone.js') {
    fs.createReadStream('bundles/redoc.standalone.js', 'utf8').pipe(response);
  } else if (request.url === '/') {
    const spec = yaml.load(readFileSync(resolve(__dirname, '../openapi.yaml')));
    let store = await createStore(spec, '', { nativeScrollbars: true });

    const sheet = new ServerStyleSheet();

    const html = renderToString(sheet.collectStyles(React.createElement(Redoc, { store })));
    const css = sheet.getStyleTags();

    const res = `<html>
    <head>
      <meta charset="utf8" />
      <title>ReDoc</title>
      <!-- needed for adaptive design -->
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          padding: 0;
          margin: 0;
        }
      </style>
      <script src="https://unpkg.com/react/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
      <script src="redoc.standalone.js"></script>
      <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
      ${css}
    </head>
    <body>
      <div id="redoc">${html}</div>
      <script>
        const state = ${JSON.stringify(await store.toJS())};
        const store = Redoc.AppStore.fromJS(state);
        document.addEventListener('DOMContentLoaded', function() {
          console.time('ReDoc hydrate');
          ReactDOM.hydrate(React.createElement(Redoc.Redoc, {store: store}), document.getElementById('redoc'));
          console.timeEnd('ReDoc hydrate');
        });
      </script>
    </body>
    </html>`;
    response.writeHead(200);
    response.write(res);
    response.end();
  } else {
    response.writeHead(404);
    response.write('Not found');
    response.end();
  }

  console.timeEnd('request ' + request.url);
});

server.listen(PORT, () => console.log(`Server started: http://127.0.0.1:${PORT}`));