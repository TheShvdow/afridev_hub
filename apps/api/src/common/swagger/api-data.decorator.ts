import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { PaginationMetaDto } from './models';

interface ApiDataOptions {
  type?: Type<unknown>;
  status?: number;
  description?: string;
  array?: boolean;
  paginated?: boolean;
}

// Documente une réponse enveloppée AD-7 : { data } ou { data, meta } pour les listes paginées.
export function ApiData({
  type,
  status = 200,
  description = 'Succès',
  array = false,
  paginated = false,
}: ApiDataOptions) {
  const itemSchema = type ? { $ref: getSchemaPath(type) } : { type: 'object' };
  const dataSchema = array || paginated ? { type: 'array', items: itemSchema } : itemSchema;

  const schema: SchemaObject = paginated
    ? {
        type: 'object',
        required: ['data', 'meta'],
        properties: { data: dataSchema, meta: { $ref: getSchemaPath(PaginationMetaDto) } },
      }
    : { type: 'object', required: ['data'], properties: { data: dataSchema } } as SchemaObject;

  return applyDecorators(
    ApiExtraModels(...(type ? [type, PaginationMetaDto] : [PaginationMetaDto])),
    ApiResponse({ status, description, schema }),
  );
}
