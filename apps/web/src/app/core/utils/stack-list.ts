import { AbstractControl, ValidationErrors } from '@angular/forms';
import { MAX_STACK_ITEMS, MAX_STACK_ITEM_LENGTH } from '../services/users.service';

/**
 * Transforme la saisie « TypeScript, NestJS , docker » en liste de technologies :
 * espaces retirés, éléments vides ignorés, doublons supprimés (casse ignorée).
 */
export function parseStackList(text: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const part of text.split(',')) {
    const item = part.trim();
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  return items;
}

/** Mêmes limites que `UpdateUserDto.stack` : 10 technologies, 30 caractères chacune. */
export function stackListValidator(control: AbstractControl<string>): ValidationErrors | null {
  const items = parseStackList(control.value ?? '');
  if (items.length > MAX_STACK_ITEMS) return { stackTooMany: true };
  if (items.some((item) => item.length > MAX_STACK_ITEM_LENGTH)) return { stackItemTooLong: true };
  return null;
}
