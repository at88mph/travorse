import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NodeNotFoundError, NotAuthenticatedError, PermissionDeniedError, VospaceError } from '../vospace/errors';
import { LOGIN_MAY_BE_NEEDED, listingErrorResponse } from './listing-error';
import { NotAFolderError } from './listing';

describe('listing errors', () => {
  it('says a login may be needed for 401 and 403', () => {
    const anonymous = listingErrorResponse(new NotAuthenticatedError('NotAuthenticated (HTTP 401)', { status: 401 }));
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.message, LOGIN_MAY_BE_NEEDED);
    assert.match(anonymous.message, /may be needed/);
    assert.match(anonymous.message, /group memberships/);

    const forbidden = listingErrorResponse(new PermissionDeniedError('PermissionDenied (HTTP 403)', { status: 403 }));
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.message, LOGIN_MAY_BE_NEEDED);
  });

  it('reports every other service error unchanged', () => {
    const missing = listingErrorResponse(new NodeNotFoundError('Container gone (HTTP 404)', { status: 404 }));
    assert.equal(missing.status, 404);
    assert.equal(missing.message, 'Container gone (HTTP 404)');

    const busy = listingErrorResponse(new VospaceError('ServiceBusy (HTTP 503)', { status: 503 }));
    assert.equal(busy.status, 503);
    assert.equal(busy.message, 'ServiceBusy (HTTP 503)');

    const notFolder = listingErrorResponse(new NotAFolderError());
    assert.equal(notFolder.status, 409);
    assert.equal(notFolder.message, 'That path is not a folder');
  });
});
