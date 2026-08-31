import { Injectable, Logger } from '@nestjs/common';
import { getRoutes, PUBLIC_PATHS, ServiceRoute } from './routes';

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly routeMap: Map<string, ServiceRoute>;

  constructor() {
    this.routeMap = new Map();
    for (const route of getRoutes()) {
      this.routeMap.set(route.path, route);
    }
    this.logger.log(`Loaded ${this.routeMap.size} domain routes`);
  }

  findRoute(path: string): ServiceRoute | null {
    for (const [routePath, route] of this.routeMap) {
      if (path === routePath || path.startsWith(routePath + '/')) {
        return route;
      }
    }
    return null;
  }

  isPublicPath(path: string): boolean {
    const cleanPath = path.split('?')[0];
    if (PUBLIC_PATHS.has(cleanPath)) return true;
    if (cleanPath.startsWith('/docs')) return true;
    if (cleanPath === '/health' || cleanPath.startsWith('/health/')) return true;
    return false;
  }

  getServiceName(path: string): string {
    const route = this.findRoute(path);
    return route?.service || 'unknown';
  }

  getServiceBaseUrl(path: string): string | null {
    const route = this.findRoute(path);
    return route?.baseUrl || null;
  }

  getAllRoutes(): ServiceRoute[] {
    return getRoutes();
  }
}
