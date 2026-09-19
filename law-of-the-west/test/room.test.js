/* The room of players, run as a test.  node --test test/room.test.js
 *
 * tools/players.js puts seven different ideas of how a sheriff talks through
 * the whole day, over and over, and holds the result to a standard: every
 * authored ending reachable by somebody, the sheriff able to live and able to
 * die, both reckonings earned, nobody stuck, and the beats answering back.
 * It is a tool first and a test second, which is why it lives in tools/ and is
 * run here rather than rewritten here.                                      */
'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const path=require('path'), {execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..');

test('32. a room of players can reach everything the day has, and both ends of it', ()=>{
  let out='';
  try{
    out=execFileSync(process.execPath,
      [path.join(ROOT,'tools','players.js'),'--days','84'],
      {encoding:'utf8',timeout:120000});
  }catch(e){
    out=(e.stdout||'')+(e.stderr||'');
    assert.fail('the room found the day wanting:\n'+out);
  }
  assert.match(out,/all clear/,out);
});

test('33. there is time to answer, and being slow costs something', ()=>{
  let out='';
  try{
    out=execFileSync(process.execPath,[path.join(ROOT,'tools','timing.js')],
      {encoding:'utf8',timeout:120000});
  }catch(e){
    out=(e.stdout||'')+(e.stderr||'');
    assert.fail('the gunfights are not answerable:\n'+out);
  }
  assert.match(out,/all clear/,out);
});
