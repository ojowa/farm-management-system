export class GeoCoordinates {
  private readonly _latitude: number;
  private readonly _longitude: number;

  private constructor(latitude: number, longitude: number) {
    this._latitude = latitude;
    this._longitude = longitude;
  }

  get latitude(): number {
    return this._latitude;
  }

  get longitude(): number {
    return this._longitude;
  }

  static create(latitude: number, longitude: number): GeoCoordinates {
    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    return new GeoCoordinates(latitude, longitude);
  }

  equals(other: GeoCoordinates): boolean {
    if (!other) return false;
    return this._latitude === other._latitude && this._longitude === other._longitude;
  }

  toString(): string {
    return `${this._latitude},${this._longitude}`;
  }

  toJSON(): { latitude: number; longitude: number } {
    return { latitude: this._latitude, longitude: this._longitude };
  }
}
