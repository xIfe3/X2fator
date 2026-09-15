// Writes a flattened package.json for a cPanel deploy bundle: strips
// devDependencies/scripts, and (for the api bundle) removes the
// workspace:* dependency on @2xfactor/database since it's vendored
// directly into node_modules instead.
//
// Usage: node flatten-package.js <sourcePackageJson> <destPackageJson> [--strip-dep=<name>] [--start=<script>]
const fs = require("fs");

const [srcPath, destPath, ...flags] = process.argv.slice(2);

const pkg = JSON.parse(fs.readFileSync(srcPath, "utf8"));
delete pkg.devDependencies;
delete pkg.scripts;

for (const flag of flags) {
  if (flag.startsWith("--strip-dep=")) {
    const dep = flag.slice("--strip-dep=".length);
    if (pkg.dependencies) delete pkg.dependencies[dep];
  }
  if (flag.startsWith("--start=")) {
    pkg.scripts = { start: flag.slice("--start=".length) };
  }
}

fs.writeFileSync(destPath, JSON.stringify(pkg, null, 2));
