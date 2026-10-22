import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExperienceLevel, ModerationActionType, ModerationTargetType, UserRole } from '@prisma/client';
import { AuthorSummaryDto } from './models';

// Modèles de réponse des routes qui n'en avaient pas : le front lit leur forme dans Swagger.

export class MessageDto {
  @ApiProperty({ example: 'Email vérifié.' }) message!: string;
}

export class RegisteredDto {
  @ApiProperty({ example: 'Compte créé : saisissez le code reçu par email pour l\'activer.' }) message!: string;
  @ApiProperty({ example: 'amadou@exemple.sn' }) email!: string;
}

export class CountResultDto {
  @ApiProperty({ example: 3, description: 'Nombre d\'éléments concernés' }) count!: number;
}

export class HealthDto {
  @ApiProperty({ example: 'ok' }) status!: string;
  @ApiProperty({ example: 'ok' }) db!: string;
  @ApiProperty({ example: 'ok' }) redis!: string;
  @ApiProperty({ example: 120.5, description: 'Secondes depuis le démarrage' }) uptime!: number;
}

// ── Utilisateurs ────────────────────────────────────────────────────────

export class MyProfileDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'idy_dev' }) username!: string;
  @ApiProperty({ nullable: true }) displayName!: string | null;
  @ApiProperty({ nullable: true }) bio!: string | null;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ nullable: true }) location!: string | null;
  @ApiProperty({ nullable: true, example: 'SN', description: 'Code de la liste GET /api/countries' }) country!: string | null;
  @ApiProperty({ type: [String], example: ['TypeScript', 'NestJS'] }) stack!: string[];
  @ApiProperty({ enum: ExperienceLevel, nullable: true }) level!: ExperienceLevel | null;
  @ApiProperty({ nullable: true }) websiteUrl!: string | null;
  @ApiProperty({ nullable: true }) githubUsername!: string | null;
  @ApiProperty({ nullable: true }) linkedinUsername!: string | null;
  @ApiProperty({ nullable: true }) twitterUsername!: string | null;
  @ApiProperty({ example: 25 }) reputation!: number;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty() isVerified!: boolean;
  @ApiProperty({ description: 'Emails d\'activité (FR-18)' }) emailNotifications!: boolean;
  @ApiProperty() isRecruiter!: boolean;
  @ApiProperty({ nullable: true, example: 'Acme Dakar' }) companyName!: string | null;
  @ApiProperty({ nullable: true, example: 'XOF', description: 'Devise d\'affichage des salaires' }) preferredCurrency!: string | null;
}

export class OnboardingResultDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'idy_dev' }) username!: string;
  @ApiProperty({ nullable: true, example: 'Dakar' }) location!: string | null;
  @ApiProperty({ nullable: true, example: 'SN' }) country!: string | null;
  @ApiProperty({ type: [String], example: ['TypeScript'] }) stack!: string[];
  @ApiProperty({ enum: ExperienceLevel, nullable: true }) level!: ExperienceLevel | null;
}

export class RecruiterProfileResultDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'idy_dev' }) username!: string;
  @ApiProperty({ example: true }) isRecruiter!: boolean;
  @ApiProperty({ example: 'Acme Dakar' }) companyName!: string;
}

class ActivityPostDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

class ActivityAnswerDto {
  @ApiProperty() id!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty() isAccepted!: boolean;
  @ApiProperty({ type: ActivityPostDto, description: 'Question répondue (id et titre)' }) post!: ActivityPostDto;
}

class ActivityProjectDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'afripay' }) slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class UserActivityDto {
  @ApiProperty({ type: [ActivityPostDto] }) recentPosts!: ActivityPostDto[];
  @ApiProperty({ type: [ActivityAnswerDto] }) recentAnswers!: ActivityAnswerDto[];
  @ApiProperty({ type: [ActivityProjectDto] }) recentProjects!: ActivityProjectDto[];
}

// ── Gamification ────────────────────────────────────────────────────────

export class BadgeDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Dev vérifié' }) name!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ example: '✅' }) icon!: string;
  @ApiProperty() condition!: string;
  @ApiProperty({ nullable: true, example: 'dev-verifie' }) slug!: string | null;
  @ApiProperty({ nullable: true, example: 'VERIFICATION' }) category!: string | null;
  @ApiProperty({ example: 0 }) requiredPoints!: number;
}

export class UserBadgeDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() badgeId!: string;
  @ApiProperty({ format: 'date-time' }) awardedAt!: string;
  @ApiProperty({ type: BadgeDto }) badge!: BadgeDto;
}

class LeaderboardCountsDto {
  @ApiProperty() posts!: number;
  @ApiProperty() answers!: number;
  @ApiProperty() receivedBadges!: number;
}

export class LeaderboardEntryDto extends AuthorSummaryDto {
  @ApiProperty({ nullable: true }) location!: string | null;
  @ApiProperty({ type: LeaderboardCountsDto }) _count!: LeaderboardCountsDto;
}

class ReputationEventDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 10 }) delta!: number;
  @ApiProperty({ example: 'answer_given' }) reason!: string;
  @ApiProperty({ nullable: true }) entityType!: string | null;
  @ApiProperty({ nullable: true }) entityId!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class ReputationDto {
  @ApiProperty({ example: 25 }) reputation!: number;
  @ApiProperty({ type: [ReputationEventDto], description: '20 derniers mouvements' }) history!: ReputationEventDto[];
}

// ── Upload ──────────────────────────────────────────────────────────────

export class AvatarPresignResultDto {
  @ApiProperty({ description: 'URL signée : envoyer le fichier en PUT, avec le Content-Type et la taille déclarés' }) uploadUrl!: string;
  @ApiProperty({ description: 'URL publique de l\'avatar une fois envoyé' }) publicUrl!: string;
  @ApiProperty({ example: 'avatars/2f1c…/9a7e….jpg', description: 'À passer à PATCH /users/me/avatar' }) key!: string;
  @ApiProperty({ example: 300, description: 'Validité de l\'URL, en secondes' }) expiresIn!: number;
}

export class CvPresignResultDto {
  @ApiProperty({ description: 'URL signée : envoyer le PDF en PUT' }) uploadUrl!: string;
  @ApiProperty({ example: 'cvs/2f1c…/9a7e….pdf', description: 'À passer en cvKey à POST /jobs/:id/apply' }) key!: string;
  @ApiProperty({ example: 300 }) expiresIn!: number;
}

// ── Projets ─────────────────────────────────────────────────────────────

export class ProjectCategoryDto {
  @ApiProperty({ example: 'Fintech' }) name!: string;
  @ApiProperty({ example: 'fintech' }) slug!: string;
  @ApiProperty({ nullable: true, example: '💳' }) icon!: string | null;
}

export class StarResultDto {
  @ApiProperty({ example: true, description: 'true : étoile ajoutée ; false : retirée' }) starred!: boolean;
  @ApiProperty({ example: 12, description: 'Nouveau total d\'étoiles AfriDev Hub' }) stars!: number;
}

// ── Paiements ───────────────────────────────────────────────────────────

export class PaymentProductDto {
  @ApiProperty({ example: 'RECRUITER_PREMIUM_MONTHLY' }) code!: string;
  @ApiProperty({ example: 'Plan recruteur premium — 1 mois' }) label!: string;
  @ApiProperty({ example: 25000, description: 'Prix fixé par le serveur' }) amount!: number;
  @ApiProperty({ example: 'XOF' }) currency!: string;
  @ApiProperty({ example: 30 }) durationDays!: number;
}

export class PaymentInitiatedDto {
  @ApiProperty() paymentId!: string;
  @ApiProperty({ example: 25000 }) amount!: number;
  @ApiProperty({ example: 'XOF' }) currency!: string;
  @ApiProperty({ description: 'Identifiant de la transaction Bictorys' }) transactionId!: string;
  @ApiProperty({ description: 'Page de paiement vers laquelle rediriger le membre' }) redirectUrl!: string;
  @ApiPropertyOptional({ nullable: true }) link!: string | null;
  @ApiPropertyOptional({ nullable: true }) qrCode!: string | null;
  @ApiPropertyOptional({ nullable: true }) message!: string | null;
}

// ── Modération et administration ────────────────────────────────────────

export class ModerationActionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, description: 'null : action automatique' }) moderatorId!: string | null;
  @ApiProperty({ nullable: true }) reportId!: string | null;
  @ApiProperty({ enum: ModerationTargetType }) entityType!: ModerationTargetType;
  @ApiProperty() entityId!: string;
  @ApiProperty({ enum: ModerationActionType }) action!: ModerationActionType;
  @ApiProperty({ nullable: true }) note!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class RoleUpdatedDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'idy_dev' }) username!: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
}

class ForumStatsDto {
  @ApiProperty() questions!: number;
  @ApiProperty() questionsWithAnswer!: number;
  @ApiProperty() questionsWithAcceptedAnswer!: number;
  @ApiProperty({ description: 'Pourcentage, arrondi' }) acceptedAnswerRate!: number;
}

class ForumStatsWithWindowDto extends ForumStatsDto {
  @ApiProperty({ type: ForumStatsDto, description: 'Mêmes chiffres sur les 30 derniers jours (SM-2, SM-7)' }) last30Days!: ForumStatsDto;
}

class AdminUsersStatsDto {
  @ApiProperty() total!: number;
  @ApiProperty() newThisWeek!: number;
}

class AdminContentStatsDto {
  @ApiProperty() posts!: number;
  @ApiProperty() projects!: number;
  @ApiProperty() jobs!: number;
}

class AdminProjectsStatsDto {
  @ApiProperty() visible!: number;
  @ApiProperty({ description: 'Stats GitHub importées (SM-6)' }) withGithubStats!: number;
}

class AdminModerationStatsDto {
  @ApiProperty() pendingReports!: number;
}

class AdminRevenueStatsDto {
  @ApiProperty() totalCommission!: number;
  @ApiProperty({ description: 'Paiements réussis (SM-3)' }) capturedPayments!: number;
}

class AdminJobsStatsDto {
  @ApiProperty({ description: 'Offres validées (SM-5)' }) published!: number;
  @ApiProperty() publishedLast60Days!: number;
  @ApiProperty() pendingReview!: number;
}

export class AdminStatsDto {
  @ApiProperty({ type: AdminUsersStatsDto }) users!: AdminUsersStatsDto;
  @ApiProperty({ type: AdminContentStatsDto }) content!: AdminContentStatsDto;
  @ApiProperty({ type: AdminProjectsStatsDto }) projects!: AdminProjectsStatsDto;
  @ApiProperty({ type: AdminModerationStatsDto }) moderation!: AdminModerationStatsDto;
  @ApiProperty({ type: AdminRevenueStatsDto }) revenue!: AdminRevenueStatsDto;
  @ApiProperty({ type: ForumStatsWithWindowDto }) forum!: ForumStatsWithWindowDto;
  @ApiProperty({ type: AdminJobsStatsDto }) jobs!: AdminJobsStatsDto;
}
