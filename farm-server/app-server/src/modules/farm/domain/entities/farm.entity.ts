export interface Farm {
  id: string;
  organizationId: string;
  name: string;
  farmType: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  size: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Field {
  id: string;
  farmId: string;
  name: string;
  size: number;
}

/** A read of a field joined to its parent farm (parcel lists and detail pages). */
export interface FieldWithFarm extends Field {
  farm?: { id: string; name: string };
}
