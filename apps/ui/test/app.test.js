const test = require('node:test');
const assert = require('node:assert/strict');
const App = require('../src/App');

function flattenText(vnode) {
  if (typeof vnode === 'string') {
    return vnode;
  }
  return (vnode.children || []).map(flattenText).join('');
}

test('App renders a heading with the game name', () => {
  const tree = App();
  const heading = tree.children.find((child) => child.type === 'h1');
  assert.ok(heading, 'heading element should exist');
  assert.match(flattenText(heading), /Graph Battle/);
});
