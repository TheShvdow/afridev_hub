import type { OpenAPIObject } from '@nestjs/swagger';

// Schéma d'erreur AD-7 : { error: { code, message, details? } }
const ERROR_ENVELOPE = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: {
          type: 'string',
          example: 'FORUM_QUESTION_NOT_FOUND',
          description: 'Code au format DOMAINE_ENTITE_RAISON (ou COMMON_* pour les erreurs génériques)',
        },
        message: { type: 'string', example: 'Question introuvable.' },
        details: { type: 'array', items: { type: 'string' }, description: 'Présent seulement pour la validation' },
      },
    },
  },
};

const ERROR_DESCRIPTIONS: Record<string, string> = {
  '400': 'Requête invalide (validation ou règle métier)',
  '401': 'Non authentifié ou identifiants invalides',
  '403': 'Accès refusé (propriété ou rôle insuffisant)',
  '404': 'Ressource introuvable',
  '500': 'Erreur interne du serveur',
};

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

interface ResponseLike {
  description?: string;
  content?: Record<string, { schema?: { properties?: Record<string, unknown>; [key: string]: unknown } }>;
}

interface OperationLike {
  summary?: string;
  description?: string;
  responses?: Record<string, ResponseLike>;
  requestBody?: unknown;
  parameters?: { in?: string }[];
  security?: unknown[];
}

const dataEnvelope = (data: unknown) => ({ type: 'object', required: ['data'], properties: { data } });

// Succès : le schéma de la réponse est enveloppé dans { data } ; une réponse sans contenu reçoit un { data } nul.
function wrapSuccessResponse(res: ResponseLike): void {
  const json = res.content?.['application/json'];
  if (json?.schema && !json.schema.properties?.data) {
    json.schema = dataEnvelope(json.schema);
  } else if (!res.content) {
    res.content = { 'application/json': { schema: dataEnvelope({ nullable: true }) } };
  }
}

// Codes d'erreur qui s'appliquent à l'opération : 500 toujours, 400 avec un corps ou une requête, 401 et 403 si
// elle est protégée, 404 avec un paramètre de chemin.
function applicableErrorCodes(op: OperationLike, path: string): Set<string> {
  const codes = new Set<string>(['500']);
  if (op.requestBody || (op.parameters ?? []).some((parameter) => parameter.in === 'query')) codes.add('400');
  if (op.security) {
    codes.add('401');
    codes.add('403');
  }
  if (path.includes('{')) codes.add('404');
  return codes;
}

function applyEnvelopeToOperation(op: OperationLike, path: string): void {
  op.description ??= op.summary;
  op.responses ??= {};
  const responses = op.responses;

  const codes = Object.keys(responses);
  if (codes.some((code) => code.startsWith('3'))) return; // redirection : pas d'enveloppe

  for (const code of codes) {
    if (code.startsWith('2') && code !== '204') wrapSuccessResponse(responses[code]);
  }

  for (const code of applicableErrorCodes(op, path)) {
    responses[code] = {
      description: responses[code]?.description ?? ERROR_DESCRIPTIONS[code],
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
    };
  }
}

// Passe sur le document OpenAPI généré : applique l'enveloppe AD-7 à toutes les opérations
// (succès { data }, erreurs { error }) et complète les descriptions manquantes.
// Les réponses de redirection (ex. callback OAuth) ne sont pas enveloppées.
export function applyEnvelopeToDocument(doc: OpenAPIObject): void {
  doc.components ??= {};
  doc.components.schemas = { ...doc.components.schemas, ErrorEnvelope: ERROR_ENVELOPE as never };

  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of HTTP_METHODS) {
      const op = (item as Record<string, OperationLike | undefined>)[method];
      if (op) applyEnvelopeToOperation(op, path);
    }
  }
}
