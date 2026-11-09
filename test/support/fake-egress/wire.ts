// Protobuf and gRPC framing for Mintkey's vault PutCredential call (field numbers of vault.proto).

export interface VaultPutInput {
  tenantId: string;
  serviceId: string;
  authScheme: number;
  value: Uint8Array;
  headerName: string;
  callerActorId: string;
  targetUrl: string;
}

export class WireError extends Error {}

function varint(n: number): Buffer {
  const out: number[] = [];
  let v = n;
  while (v >= 0x80) {
    out.push((v % 0x80) | 0x80);
    v = Math.floor(v / 0x80);
  }
  out.push(v);
  return Buffer.from(out);
}

function bytesField(num: number, data: Uint8Array): Buffer {
  return Buffer.concat([varint(num * 8 + 2), varint(data.length), data]);
}

export function encodePutRequest(m: VaultPutInput): Buffer {
  const parts: Buffer[] = [];
  const text = (num: number, s: string): void => {
    if (s !== "") parts.push(bytesField(num, Buffer.from(s, "utf8")));
  };
  text(1, m.tenantId);
  text(2, m.serviceId);
  if (m.authScheme !== 0) parts.push(Buffer.concat([varint(3 * 8), varint(m.authScheme)]));
  if (m.value.length > 0) parts.push(bytesField(4, m.value));
  text(6, m.headerName);
  text(8, m.callerActorId);
  text(9, m.targetUrl);
  return Buffer.concat(parts);
}

function readVarint(buf: Buffer, pos: number): [number, number] {
  let result = 0;
  let mul = 1;
  for (let i = 0; i < 10; i++) {
    const b = buf[pos + i];
    if (b === undefined) throw new WireError("truncated varint");
    result += (b & 0x7f) * mul;
    if ((b & 0x80) === 0) return [result, pos + i + 1];
    mul *= 0x80;
  }
  throw new WireError("varint too long");
}

const utf8 = new TextDecoder("utf-8", { fatal: true });

function decodeText(b: Buffer): string {
  try {
    return utf8.decode(b);
  } catch {
    throw new WireError("invalid utf-8");
  }
}

function fields(message: Buffer, onField: (num: number, wire: number, v: number | Buffer) => void): void {
  let pos = 0;
  while (pos < message.length) {
    const [tag, afterTag] = readVarint(message, pos);
    pos = afterTag;
    const num = Math.floor(tag / 8);
    const wire = tag % 8;
    if (num === 0) throw new WireError("field number 0");
    if (wire === 0) {
      const [v, next] = readVarint(message, pos);
      pos = next;
      onField(num, wire, v);
    } else if (wire === 1 || wire === 5) {
      const size = wire === 1 ? 8 : 4;
      if (pos + size > message.length) throw new WireError("truncated field");
      pos += size;
      onField(num, wire, 0);
    } else if (wire === 2) {
      const [len, next] = readVarint(message, pos);
      if (next + len > message.length) throw new WireError("truncated field");
      onField(num, wire, message.subarray(next, next + len));
      pos = next + len;
    } else {
      throw new WireError("unsupported wire type");
    }
  }
}

export function decodePutRequest(
  message: Buffer,
): Omit<VaultPutInput, "value"> & { value: Buffer } {
  const out = {
    tenantId: "",
    serviceId: "",
    authScheme: 0,
    value: Buffer.alloc(0),
    headerName: "",
    callerActorId: "",
    targetUrl: "",
  };
  const textMembers: Record<number, "tenantId" | "serviceId" | "headerName" | "callerActorId" | "targetUrl"> = {
    1: "tenantId",
    2: "serviceId",
    6: "headerName",
    8: "callerActorId",
    9: "targetUrl",
  };
  fields(message, (num, wire, v) => {
    const key = textMembers[num];
    if (key !== undefined) {
      if (wire !== 2 || typeof v === "number") throw new WireError("wrong wire type");
      out[key] = decodeText(v);
    } else if (num === 3) {
      if (wire !== 0 || typeof v !== "number") throw new WireError("wrong wire type");
      out.authScheme = v;
    } else if (num === 4) {
      if (wire !== 2 || typeof v === "number") throw new WireError("wrong wire type");
      out.value = Buffer.from(v);
    }
  });
  return out;
}

export function encodePutResponse(keyVersion: number): Buffer {
  const parts: Buffer[] = [];
  if (keyVersion !== 0) parts.push(Buffer.concat([varint(1 * 8), varint(keyVersion)]));
  parts.push(bytesField(2, Buffer.alloc(0)));
  return Buffer.concat(parts);
}

export function decodePutResponse(message: Buffer): number {
  let version = 0;
  fields(message, (num, wire, v) => {
    if (num === 1) {
      if (wire !== 0 || typeof v !== "number") throw new WireError("wrong wire type");
      version = v;
    }
  });
  return version;
}

export function frame(message: Uint8Array): Buffer {
  const head = Buffer.alloc(5);
  head.writeUInt32BE(message.length, 1);
  return Buffer.concat([head, message]);
}

export function unframe(body: Buffer): Buffer {
  if (body.length < 5) throw new WireError("short frame");
  if (body[0] !== 0) throw new WireError("compressed frame");
  const len = body.readUInt32BE(1);
  if (body.length !== 5 + len) throw new WireError("frame length mismatch");
  return body.subarray(5);
}
