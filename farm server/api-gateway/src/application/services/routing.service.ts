import { Injectable, Logger } from '@nestjs/common';
import { getRoutes, PUBLIC_PATHS, ServiceRoute } from '../../domain/routes';

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

  getTargetUrl(path: string): string | null {
    const route = this.findRoute(path);
    return route?.target || null;
  }

  shouldRewrite(path: string): boolean {
    const route = this.findRoute(path);
    if (!route) return false;
    if (route.rewrite === false) return false;

    const routePath = route.path;
    return path.startsWith(routePath) && path !== routePath;
  }

  rewritePath(originalPath: string): string {
    const route = this.findRoute(originalPath);
    if (!route || route.rewrite === false) return originalPath;
    return originalPath.replace(new RegExp(`^${route.path}`), '') || '/';
  }

  getServiceName(path: string): string {
    const route = this.findRoute(path);
    return route?.service || 'unknown';
  }

  getAllRoutes(): ServiceRoute[] {
    return getRoutes();
  }
}
