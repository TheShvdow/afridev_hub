import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto — pays', () => {
  const check = (country: unknown) => {
    const dto = plainToInstance(UpdateUserDto, { country });
    return { dto, errors: validateSync(dto) };
  };

  it('accepts a country of the list, whatever its case', () => {
    const { dto, errors } = check('sn');
    expect(errors).toHaveLength(0);
    expect(dto.country).toBe('SN');
  });

  it('rejects a code outside the list and a country name typed by hand', () => {
    expect(check('ZZ').errors).not.toHaveLength(0);
    expect(check('Sénégal').errors).not.toHaveLength(0);
  });
});
