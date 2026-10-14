import { PartialType } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';

// Modification d'une offre : tous les champs optionnels, mêmes contraintes que la création.
export class UpdateJobDto extends PartialType(CreateJobDto) {}
