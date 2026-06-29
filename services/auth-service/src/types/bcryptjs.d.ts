declare module 'bcryptjs' {
  export function hash(password: string, salt: number): Promise<string>;
  export function hashSync(password: string, salt: number): string;
  export function compare(password: string, hash: string): Promise<boolean>;
  export function compareSync(password: string, hash: string): boolean;
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
}
