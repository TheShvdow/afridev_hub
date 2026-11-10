// Textes des pages légales. Les champs « À COMPLÉTER » doivent être renseignés par l'éditeur avant la mise en avant du site.

export type LegalSlug = 'mentions-legales' | 'conditions-generales' | 'confidentialite' | 'cookies';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDoc {
  slug: LegalSlug;
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_UPDATED = '29 octobre 2026';

const EDITOR = 'AfriDev Hub';
const TODO = 'À COMPLÉTER';
const CONTACT = `${TODO} : adresse e-mail de contact`;

export const LEGAL_LINKS: { slug: LegalSlug; label: string }[] = [
  { slug: 'conditions-generales', label: "Conditions d'utilisation" },
  { slug: 'confidentialite', label: 'Confidentialité' },
  { slug: 'cookies', label: 'Cookies' },
  { slug: 'mentions-legales', label: 'Mentions légales' },
];

export const LEGAL_DOCS: Record<LegalSlug, LegalDoc> = {
  'mentions-legales': {
    slug: 'mentions-legales',
    title: 'Mentions légales',
    intro: `Informations sur l'éditeur et l'hébergement du site ${EDITOR}.`,
    sections: [
      {
        heading: "Éditeur du site",
        items: [
          `Nom du site : ${EDITOR}`,
          `Éditeur : ${TODO} (nom ou raison sociale)`,
          `Adresse : ${TODO}`,
          `Immatriculation : ${TODO} (NINEA / RCCM, le cas échéant)`,
          `Directeur de la publication : ${TODO}`,
          `Contact : ${CONTACT}`,
        ],
      },
      {
        heading: 'Hébergement',
        items: [
          'Site web (interface) : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.',
          'Serveur applicatif (API) : Systalink (platform-systalink.com).',
          'Base de données : Neon, hébergée en Allemagne (Francfort).',
          'Fichiers envoyés (avatars, CV) : Cloudflare, Inc. (stockage R2).',
        ],
      },
      {
        heading: 'Propriété intellectuelle',
        paragraphs: [
          `La marque, le logo, la conception graphique et le code du site ${EDITOR} sont protégés. Toute reproduction sans autorisation écrite de l'éditeur est interdite.`,
          'Les questions, réponses, projets et autres contenus publiés par les membres restent leur propriété ; ils accordent à la plateforme la licence décrite dans les conditions d\'utilisation.',
        ],
      },
      {
        heading: 'Signaler un contenu',
        paragraphs: [
          "Un contenu illicite ou contraire aux règles de la communauté peut être signalé depuis le bouton « Signaler » présent sur les questions, réponses, projets et offres, ou en écrivant à l'adresse de contact ci-dessus.",
        ],
      },
    ],
  },

  'conditions-generales': {
    slug: 'conditions-generales',
    title: "Conditions générales d'utilisation",
    intro: `Ces conditions encadrent l'utilisation de ${EDITOR}, une communauté de développeurs africains (forum de questions-réponses, vitrine de projets, offres d'emploi). En créant un compte ou en utilisant le site, vous les acceptez.`,
    sections: [
      {
        heading: '1. Compte',
        paragraphs: [
          "L'inscription est gratuite. Vous devez avoir au moins 16 ans, fournir une adresse e-mail valide que vous contrôlez et confirmer cette adresse avec le code envoyé par e-mail.",
          'Vous êtes responsable de la confidentialité de votre mot de passe et de ce qui est fait depuis votre compte. Prévenez-nous sans délai en cas de perte ou de piratage. Un compte est personnel : une personne, un compte.',
        ],
      },
      {
        heading: '2. Rôles',
        items: [
          'Membre : pose des questions, répond, vote, publie des projets et candidate aux offres.',
          "Recruteur : membre qui active le profil recruteur pour publier des offres d'emploi et lire les candidatures reçues.",
          'Modérateur et administrateur : traitent les signalements et peuvent masquer des contenus ou suspendre des comptes.',
        ],
      },
      {
        heading: '3. Vos contenus',
        paragraphs: [
          'Vous restez propriétaire de ce que vous publiez. Vous accordez à la plateforme une licence mondiale, non exclusive et gratuite pour héberger, afficher, reproduire et mettre en forme ces contenus afin de faire fonctionner le service (y compris leurs aperçus de partage). Cette licence prend fin à la suppression du contenu, sauf copies techniques temporaires.',
          "Vous garantissez détenir les droits nécessaires sur ce que vous publiez (texte, code, images) et que cela n'enfreint ni la loi ni les droits de tiers. Pour le code, indiquez la licence applicable lorsqu'elle existe.",
        ],
      },
      {
        heading: '4. Règles de la communauté',
        paragraphs: ['Sont interdits :'],
        items: [
          'les propos haineux, discriminatoires, harcelants, menaçants ou diffamatoires ;',
          'le spam, la publicité non sollicitée, les liens trompeurs et les faux comptes ;',
          "la publication de données personnelles d'autrui sans son accord ;",
          'les contenus illicites, frauduleux ou portant atteinte aux droits de tiers ;',
          "la manipulation des votes et de la réputation, ainsi que toute tentative d'accéder aux données ou au fonctionnement du site de façon non autorisée (analyse automatisée abusive, contournement des limites, etc.) ;",
          "les offres d'emploi trompeuses, qui demandent un paiement au candidat ou collectent des données sans rapport avec le recrutement.",
        ],
      },
      {
        heading: '5. Signalements et modération',
        paragraphs: [
          "Chacun peut signaler un contenu. Un contenu signalé de nombreuses fois par des membres différents peut être masqué automatiquement en attendant l'examen d'un modérateur, qui le rétablit ou le confirme.",
          "En cas de manquement, la modération peut masquer un contenu, adresser un avertissement ou suspendre le compte. Nous cherchons à motiver nos décisions ; vous pouvez nous écrire pour les contester.",
        ],
      },
      {
        heading: '6. Réputation et badges',
        paragraphs: [
          'Les votes alimentent un score de réputation et des badges. Ils servent uniquement à reconnaître la contribution et à ouvrir certaines fonctions (voter, par exemple). Ils n\'ont aucune valeur monétaire et peuvent être corrigés en cas d\'abus.',
        ],
      },
      {
        heading: "7. Offres d'emploi et candidatures",
        paragraphs: [
          "La plateforme met en relation recruteurs et candidats ; elle n'est partie à aucun contrat de travail ou de prestation et ne garantit ni l'exactitude des offres ni l'issue d'une candidature.",
          "Le recruteur est seul responsable de ses offres, qui doivent être réelles, licites et non discriminatoires. En candidatant, vous autorisez la transmission au recruteur concerné des informations et du CV que vous joignez.",
          "Les offres sont limitées en nombre selon le plan du recruteur (plan gratuit ou premium) et expirent automatiquement au bout de la durée indiquée.",
        ],
      },
      {
        heading: '8. Plan recruteur premium et paiement',
        paragraphs: [
          "Le plan premium est payant. Le prix et la durée sont affichés avant l'achat ; des frais de paiement du prestataire peuvent s'y ajouter et sont alors indiqués avant la validation.",
          "Le paiement est réalisé sur la page sécurisée de notre prestataire Bictorys (mobile money, carte). Nous ne voyons ni ne conservons vos numéros de carte ou codes. L'accès premium est activé à la confirmation du paiement.",
          `Pour toute question de facturation ou demande de remboursement, écrivez à l'adresse de contact indiquée dans les mentions légales.`,
        ],
      },
      {
        heading: '9. Disponibilité',
        paragraphs: [
          "Nous faisons de notre mieux pour que le site soit disponible, mais il est fourni sans garantie de disponibilité continue : maintenance, panne d'un hébergeur ou d'un service tiers peuvent l'interrompre.",
        ],
      },
      {
        heading: '10. Responsabilité',
        paragraphs: [
          "Les contenus publiés par les membres (réponses, code, conseils) n'engagent que leurs auteurs ; vérifiez-les avant de les utiliser en production. Dans la mesure permise par la loi, l'éditeur n'est pas responsable des dommages indirects liés à l'usage du site.",
        ],
      },
      {
        heading: '11. Suspension et suppression du compte',
        paragraphs: [
          "Vous pouvez demander la suppression de votre compte à tout moment (voir la politique de confidentialité). Nous pouvons suspendre ou supprimer un compte qui enfreint ces conditions ; en cas de suspension, la connexion est immédiatement bloquée.",
        ],
      },
      {
        heading: '12. Modification des conditions',
        paragraphs: [
          'Ces conditions peuvent évoluer. La date de dernière mise à jour figure en haut de page ; en cas de changement important, les membres en sont informés. Continuer à utiliser le site après la mise à jour vaut acceptation.',
        ],
      },
      {
        heading: '13. Droit applicable',
        paragraphs: [
          `Ces conditions sont régies par le droit sénégalais. À défaut d'accord amiable, les tribunaux compétents sont ceux de ${TODO} (ville).`,
        ],
      },
    ],
  },

  confidentialite: {
    slug: 'confidentialite',
    title: 'Politique de confidentialité',
    intro: `Cette politique explique quelles données ${EDITOR} collecte, pourquoi, avec qui elles sont partagées et comment exercer vos droits.`,
    sections: [
      {
        heading: 'Responsable du traitement',
        paragraphs: [`${EDITOR}, ${TODO} (éditeur). Contact pour toute question sur vos données : ${CONTACT}.`],
      },
      {
        heading: 'Données que nous collectons',
        items: [
          "Compte : adresse e-mail, pseudo, mot de passe (conservé uniquement sous forme de hachage, jamais en clair). Si vous vous connectez avec Google ou GitHub : l'identifiant de ce compte, votre nom, votre adresse e-mail et votre photo, selon ce que le service nous transmet.",
          'Profil (facultatif) : nom affiché, présentation, photo, pays, ville, niveau, technologies, liens vers vos comptes GitHub, LinkedIn, X et votre site.',
          'Contributions : questions, réponses, votes, projets, signalements, offres et candidatures, y compris le CV et les informations que vous joignez à une candidature.',
          "Recruteurs : nom de l'entreprise, offres publiées, alertes emploi.",
          'Paiement : référence, montant, statut et date de la transaction. Les numéros de carte et codes mobile money sont saisis chez Bictorys et ne nous parviennent pas.',
          "Données techniques : adresse IP (limitation des abus et journaux de sécurité), date de dernière activité, type de navigateur, erreurs techniques du serveur.",
          'Notifications : vos préférences et l\'historique des notifications reçues.',
        ],
      },
      {
        heading: 'Pourquoi et sur quelle base',
        items: [
          "Créer et gérer votre compte, vous authentifier et sécuriser l'accès : exécution du service.",
          'Faire fonctionner le forum, les projets, les offres, la réputation et les notifications : exécution du service.',
          "Envoyer les e-mails de service (code de vérification, réinitialisation du mot de passe, accusés de candidature) : exécution du service. Les e-mails d'activité (réponses, votes, candidatures) peuvent être désactivés dans vos paramètres.",
          'Traiter les paiements du plan premium : exécution du contrat et obligations comptables.',
          'Modérer, prévenir les abus et la fraude, assurer la sécurité et corriger les erreurs : intérêt légitime.',
        ],
      },
      {
        heading: 'Qui reçoit vos données',
        paragraphs: [
          "Nous ne vendons pas vos données et n'utilisons aucun traceur publicitaire. Elles sont partagées avec les prestataires strictement nécessaires :",
        ],
        items: [
          'Vercel (États-Unis) : diffusion du site.',
          'Systalink (platform-systalink.com) : exécution du serveur applicatif.',
          'Neon (Allemagne) : base de données.',
          'Upstash : stockage temporaire des sessions de connexion.',
          'Cloudflare R2 : fichiers que vous envoyez (avatar, CV).',
          'Resend : envoi des e-mails.',
          'Bictorys : paiement du plan premium.',
          'Sentry (Union européenne) : suivi des erreurs techniques, sans contenu de vos requêtes.',
          'Google et GitHub : uniquement si vous choisissez de vous connecter avec eux.',
          'Recruteurs : votre profil public est visible de tous ; votre candidature (et CV) n\'est transmise qu\'au recruteur de l\'offre concernée.',
        ],
      },
      {
        heading: 'Ce qui est public',
        paragraphs: [
          'Votre pseudo, votre profil, vos questions, réponses, projets, votre réputation et vos badges sont visibles par tous les visiteurs. Ne publiez pas d\'informations que vous ne souhaitez pas rendre publiques. Les comptes administrateurs n\'ont pas de profil public.',
        ],
      },
      {
        heading: 'Transferts hors du Sénégal',
        paragraphs: [
          "Certains prestataires sont situés aux États-Unis ou dans l'Union européenne. Les données y sont transférées uniquement pour faire fonctionner le service, avec les garanties contractuelles proposées par ces prestataires.",
        ],
      },
      {
        heading: 'Durée de conservation',
        items: [
          'Compte et contributions : tant que le compte existe. À la suppression du compte, vos données personnelles sont supprimées ou anonymisées ; les contenus publics déjà cités par d\'autres membres peuvent être conservés sans lien avec votre identité.',
          'Codes de vérification et de réinitialisation : quelques minutes, puis supprimés ou expirés.',
          'Sessions de connexion : jusqu\'à leur expiration ou votre déconnexion.',
          "Données de paiement : le temps exigé par les obligations comptables et légales.",
          "Journaux techniques : une durée limitée, nécessaire à la sécurité.",
        ],
      },
      {
        heading: 'Sécurité',
        paragraphs: [
          'Connexions chiffrées (HTTPS), mots de passe hachés, sessions à durée limitée révocables, limitation du nombre de tentatives de connexion et accès restreints aux données. Aucun système n\'étant infaillible, signalez-nous toute faille ou tout usage suspect.',
        ],
      },
      {
        heading: 'Vos droits',
        paragraphs: [
          `Conformément à la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel, vous disposez d'un droit d'accès, de rectification, d'opposition et de suppression de vos données. Vous pouvez modifier la plupart de vos informations depuis votre profil et vos paramètres ; pour le reste, ou pour supprimer votre compte, écrivez à ${CONTACT}. Nous répondons dans un délai raisonnable, après vérification de votre identité.`,
          "Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la Commission de protection des données personnelles (CDP) du Sénégal.",
        ],
      },
      {
        heading: 'Mineurs',
        paragraphs: ["Le site n'est pas destiné aux moins de 16 ans. Si vous pensez qu'un mineur s'est inscrit, contactez-nous pour supprimer son compte."],
      },
      {
        heading: 'Modifications',
        paragraphs: ['Cette politique peut évoluer ; la date de mise à jour figure en haut de page et les changements importants sont annoncés aux membres.'],
      },
    ],
  },

  cookies: {
    slug: 'cookies',
    title: 'Cookies et stockage local',
    intro: `${EDITOR} n'utilise aucun cookie publicitaire, de mesure d'audience ni traceur tiers. Seul un stockage technique, nécessaire au fonctionnement du site, est utilisé : il ne demande donc pas de consentement.`,
    sections: [
      {
        heading: 'Ce qui est stocké dans votre navigateur',
        items: [
          "Session de connexion : vos jetons d'accès sont gardés dans le stockage local de votre navigateur si vous cochez « Rester connecté », sinon uniquement pour l'onglet en cours (stockage de session). Ils sont effacés à la déconnexion.",
          "Cache de lecture : pour afficher plus vite le forum, les projets et les offres, des réponses récentes sont gardées en mémoire et dans le stockage de session de l'onglet. Elles disparaissent à la fermeture de l'onglet.",
          "Préférences d'interface : par exemple le fait d'avoir passé l'écran de bienvenue.",
        ],
      },
      {
        heading: 'Services tiers',
        paragraphs: [
          "Si vous vous connectez avec Google ou GitHub, ou si vous payez via Bictorys, vous quittez brièvement notre site : ces services peuvent déposer leurs propres cookies, soumis à leurs politiques.",
        ],
      },
      {
        heading: 'Les contrôler',
        paragraphs: [
          "Vous pouvez effacer le stockage du site depuis les paramètres de votre navigateur ou en vous déconnectant. Bloquer ce stockage empêche de rester connecté.",
        ],
      },
    ],
  },
};
