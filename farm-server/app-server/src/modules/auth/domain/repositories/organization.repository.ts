export interface OrganizationRepository {
  findById(id: string): Promise<{ id: string; name: string; slug: string } | null>;
  findBySlug(slug: string): Promise<{ id: string; name: string; slug: string } | null>;
  findAll(): Promise<Array<{ id: string; name: string; slug: string }>>;
}
