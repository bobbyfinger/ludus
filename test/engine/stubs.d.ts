// Types minimaux pour node:test / node:assert/strict.
// ponytail: stub local plutôt que @types/node (package.json hors scope de cette tâche) ;
// remplacer par @types/node quand une tâche touche package.json.
declare module "node:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
}
declare module "node:assert/strict" {
  const assert: {
    equal(a: unknown, b: unknown, msg?: string): void;
    ok(v: unknown, msg?: string): void;
    deepEqual(a: unknown, b: unknown, msg?: string): void;
    notDeepEqual(a: unknown, b: unknown, msg?: string): void;
  };
  export default assert;
}
