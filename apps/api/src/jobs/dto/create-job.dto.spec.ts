import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateJobDto } from './create-job.dto';
import { UpdateJobDto } from './update-job.dto';

const valid = {
  title: 'Développeur Angular Senior',
  description: 'x'.repeat(120),
  company: 'TechStartup Dakar',
  country: 'SN',
  type: 'FULL_TIME',
  mode: 'REMOTE',
  salaryMin: 500000,
  salaryMax: 800000,
  currency: 'XOF',
  stack: ['angular'],
};

async function countryErrors(cls: typeof CreateJobDto | typeof UpdateJobDto, body: object) {
  const errors = await validate(plainToInstance(cls, body));
  return errors.filter((e) => e.property === 'country');
}

describe('CreateJobDto — pays', () => {
  it.each(['SN', 'CI', 'NG', 'FR', 'CA'])('accepte %p', async (country) => {
    expect(await countryErrors(CreateJobDto, { ...valid, country })).toHaveLength(0);
  });

  it.each(['ZZ', 'sn', 'SEN', 'Dakar, Sénégal', ''])('refuse %p', async (country) => {
    expect(await countryErrors(CreateJobDto, { ...valid, country })).toHaveLength(1);
  });

  it('applique la même liste à la modification, où le pays reste facultatif', async () => {
    expect(await countryErrors(UpdateJobDto, { title: 'Nouveau titre' })).toHaveLength(0);
    expect(await countryErrors(UpdateJobDto, { country: 'ZZ' })).toHaveLength(1);
  });
});
