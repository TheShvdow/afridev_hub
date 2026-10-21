import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { AvatarPresignDto } from './dto/avatar-presign.dto';
import { CvPresignDto } from './dto/cv-presign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiData } from '../common/swagger/api-data.decorator';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploads: UploadService) {}

  @Post('avatar-presign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir une URL présignée pour envoyer son avatar vers R2' })
  @ApiData({ description: 'URL présignée (PUT, valable 5 min) et URL publique finale' })
  presignAvatar(@CurrentUser('id') userId: string, @Body() dto: AvatarPresignDto) {
    return this.uploads.presignAvatar(userId, dto);
  }

  @Post('cv-presign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir une URL présignée pour envoyer son CV (PDF, 5 Mo max) vers R2' })
  @ApiData({ description: 'URL présignée (PUT, valable 5 min) et clé à passer à POST /jobs/:id/apply' })
  presignCv(@CurrentUser('id') userId: string, @Body() dto: CvPresignDto) {
    return this.uploads.presignCv(userId, dto);
  }
}
