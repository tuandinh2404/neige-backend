import express, {
  NextFunction,
  Request,
  Response,
} from 'express';

import cors from 'cors';

import routes from './routes';

import config from '@/config';

import {
  NotFoundError,
} from '@/core/errors/AppError';

import {
  errorHandler,
} from '@/core/errors/errorHandler';

export default ({
  app,
}: {
  app: express.Application;
}) => {
  app.get(
    '/status',
    (_req: Request, res: Response) => {
      res.status(200).end();
    },
  );

  app.head(
    '/status',
    (_req: Request, res: Response) => {
      res.status(200).end();
    },
  );

  app.enable('trust proxy');

  app.use(cors());

  app.use(
    require('method-override')(),
  );

  app.use(express.json());

  // Load API routes
  app.use(
    config.api.prefix,
    routes,
  );

  /*
   * 404
   */
  app.use(
    (
      _req: Request,
      _res: Response,
      next: NextFunction,
    ) => {
      next(
        new NotFoundError('Not Found'),
      );
    },
  );

  /*
   * Global error handler
   */
  app.use(errorHandler);
};