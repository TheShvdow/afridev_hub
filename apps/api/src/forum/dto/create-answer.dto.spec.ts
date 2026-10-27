import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAnswerDto } from './create-answer.dto';
import { UpdateAnswerDto } from './update-answer.dto';

describe('CreateAnswerDto — réponse ≥ 30 caractères (glossaire)', () => {
  const check = (body: string) => validate(plainToInstance(CreateAnswerDto, { body }));

  it('refuse un corps de moins de 30 caractères', async () => {
    const errors = await check('Trop court.');
    expect(errors[0].constraints?.minLength).toBe('La réponse doit contenir au moins 30 caractères.');
  });

  it('accepte un corps de 30 caractères', async () => {
    expect(await check('a'.repeat(30))).toHaveLength(0);
  });

  it('applique la même règle à la modification', async () => {
    const errors = await validate(plainToInstance(UpdateAnswerDto, { body: 'court' }));
    expect(errors).toHaveLength(1);
  });
});
