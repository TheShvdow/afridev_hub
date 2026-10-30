import type { OpenAPIObject } from '@nestjs/swagger';
import { applyEnvelopeToDocument } from './envelope.document';

function documentWith(paths: Record<string, unknown>): OpenAPIObject {
  return { openapi: '3.0.0', info: { title: 't', version: '1' }, paths } as unknown as OpenAPIObject;
}

interface Sample {
  description: string;
  content: Record<string, { schema: { type: string; required: string[]; properties: Record<string, unknown>; $ref: string } }>;
}
interface Operation {
  description: string;
  responses: Record<string, Sample>;
}

/** L'opération `method` du chemin `path` après passage de l'enveloppe. */
const operation = (doc: OpenAPIObject, path: string, method: string): Operation =>
  (doc.paths[path] as unknown as Record<string, Operation>)[method];

const json = (schema: unknown) => ({ content: { 'application/json': { schema } } });

describe('applyEnvelopeToDocument (AD-7)', () => {
  it('registers the ErrorEnvelope schema and keeps the existing schemas', () => {
    const doc = documentWith({});
    doc.components = { schemas: { Existing: { type: 'string' } } };

    applyEnvelopeToDocument(doc);

    expect(Object.keys(doc.components.schemas ?? {})).toEqual(['Existing', 'ErrorEnvelope']);
  });

  it('creates the components section when the document has none', () => {
    const doc = documentWith({});

    applyEnvelopeToDocument(doc);

    expect(doc.components?.schemas).toHaveProperty('ErrorEnvelope');
  });

  it('wraps a success schema in { data } and leaves an already wrapped one alone', () => {
    const doc = documentWith({
      '/a': { get: { summary: 'A', responses: { '200': json({ type: 'object', properties: { id: { type: 'string' } } }) } } },
      '/b': { get: { responses: { '200': json({ type: 'object', properties: { data: { type: 'string' } } }) } } },
    });

    applyEnvelopeToDocument(doc);

    const a = operation(doc, '/a', 'get').responses['200'].content['application/json'].schema;
    expect(a).toEqual({ type: 'object', required: ['data'], properties: { data: { type: 'object', properties: { id: { type: 'string' } } } } });
    const b = operation(doc, '/b', 'get').responses['200'].content['application/json'].schema;
    expect(b.properties.data).toEqual({ type: 'string' });
  });

  it('gives a success response without content a nullable { data }, and ignores 204', () => {
    const doc = documentWith({ '/c': { post: { responses: { '201': {}, '204': {} } } } });

    applyEnvelopeToDocument(doc);

    const responses = operation(doc, '/c', 'post').responses;
    expect(responses['201'].content['application/json'].schema.properties.data).toEqual({ nullable: true });
    expect(responses['204'].content).toBeUndefined();
  });

  it('does not wrap redirections and adds no envelope to them', () => {
    const doc = documentWith({ '/oauth': { get: { responses: { '302': { description: 'redirect' } } } } });

    applyEnvelopeToDocument(doc);

    expect(Object.keys(operation(doc, '/oauth', 'get').responses)).toEqual(['302']);
  });

  it('adds the error responses that apply: 500 always, 400 with a body or query, 401/403 when secured, 404 with a path parameter', () => {
    const doc = documentWith({
      '/plain': { get: { responses: { '200': json({ type: 'string' }) } } },
      '/items/{id}': {
        patch: { requestBody: {}, security: [{ bearer: [] }], responses: { '200': json({ type: 'string' }) } },
      },
      '/search': { get: { parameters: [{ in: 'query' }], responses: { '200': json({ type: 'string' }) } } },
    });

    applyEnvelopeToDocument(doc);

    const codes = (path: string, method: string) =>
      Object.keys(operation(doc, path, method).responses).filter((code) => !code.startsWith('2')).sort();
    expect(codes('/plain', 'get')).toEqual(['500']);
    expect(codes('/items/{id}', 'patch')).toEqual(['400', '401', '403', '404', '500']);
    expect(codes('/search', 'get')).toEqual(['400', '500']);
    const error = operation(doc, '/plain', 'get').responses['500'];
    expect(error.description).toBe('Erreur interne du serveur');
    expect(error.content['application/json'].schema).toEqual({ $ref: '#/components/schemas/ErrorEnvelope' });
  });

  it('keeps the description of an existing error response and fills a missing operation description from the summary', () => {
    const doc = documentWith({
      '/d': { get: { summary: 'Résumé', responses: { '200': json({ type: 'string' }), '500': { description: 'Panne spécifique' } } } },
    });

    applyEnvelopeToDocument(doc);

    const op = operation(doc, '/d', 'get');
    expect(op.description).toBe('Résumé');
    expect(op.responses['500'].description).toBe('Panne spécifique');
  });
});
