import { OAuthCallbackFilter } from './oauth-callback.filter';
import { DomainException } from '../../common/errors/domain.exception';

function run(exception: unknown, path = '/api/auth/github/callback') {
  const res = { redirect: jest.fn() };
  const host = { switchToHttp: () => ({ getRequest: () => ({ path }), getResponse: () => res }) };
  const filter = new OAuthCallbackFilter({ get: () => 'https://web.test' } as never);
  filter.catch(exception, host as never);
  return res.redirect.mock.calls[0][0] as string;
}

describe('OAuthCallbackFilter', () => {
  it('redirects a failed token exchange to the login page instead of a 500', () => {
    expect(run(new Error('Failed to obtain access token')))
      .toBe('https://web.test/auth/login#provider=github&error=AUTH_OAUTH_FAILED');
  });

  it('keeps the domain error code, for example a banned account', () => {
    expect(run(new DomainException('AUTH_ACCOUNT_BANNED', 'Compte suspendu.', 403), '/api/auth/google/callback'))
      .toBe('https://web.test/auth/login#provider=google&error=AUTH_ACCOUNT_BANNED');
  });
});
