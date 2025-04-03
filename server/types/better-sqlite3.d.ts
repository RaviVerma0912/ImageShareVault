declare module 'better-sqlite3' {
  interface Statement {
    run(...params: any[]): { lastInsertRowid: number; changes: number };
    get(...params: any[]): any;
    all(...params: any[]): any[];
    iterate(...params: any[]): Iterator<any>;
  }
  
  interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): void;
    transaction(fn: Function): Function;
    pragma(pragma: string, options?: { simple?: boolean }): any;
    function(name: string, cb: Function): void;
    aggregate(name: string, options: { start: any; step: Function; result?: Function }): void;
    backup(filename: string): Promise<void>;
    close(): void;
    serialize(): Buffer;
    readonly memory: boolean;
    readonly open: boolean;
    readonly inTransaction: boolean;
    readonly name: string;
    readonly readonly: boolean;
  }
  
  export default function(filename: string, options?: { readonly?: boolean; fileMustExist?: boolean; timeout?: number; verbose?: Function }): Database;
}