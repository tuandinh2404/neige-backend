import { IJwtUser } from "@/module/auth/auth.types";


declare global {
    namespace Express {
        interface Request {
            currentUser?: IJwtUser;
        }
    }
}

export {};