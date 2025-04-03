declare module 'nodemailer' {
  export interface SendMailOptions {
    from?: string;
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    attachments?: Attachment[];
    headers?: { [key: string]: string };
    [key: string]: any;
  }

  export interface Attachment {
    filename?: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
    cid?: string;
    encoding?: string;
    headers?: { [key: string]: string };
    raw?: string | Buffer;
    [key: string]: any;
  }

  export interface SentMessageInfo {
    accepted: string[];
    rejected: string[];
    envelopeTime: number;
    messageTime: number;
    messageSize: number;
    response: string;
    envelope: { from: string; to: string[] };
    messageId: string;
  }

  export interface Transporter {
    sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
    close?(): void;
  }

  export interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
      type?: string;
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
      accessToken?: string;
      expires?: number;
    };
    [key: string]: any;
  }

  export function createTransport(options: TransportOptions | string): Transporter;
  export function createTransport(transport: any, defaults?: SendMailOptions): Transporter;
  export function createTestAccount(): Promise<{ user: string; pass: string; smtp: { host: string; port: number; secure: boolean } }>;
  export function getTestMessageUrl(info: SentMessageInfo): string;
}