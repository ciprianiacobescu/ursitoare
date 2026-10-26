export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now(): Date {
    return new Date();
  },
};

export function fixedClock(iso: string): Clock {
  const millis = Date.parse(iso);
  if (Number.isNaN(millis)) {
    throw new RangeError("fixedClock requires a valid date");
  }
  return {
    now(): Date {
      return new Date(millis);
    },
  };
}
