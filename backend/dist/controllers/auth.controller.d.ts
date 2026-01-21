import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
 
export declare const googleAuth: any;
 
export declare const googleCallback: (req: Request, res: Response) => void;
 
export declare const getCurrentUser: (req: AuthenticatedRequest, res: Response<ApiResponse>) => Promise<void>;
 
export declare const logout: (req: AuthenticatedRequest, res: Response<ApiResponse>) => Promise<void>;
declare const _default: {
    googleAuth: any;
    googleCallback: (req: Request, res: Response) => void;
    getCurrentUser: (req: AuthenticatedRequest, res: Response<ApiResponse>) => Promise<void>;
    logout: (req: AuthenticatedRequest, res: Response<ApiResponse>) => Promise<void>;
};
export default _default;
 