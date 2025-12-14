import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    // 1. Status Code
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 2. Extração da Resposta (Origem de Any #1)
    let exceptionResponse: unknown;

    if (exception instanceof HttpException) {
      // O Linter reclama aqui porque .getResponse() retorna any.
      // Desabilitamos nesta linha específica e salvamos como 'unknown' (seguro).

      exceptionResponse = exception.getResponse();
    } else {
      exceptionResponse = { message: 'Internal Server Error' };
    }

    // 3. Extração da URL (Origem de Any #2 - AQUI ESTAVA O ERRO)
    // O .getRequestUrl() também retorna any. Precisamos forçar (cast) para string.
    const requestUrl = httpAdapter.getRequestUrl(ctx.getRequest()) as string;

    // 4. Montagem do Payload Base
    const responsePayload = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: requestUrl,
    };

    // 5. Mesclagem Segura dos dados do erro no Payload
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      Object.assign(responsePayload, exceptionResponse);
    } else if (typeof exceptionResponse === 'string') {
      Object.assign(responsePayload, { message: exceptionResponse });
    }

    if (httpStatus >= 500) {
      this.logger.error(exception, `Erro Crítico no Endpoint: ${requestUrl}`);
    } else {
      this.logger.warn(
        ` Erro de Cliente (${httpStatus}) no Endpoint: ${requestUrl}`,
      );
    }

    httpAdapter.reply(ctx.getResponse(), responsePayload, httpStatus);
  }
}
