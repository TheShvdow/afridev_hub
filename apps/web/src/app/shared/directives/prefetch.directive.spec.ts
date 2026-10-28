import { Component, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PrefetchDirective } from './prefetch.directive';

@Component({
  standalone: true,
  imports: [PrefetchDirective],
  template: `<a [appPrefetch]="path()">lien</a>`,
})
class HostComponent {
  readonly path = signal<string | null>('/forum/posts/abc');
}

describe('PrefetchDirective', () => {
  function setup(withHttp = true) {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: withHttp ? [provideHttpClient(), provideHttpClientTesting()] : [],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLElement;
    return { fixture, link, backend: withHttp ? TestBed.inject(HttpTestingController) : null };
  }

  it('loads the page when the pointer reaches the link', () => {
    const { link, backend } = setup();
    link.dispatchEvent(new Event('mouseenter'));
    const request = backend!.expectOne(`${environment.apiUrl}/forum/posts/abc`);
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('loads the page when the link gets the focus', () => {
    const { link, backend } = setup();
    link.dispatchEvent(new Event('focus'));
    const request = backend!.expectOne(`${environment.apiUrl}/forum/posts/abc`);
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('loads nothing without a path', () => {
    const { fixture, link, backend } = setup();
    fixture.componentInstance.path.set(null);
    fixture.detectChanges();
    link.dispatchEvent(new Event('mouseenter'));
    expect(backend!.match(() => true)).toHaveLength(0);
  });

  it('does nothing when the browser asks to save data', () => {
    const { link, backend } = setup();
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    link.dispatchEvent(new Event('mouseenter'));
    expect(backend!.match(() => true)).toHaveLength(0);
    Reflect.deleteProperty(navigator, 'connection');
  });

  it('stays silent where no HTTP client exists', () => {
    const { link } = setup(false);
    expect(() => link.dispatchEvent(new Event('mouseenter'))).not.toThrow();
  });
});
