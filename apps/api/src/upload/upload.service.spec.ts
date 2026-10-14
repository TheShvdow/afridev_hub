import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UploadService } from './upload.service';
import { AvatarPresignDto, MAX_AVATAR_BYTES } from './dto/avatar-presign.dto';

const configured = {
  CLOUDFLARE_ACCOUNT_ID: 'acc123',
  CLOUDFLARE_R2_ACCESS_KEY_ID: 'AKIATEST',
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'secret-test',
  CLOUDFLARE_R2_BUCKET_NAME: 'afridev-hub-media',
  CLOUDFLARE_R2_PUBLIC_URL: 'https://media.afridevhub.com/',
};

const withConfig = (values: Record<string, string | undefined>) => ({
  get: jest.fn((key: string) => values[key]),
});

async function dtoErrors(input: Record<string, unknown>) {
  return validate(plainToInstance(AvatarPresignDto, input));
}

describe('AvatarPresignDto', () => {
  it('accepts a JPEG of 250 Ko', async () => {
    expect(await dtoErrors({ mimeType: 'image/jpeg', fileSizeBytes: 250_000 })).toHaveLength(0);
  });

  it('rejects a PDF', async () => {
    expect(await dtoErrors({ mimeType: 'application/pdf', fileSizeBytes: 1000 })).not.toHaveLength(0);
  });

  it('rejects a file above 5 Mo', async () => {
    expect(await dtoErrors({ mimeType: 'image/png', fileSizeBytes: MAX_AVATAR_BYTES + 1 })).not.toHaveLength(0);
  });
});

describe('UploadService.presignAvatar', () => {
  it('returns a presigned PUT URL and the public URL under the avatars prefix', async () => {
    const service = new UploadService(withConfig(configured) as never);
    const result = await service.presignAvatar('u1', { mimeType: 'image/webp', fileSizeBytes: 1000 } as AvatarPresignDto);

    expect(result.key).toMatch(/^avatars\/u1\/[0-9a-f-]+\.webp$/);
    expect(result.publicUrl).toBe(`https://media.afridevhub.com/${result.key}`);
    expect(result.uploadUrl).toContain('afridev-hub-media');
    expect(result.uploadUrl).toContain('X-Amz-Signature=');
    expect(result.expiresIn).toBe(300);
  });

  it('refuses to presign when R2 is not configured', async () => {
    const service = new UploadService(withConfig({}) as never);
    await expect(
      service.presignAvatar('u1', { mimeType: 'image/png', fileSizeBytes: 1000 } as AvatarPresignDto),
    ).rejects.toMatchObject({ code: 'UPLOAD_NOT_CONFIGURED' });
  });
});
