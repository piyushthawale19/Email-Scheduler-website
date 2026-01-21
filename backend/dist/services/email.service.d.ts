import { SendEmailOptions, SendEmailResult, SMTPConfig } from '../types';
/**
 * Send an email using the provided options
 */
export declare const sendEmail: (options: SendEmailOptions, smtpConfig?: SMTPConfig) => Promise<SendEmailResult>;
/**
 * Close all cached transporters
 */
export declare const closeTransporters: () => void;
declare const _default: {
    sendEmail: (options: SendEmailOptions, smtpConfig?: SMTPConfig) => Promise<SendEmailResult>;
    closeTransporters: () => void;
};
export default _default;
//# sourceMappingURL=email.service.d.ts.map