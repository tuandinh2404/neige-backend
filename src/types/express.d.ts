import { IJwtUser } from "../interfaces/IJwtUser";


declare global {
    namespace Express {
        interface Request {
            currentUser?: IJwtUser;
        }
    }
}

export {};