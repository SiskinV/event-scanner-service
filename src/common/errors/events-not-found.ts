import status from 'http-status';
import { AppError } from './app-error';
import { ErrorCode } from './error-code';

export class EventsNotFound extends AppError {
  constructor(integrator: string) {
    super(
      `No events for integrator found: ${integrator}`,
      status.NOT_FOUND,
      true,
      ErrorCode.EVENTS_NOT_FOUND
    );

    this.name = 'EventsNotFoundError';
  }
}
