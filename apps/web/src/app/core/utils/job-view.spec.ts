import { JobOffer } from '../services/jobs.service';
import { formatSalary, toJob } from './job-view';

const NOW = Date.parse('2026-10-27T12:00:00Z');

const OFFER: JobOffer = {
  id: 'job-1',
  title: 'Développeur NestJS',
  description: 'Une description',
  company: 'GTECH',
  country: 'SN',
  type: 'FULL_TIME',
  mode: 'HYBRID',
  stack: ['NestJS', 'Docker'],
  status: 'ACTIVE',
  salaryMin: 500000,
  salaryMax: 800000,
  currency: 'XOF',
  publishedAt: '2026-10-25T12:00:00Z',
  expiresAt: '2026-12-24T12:00:00Z',
  createdAt: '2026-10-24T12:00:00Z',
  recruiter: { id: 'u1', username: 'rec', displayName: null, avatarUrl: null },
};

describe('toJob', () => {
  it('maps contract, mode, country name and skills', () => {
    const job = toJob(OFFER, new Map([['SN', 'Sénégal']]), NOW);

    expect(job).toMatchObject({
      id: 'job-1',
      company: 'GTECH',
      country: 'Sénégal',
      type: 'CDI · Hybride',
      mode: 'Hybride',
      skills: ['NestJS', 'Docker'],
      isNew: true,
    });
    expect(job.posted).toBe('Publiée il y a 2 j');
  });

  it('falls back to the country code and flags old offers as not new', () => {
    const job = toJob({ ...OFFER, publishedAt: '2026-09-01T00:00:00Z' }, new Map(), NOW);

    expect(job.country).toBe('SN');
    expect(job.isNew).toBe(false);
  });
});

describe('formatSalary', () => {
  it('uses the converted salary when the API provides one', () => {
    const converted = { currency: 'EUR', salaryMin: 760, salaryMax: 1220, ratesAt: null };

    expect(formatSalary({ ...OFFER, converted })).toContain('EUR');
    expect(formatSalary(OFFER)).toMatch(/500\s000 – 800\s000 XOF/);
  });
});
