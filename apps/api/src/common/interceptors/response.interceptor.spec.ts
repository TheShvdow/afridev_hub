import { of, lastValueFrom } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

function wrap(value: unknown) {
  return lastValueFrom(new ResponseInterceptor().intercept({} as never, { handle: () => of(value) } as never));
}

describe('ResponseInterceptor (AD-7)', () => {
  it('wraps a plain value in data', async () => {
    expect(await wrap({ id: 'u1' })).toEqual({ data: { id: 'u1' } });
  });

  it('passes an already enveloped paginated result through unchanged', async () => {
    const paged = { data: [1, 2], meta: { total: 2, page: 1, limit: 20, totalPages: 1 } };
    expect(await wrap(paged)).toBe(paged);
  });

  it('wraps undefined as data null', async () => {
    expect(await wrap(undefined)).toEqual({ data: null });
  });
});
