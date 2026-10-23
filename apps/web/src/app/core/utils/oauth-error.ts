/**
 * Messages affichés quand la connexion OAuth échoue.
 *
 * Deux sources de codes :
 *  - l'API, qui redirige vers `/auth/login#provider=…&error=…` après un
 *    callback en échec (voir `OAuthCallbackFilter` côté API) ;
 *  - le fournisseur lui-même (GitHub, Google), qui renvoie ses propres codes
 *    OAuth (`access_denied`, `redirect_uri_mismatch`…) quand l'autorisation
 *    est refusée ou quand l'application OAuth est mal configurée.
 */
export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  AUTH_OAUTH_FAILED:
    'La connexion avec ce fournisseur a échoué. Veuillez réessayer dans un instant.',
  AUTH_OAUTH_EMAIL_MISSING:
    'Ce fournisseur n’a pas transmis d’adresse e-mail. Connectez-vous avec votre e-mail et votre mot de passe.',
  AUTH_PROVIDER_NOT_CONFIGURED:
    'Ce fournisseur de connexion n’est pas disponible. Connectez-vous avec votre e-mail et votre mot de passe.',
  AUTH_ACCOUNT_BANNED:
    'Ce compte est suspendu. Contactez l’administration.',
  AUTH_ACCOUNT_ALREADY_LINKED:
    'Ce compte est déjà lié à un autre compte AfriDev Hub.',
  AUTH_EMAIL_NOT_VERIFIED:
    'Votre adresse e-mail n’est pas encore confirmée. Saisissez le code reçu pour activer le compte.',
  AUTH_INVALID_CREDENTIALS: 'Identifiants incorrects.',

  // Codes renvoyés par le fournisseur (OAuth 2.0).
  access_denied: 'Vous avez refusé l’accès à votre compte. Vous pouvez revenir à l’étape précédente.',
  unauthorized_client: 'Cette application n’est pas autorisée à utiliser ce fournisseur de connexion.',
  unsupported_response_type: 'Le fournisseur de connexion a refusé le type de réponse demandé.',
  invalid_scope: 'Le fournisseur de connexion a refusé les permissions demandées.',
  server_error: 'Le fournisseur de connexion est momentanément indisponible. Réessayez plus tard.',
  temporarily_unavailable:
    'Le fournisseur de connexion est momentanément indisponible. Réessayez plus tard.',
  redirect_uri_mismatch:
    'La configuration GitHub du serveur est incorrecte : l’URL de retour déclarée par l’application ne correspond pas à celle enregistrée par le fournisseur.',
  incorrect_client_credentials:
    'La configuration GitHub du serveur est incorrecte : les identifiants OAuth enregistrés ne sont pas valides.',
  unverified_email:
    'L’adresse e-mail de votre compte GitHub n’est pas vérifiée : vérifiez-la sur GitHub avant de vous connecter.',
  email_not_verified:
    'L’adresse e-mail de votre compte GitHub n’est pas vérifiée : vérifiez-la sur GitHub avant de vous connecter.',
  bad_verification_state:
    'La session de connexion a expiré. Recommencez la connexion.',
  state_not_found:
    'La session de connexion a expiré. Recommencez la connexion.',
};

export const OAUTH_ERROR_FALLBACK =
  'La connexion avec ce fournisseur a échoué. Veuillez réessayer dans un instant.';

/**
 * Message à afficher pour un échec OAuth.
 *
 * La description du fournisseur (`error_description`) est prioritaire quand
 * elle est présente : elle porte le détail technique que le message générique
 * ne contient pas.
 */
export function resolveOAuthErrorMessage(
  code: string | null,
  description?: string | null
): string {
  const message = code ? OAUTH_ERROR_MESSAGES[code] : undefined;

  if (description && !code) {
    return description;
  }

  return message ?? OAUTH_ERROR_FALLBACK;
}
