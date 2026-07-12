import { AggregateRoot, Id, Email, Phone } from '@farm/domain-core';
import {
  OrganizationCreated,
  OrganizationSubscriptionChanged,
} from '../events/organization-events';

export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled';

export interface OrganizationSettings {
  timezone: string;
  currency: string;
  language: string;
  dateFormat: string;
  allowInvitations: boolean;
  requireEmailVerification: boolean;
}

export interface OrganizationProps {
  name: string;
  slug: string;
  email: Email;
  phone: Phone | null;
  logo: string | null;
  website: string | null;
  industry: string | null;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  settings: OrganizationSettings;
}

export class Organization extends AggregateRoot<OrganizationProps> {
  private constructor(id: Id, props: OrganizationProps) {
    super(id, props);
  }

  static create(
    id: Id,
    props: Omit<OrganizationProps, 'subscriptionPlan' | 'subscriptionStatus' | 'settings'> & {
      subscriptionPlan?: SubscriptionPlan;
      subscriptionStatus?: SubscriptionStatus;
      settings?: Partial<OrganizationSettings>;
    }
  ): Organization {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Organization name is required');
    }
    if (!props.slug || props.slug.trim().length === 0) {
      throw new Error('Organization slug is required');
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(props.slug)) {
      throw new Error(
        'Organization slug must contain only lowercase letters, numbers, and hyphens'
      );
    }

    const defaultSettings: OrganizationSettings = {
      timezone: 'UTC',
      currency: 'USD',
      language: 'en',
      dateFormat: 'YYYY-MM-DD',
      allowInvitations: true,
      requireEmailVerification: true,
    };

    const organization = new Organization(id, {
      name: props.name.trim(),
      slug: props.slug.trim().toLowerCase(),
      email: props.email,
      phone: props.phone ?? null,
      logo: props.logo ?? null,
      website: props.website ?? null,
      industry: props.industry ?? null,
      subscriptionPlan: props.subscriptionPlan ?? 'free',
      subscriptionStatus: props.subscriptionStatus ?? 'active',
      settings: { ...defaultSettings, ...props.settings },
    });

    organization.addDomainEvent(
      new OrganizationCreated(id.toString(), {
        name: props.name,
        slug: props.slug,
      })
    );

    return organization;
  }

  static reconstitute(id: Id, props: OrganizationProps): Organization {
    return new Organization(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get email(): Email {
    return this.props.email;
  }

  get phone(): Phone | null {
    return this.props.phone;
  }

  get logo(): string | null {
    return this.props.logo;
  }

  get website(): string | null {
    return this.props.website;
  }

  get industry(): string | null {
    return this.props.industry;
  }

  get subscriptionPlan(): SubscriptionPlan {
    return this.props.subscriptionPlan;
  }

  get subscriptionStatus(): SubscriptionStatus {
    return this.props.subscriptionStatus;
  }

  get settings(): OrganizationSettings {
    return this.props.settings;
  }

  updateSubscription(plan: SubscriptionPlan, status: SubscriptionStatus): void {
    if (!plan || plan.trim().length === 0) {
      throw new Error('Subscription plan is required');
    }
    if (!status || status.trim().length === 0) {
      throw new Error('Subscription status is required');
    }

    const validPlans: SubscriptionPlan[] = ['free', 'starter', 'professional', 'enterprise'];
    const validStatuses: SubscriptionStatus[] = [
      'active',
      'inactive',
      'trialing',
      'past_due',
      'canceled',
    ];

    if (!validPlans.includes(plan)) {
      throw new Error(`Invalid subscription plan: ${plan}`);
    }
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid subscription status: ${status}`);
    }

    const previousPlan = this.props.subscriptionPlan;
    const previousStatus = this.props.subscriptionStatus;

    this.props.subscriptionPlan = plan;
    this.props.subscriptionStatus = status;

    this.addDomainEvent(
      new OrganizationSubscriptionChanged(this.id.toString(), {
        previousPlan,
        newPlan: plan,
        previousStatus,
        newStatus: status,
      })
    );
  }

  updateSettings(settings: Partial<OrganizationSettings>): void {
    if (settings.timezone !== undefined) {
      this.props.settings.timezone = settings.timezone;
    }
    if (settings.currency !== undefined) {
      this.props.settings.currency = settings.currency;
    }
    if (settings.language !== undefined) {
      this.props.settings.language = settings.language;
    }
    if (settings.dateFormat !== undefined) {
      this.props.settings.dateFormat = settings.dateFormat;
    }
    if (settings.allowInvitations !== undefined) {
      this.props.settings.allowInvitations = settings.allowInvitations;
    }
    if (settings.requireEmailVerification !== undefined) {
      this.props.settings.requireEmailVerification = settings.requireEmailVerification;
    }
  }

  updateProfile(data: {
    name?: string;
    logo?: string | null;
    website?: string | null;
    industry?: string | null;
    phone?: Phone | null;
  }): void {
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error('Organization name cannot be empty');
      }
      this.props.name = data.name.trim();
    }
    if (data.logo !== undefined) {
      this.props.logo = data.logo;
    }
    if (data.website !== undefined) {
      this.props.website = data.website;
    }
    if (data.industry !== undefined) {
      this.props.industry = data.industry;
    }
    if (data.phone !== undefined) {
      this.props.phone = data.phone;
    }
  }
}
