import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApplyJobDto } from './apply-job.dto';

const BASE = { message: 'Motivé par ce poste.', fullName: 'Aminata Diallo' };

async function check(payload: Record<string, unknown>) {
  const dto = plainToInstance(ApplyJobDto, { ...BASE, ...payload });
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, errors, fields: errors.map((error) => error.property) };
}

describe('ApplyJobDto — candidature enrichie', () => {
  it('accepts the minimum: a message and a full name', async () => {
    expect((await check({})).errors).toHaveLength(0);
  });

  it('accepts every optional field', async () => {
    const { errors } = await check({
      phone: '+221 77 123 45 67',
      country: 'SN',
      city: 'Dakar',
      linkedinUrl: 'https://www.linkedin.com/in/aminata-diallo',
      githubUrl: 'https://github.com/aminata-dev',
      portfolioUrl: 'https://aminata.dev',
      experienceYears: '3',
      availableFrom: '2026-12-01',
      expectedSalary: '900000',
      expectedCurrency: 'XOF',
      stack: ['Angular', 'NestJS'],
      cvKey: 'cvs/u1/x.pdf',
    });
    expect(errors).toHaveLength(0);
  });

  it('requires the full name', async () => {
    expect((await check({ fullName: '   ' })).fields).toContain('fullName');
  });

  it('treats empty strings as absent instead of invalid', async () => {
    const { errors, dto } = await check({ phone: '', city: ' ', githubUrl: '', availableFrom: '', country: '' });
    expect(errors).toHaveLength(0);
    expect(dto.phone).toBeUndefined();
    expect(dto.githubUrl).toBeUndefined();
  });

  it.each([
    ['phone', 'abc'],
    ['linkedinUrl', 'linkedin.com/in/aminata'],
    ['githubUrl', 'ftp://github.com/x'],
    ['country', 'ZZ'],
    ['experienceYears', '80'],
    ['availableFrom', '01/12/2026'],
    ['expectedSalary', '0'],
  ])('rejects an invalid %s', async (field, value) => {
    expect((await check({ [field]: value, expectedCurrency: 'XOF' })).fields).toContain(field);
  });

  it('requires a currency with the expected salary', async () => {
    expect((await check({ expectedSalary: 900000 })).fields).toContain('expectedCurrency');
    expect((await check({ expectedSalary: 900000, expectedCurrency: 'XOF' })).errors).toHaveLength(0);
  });

  it('caps the stack at 10 technologies', async () => {
    const stack = Array.from({ length: 11 }, (_, index) => `tech${index}`);
    expect((await check({ stack })).fields).toContain('stack');
  });
});
