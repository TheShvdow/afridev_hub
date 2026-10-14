import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';

// Modification d'une question : tous les champs optionnels, mêmes contraintes que la création.
export class UpdatePostDto extends PartialType(CreatePostDto) {}
