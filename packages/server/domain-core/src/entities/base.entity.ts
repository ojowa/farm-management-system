import { Id } from '../value-objects/id.value-object';

export abstract class BaseEntity<T> {
  protected readonly _id: Id;
  protected props: T;

  constructor(id: Id, props: T) {
    this._id = id;
    this.props = props;
  }

  get id(): Id {
    return this._id;
  }

  equals(object?: BaseEntity<T>): boolean {
    if (object === null || object === undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!(object instanceof BaseEntity)) {
      return false;
    }

    return this._id.equals(object._id);
  }
}
