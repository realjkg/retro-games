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
/* The budget is a real limit, not a number to print at somebody. The test suite
 * holds the same line (page.test.js, test 9p), but this is the script a person
 * runs by hand, and a silent overrun here is a surprise deferred to the test
 * run. The page must stay one small file: it is opened from a phone, and from
 * file:// with no server behind it. */
const BUDGET_KB=320;
const kb=Buffer.byteLength(out)/1024;
console.log(`index.html  ${kb.toFixed(1)} KB  (budget ${BUDGET_KB} KB)`);
if(kb>BUDGET_KB){
  console.error(`OVER BUDGET: ${kb.toFixed(1)} KB against a limit of ${BUDGET_KB} KB.`);
  process.exitCode=1;
}
/* Left as a warning on purpose: test 9p enforces this properly, and the same
 * rule failing hard in two places is two places for it to drift. */
if(/<script[^>]+src=|https?:\/\/(?!www\.w3\.org)/.test(out.replace(/<!--[\s\S]*?-->/g,'')))
  console.log('WARNING: the page appears to reference something external');
