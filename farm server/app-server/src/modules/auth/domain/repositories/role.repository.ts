export interface RoleRepository {
  findById(id: string): Promise<{ id: string; name: string; isSystem: boolean; organizationId: string | null } | null>;
  findByName(name: string, organizationId: string | null): Promise<{ id: string; name: string } | null>;
  findDefaultRole(): Promise<{ id: string; name: string } | null>;
  findManyByIds(ids: string[]): Promise<Array<{ id: string; name: string; isSystem: boolean }>>;
}
