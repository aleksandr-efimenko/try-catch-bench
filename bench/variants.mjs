export function plain(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += i & 7;
  }
  return sum;
}

export function guarded(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    try {
      sum += i & 7;
    } catch (e) {
      sum = -1;
    }
  }
  return sum;
}

export function throwing(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    try {
      throw new Error("bad input");
    } catch (e) {
      sum += i & 7;
    }
  }
  return sum;
}

export function throwObject(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    try {
      throw { code: 1 };
    } catch (e) {
      sum += i & 7;
    }
  }
  return sum;
}
