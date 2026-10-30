import { Job } from '../../shared/components/card-job.component/card-job.component';
import { JOB_MODES, JOB_TYPES, JobOffer } from '../services/jobs.service';
import { relativeTime } from '../../shared/utils/forum-thread.mapper';

const NEW_JOB_DAYS = 7;
const DEFAULT_LOGO = 'assets/images/logo.png';

/** « 500 000 – 800 000 XOF », dans la devise convertie quand l'API l'a fournie. */
export function formatSalary(offer: JobOffer): string {
  const { salaryMin, salaryMax, currency } = offer.converted ?? offer;
  const format = new Intl.NumberFormat('fr-FR');
  return `${format.format(salaryMin)} – ${format.format(salaryMax)} ${currency}`;
}

/** Offre de l'API → modèle d'affichage des cartes et du panneau de détail. */
export function toJob(offer: JobOffer, countryNames: ReadonlyMap<string, string>, now = Date.now()): Job {
  const type = JOB_TYPES.find((item) => item.value === offer.type)?.label ?? offer.type;
  const mode = JOB_MODES.find((item) => item.value === offer.mode)?.label ?? offer.mode;
  const country = countryNames.get(offer.country) ?? offer.country;
  const published = offer.publishedAt ?? offer.createdAt;

  return {
    id: offer.id,
    logo: DEFAULT_LOGO,
    company: offer.company,
    title: offer.title,
    location: country,
    country,
    type: `${type} · ${mode}`,
    mode,
    skills: offer.stack,
    salary: formatSalary(offer),
    currency: offer.converted?.currency ?? offer.currency,
    posted: `Publiée ${relativeTime(published, now)}`,
    isNew: now - new Date(published).getTime() < NEW_JOB_DAYS * 86_400_000,
    description: offer.description ?? '',
  };
}
