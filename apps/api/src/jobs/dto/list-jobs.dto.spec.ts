import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListJobsDto } from './list-jobs.dto';

describe('ListJobsDto — pays', () => {
  const check = (country: string) => {
    const dto = plainToInstance(ListJobsDto, { country });
    return { dto, errors: validateSync(dto) };
  };

  it('accepts a listed country, case-insensitive', () => {
    const { dto, errors } = check('sn');
    expect(errors).toHaveLength(0);
    expect(dto.country).toBe('SN');
  });

  it('rejects a code outside the list', () => {
    expect(check('ZZ').errors).not.toHaveLength(0);
  });
});
