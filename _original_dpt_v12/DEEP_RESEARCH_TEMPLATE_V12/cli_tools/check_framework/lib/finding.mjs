export class Finding {
  constructor(code, message) {
    this.code = code;
    this.message = message;
  }
}

export function helperNote() {
  return "NOTE helper output is read-only; it is not logged gate evidence and does not authorize gate passage";
}
