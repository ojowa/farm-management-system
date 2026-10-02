const next = require('next');
const http = require('http');

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const port = Number(process.env.PORT) || 4003;
  http.createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`> admin ready on :${port}`);
  });
});
