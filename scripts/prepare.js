// Génère le client Prisma quand le schéma est présent.
// Dans une image Docker, `npm ci` s'exécute avant la copie des sources : le schéma
// n'existe pas encore et la génération est reportée au build (`build:api`).
const fs = require('fs');
const { execSync } = require('child_process');

if (fs.existsSync('prisma/schema.prisma')) {
  execSync('prisma generate --schema=prisma/schema.prisma', { stdio: 'inherit' });
}
