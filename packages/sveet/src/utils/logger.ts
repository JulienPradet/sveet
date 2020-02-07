interface Logger {
  error(message: string, error: Error): void;
  warn(message: string, stack: [String]): void;
  log(message: string): void;
}

export class DefaultLogger implements Logger {
  error(message: string, error: Error) {
    console.error(`[Sveet]`, message, error);
  }

  warn(message: string, stack: [String]) {
    console.warn(`[Sveet]`, message, stack);
  }

  log(message: string) {
    console.log(`[Sveet]`, message);
  }
}

export default Logger;
