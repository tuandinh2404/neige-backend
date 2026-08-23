import { Router} from 'express';
import router from './routes';

export default () => {
    const app = Router();
    app.use(router)
    return app
}