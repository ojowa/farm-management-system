declare const describe: any;
declare const it: any;
declare const beforeAll: any;
declare const afterAll: any;
declare const expect: any;

declare module 'jsonwebtoken' {
  export function sign(payload: any, secretOrPrivateKey: any, options?: any): string;
}

