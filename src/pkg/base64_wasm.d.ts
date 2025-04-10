/* tslint:disable */
/* eslint-disable */
export function bytes_to_base64_standard(bytes: Uint8Array): string;
export function bytes_to_urlbase64(bytes: Uint8Array): string;
export function bytes_to_base64(bytes: Uint8Array, url_safe: boolean): string;
export function base64_to_bytes_standard(base64_str: string): Uint8Array;
export function base64_to_bytes_url(base64_str: string): Uint8Array;
export function base64_to_bytes_custom(
  base64_str: string,
  url_safe: boolean,
): Uint8Array;

export type InitInput =
  | RequestInfo
  | URL
  | Response
  | BufferSource
  | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly bytes_to_base64_standard: (a: number, b: number) => [number, number];
  readonly bytes_to_urlbase64: (a: number, b: number) => [number, number];
  readonly bytes_to_base64: (
    a: number,
    b: number,
    c: number,
  ) => [number, number];
  readonly base64_to_bytes_standard: (a: number, b: number) => [number, number];
  readonly base64_to_bytes_url: (a: number, b: number) => [number, number];
  readonly base64_to_bytes_custom: (
    a: number,
    b: number,
    c: number,
  ) => [number, number];
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_realloc: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(
  module: { module: SyncInitInput } | SyncInitInput,
): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
  module_or_path?:
    | { module_or_path: InitInput | Promise<InitInput> }
    | InitInput
    | Promise<InitInput>,
): Promise<InitOutput>;
