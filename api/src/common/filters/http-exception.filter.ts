import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { Request, Response } from 'express';

// Postgres error codes we want to turn into clean, specific messages
// instead of a generic 500. See:
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_NOT_NULL_VIOLATION = '23502';
const PG_STRING_TOO_LONG = '22001';

interface PgErrorLike {
  code?: string;
  constraint?: string;
  column?: string;
  detail?: string;
  message?: string;
}

/**
 * Drizzle wraps the real driver error in `.cause` (sometimes a few
 * levels deep). Walk the chain to find the actual Postgres error, since
 * that's the one with a `.code` and useful `.detail`/`.constraint` —
 * the outer DrizzleQueryError just says "Failed query: insert into...".
 */
function findPgError(err: unknown): PgErrorLike | undefined {
  let current = err as { cause?: unknown; code?: unknown } | undefined;
  for (let i = 0; i < 5 && current; i++) {
    if (typeof current.code === 'string' && /^\d{5}$/.test(current.code)) {
      return current as PgErrorLike;
    }
    current = (current as { cause?: typeof current }).cause;
  }
  return undefined;
}

function humanizePgError(pgError: PgErrorLike): string | undefined {
  const field = pgError.constraint?.replace(/^\w+_/, '').replace(/_key|_unique|_idx$/, '') ?? pgError.column;

  switch (pgError.code) {
    case PG_UNIQUE_VIOLATION:
      return field
        ? `That ${field.replace(/_/g, ' ')} is already in use.`
        : 'That value is already in use.';
    case PG_FOREIGN_KEY_VIOLATION:
      return 'That references something that no longer exists.';
    case PG_NOT_NULL_VIOLATION:
      return field ? `${field.replace(/_/g, ' ')} is required.` : 'A required field is missing.';
    case PG_STRING_TOO_LONG:
      return field ? `${field.replace(/_/g, ' ')} is too long.` : 'A field is too long.';
    default:
      return undefined;
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();

    const response = context.getResponse<Response>();

    const request = context.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';

    let errors: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const body = exceptionResponse as Record<string, unknown>;

        if (typeof body.message === 'string') {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = body.message.join('; ');
        }

        errors = body.message;
      }
    } else {
      // Not a NestJS HttpException — most commonly a raw database error
      // bubbling up from a service. Try to recognize it and turn it into
      // something the user (and the frontend) can actually act on.
      const pgError = findPgError(exception);
      const friendly = pgError && humanizePgError(pgError);

      if (friendly) {
        status =
          pgError!.code === PG_UNIQUE_VIOLATION
            ? HttpStatus.CONFLICT
            : HttpStatus.BAD_REQUEST;
        message = friendly;
      }
    }

    // Anything that reaches here as a non-HttpException (DB errors, driver
    // errors, unexpected nulls, etc.) was previously swallowed into the
    // generic 500 above with zero trace of what actually happened. Always
    // log the real exception server-side — including the full `.cause`
    // chain, since Drizzle wraps the actual driver error there and the
    // outer error's own message/stack is usually just "Failed query: ...".
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const causeChain: string[] = [];
      let current: unknown = exception;
      let depth = 0;
      while (current instanceof Error && depth < 5) {
        causeChain.push(current.message);
        current = (current as { cause?: unknown }).cause;
        depth++;
      }

      this.logger.error(
        `${request.method} ${request.url} -> 500: ${causeChain.join(' <- caused by: ')}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} -> ${status}: ${message}`,
      );
    }

    response.status(status).json({
      success: false,

      error: {
        statusCode: status,
        message,
        errors,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
