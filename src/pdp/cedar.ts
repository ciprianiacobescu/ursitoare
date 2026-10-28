// The one Cedar import of the module: the Node build compiles the wasm at import.
import * as cedar from "@cedar-policy/cedar-wasm/nodejs";

export { cedar };
export const CEDAR_WASM_PKG_VERSION = "4.14.0";
