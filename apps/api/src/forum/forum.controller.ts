import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiData } from '../common/swagger/api-data.decorator';
import { PostDto, PostDetailDto, AnswerDto, SuccessDto } from '../common/swagger/models';
import { UpdatePostDto } from './dto/update-post.dto';

interface ReqUser { id: string; role: string; }

@ApiTags('Forum')
@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  // ── Posts ────────────────────────────────────────────────────────────

  @Get('posts')
  @ApiOperation({ summary: 'Lister les questions' })
  @ApiData({ type: PostDto, paginated: true, description: 'Liste paginée des questions' })
  listPosts(@Query() query: ListPostsDto) {
    return this.forumService.listPosts(query);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Détail d\'une question' })
  @ApiData({ type: PostDetailDto, description: 'Question avec ses réponses' })
  getPost(
    @Param('id') id: string,
    @Request() req: { user?: ReqUser },
  ) {
    return this.forumService.getPost(id, req.user?.id);
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Poser une question' })
  @ApiData({ type: PostDto, status: 201, description: 'Question créée' })
  createPost(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.forumService.createPost(userId, dto);
  }

  @Patch('posts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une question' })
  @ApiData({ type: PostDto, description: 'Question mise à jour' })
  updatePost(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.forumService.updatePost(id, userId, dto);
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une question' })
  deletePost(
    @Param('id') id: string,
    @CurrentUser() user: ReqUser,
  ) {
    return this.forumService.deletePost(id, user.id, user.role);
  }

  // ── Answers ──────────────────────────────────────────────────────────

  @Post('posts/:postId/answers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Répondre à une question' })
  @ApiData({ type: AnswerDto, status: 201, description: 'Réponse créée' })
  createAnswer(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.forumService.createAnswer(postId, userId, dto);
  }

  @Patch('answers/:answerId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accepter une réponse' })
  @ApiData({ type: SuccessDto, description: 'Réponse acceptée' })
  acceptAnswer(
    @Param('answerId') answerId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.forumService.acceptAnswer(answerId, userId);
  }

  @Delete('answers/:answerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une réponse' })
  deleteAnswer(
    @Param('answerId') answerId: string,
    @CurrentUser() user: ReqUser,
  ) {
    return this.forumService.deleteAnswer(answerId, user.id, user.role);
  }
}
