import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { DomainException } from '../common/errors/domain.exception';
import { AvatarPresignDto } from './dto/avatar-presign.dto';

const UPLOAD_TTL_SECONDS = 300; // 5 min pour envoyer le fichier
const AVATAR_KEY = /^avatars\/[^/]+\/[0-9a-f-]+\.(jpg|png|webp|gif)$/;
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
    const { client, bucket, publicBase } = this.requireStorage();

    const key = `avatars/${userId}/${randomUUID()}.${EXTENSIONS[dto.mimeType]}`;
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: dto.mimeType, ContentLength: dto.fileSizeBytes }),
      { expiresIn: UPLOAD_TTL_SECONDS },
    );

    return {
      uploadUrl,
      publicUrl: `${publicBase}/${key}`,
      key,
      expiresIn: UPLOAD_TTL_SECONDS,
    };
  }

  // Valide un avatar déjà envoyé : clé bien formée, dans le dossier de l'utilisateur, objet présent dans R2.
  async confirmAvatar(userId: string, key: string): Promise<string> {
    if (!AVATAR_KEY.test(key) || !key.startsWith(`avatars/${userId}/`)) {
      throw new DomainException('UPLOAD_KEY_INVALID', 'Clé de fichier invalide.', 400);
    }

    const { client, bucket, publicBase } = this.requireStorage();
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      throw new DomainException('UPLOAD_OBJECT_NOT_FOUND', 'Fichier introuvable : envoyez-le d\'abord vers le stockage.', 400);
    }

    return `${publicBase}/${key}`;
  }

  private requireStorage() {
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
      // Pas de somme de contrôle ajoutée par défaut : R2 signe alors uniquement les en-têtes utiles.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
    return { client, bucket, publicBase: publicBase.replace(/\/$/, '') };
  }
}
