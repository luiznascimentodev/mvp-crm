import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
      service: 'Orbit CRM API',
      version: '1.0.0', // Could read from package.json but hardcoded is fine for MVP
    };
  }
}
