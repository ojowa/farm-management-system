import { Inject,  Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrganizationRepository } from '../../domain/repositories/organization.repository';
import { CreateOrganizationRequest } from '../../../../kernel/types';
import { PaymentsApplicationService } from '../../../payments';

@Injectable()
export class OrganizationApplicationService {
  constructor(
    @Inject('OrganizationRepository') private readonly orgRepo: OrganizationRepository,
    private readonly payments: PaymentsApplicationService
  ) {}

  async create(createDto: CreateOrganizationRequest) {
    const existingBySlug = await this.orgRepo.findBySlug(createDto.slug);
    if (existingBySlug) {
      throw new BadRequestException(`Organization with slug ${createDto.slug} already exists`);
    }

    const existingByEmail = await this.orgRepo.findBySlug(createDto.adminEmail);
    if (existingByEmail) {
      throw new BadRequestException(`Organization with email ${createDto.adminEmail} already exists`);
    }

    let planName = createDto.subscriptionPlan;
    if (planName) {
      const plan = await this.orgRepo.findSubscriptionPlanByName(planName);
      if (!plan) {
        throw new BadRequestException(`Subscription plan '${planName}' does not exist`);
      }
    } else {
      const defaultPlan = await this.orgRepo.findDefaultSubscriptionPlan();
      planName = defaultPlan?.name || 'FREE';
    }

    return this.orgRepo.create({
      name: createDto.name,
      slug: createDto.slug,
      email: createDto.adminEmail,
      subscriptionPlan: planName,
      subscriptionStatus: 'TRIAL',
      settings: { currency: 'USD', timezone: 'UTC', language: 'en', measurementUnit: 'METRIC', dateFormat: 'YYYY-MM-DD' },
    });
  }

  async findOne(id: string, organizationId?: string) {
    // Tenancy: this module is strictly self-service — the :id in the path must
    // be the caller's own organization, so a foreign id reads as not-found.
    if (!organizationId || id !== organizationId) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    const org = await this.orgRepo.findById(id);
    if (!org) throw new NotFoundException(`Organization with ID ${id} not found`);
    return org;
  }

  async findBySlug(slug: string, organizationId?: string) {
    if (!organizationId) throw new NotFoundException('Organization not found');
    const org = await this.orgRepo.findBySlug(slug);
    if (!org || org.id !== organizationId) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async update(id: string, organizationId: string, updateDto: Partial<{ name: string; slug: string; email: string; subscriptionPlan: string; subscriptionStatus: string; settings: Record<string, any> }>) {
    await this.findOne(id, organizationId);

    if (updateDto.subscriptionPlan) {
      const plan = await this.orgRepo.findSubscriptionPlanByName(updateDto.subscriptionPlan);
      if (!plan) {
        throw new BadRequestException(`Subscription plan '${updateDto.subscriptionPlan}' does not exist`);
      }
    }

    return this.orgRepo.update(id, updateDto);
  }

  async findAll(organizationId?: string) {
    // Never enumerate other tenants — a caller only ever sees their own row.
    if (!organizationId) return [];
    const org = await this.orgRepo.findById(organizationId);
    return org ? [org] : [];
  }

  async getSubscriptionPlans() {
    return this.orgRepo.findActiveSubscriptionPlans();
  }

  /**
   * Org-facing subscription snapshot for the billing page (owner-only via
   * `billing.manage` on the controller): linked plan, its entitlements, and
   * live usage against the plan caps.
   */
  async getSubscription(organizationId: string) {
    if (!organizationId) throw new NotFoundException('Organization not found');
    const { prisma, applySubscriptionExpiryIfNeeded } = await import('../../../../kernel/database');
    const snapshotSelect = {
      id: true,
      name: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionPlanId: true,
      subscriptionPaidThrough: true,
      subscriptionPlanRef: {
        select: {
          id: true, name: true, displayName: true, description: true,
          price: true, currency: true, billingCycle: true,
          maxUsers: true, maxFarms: true, maxStorage: true, features: true,
        },
      },
      _count: { select: { farms: true, users: true } },
    } as const;
    let org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: snapshotSelect,
    });
    if (!org) throw new NotFoundException('Organization not found');

    // Lazy billing expiry: a lapse must be reflected in this very snapshot.
    if (await applySubscriptionExpiryIfNeeded(prisma as any, org as any)) {
      org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: snapshotSelect,
      });
      if (!org) throw new NotFoundException('Organization not found');
    }

    const billing = await prisma.paystackSubscription.findUnique({
      where: { organizationId },
    });

    // Same normalization as withPlanFeatures: unconfigured plans store the
    // legacy `"[]"` default, which is not an entitlement object.
    const raw = org.subscriptionPlanRef?.features as any;
    const features = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const list = (v: any): string[] => (Array.isArray(v) ? v : []);

    return {
      status: org.subscriptionStatus,
      organization: { id: org.id, name: org.name, planName: org.subscriptionPlan },
      plan: org.subscriptionPlanRef
        ? {
            id: org.subscriptionPlanRef.id,
            name: org.subscriptionPlanRef.name,
            displayName: org.subscriptionPlanRef.displayName,
            description: org.subscriptionPlanRef.description,
            price: Number(org.subscriptionPlanRef.price ?? 0),
            currency: org.subscriptionPlanRef.currency,
            billingCycle: org.subscriptionPlanRef.billingCycle,
            maxUsers: org.subscriptionPlanRef.maxUsers,
            maxFarms: org.subscriptionPlanRef.maxFarms,
            maxStorage: org.subscriptionPlanRef.maxStorage,
            features: {
              modules: list(features.modules),
              farmTypes: list(features.farmTypes),
              perks: list(features.perks),
            },
          }
        : null,
      usage: { farms: org._count.farms, users: org._count.users },
      // Recurring billing state: null for free/comped orgs (never expires);
      // set by checkout/renewal webhooks for billing-managed ones.
      paidThrough: org.subscriptionPaidThrough ? org.subscriptionPaidThrough.toISOString() : null,
      billing: billing
        ? {
            status: billing.status,
            cancelReason: billing.cancelReason,
            nextBillingDate: billing.nextPaymentDate
              ? billing.nextPaymentDate.toISOString()
              : null,
            customerEmail: billing.customerEmail,
          }
        : null,
    };
  }

  /**
   * Owner-initiated plan change. Keeps the legacy `subscriptionPlan` name
   * column in sync with the FK — the two drifting is exactly what used to
   * make entitlements resolve to an empty module list.
   */
  async changeSubscriptionPlan(organizationId: string, planId: string) {
    if (!organizationId) throw new NotFoundException('Organization not found');
    if (!planId) throw new BadRequestException('planId is required');
    const { prisma, applySubscriptionExpiryIfNeeded } = await import('../../../../kernel/database');
    let org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, subscriptionPlanId: true, subscriptionPaidThrough: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (await applySubscriptionExpiryIfNeeded(prisma as any, org as any)) {
      org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, subscriptionPlanId: true, subscriptionPaidThrough: true },
      });
      if (!org) throw new NotFoundException('Organization not found');
    }
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      throw new BadRequestException('Subscription plan not found');
    }
    if (org.subscriptionPlanId === plan.id) {
      throw new BadRequestException(`Already subscribed to the ${plan.name} plan`);
    }
    // Paid plans switch through Paystack checkout only — this PATCH is the
    // instant, free path (and is how an owner returns to FREE).
    if (Number(plan.price ?? 0) > 0) {
      throw new BadRequestException(
        `The ${plan.displayName} plan is paid — start checkout instead of switching directly`
      );
    }
    // Moving to a free plan ends any live Paystack subscription (future
    // charges stop) and clears the paid-through date.
    await this.payments.forceCancelForFreeSwitch(organizationId);
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        subscriptionPlanId: plan.id,
        subscriptionPlan: plan.name,
        subscriptionPaidThrough: null,
      },
    });
    return this.getSubscription(organizationId);
  }

  // ── Paystack checkout surface (controller routes, all billing.manage) ──

  async checkoutPlan(
    organizationId: string,
    planId: string,
    user: { id?: string; email?: string }
  ) {
    return this.payments.initializeCheckout(organizationId, planId, user);
  }

  async checkoutStatus(organizationId: string, reference: string) {
    return this.payments.pollCheckoutStatus(organizationId, reference);
  }

  async cancelBilling(organizationId: string, userId?: string) {
    return this.payments.cancelBilling(organizationId, userId);
  }

  async resumeBilling(organizationId: string, userId?: string) {
    return this.payments.resumeBilling(organizationId, userId);
  }

  async listPayments(organizationId: string, limit?: number) {
    return this.payments.listOrgPayments(organizationId, limit);
  }

  async delete(id: string, organizationId?: string) {
    await this.findOne(id, organizationId);
    return this.orgRepo.delete(id);
  }
}
