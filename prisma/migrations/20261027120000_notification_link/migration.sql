-- Chemin web du contenu concerné (ex. /forum/<id>) : permet d'ouvrir la cible depuis la liste des notifications.
-- Colonne facultative : les notifications existantes restent sans lien.
ALTER TABLE "Notification" ADD COLUMN "link" TEXT;
