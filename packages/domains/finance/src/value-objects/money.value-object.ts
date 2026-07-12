import { Money as DomainMoney } from '@farm/domain-core';

export { DomainMoney as Money };

export function createMoney(amount: number, currency: string = 'USD'): DomainMoney {
  return DomainMoney.create(amount, currency);
}

export function zeroMoney(currency: string = 'USD'): DomainMoney {
  return DomainMoney.zero(currency);
}
