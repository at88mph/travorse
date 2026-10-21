export class VospaceError extends Error {
  readonly status?: number;

  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.status = options?.status;
  }
}

export class ServiceNotFoundError extends VospaceError {}

export class NodeNotFoundError extends VospaceError {}

export class NodeAlreadyExistsError extends VospaceError {}

export class NotAuthenticatedError extends VospaceError {}

export class PermissionDeniedError extends VospaceError {}

export class NodeNotSupportedError extends VospaceError {}

export class NodeParsingError extends VospaceError {}
