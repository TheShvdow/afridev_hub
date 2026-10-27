const KEY = 'afridev_pending_speciality';

/**
 * La spécialité choisie à l'inscription n'est pas acceptée par `RegisterDto`.
 * Elle est conservée le temps de la vérification de l'e-mail, puis écrite dans
 * le profil à la première connexion (l'API protège `PATCH /users/me` par un JWT).
 */
export function rememberSpeciality(speciality: string): void {
  if (typeof sessionStorage === 'undefined' || !speciality) return;
  sessionStorage.setItem(KEY, speciality);
}

export function takeSpeciality(): string | null {
  if (typeof sessionStorage === 'undefined') return null;

  const speciality = sessionStorage.getItem(KEY);
  if (speciality) sessionStorage.removeItem(KEY);
  return speciality;
}
