import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { DomainException } from '../common/errors/domain.exception';
import { AvatarPresignDto } from './dto/avatar-presign.dto';

const UPLOAD_TTL_SECONDS = 300; // 5 min pour envoyer le fichier
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// Upload d'avatars vers Cloudflare R2 par URL présignée (AD-6) : les identifiants restent côté serveur.
@Injectable()
export class UploadService {
  constructor(private readonly config: ConfigService) {}

  async presignAvatar(userId: string, dto: AvatarPresignDto) {
    const accountId = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('CLOUDFLARE_R2_BUCKET_NAME');
    const publicBase = this.config.get<string>('CLOUDFLARE_R2_PUBLIC_URL');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
      throw new DomainException('UPLOAD_NOT_CONFIGURED', 'Le stockage des fichiers n\'est pas configuré.', 503);
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const key = `avatars/${userId}/${randomUUID()}.${EXTENSIONS[dto.mimeType]}`;
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: dto.mimeType, ContentLength: dto.fileSizeBytes }),
      { expiresIn: UPLOAD_TTL_SECONDS },
    );

    return {
      uploadUrl,
      publicUrl: `${publicBase.replace(/\/$/, '')}/${key}`,
      key,
      expiresIn: UPLOAD_TTL_SECONDS,
    };
  }
}
