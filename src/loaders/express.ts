import express, { Request, Response, NextFunction} from 'express';
import cors from 'cors';
import routes from '@/api';
import config from '@/config';

interface CustomError extends Error {
  status?: number;
}
export default ({ app }: { app: express.Application }) => {
  app.get('/status', (req: Request, res: Response) => {
    res.status(200).end();
  });
  app.head('/status', (req: Request, res: Response) => {
    res.status(200).end();
  });
  app.enable('trust proxy');
  app.use(cors());
  app.use(require('method-override')());
  app.use(express.json());
  // Load API routes
  app.use(config.api.prefix, routes());

  // API Documentation

  /// catch 404 and forward to error handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    const err: CustomError = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  /// error handlers
  app.use((err: CustomError, req: Request, res: Response, next: NextFunction) => {
    /**
     * Handle 401 thrown by express-jwt library
     */
    if (err.name === 'UnauthorizedError') {
      return res
        .status(err.status || 401)
        .send({ message: err.message })
        .end();
    }
    return next(err);
  });
  app.use((err: CustomError, req: Request, res: Response, next: NextFunction) => {
    res.status(err.status || 500);
    res.json({
      errors: {
        message: err.message,
      },
    });
  });
};