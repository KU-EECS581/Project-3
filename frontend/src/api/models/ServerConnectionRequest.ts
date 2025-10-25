import type { User } from "../../models/User";

export interface ServerConnectionRequest {
    host: string;
    port: number;
    user: User;
}