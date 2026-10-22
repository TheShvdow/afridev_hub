import { PartialType } from '@nestjs/swagger';
import { CreateAnswerDto } from './create-answer.dto';

// Modification d'une réponse : mêmes contraintes que la création (corps ≥ 30 caractères).
export class UpdateAnswerDto extends PartialType(CreateAnswerDto) {}
