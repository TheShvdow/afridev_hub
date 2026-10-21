// ─────────────────────────────────────────────────────────────────────────────
// Types partagés API ↔ front (miroir du contrat BMAD : data-contract-afridev-hub-phase1.md)
//
// Règles :
//   - Enums : valeurs identiques à `prisma/schema.prisma` (source de vérité).
//   - Champs : noms identiques aux champs Prisma ; relations nommées comme dans Prisma
//     (`user`, `postTags`, `projectTags`, `recruiter`, `actor`).
//   - Ne pas ajouter de champ ici sans l'ajouter au schéma (ou documenter le mapping).
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums (miroir Prisma) ────────────────────────────────────────────────────

export type UserRole = 'MEMBER' | 'MODERATOR' | 'ADMIN';
export type VoteEntityType = 'POST' | 'ANSWER';
export type VoteValue = 'UP' | 'DOWN';
export type ReportEntityType = 'POST' | 'ANSWER' | 'PROJECT';
export type ModerationTargetType = 'POST' | 'ANSWER' | 'PROJECT' | 'USER';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
export type ModerationActionType = 'HIDDEN' | 'RESTORED' | 'DISMISSED' | 'WARNING' | 'BAN';
export type ExperienceLevel = 'JUNIOR' | 'MID' | 'SENIOR';
export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP';
export type JobMode = 'REMOTE' | 'ONSITE' | 'HYBRID';
export type JobStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'EXPIRED' | 'CLOSED';
export type ApplicationStatus = 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';
export type PlanType = 'FREE' | 'PREMIUM';
export type PaymentProvider = 'BICTORYS';  // agrégateur unique (décision 2026-10-14)
export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
export type PaymentEntityType = 'MENTOR_SESSION' | 'RECRUITER_PLAN' | 'COURSE_ENROLLMENT';
export type RefundStatus = 'PENDING' | 'PROCESSED' | 'REJECTED';
export type NotificationType =
  | 'NEW_ANSWER'
  | 'ANSWER_ACCEPTED'
  | 'VOTE_RECEIVED'
  | 'MENTION'
  | 'REPORT_RESOLVED'
  | 'JOB_ALERT'
  | 'JOB_APPLICATION'
  | 'JOB_REVIEWED'
  | 'SYSTEM'
  | 'BADGE_AWARDED';

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginDto {
  email:    string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email:    string;
  password: string;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
}

// ── User ──────────────────────────────────────────────────────────────────────

/** Sous-ensemble public d'un utilisateur, utilisé dans les relations (`user`, `recruiter`, `actor`…). */
export interface UserSummary {
  id:          string;
  username:    string;
  displayName: string | null;
  avatarUrl:   string | null;
  reputation:  number;
}

export interface UserMe {
  id:          string;
  email:       string;
  username:    string;
  displayName: string | null;
  avatarUrl:   string | null;
  role:        UserRole;
  isVerified:  boolean;
  reputation:  number;
  emailNotifications: boolean;
  isRecruiter: boolean;
  companyName: string | null;
  preferredCurrency: string | null;
  createdAt:   string;
}

export interface UserProfile {
  id:               string;
  username:         string;
  displayName:      string | null;
  bio:              string | null;
  avatarUrl:        string | null;
  location:         string | null;
  websiteUrl:       string | null;
  githubUsername:   string | null;
  linkedinUsername: string | null;
  twitterUsername:  string | null;
  reputation:       number;
  role:             UserRole;
  isVerified:       boolean;
  createdAt:        string;
  _count?: {
    posts:          number;
    answers:        number;
    projects:       number;
    receivedBadges: number;
  };
}

// ── Forum ─────────────────────────────────────────────────────────────────────

export interface TagSummary {
  name: string;
  slug: string;
}

export interface PostTagItem {
  tag: TagSummary;
}

export interface PostListItem {
  id:         string;
  title:      string;
  viewCount:  number;
  isResolved: boolean;
  voteScore:  number;
  lastActivityAt: string;
  createdAt:  string;
  user:       UserSummary;
  postTags:   PostTagItem[];
  _count:     { answers: number };
}

export interface AnswerItem {
  id:         string;
  body:       string;   // « [Contenu masqué] » quand isHidden, sauf pour la modération
  isAccepted: boolean;
  voteScore:  number;
  isHidden:   boolean;
  createdAt:  string;
  user:       UserSummary;
}

export interface PostDetail extends PostListItem {
  body:     string;   // « [Contenu masqué] » quand isHidden, sauf pour la modération
  isHidden: boolean;
  answers:  AnswerItem[];
}

// ── Votes ─────────────────────────────────────────────────────────────────────

export interface VoteDto {
  value: VoteValue;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export interface ProjectCategorySummary {
  name: string;
  slug: string;
}

export interface ProjectTagItem {
  tag: TagSummary;
}

export interface ProjectListItem {
  id:          string;
  slug:        string;
  name:        string;
  description: string;
  country:     string;
  repoUrl:     string;
  demoUrl:     string | null;
  githubStars:    number;
  githubForks:    number;
  githubLanguage: string | null;
  githubLastPush: string | null;
  githubSyncedAt: string | null;   // null : stats GitHub pas encore importées
  createdAt:   string;
  user:        UserSummary;
  projectTags: ProjectTagItem[];
  _count:      { stars: number };
}

export interface CreateProjectDto {
  name:          string;
  description:   string;
  country:       string;
  repoUrl:       string;
  demoUrl?:      string;
  tags:          string[];
  categorySlug:  string;
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export interface JobListItem {
  id:        string;
  title:     string;
  company:   string;
  country:   string;
  type:      JobType;
  mode:      JobMode;
  stack:     string[];
  status:    JobStatus;
  salaryMin: number;
  salaryMax: number;
  currency:  string;
  // Salaire converti dans la devise demandée (?currency= ou devise préférée du membre), si un taux est connu.
  converted?: ConvertedSalary | null;
  publishedAt: string | null;
  expiresAt: string;
  createdAt: string;
  recruiter: UserSummary;
}

export interface ConvertedSalary {
  currency:  string;
  salaryMin: number;
  salaryMax: number;
  ratesAt:   string;
}

export interface CreateJobDto {
  title:       string;
  description: string;
  company:     string;
  country:     string;
  type:        JobType;
  mode:        JobMode;
  salaryMin:   number;
  salaryMax:   number;
  currency:    string;
  stack:       string[];
}

export interface ApplyJobDto {
  message: string;
  cvKey?:  string;  // clé R2 renvoyée par POST /upload/cv-presign
}

export interface JobApplicationItem {
  id:        string;
  message:   string;
  cvDownloadUrl: string | null;  // URL signée, valable 10 min
  status:    ApplicationStatus;
  createdAt: string;
  user:      UserSummary;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface PaymentItem {
  id:          string;
  amount:      number;
  currency:    string;
  provider:    PaymentProvider;
  status:      PaymentStatus;
  entityType:  PaymentEntityType;
  entityId:    string;
  externalRef: string | null;
  createdAt:   string;
  updatedAt:   string;
}

export interface InitiatePaymentDto {
  amount:     number;
  currency:   string;
  provider:   PaymentProvider;
  entityType: PaymentEntityType;
  entityId:   string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationItem {
  id:         string;
  type:       NotificationType;
  title:      string | null;
  message:    string;
  targetType: string | null;
  targetId:   string | null;
  isRead:     boolean;
  createdAt:  string;
  actor:      UserSummary | null;
}

// ── Enveloppe de réponse (AD-7) ──────────────────────────────────────────────

/** Succès : toute réponse est enveloppée dans `data` ; les listes ajoutent `meta`. */
export interface ApiSuccess<T> {
  data: T;
}

/** Erreur : `code` au format DOMAINE_ENTITE_RAISON ; `details` seulement pour la validation. */
export interface ApiErrorEnvelope {
  error: {
    code:     ErrorCode;
    message:  string;
    details?: string[];
  };
}

// ── Codes d'erreur métier (AD-7) ─────────────────────────────────────────────

export type ErrorCode =
  // Génériques (exceptions framework)
  | 'COMMON_BAD_REQUEST'
  | 'COMMON_VALIDATION_FAILED'
  | 'COMMON_UNAUTHORIZED'
  | 'COMMON_FORBIDDEN'
  | 'COMMON_NOT_FOUND'
  | 'COMMON_CONFLICT'
  | 'COMMON_TOO_MANY_REQUESTS'
  | 'COMMON_SERVICE_UNAVAILABLE'
  | 'COMMON_INTERNAL_ERROR'
  // Auth
  | 'AUTH_EMAIL_TAKEN'
  | 'AUTH_USERNAME_TAKEN'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_USER_NOT_FOUND'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_REFRESH_TOKEN_MISSING'
  | 'AUTH_REFRESH_TOKEN_REVOKED'
  | 'AUTH_ROLE_FORBIDDEN'
  | 'AUTH_VERIFICATION_TOKEN_INVALID'
  | 'AUTH_ALREADY_VERIFIED'
  | 'AUTH_LINK_TOKEN_INVALID'
  | 'AUTH_ACCOUNT_ALREADY_LINKED'
  | 'AUTH_PROVIDER_NOT_CONFIGURED'
  | 'AUTH_OAUTH_EMAIL_MISSING'
  | 'AUTH_ACCOUNT_BANNED'
  // Utilisateurs
  | 'USERS_USER_NOT_FOUND'
  | 'USERS_FILE_MISSING'
  // Forum
  | 'FORUM_QUESTION_NOT_FOUND'
  | 'FORUM_ANSWER_NOT_FOUND'
  | 'FORUM_FORBIDDEN'
  | 'FORUM_ANSWER_ACCEPT_FORBIDDEN'
  | 'FORUM_SELF_ANSWER_FORBIDDEN'
  | 'FORUM_ANSWER_FORBIDDEN'
  // Votes
  | 'VOTES_TARGET_NOT_FOUND'
  | 'VOTES_SELF_VOTE_FORBIDDEN'
  | 'VOTES_REPUTATION_TOO_LOW'
  // Projets
  | 'PROJECTS_PROJECT_NOT_FOUND'
  | 'PROJECTS_CATEGORY_NOT_FOUND'
  | 'PROJECTS_FORBIDDEN'
  | 'PROJECTS_VERIFIED_BADGE_REQUIRED'
  | 'PROJECTS_GITHUB_URL_INVALID'
  | 'PROJECTS_GITHUB_REPO_NOT_FOUND'
  | 'PROJECTS_REPO_ALREADY_SUBMITTED'
  | 'PROJECTS_REFRESH_TOO_SOON'
  // Offres
  | 'JOBS_OFFER_NOT_FOUND'
  | 'JOBS_OFFER_CLOSED'
  | 'JOBS_FORBIDDEN'
  | 'JOBS_ALREADY_APPLIED'
  | 'JOBS_SALARY_RANGE_INVALID'
  | 'JOBS_RECRUITER_REQUIRED'
  | 'JOBS_PLAN_LIMIT_REACHED'
  | 'JOBS_OFFER_NOT_PENDING'
  | 'JOBS_OFFER_NOT_RENEWABLE'
  | 'JOBS_ALERT_NOT_FOUND'
  | 'JOBS_ALERT_LIMIT_REACHED'
  // Modération
  | 'MODERATION_REPORT_NOT_FOUND'
  | 'MODERATION_REPORT_DUPLICATE'
  | 'MODERATION_REPORT_ALREADY_CLOSED'
  | 'MODERATION_TARGET_NOT_FOUND'
  // Paiements
  | 'PAYMENTS_PAYMENT_NOT_FOUND'
  | 'PAYMENTS_PROVIDER_NOT_CONFIGURED'
  | 'PAYMENTS_PROVIDER_ERROR'
  | 'PAYMENTS_WEBHOOK_INVALID_SIGNATURE'
  | 'UPLOAD_NOT_CONFIGURED'
  | 'UPLOAD_KEY_INVALID'
  | 'UPLOAD_OBJECT_NOT_FOUND';

// ── Événements de domaine (EventEmitter2, AD-1 / AD-8) ───────────────────────
// Nommage : <module>.<entité>.<action>. Payloads typés ici, jamais `any`.

export interface ForumQuestionCreatedEvent {
  authorId: string;
  postId:   string;
}

export interface ForumAnswerCreatedEvent {
  authorId:     string;
  answerId:     string;
  postId:       string;
  postAuthorId: string;
}

export interface ForumAnswerAcceptedEvent {
  answerAuthorId: string;
  answerId:       string;
  postId:         string;
  acceptedById:   string;
}

export interface UsersProfileUpdatedEvent {
  userId: string;
}

export interface AuthEmailVerifiedEvent {
  userId: string;
}

export interface GamificationReputationUpdatedEvent {
  userId:     string;
  reputation: number;
  delta:      number;
  reason:     string;
}

export interface JobsOfferPublishedEvent {
  jobId:       string;
  recruiterId: string;
}

export interface JobsOfferReviewedEvent {
  jobId:       string;
  recruiterId: string;
  title:       string;
  approved:    boolean;
  reason?:     string;
}

export interface JobsApplicationCreatedEvent {
  applicationId: string;
  jobId:         string;
  jobTitle:      string;
  recruiterId:   string;
  applicantId:   string;
}

export interface JobsAlertMatchedEvent {
  userId:   string;
  jobId:    string;
  jobTitle: string;
}

export interface VotesVoteChangedEvent {
  voterId:       string;
  targetOwnerId: string;
  entityType:    VoteEntityType;
  entityId:      string;
  previous:      VoteValue | null;
  next:          VoteValue | null;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
}

// ── API Error ─────────────────────────────────────────────────────────────────

// Forme des erreurs d'exception framework (Nest). Les erreurs de l'API suivent l'enveloppe AD-7
// `ApiErrorEnvelope` ; ce type ne sert qu'aux réponses non enveloppées.
export interface ApiError {
  statusCode: number;
  message:    string | string[];
  error?:     string;
}
