// Script chargé par Swagger UI (fichier externe : helmet bloque les scripts inline).
// Au retour d'une connexion GitHub ou Google lancée avec ?redirect=docs, le fragment
// contient le token d'accès : il est placé dans « Authorize », puis retiré de l'URL.
export const SWAGGER_OAUTH_SCRIPT_PATH = '/api/docs-oauth-login.js';

export const SWAGGER_OAUTH_SCRIPT = `(function () {
  var params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.has('at') && !params.has('linkToken') && !params.has('error')) return;
  history.replaceState(null, '', window.location.pathname + window.location.search);

  var timer = setInterval(function () {
    if (!window.ui) return;
    clearInterval(timer);
    if (params.get('at')) {
      window.ui.preauthorizeApiKey('bearer', params.get('at'));
    } else if (params.get('linkToken')) {
      window.alert(
        'Un compte existe déjà avec ' + params.get('email') + '.\\n' +
        'Pour lier ' + params.get('provider') + ', appelle POST /api/auth/oauth/link avec ce linkToken ' +
        '(valable 10 minutes) et le mot de passe du compte :\\n\\n' + params.get('linkToken'));
    } else {
      window.alert('Connexion ' + params.get('provider') + ' échouée : ' + params.get('error'));
    }
  }, 100);
})();
`;
