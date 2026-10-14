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

export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';

export interface UserMe {
  id:          string;
  email:       string;
  username:    string;
  displayName: string | null;
  avatarUrl:   string | null;
  role:        UserRole;
  isVerified:  boolean;
  reputation:  number;
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

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'DELETED';

export interface PostTag {
  tag: { name: string; slug: string };
}

export interface PostListItem {
  id:          string;
  title:       string;
  slug:        string;
  excerpt:     string | null;
  voteScore:   number;
  answerCount: number;
  viewCount:   number;
  isSolved:    boolean;
  createdAt:   string;
  lastActivityAt: string;
  author:      Pick<UserProfile, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'reputation'>;
  tags:        PostTag[];
}

export interface AnswerItem {
  id:         string;
  body:       string;
  voteScore:  number;
  isAccepted: boolean;
  createdAt:  string;
  author:     Pick<UserProfile, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'reputation'>;
}

export interface PostDetail extends PostListItem {
  body:    string;
  answers: AnswerItem[];
}

// ── Projects ──────────────────────────────────────────────────────────────────

export type ProjectStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

export interface ProjectListItem {
  id:          string;
  title:       string;
  slug:        string;
  description: string;
  repoUrl:     string | null;
  demoUrl:     string | null;
  techStack:   string[];
  starCount:   number;
  viewCount:   number;
  status:      ProjectStatus;
  createdAt:   string;
  author:      Pick<UserProfile, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  category:    { name: string; slug: string } | null;
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export type JobType     = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP';
export type WorkMode    = 'REMOTE' | 'ONSITE' | 'HYBRID';
export type JobStatus   = 'ACTIVE' | 'EXPIRED' | 'FILLED' | 'DELETED';

export interface JobListItem {
  id:          string;
  title:       string;
  slug:        string;
  company:     string;
  location:    string | null;
  type:        JobType;
  workMode:    WorkMode;
  salaryMin:   number | null;
  salaryMax:   number | null;
  currency:    string | null;
  techStack:   string[];
  isPremium:   boolean;
  viewCount:   number;
  status:      JobStatus;
  publishedAt: string;
  expiresAt:   string | null;
  poster:      Pick<UserProfile, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export type PaymentProvider = 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'STRIPE';
export type PaymentStatus   = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface PaymentItem {
  id:         string;
  amount:     number;
  currency:   string;
  provider:   PaymentProvider;
  purpose:    string;
  status:     PaymentStatus;
  reference:  string;
  createdAt:  string;
  paidAt:     string | null;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'NEW_ANSWER'
  | 'ANSWER_ACCEPTED'
  | 'UPVOTE'
  | 'MENTION'
  | 'BADGE_EARNED'
  | 'PROJECT_APPROVED'
  | 'JOB_APPLICATION'
  | 'SYSTEM';

export interface NotificationItem {
  id:         string;
  type:       NotificationType;
  title:      string;
  message:    string;
  targetType: string | null;
  targetId:   string | null;
  isRead:     boolean;
  createdAt:  string;
  actor:      Pick<UserProfile, 'id' | 'username' | 'displayName' | 'avatarUrl'> | null;
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

export interface ApiError {
  statusCode: number;
  message:    string | string[];
  error?:     string;
}
