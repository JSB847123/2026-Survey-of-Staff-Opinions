export class AppError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export class ParseError extends AppError {
  constructor(message: string) {
    super(422, message);
    this.name = "ParseError";
  }
}
