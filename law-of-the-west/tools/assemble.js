#!/usr/bin/env node
/* Writes index.html from page.html plus the four scripts, in order:
 * sid-audio.js verbatim, then content, engine and ui, all inline. The result
 * is the deliverable and is committed; this only exists so the sources can be
 * edited as separate files. Running it is never required to play the game.
 *   node tools/assemble.js                                                   */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const shell=read('page.html');
const parts=['sid-audio.js','content.js','engine.js','ui.js']
  .map(f=>`/* ===== ${f} ===== */\n`+read(f).replace(/^#!.*\n/,''));
const marker='/* SCRIPTS */';
if(!shell.includes(marker))throw new Error('page.html has no '+marker);
const out=shell.replace(marker,parts.join('\n\n'));
fs.writeFileSync(path.join(ROOT,'index.html'),out);
const kb=(Buffer.byteLength(out)/1024).toFixed(1);
console.log(`index.html  ${kb} KB  (budget 160 KB)`);
if(/<script[^>]+src=|https?:\/\/(?!www\.w3\.org)/.test(out.replace(/<!--[\s\S]*?-->/g,'')))
  console.log('WARNING: the page appears to reference something external');
