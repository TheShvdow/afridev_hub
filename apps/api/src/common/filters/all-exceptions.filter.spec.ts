import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { DomainException } from '../errors/domain.exception';

function hostWith(response: { status: jest.Mock; json: jest.Mock }) {
  return { switchToHttp: () => ({ getResponse: () => response }) } as never;
}

function run(exception: unknown) {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  new AllExceptionsFilter().catch(exception, hostWith(response));
  return { status: response.status.mock.calls[0][0], body: response.json.mock.calls[0][0] };
}

describe('AllExceptionsFilter (AD-7)', () => {
  it('renders a DomainException with its own code and status', () => {
    const { status, body } = run(new DomainException('FORUM_QUESTION_NOT_FOUND', 'Question introuvable.', 404));
    expect(status).toBe(404);
    expect(body).toEqual({ error: { code: 'FORUM_QUESTION_NOT_FOUND', message: 'Question introuvable.' } });
  });

  it('maps a validation error (array of messages) to COMMON_VALIDATION_FAILED with details', () => {
    const { status, body } = run(new BadRequestException(['title too short', 'tags required']));
    expect(status).toBe(400);
    expect(body.error.code).toBe('COMMON_VALIDATION_FAILED');
    expect(body.error.details).toEqual(['title too short', 'tags required']);
  });

  it('maps a framework HttpException to its generic COMMON_* code', () => {
    const { status, body } = run(new NotFoundException('Cannot GET /api/unknown'));
    expect(status).toBe(404);
    expect(body).toEqual({ error: { code: 'COMMON_NOT_FOUND', message: 'Cannot GET /api/unknown' } });
  });

  it('maps an unknown error to a 500 without leaking its message', () => {
    const { status, body } = run(new Error('connection string postgresql://user:secret@host'));
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body).toEqual({ error: { code: 'COMMON_INTERNAL_ERROR', message: 'Erreur interne du serveur.' } });
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('keeps a generic status without a dedicated code as COMMON_BAD_REQUEST', () => {
    const { body } = run(new HttpException('Teapot', 418));
    expect(body.error.code).toBe('COMMON_BAD_REQUEST');
  });
});
