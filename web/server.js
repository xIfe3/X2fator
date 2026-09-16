// Minimal production server entrypoint for hosts (like cPanel's
// "Setup Node.js App") that require a single JS file to run, rather
// than an npm script — `next start` is a CLI command, not something
// Passenger/LSAPI can execute directly, so this wraps Next's
// programmatic server API instead. Requires `next build` to have run
// first (this repo's scripts/build-cpanel.sh does that).
const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";

const app = next({ dev: false, dir: __dirname, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
      console.log(`Ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start Next.js server:", err);
    process.exit(1);
  });
