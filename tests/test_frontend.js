import assert from 'assert';
import { filterApps } from '../src/js/core/startMenu.js';

const apps = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
];

assert.deepStrictEqual(filterApps(apps, 'al'), [apps[0]]);
assert.deepStrictEqual(filterApps(apps, 'B'), [apps[1]]);
console.log('frontend tests passed');
