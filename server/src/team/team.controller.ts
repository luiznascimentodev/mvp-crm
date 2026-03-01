import {
  Body,
  Controller,
  createParamDecorator,
  Delete,
  ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { TeamService } from './team.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';

interface JwtUser {
  userId: string;
  tenantId: string;
  role: Role;
  email: string;
}

const ReqUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtUser =>
    ctx.switchToHttp().getRequest<{ user: JwtUser }>().user,
);

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('members')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  listMembers(@ReqUser() user: JwtUser) {
    return this.teamService.listMembers(user.tenantId);
  }

  @Get('invites')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.OWNER)
  listInvites(@ReqUser() user: JwtUser) {
    return this.teamService.listInvites(user.tenantId);
  }

  @Post('invite')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.OWNER)
  @HttpCode(HttpStatus.CREATED)
  inviteMember(@ReqUser() user: JwtUser, @Body() dto: InviteMemberDto) {
    return this.teamService.inviteMember(user.tenantId, user.userId, dto);
  }

  @Delete('invites/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.OWNER)
  @HttpCode(HttpStatus.OK)
  revokeInvite(
    @ReqUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamService.revokeInvite(user.tenantId, id);
  }

  @Get('invite/:token')
  getInvite(@Param('token') token: string) {
    return this.teamService.getInviteByToken(token);
  }

  @Post('accept/:token')
  @HttpCode(HttpStatus.CREATED)
  acceptInvite(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    return this.teamService.acceptInvite(token, dto);
  }
}
