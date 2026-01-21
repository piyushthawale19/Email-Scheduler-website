import { Worker } from 'bullmq';
import { EmailJobData, EmailJobResult } from '../types';
export declare const createEmailWorker: () => Worker<EmailJobData, EmailJobResult>;
export default createEmailWorker;
//# sourceMappingURL=email.worker.d.ts.map