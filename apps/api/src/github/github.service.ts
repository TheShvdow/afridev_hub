import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const API_URL = 'https://api.github.com';
const TIMEOUT_MS = 8_000;

// URL de dépôt acceptée : https://github.com/<owner>/<repo>, avec ou sans « .git » ni « / » final.
const REPO_URL = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?\/?$/;

export interface GithubRepoStats {
  fullName: string;          // « owner/repo » tel que GitHub l'écrit
  stars:    number;
  forks:    number;
  language: string | null;
  pushedAt: Date | null;
}

// not_found : dépôt inexistant ou privé. unavailable : limite atteinte, réseau, erreur GitHub.
export type GithubRepoResult =
  | { status: 'ok'; repo: GithubRepoStats }
  | { status: 'not_found' }
  | { status: 'unavailable'; reason: string };

interface GithubRepoResponse {
  full_name:        string;
  stargazers_count: number;
  forks_count:      number;
  language:         string | null;
  pushed_at:        string | null;
}

// Client minimal de l'API publique GitHub (FR-22, FR-23).
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private readonly config: ConfigService) {}

  // « owner/repo » en minuscules, ou null si l'URL n'est pas celle d'un dépôt GitHub.
  parseRepoUrl(url: string): string | null {
    const match = REPO_URL.exec(url.trim());
    return match ? `${match[1]}/${match[2]}`.toLowerCase() : null;
  }

  async fetchRepo(fullName: string): Promise<GithubRepoResult> {
    const token = this.config.get<string>('GITHUB_API_TOKEN');
    try {
      const response = await fetch(`${API_URL}/repos/${fullName}`, {
        headers: {
          Accept:                 'application/vnd.github+json',
          'User-Agent':           'afridev-hub',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (response.status === 404) return { status: 'not_found' };
      if (!response.ok) {
        const reason = response.status === 403 || response.status === 429
          ? `limite de requêtes GitHub atteinte (HTTP ${response.status})`
          : `HTTP ${response.status}`;
        this.logger.warn(`Dépôt ${fullName} non lu : ${reason}`);
        return { status: 'unavailable', reason };
      }

      const body = (await response.json()) as GithubRepoResponse;
      return {
        status: 'ok',
        repo: {
          fullName: body.full_name,
          stars:    body.stargazers_count,
          forks:    body.forks_count,
          language: body.language,
          pushedAt: body.pushed_at ? new Date(body.pushed_at) : null,
        },
      };
    } catch (error) {
      this.logger.warn(`Dépôt ${fullName} non lu : ${String(error)}`);
      return { status: 'unavailable', reason: 'GitHub injoignable' };
    }
  }
}
