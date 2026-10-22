import { Thread } from '../components/card-thread/card-thread.component';

export const THREADS: Thread[] = [
  {
    initials: 'AD',
    tags: ['Backend', '#Sénégal', '#MobileMoney', '#Wave'],
    title: 'Comment gérer les paiements Mobile Money dans une API Node ?',
    meta: 'Aminata D. · Dakar · il y a 12 min',
    votes: '19',
    replies: '24',
    body: "Salut la communauté ! Je développe une API Node.js qui doit encaisser des paiements via Wave et Orange Money. Comment structurez-vous la gestion des webhooks de confirmation et l'idempotence des transactions ?",
    comments: [
      {
        id: 'tom-1',
        initials: 'KA',
        author: 'Kwame A.',
        role: 'Senior Backend Engineer',
        verified: true,
        time: 'il y a 8 min',
        message:
          "Perso j'utilise une clé d'idempotence stockée en base avec un index unique sur l'ID de transaction de l'opérateur. Ça évite les doublons quand le webhook est renvoyé.",
      },
      {
        id: 'tom-2',
        initials: 'FN',
        author: 'Fatou N.',
        role: 'Lead Mobile Engineer',
        verified: true,
        time: 'il y a 5 min',
        message:
          'Pense aussi à valider la signature HMAC de chaque webhook avant de traiter quoi que ce soit. Beaucoup d’opérateurs la fournissent.',
      },
      {
        id: 'tom-3',
        initials: 'BN',
        author: 'Chidi O.',
        role: 'DevOps Engineer',
        verified: false,
        time: 'il y a 2 min',
        message:
          'Et prévois une file de retry pour les webhooks en échec, avec un backoff exponentiel.',
      },
    ],
  },
  {
    initials: 'KA',
    tags: ['Backend', '#Sénégal', '#MobileMoney', '#Wave'],
    title: 'Optimiser une PWA pour les connexions 3G instables',
    meta: 'Kwame A. · Accra · il y a 45 min',
    votes: '19',
    replies: '24',
    body: 'Nos utilisateurs naviguent souvent en 3G instable. Quelles techniques utilisez-vous pour rendre une PWA React utilisable même avec une connexion médiocre ?',
    comments: [
      {
        id: 'tpw-1',
        initials: 'AD',
        author: 'Aminata D.',
        role: 'Senior Frontend Engineer',
        verified: true,
        time: 'il y a 30 min',
        message:
          "Service worker avec stratégie stale-while-revalidate pour les assets, et cache-first pour l'app shell.",
      },
      {
        id: 'tpw-2',
        initials: 'BN',
        author: 'Chidi O.',
        role: 'DevOps Engineer',
        verified: false,
        time: 'il y a 20 min',
        message:
          'Compresse les images en WebP et charge en lazy tout ce qui est sous la ligne de flottaison.',
      },
    ],
  },
  {
    initials: 'FN',
    tags: ['Carrière', '#MobileMoney', '#Wave'],
    title: "Retour d'expérience : passer de freelance à CTO d'une fintech",
    meta: 'Fatou N. · Abidjan · il y a 2 h',
    votes: '19',
    replies: '24',
    body: "Après 4 ans de freelance, je viens de rejoindre une fintech comme CTO. Voici ce que j'aurais aimé savoir avant de faire le saut : le management, c'est un tout autre métier que coder.",
    comments: [
      {
        id: 'tcto-1',
        initials: 'KA',
        author: 'Kwame A.',
        role: 'Senior Frontend Engineer',
        verified: true,
        time: 'il y a 1 h',
        message:
          'Merci pour ce retour ! Comment gères-tu la transition entre ton ancien réflexe de tout faire toi-même et la délégation ?',
      },
      {
        id: 'tcto-2',
        initials: 'AD',
        author: 'Aminata D.',
        role: 'Engineering Manager',
        verified: true,
        time: 'il y a 45 min',
        message: 'Très inspirant. Est-ce que tu as gardé un pied dans le code ?',
      },
    ],
  },
  {
    initials: 'BN',
    tags: ['Mobile', '#MobileMoney', '#Wave'],
    title: 'Stratégie offline-first avec SQLite et synchronisation',
    meta: 'Chidi O. · Lagos · il y a 3 h',
    votes: '19',
    replies: '24',
    body: 'On construit une app mobile offline-first avec SQLite. Quelles stratégies de synchronisation utilisez-vous pour gérer les conflits quand les appareils se reconnectent ?',
    comments: [
      {
        id: 'toff-1',
        initials: 'FN',
        author: 'Fatou N.',
        role: 'Mobile Architect',
        verified: true,
        time: 'il y a 2 h',
        message:
          "Last-write-wins c'est simple mais ça perd des données. Regarde du côté des CRDT pour du merge sans conflit.",
      },
      {
        id: 'toff-2',
        initials: 'KA',
        author: 'Kwame A.',
        role: 'Senior Frontend Engineer',
        verified: true,
        time: 'il y a 1 h',
        message:
          'On utilise un journal de changements horodaté et on rejoue les opérations côté serveur.',
      },
    ],
  },
];

export const ALL_TAGS = 'Tout';

export const THREAD_TAGS = [ALL_TAGS, ...new Set(THREADS.flatMap((thread) => thread.tags))];

export function filterThreads(threads: Thread[], tag: string): Thread[] {
  return tag === ALL_TAGS ? threads : threads.filter((thread) => thread.tags.includes(tag));
}
