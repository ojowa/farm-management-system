import { Request, Response } from 'express';
import { ReportingService } from './reporting.service';

const createReportSchema = {
  parse: (body: any) => body,
};

const updateReportSchema = {
  parse: (body: any) => body,
};

const service = new ReportingService();


export class ReportingController {
  private getOrganizationId(req: Request): string {
    const orgId = (req as any)?.user?.organizationId as string | undefined;
    if (!orgId) {
      const err: any = new Error('organizationId missing from request');
      err.statusCode = 401;
      throw err;
    }
    return orgId;
  }

  async getAllReports(req: Request, res: Response) {
    try {
      const organizationId = this.getOrganizationId(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const filter: any = {};
      if (req.query.farmId) filter.farmId = req.query.farmId as string;
      if (req.query.search) filter.search = req.query.search as string;

      const result = await service.getAllReports(organizationId, filter, sortBy, sortOrder, page, limit);
      res.json(result);
    } catch (error: any) {
      const status = error?.statusCode ?? 500;
      res.status(status).json({ error: error.message || error });
    }
  }

  async getReportById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      const report = await service.getReportById(id, organizationId);
      res.json(report);
    } catch (error: any) {
      const status = error?.statusCode === 404 ? 404 : error?.statusCode ?? 500;
      res.status(status).json({ error: error.message || error });
    }
  }

  async createReport(req: Request, res: Response) {
    try {
      const validated = createReportSchema.parse(req.body);
      const organizationId = this.getOrganizationId(req);
      const report = await service.createReport(validated, organizationId);
      res.status(201).json(report);
    } catch (error: any) {
      const status = error?.statusCode ?? 400;
      res.status(status).json({ error: error.message || error });
    }
  }

  async updateReport(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const validated = updateReportSchema.parse(req.body);
      const organizationId = this.getOrganizationId(req);
      const report = await service.updateReport(id, validated, organizationId);
      res.json(report);
    } catch (error: any) {
      const status = error?.statusCode ?? 400;
      res.status(status).json({ error: error.message || error });
    }
  }

  async deleteReport(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const organizationId = this.getOrganizationId(req);
      await service.deleteReport(id, organizationId);
      res.status(204).send();
    } catch (error: any) {
      const status = error?.statusCode ?? 400;
      res.status(status).json({ error: error.message || error });
    }
  }
}


