import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { MAX_PAGE_LIMIT } from '../pipes/positive-int.pipe';

interface ApiPaginationOptions {
  /** Valeur par défaut de `limit` ; `false` si la route n'accepte pas `limit`. */
  defaultLimit?: number | false;
}

// Documente `page` et `limit` comme optionnels. Sans @ApiQuery, Swagger
// marque obligatoire tout paramètre @Query('…'), le `?` TypeScript
// n'existant pas à l'exécution.
export function ApiPaginationQuery({ defaultLimit = 20 }: ApiPaginationOptions = {}) {
  const decorators = [
    ApiQuery({
      name: 'page',
      required: false,
      schema: { type: 'integer', minimum: 1, default: 1 },
    }),
  ];
  if (defaultLimit !== false) {
    decorators.push(
      ApiQuery({
        name: 'limit',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: MAX_PAGE_LIMIT, default: defaultLimit },
      }),
    );
  }
  return applyDecorators(...decorators);
}
