import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

// Modification d'un projet : les tags et la catégorie ne se modifient pas ici.
export class UpdateProjectDto extends PartialType(OmitType(CreateProjectDto, ['tags', 'categorySlug'] as const)) {}
