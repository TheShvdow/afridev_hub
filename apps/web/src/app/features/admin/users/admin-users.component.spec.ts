import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminUsersComponent } from './admin-users.component';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { ModerationService } from '../../../core/services/moderation.service';
import { AuthStore } from '../../../core/store/auth.store';
import { ToastService } from '../../../core/services/toast.service';

const USER: AdminUser = {
  id: 'u2',
  username: 'chidi_codes',
  email: 'chidi@example.com',
  role: 'MEMBER',
  isVerified: true,
  reputation: 480,
  createdAt: new Date().toISOString(),
  lastSeenAt: null,
};

describe('AdminUsersComponent', () => {
  const admin = { listUsers: jest.fn(), updateRole: jest.fn() };
  const moderation = { banUser: jest.fn(), unbanUser: jest.fn() };
  const toast = { success: jest.fn(), error: jest.fn() };

  function create() {
    TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: ModerationService, useValue: moderation },
        { provide: ToastService, useValue: toast },
        { provide: AuthStore, useValue: { currentUser: () => ({ id: 'admin-1', role: 'ADMIN' }) } },
      ],
    });
    const fixture = TestBed.createComponent(AdminUsersComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    admin.listUsers.mockReturnValue(of({ data: [USER], meta: { total: 1, page: 1, limit: 30, totalPages: 1 } }));
  });

  it('lists users and searches by term', () => {
    const fixture = create();

    fixture.componentInstance.find('  chidi ');

    expect(admin.listUsers).toHaveBeenLastCalledWith(1, 'chidi');
    expect(fixture.nativeElement.textContent).toContain('chidi_codes');
  });

  it('updates the role and shows it in the list', () => {
    admin.updateRole.mockReturnValue(of({}));
    const fixture = create();

    fixture.componentInstance.changeRole(USER, 'MODERATOR');

    expect(admin.updateRole).toHaveBeenCalledWith('u2', 'MODERATOR');
    expect(fixture.componentInstance.users()[0].role).toBe('MODERATOR');
  });

  it('requires a ban reason of at least 3 characters', () => {
    const fixture = create();

    fixture.componentInstance.ban(USER, ' a ');
    expect(moderation.banUser).not.toHaveBeenCalled();

    moderation.banUser.mockReturnValue(of({}));
    fixture.componentInstance.ban(USER, ' Harcèlement ');
    expect(moderation.banUser).toHaveBeenCalledWith('u2', 'Harcèlement');
  });

  it('lifts a ban', () => {
    moderation.unbanUser.mockReturnValue(of({}));
    create().componentInstance.unban(USER);

    expect(moderation.unbanUser).toHaveBeenCalledWith('u2');
  });
});
