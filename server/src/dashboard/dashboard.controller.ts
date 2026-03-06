import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUser } from '../auth/strategies/jwt.strategy';
import { DashboardService } from './dashboard.service';

@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics(@Request() req: { user: AuthUser }) {
    return this.dashboardService.getMetrics(req.user.tenantId);
  }

  @Get('leads-over-time')
  getLeadsOverTime(
    @Request() req: { user: AuthUser },
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.dashboardService.getLeadsOverTime(req.user.tenantId, days);
  }

  @Get('top-performers')
  getTopPerformers(@Request() req: { user: AuthUser }) {
    return this.dashboardService.getTopPerformers(req.user.tenantId);
  }

  @Get('funnel')
  getLeadsFunnel(@Request() req: { user: AuthUser }) {
    return this.dashboardService.getLeadsFunnel(req.user.tenantId);
  }

  @Get('leads-by-source')
  getLeadsBySource(@Request() req: { user: AuthUser }) {
    return this.dashboardService.getLeadsBySource(req.user.tenantId);
  }
}
