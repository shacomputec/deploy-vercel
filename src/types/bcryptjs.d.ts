declare module "bcryptjs" {
  export function genSaltSync(rounds?: number): string;
  export function genSalt(rounds?: number): Promise<string>;
  export function hashSync(s: string, salt?: string | number): string;
  export function hash(s: string, salt: string | number): Promise<string>;
  export function compareSync(s: string, hash: string): boolean;
  export function compare(s: string, hash: string): Promise<boolean>;
  export function setRandomFallback(random: (len: number) => number[]): void;
  const bcrypt: {
    genSaltSync: typeof genSaltSync;
    genSalt: typeof genSalt;
    hashSync: typeof hashSync;
    hash: typeof hash;
    compareSync: typeof compareSync;
    compare: typeof compare;
  };
  export default bcrypt;
}
