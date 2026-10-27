import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobMode, JobStatus, JobType, PaymentProvider, PaymentStatus, ApplicationStatus, ReportEntityType, ReportStatus, UserRole } from '@prisma/client';

// Modèles de réponse pour la documentation Swagger. Chaque champ reprend le `select` du service
// correspondant : ces classes ne sont jamais utilisées pour valider une entrée.

export class PaginationMetaDto {
  @ApiProperty({ example: 42 }) total!: number;
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) limit!: number;
  @ApiProperty({ example: 3 }) totalPages!: number;
}

export class CountryDto {
  @ApiProperty({ example: 'SN', description: 'Code ISO 3166-1 alpha-2, stocké dans User.country, JobOffer.country, Project.country' }) code!: string;
  @ApiProperty({ example: 'SEN', description: 'Code ISO 3166-1 alpha-3' }) alpha3!: string;
  @ApiProperty({ example: 'Sénégal' }) name!: string;
  @ApiProperty({ enum: ['AFRICA', 'DIASPORA'] }) region!: 'AFRICA' | 'DIASPORA';
}

export class SuccessDto {
  @ApiProperty({ example: true }) success!: boolean;
}

export class AuthorSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'idy_dev' }) username!: string;
  @ApiProperty({ nullable: true, example: 'Idrissa Wade' }) displayName!: string | null;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ example: 15 }) reputation!: number;
}

export class TagDto {
  @ApiProperty({ example: 'NestJS' }) name!: string;
  @ApiProperty({ example: 'nestjs' }) slug!: string;
}

export class TagLinkDto {
  @ApiProperty({ type: TagDto }) tag!: TagDto;
}

export class UserProfileDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'idy_dev' }) username!: string;
  @ApiProperty({ nullable: true }) displayName!: string | null;
  @ApiProperty({ nullable: true }) bio!: string | null;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ nullable: true }) location!: string | null;
  @ApiProperty({ nullable: true, example: 'SN', description: 'Code ISO 3166-1 alpha-2' }) country!: string | null;
  @ApiProperty({ type: [String], example: ['TypeScript', 'NestJS'] }) stack!: string[];
  @ApiProperty({ enum: ['JUNIOR', 'MID', 'SENIOR'], nullable: true }) level!: 'JUNIOR' | 'MID' | 'SENIOR' | null;
  @ApiProperty({ nullable: true }) websiteUrl!: string | null;
  @ApiProperty({ nullable: true }) githubUsername!: string | null;
  @ApiProperty({ nullable: true }) linkedinUsername!: string | null;
  @ApiProperty({ nullable: true }) twitterUsername!: string | null;
  @ApiProperty({ example: 0 }) reputation!: number;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty() isVerified!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiPropertyOptional({ description: 'Compteurs (profil public)', example: { posts: 4, answers: 12, projects: 2, receivedBadges: 3 } })
  _count?: { posts: number; answers: number; projects: number; receivedBadges: number };
  @ApiPropertyOptional({ description: 'Métadonnées Open Graph (profil public)', example: { ogTitle: 'Idrissa Wade — AfriDev Hub', ogDescription: '…', ogImage: null, ogUrl: 'https://afridevhub.com/@idy_dev' } })
  ogMeta?: { ogTitle: string; ogDescription: string; ogImage: string | null; ogUrl: string };
}

export class PostDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Comment configurer Nx avec Angular 18 + SSR ?' }) title!: string;
  @ApiPropertyOptional({ description: 'Absent de la liste, présent sur le détail' }) userId?: string;
  @ApiPropertyOptional({ description: 'Présent sur le détail et la création' }) body?: string;
  @ApiPropertyOptional() viewCount?: number;
  @ApiProperty() isResolved!: boolean;
  @ApiProperty({ example: 3, description: 'Votes positifs − négatifs' }) voteScore!: number;
  @ApiProperty({ format: 'date-time' }) lastActivityAt!: string;
  @ApiPropertyOptional({ description: 'Présent sur le détail ; titre et corps remplacés par « [Contenu masqué] » hors modération' })
  isHidden?: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiPropertyOptional({ format: 'date-time' }) updatedAt?: string;
  @ApiProperty({ type: AuthorSummaryDto }) user!: AuthorSummaryDto;
  @ApiProperty({ type: [TagLinkDto] }) postTags!: TagLinkDto[];
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'number' }, example: { answers: 2 } })
  _count?: { answers: number };
}

export class AnswerDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: '« [Contenu masqué] » quand isHidden, hors modération' }) body!: string;
  @ApiProperty() isAccepted!: boolean;
  @ApiProperty({ example: 1 }) voteScore!: number;
  @ApiProperty() isHidden!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: AuthorSummaryDto }) user!: AuthorSummaryDto;
}

export class PostDetailDto extends PostDto {
  @ApiProperty({ type: [AnswerDto] }) answers!: AnswerDto[];
}

export class SimilarPostDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Comment configurer Nx avec Angular 18 ?' }) title!: string;
  @ApiProperty() isResolved!: boolean;
  @ApiProperty({ example: 0.72, description: 'Similarité trigramme du titre (0 à 1)' }) similarity!: number;
}

export class VoteResultDto {
  @ApiProperty({ enum: ['added', 'changed', 'removed'], example: 'added' }) action!: 'added' | 'changed' | 'removed';
  @ApiProperty({ example: 1, description: 'Score net (votes positifs − négatifs)' }) newScore!: number;
}

export class ProjectOgMetaDto {
  @ApiProperty({ example: 'AfriPay — AfriDev Hub' }) ogTitle!: string;
  @ApiProperty() ogDescription!: string;
  @ApiProperty({ nullable: true }) ogImage!: string | null;
  @ApiProperty({ example: 'https://afridevhub.com/projects/afripay' }) ogUrl!: string;
}

export class ProjectDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'afripay', description: 'Identifiant d\'URL : /projects/<slug>' }) slug!: string;
  @ApiProperty({ example: 'AfriPay' }) name!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ example: 'SN', description: 'ISO 3166-1 alpha-2' }) country!: string;
  @ApiProperty() repoUrl!: string;
  @ApiProperty({ nullable: true }) demoUrl!: string | null;
  @ApiProperty({ example: 42 }) githubStars!: number;
  @ApiProperty({ example: 7 }) githubForks!: number;
  @ApiProperty({ nullable: true, example: 'TypeScript' }) githubLanguage!: string | null;
  @ApiProperty({ nullable: true, format: 'date-time' }) githubLastPush!: string | null;
  @ApiProperty({ nullable: true, format: 'date-time', description: 'null : stats GitHub pas encore importées' }) githubSyncedAt!: string | null;
  @ApiPropertyOptional({ type: ProjectOgMetaDto, description: 'Présent sur le détail' }) ogMeta?: ProjectOgMetaDto;
  @ApiPropertyOptional({ description: 'Présent sur le détail pour un visiteur connecté' }) starredByViewer?: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: AuthorSummaryDto }) user!: AuthorSummaryDto;
  @ApiProperty({ type: [TagLinkDto] }) projectTags!: TagLinkDto[];
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'number' }, example: { stars: 3 } })
  _count?: { stars: number };
}

export class JobDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Développeur NestJS Senior' }) title!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ example: 'GTECH Sénégal' }) company!: string;
  @ApiProperty({ example: 'SN' }) country!: string;
  @ApiProperty({ enum: JobType }) type!: JobType;
  @ApiProperty({ enum: JobMode }) mode!: JobMode;
  @ApiProperty({ type: [String], example: ['NestJS', 'Docker'] }) stack!: string[];
  @ApiProperty({ enum: JobStatus }) status!: JobStatus;
  @ApiProperty({ example: 500000, description: 'Unités de base (entier)' }) salaryMin!: number;
  @ApiProperty({ example: 800000 }) salaryMax!: number;
  @ApiProperty({ example: 'XOF' }) currency!: string;
  @ApiPropertyOptional({ type: () => ConvertedSalaryDto, nullable: true, description: 'Salaire dans la devise demandée, absent si même devise ou taux inconnu' })
  converted?: ConvertedSalaryDto | null;
  @ApiProperty({ format: 'date-time', nullable: true, description: 'Date de validation par la modération' }) publishedAt!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Motif du refus, visible du recruteur' }) rejectionReason?: string | null;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: AuthorSummaryDto }) recruiter!: AuthorSummaryDto;
}

export class ConvertedSalaryDto {
  @ApiProperty({ example: 'NGN' }) currency!: string;
  @ApiProperty({ example: 1250000 }) salaryMin!: number;
  @ApiProperty({ example: 2000000 }) salaryMax!: number;
  @ApiProperty({ format: 'date-time', nullable: true }) ratesAt!: string | null;
}

export class JobApplicationDto {
  @ApiProperty() id!: string;
  @ApiProperty() message!: string;
  @ApiPropertyOptional({ nullable: true, description: 'Lien signé vers le CV, valable 10 min (recruteur)' }) cvDownloadUrl?: string | null;
  @ApiPropertyOptional({ description: 'Profil candidat tronqué (plan gratuit)' }) profileTruncated?: boolean;
  @ApiProperty({ enum: ApplicationStatus }) status!: ApplicationStatus;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class RecruiterPlanDto {
  @ApiProperty({ enum: ['FREE', 'PREMIUM'] }) planType!: 'FREE' | 'PREMIUM';
  @ApiProperty() isPremium!: boolean;
  @ApiProperty({ format: 'date-time', nullable: true }) premiumUntil!: string | null;
  @ApiProperty({ example: 2 }) offersThisMonth!: number;
  @ApiProperty({ example: 3, nullable: true, description: 'null : illimité' }) monthlyLimit!: number | null;
}

export class JobAlertDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, example: 'SN' }) country!: string | null;
  @ApiProperty({ enum: JobMode, nullable: true }) mode!: JobMode | null;
  @ApiProperty({ type: [String], example: ['angular'] }) stack!: string[];
  @ApiProperty({ nullable: true, example: 300000 }) salaryMin!: number | null;
  @ApiProperty({ nullable: true, example: 'XOF' }) currency!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class PaymentDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 10000 }) amount!: number;
  @ApiProperty({ example: 'XOF' }) currency!: string;
  @ApiProperty({ enum: PaymentProvider }) provider!: PaymentProvider;
  @ApiProperty({ enum: PaymentStatus }) status!: PaymentStatus;
  @ApiProperty() entityId!: string;
  @ApiProperty({ nullable: true }) externalRef!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class ReportDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ReportEntityType }) entityType!: ReportEntityType;
  @ApiProperty() entityId!: string;
  @ApiProperty() reason!: string;
  @ApiProperty({ enum: ReportStatus }) status!: ReportStatus;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}
