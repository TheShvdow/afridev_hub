import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuditLogComponent } from './audit-log.component';
import { AdminService } from '../../../core/services/admin.service';

describe('AuditLogComponent', () => {
  it('lists the audit entries, with "Système" when no author is recorded', () => {
    const admin = {
      auditLog: jest.fn().mockReturnValue(
        of({
          data: [
            { id: 'a1', action: 'JOB_APPROVED', entityType: 'JOB_OFFER', entityId: 'job-1', createdAt: new Date().toISOString(), user: { id: 'u1', username: 'modo_koffi', avatarUrl: null } },
            { id: 'a2', action: 'CONTENT_AUTO_HIDDEN', entityType: 'POST', entityId: 'p1', createdAt: new Date().toISOString(), user: null },
          ],
          meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
        }),
      ),
    };
    TestBed.configureTestingModule({ imports: [AuditLogComponent], providers: [{ provide: AdminService, useValue: admin }] });
    const fixture = TestBed.createComponent(AuditLogComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('JOB_APPROVED');
    expect(text).toContain('modo_koffi');
    expect(text).toContain('Système');
  });
});
