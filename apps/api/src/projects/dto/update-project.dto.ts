import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

// Modification d'un projet : tous les champs optionnels, mêmes contraintes que la soumission.
// Un nouveau repoUrl est revérifié auprès de GitHub.
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
