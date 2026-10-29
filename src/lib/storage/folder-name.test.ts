import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { childFolderPath, validateNewFolderName } from './folder-name';

describe('validateNewFolderName', () => {
  it('accepts URI-safe segment names', () => {
    assert.deepEqual(validateNewFolderName('project-2026'), { ok: true, name: 'project-2026' });
    assert.deepEqual(validateNewFolderName('data_set.v1'), { ok: true, name: 'data_set.v1' });
  });

  it('rejects spaces and slashes', () => {
    assert.equal(validateNewFolderName('My docs').ok, false);
    assert.equal(validateNewFolderName('a/b').ok, false);
  });

  it('builds child paths', () => {
    assert.equal(childFolderPath('/home/user', 'new-dir'), '/home/user/new-dir');
    assert.equal(childFolderPath('/', 'top'), '/top');
  });
});
