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

  @Get('deals-over-time')
  getDealsOverTime(
    @Request() req: { user: AuthUser },
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.dashboardService.getDealsOverTime(req.user.tenantId, days);
  }

  @Get('top-performers')
  getTopPerformers(@Request() req: { user: AuthUser }) {
    return this.dashboardService.getTopPerformers(req.user.tenantId);
  }

  @Get('funnel')
  getConversionFunnel(@Request() req: { user: AuthUser }) {
    return this.dashboardService.getConversionFunnel(req.user.tenantId);
  }
}
