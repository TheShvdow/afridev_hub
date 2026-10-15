import { UploadService } from './upload.service';

const configured = {
  CLOUDFLARE_ACCOUNT_ID: 'acc123',
  CLOUDFLARE_R2_ACCESS_KEY_ID: 'AKIATEST',
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'secret-test',
  CLOUDFLARE_R2_BUCKET_NAME: 'afridev-hub',
  CLOUDFLARE_R2_PUBLIC_URL: 'https://media.afridevhub.com',
};
const service = (values: Record<string, string | undefined>) =>
  new UploadService({ get: (key: string) => values[key] } as never);

const own = 'avatars/u1/9b09c626-f769-4e63-bee0-790b769e1185.png';

describe('UploadService.confirmAvatar — règles d\'accès', () => {
  it('refuses a key outside the user folder', async () => {
    await expect(service(configured).confirmAvatar('u1', 'avatars/u2/9b09c626-f769-4e63-bee0-790b769e1185.png'))
      .rejects.toMatchObject({ code: 'UPLOAD_KEY_INVALID' });
  });

  it('refuses a malformed key (path traversal, wrong extension)', async () => {
    await expect(service(configured).confirmAvatar('u1', 'avatars/u1/../../secret.png'))
      .rejects.toMatchObject({ code: 'UPLOAD_KEY_INVALID' });
    await expect(service(configured).confirmAvatar('u1', 'avatars/u1/9b09c626-f769-4e63-bee0-790b769e1185.pdf'))
      .rejects.toMatchObject({ code: 'UPLOAD_KEY_INVALID' });
  });

  it('refuses when the storage is not configured', async () => {
    await expect(service({}).confirmAvatar('u1', own)).rejects.toMatchObject({ code: 'UPLOAD_NOT_CONFIGURED' });
  });
});
