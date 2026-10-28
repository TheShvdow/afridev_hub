import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { HttpCacheService } from '../cache/http-cache.service';
import { FRESH_MS, STALE_MS } from '../cache/cache-policy';
import { AuthStore } from '../store/auth.store';
import { cacheInterceptor } from './cache.interceptor';

const LIST = `${environment.apiUrl}/forum/posts`;
const PLAN = `${environment.apiUrl}/jobs/plan`;

describe('cacheInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let user: { id: string } | null;
  let token: string | null;
  let now: number;

  beforeEach(() => {
    user = { id: 'u1' };
    token = 'jwt';
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([cacheInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: { currentUser: () => user, accessToken: () => token } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    jest.restoreAllMocks();
  });

  const get = (url = LIST) => {
    const seen: unknown[] = [];
    http.get(url).subscribe((body) => seen.push(body));
    return seen;
  };

  it('asks the network once, then answers from the cache without any request', () => {
    const first = get();
    backend.expectOne(LIST).flush({ data: [1] });
    expect(first).toEqual([{ data: [1] }]);

    const second = get();
    backend.expectNone(LIST);
    expect(second).toEqual([{ data: [1] }]);
  });

  it('shares one request between two readers of the same page', () => {
    const a = get();
    const b = get();
    backend.expectOne(LIST).flush({ data: ['x'] });
    expect(a).toEqual([{ data: ['x'] }]);
    expect(b).toEqual([{ data: ['x'] }]);
  });

  it('shows the cached page at once when stale, then the new version if it changed', () => {
    get();
    backend.expectOne(LIST).flush({ data: ['old'] });

    now += FRESH_MS + 1;
    const seen = get();
    expect(seen).toEqual([{ data: ['old'] }]);

    backend.expectOne(LIST).flush({ data: ['new'] });
    expect(seen).toEqual([{ data: ['old'] }, { data: ['new'] }]);
  });

  it('never shows a stale page 2 twice: it waits for the network instead', () => {
    const page2 = `${LIST}?page=2`;
    http.get(page2).subscribe();
    backend.expectOne(page2).flush({ data: ['p2'] });

    now += FRESH_MS + 1;
    const seen: unknown[] = [];
    http.get(page2).subscribe((body) => seen.push(body));
    expect(seen).toEqual([]);
    backend.expectOne(page2).flush({ data: ['p2 new'] });
    expect(seen).toEqual([{ data: ['p2 new'] }]);
  });

  it('still serves a fresh page 2 from the cache', () => {
    const page2 = `${LIST}?page=2`;
    http.get(page2).subscribe();
    backend.expectOne(page2).flush({ data: ['p2'] });

    const seen: unknown[] = [];
    http.get(page2).subscribe((body) => seen.push(body));
    backend.expectNone(page2);
    expect(seen).toEqual([{ data: ['p2'] }]);
  });

  it('does not emit twice when the fresh version is identical', () => {
    get();
    backend.expectOne(LIST).flush({ data: ['same'] });

    now += FRESH_MS + 1;
    const seen = get();
    backend.expectOne(LIST).flush({ data: ['same'] });
    expect(seen).toHaveLength(1);
  });

  it('keeps showing the cached page when the refresh fails', () => {
    get();
    backend.expectOne(LIST).flush({ data: ['old'] });

    now += FRESH_MS + 1;
    const seen = get();
    backend.expectOne(LIST).flush('down', { status: 500, statusText: 'Server Error' });
    expect(seen).toEqual([{ data: ['old'] }]);
  });

  it('goes back to the network once the entry has expired', () => {
    get();
    backend.expectOne(LIST).flush({ data: ['old'] });

    now += STALE_MS + 1;
    const seen = get();
    backend.expectOne(LIST).flush({ data: ['fresh'] });
    expect(seen).toEqual([{ data: ['fresh'] }]);
  });

  it('clears the cache after a successful write', () => {
    get();
    backend.expectOne(LIST).flush({ data: ['before'] });

    http.post(LIST, {}).subscribe();
    backend.expectOne({ method: 'POST', url: LIST }).flush({});

    const seen = get();
    backend.expectOne(LIST).flush({ data: ['after'] });
    expect(seen).toEqual([{ data: ['after'] }]);
  });

  it('keeps the cache when the write fails', () => {
    get();
    backend.expectOne(LIST).flush({ data: ['kept'] });

    http.post(LIST, {}).subscribe({ error: () => undefined });
    backend.expectOne({ method: 'POST', url: LIST }).flush('no', { status: 400, statusText: 'Bad Request' });

    const seen = get();
    backend.expectNone(LIST);
    expect(seen).toEqual([{ data: ['kept'] }]);
  });

  it('does not store a read that finished after the cache was cleared', () => {
    get();
    const pending = backend.expectOne(LIST);

    TestBed.inject(HttpCacheService).clear();
    pending.flush({ data: ['late'] });

    const seen = get();
    backend.expectOne(LIST).flush({ data: ['current'] });
    expect(seen).toEqual([{ data: ['current'] }]);
  });

  it('keeps each member\'s data apart', () => {
    get();
    backend.expectOne(LIST).flush({ data: ['for u1'] });

    user = { id: 'u2' };
    const seen = get();
    backend.expectOne(LIST).flush({ data: ['for u2'] });
    expect(seen).toEqual([{ data: ['for u2'] }]);
  });

  const jwtFor = (sub: string) => `h.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.s`;

  it('caches under the token owner while the profile is still loading after a reload', () => {
    user = null;
    token = jwtFor('u7');
    get();
    backend.expectOne(LIST).flush({ data: ['mine'] });
    const again = get();
    backend.expectNone(LIST);
    expect(again).toEqual([{ data: ['mine'] }]);

    // Le même jeton, profil chargé : c'est la même entrée.
    user = { id: 'u7' };
    const loaded = get();
    backend.expectNone(LIST);
    expect(loaded).toEqual([{ data: ['mine'] }]);
  });

  it('skips the cache when the token cannot be read', () => {
    user = null;
    token = 'not-a-jwt';
    const first = get();
    backend.expectOne(LIST).flush({ data: [1] });
    const second = get();
    backend.expectOne(LIST).flush({ data: [2] });
    expect(first).toEqual([{ data: [1] }]);
    expect(second).toEqual([{ data: [2] }]);
  });

  it('never caches private or volatile reads', () => {
    const first = get(PLAN);
    backend.expectOne(PLAN).flush({ data: { planType: 'FREE' } });
    const second = get(PLAN);
    backend.expectOne(PLAN).flush({ data: { planType: 'PREMIUM' } });
    expect(first).toEqual([{ data: { planType: 'FREE' } }]);
    expect(second).toEqual([{ data: { planType: 'PREMIUM' } }]);
  });

  it('hands out copies: changing a result does not change the cache', () => {
    http.get<{ data: string[] }>(LIST).subscribe((body) => body.data.push('mutated'));
    backend.expectOne(LIST).flush({ data: ['a'] });

    const seen = get();
    expect(seen).toEqual([{ data: ['a'] }]);
  });

  it('restores the last page after a reload, from the session storage', () => {
    get();
    backend.expectOne(LIST).flush({ data: ['persisted'] });

    TestBed.inject(HttpCacheService)['memory'].clear();
    const seen = get();
    backend.expectNone(LIST);
    expect(seen).toEqual([{ data: ['persisted'] }]);
  });
});
