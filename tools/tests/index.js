'use strict';
// Node 24 does not expand a directory given to `node --test`, so `node --test tools/tests/`
// loads this file. It runs every *.test.js next to it.
const fs = require('node:fs');
const path = require('node:path');
for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith('.test.js')).sort()) {
  require(path.join(__dirname, f));
}
