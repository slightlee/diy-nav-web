import { AppError, type EmailVerificationMessage, type EmailVerificationSender } from '@nav/core'
import type { Logger } from '@nav/logger'
import nodemailer, { type Transporter } from 'nodemailer'

export interface SmtpVerificationEmailSenderOptions {
  user?: string
  password?: string
  fromName: string
  environment: 'development' | 'production' | 'test'
  logger: Logger
}

const NETEASE_SMTP_CONFIG = {
  host: 'smtp.163.com',
  port: 465,
  secure: true
} as const

export class SmtpVerificationEmailSender implements EmailVerificationSender {
  private transporter?: Transporter

  constructor(private readonly options: SmtpVerificationEmailSenderOptions) {}

  async sendEmailBindingVerification(message: EmailVerificationMessage): Promise<void> {
    const { user, password, fromName, environment, logger } = this.options
    if (!user || !password) {
      if (environment !== 'production') {
        logger.warn(
          { to: message.to, verificationUrl: message.verificationUrl },
          'Email delivery is not configured; use the development verification URL'
        )
        return
      }
      throw new AppError(
        'Email delivery is temporarily unavailable',
        'EMAIL_DELIVERY_UNAVAILABLE',
        503
      )
    }

    try {
      await this.getTransporter(user, password).sendMail({
        from: { name: fromName, address: user },
        to: message.to,
        subject: `【${fromName}】验证邮箱并启用密码登录`,
        html: this.buildHtml(message),
        text: this.buildText(message),
        messageId: `<${message.idempotencyKey}@${this.getEmailDomain(user)}>`
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to send email binding verification through SMTP')
      throw new AppError('Verification email could not be sent', 'EMAIL_DELIVERY_FAILED', 502)
    }
  }

  private getTransporter(user: string, password: string): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        ...NETEASE_SMTP_CONFIG,
        auth: {
          user,
          pass: password
        }
      })
    }
    return this.transporter
  }

  private buildText(message: EmailVerificationMessage): string {
    return [
      `你正在为 ${this.options.fromName} 账号验证邮箱并启用密码登录。`,
      `请在 ${message.expiresInMinutes} 分钟内打开以下链接完成验证：`,
      message.verificationUrl,
      '完成验证并设置密码后，该邮箱才会正式绑定到当前账号。',
      '如果不是你本人操作，请忽略本邮件。'
    ].join('\n\n')
  }

  private buildHtml(message: EmailVerificationMessage): string {
    const url = this.escapeHtml(message.verificationUrl)
    const brandName = this.escapeHtml(this.options.fromName)
    const brandInitial = this.escapeHtml(Array.from(this.options.fromName.trim())[0] || 'D')
    const expiresInMinutes = message.expiresInMinutes

    return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>验证邮箱并启用密码登录</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6fa;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">请在 ${expiresInMinutes} 分钟内验证邮箱并设置登录密码。</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f6fa;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e5e9f2;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(30,55,90,0.08);">
            <tr>
              <td style="height:4px;background:#4f7df3;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:34px 40px 36px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-bottom:30px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" valign="middle" style="width:42px;height:42px;border-radius:12px;background:#edf3ff;color:#4f7df3;font-size:19px;font-weight:700;">${brandInitial}</td>
                          <td style="padding-left:12px;color:#1f2937;font-size:16px;font-weight:700;">${brandName}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div style="margin-bottom:10px;color:#4f7df3;font-size:12px;font-weight:700;letter-spacing:0.08em;">邮箱安全验证</div>
                      <h1 style="margin:0 0 14px;color:#172033;font-size:26px;line-height:1.35;font-weight:750;">验证邮箱并启用密码登录</h1>
                      <p style="margin:0 0 24px;color:#667085;font-size:15px;line-height:1.8;">你正在为 <strong style="color:#344054;">${brandName}</strong> 账号绑定邮箱。验证通过并设置密码后，该邮箱才会正式成为登录方式。</p>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
                        <tr>
                          <td align="center" bgcolor="#4f7df3" style="border-radius:10px;">
                            <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 24px;color:#ffffff;font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;">验证邮箱并设置密码</a>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-bottom:24px;background:#f8faff;border:1px solid #e8eefc;border-radius:10px;">
                        <tr>
                          <td style="padding:13px 15px;color:#526078;font-size:13px;line-height:1.65;">
                            此链接将在 <strong style="color:#344054;">${expiresInMinutes} 分钟</strong>后失效。完成绑定后，可以使用该邮箱和新密码登录当前账号。
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 8px;color:#98a2b3;font-size:12px;line-height:1.6;">按钮无法打开时，请复制以下链接到浏览器：</p>
                      <p style="margin:0;padding:11px 13px;background:#f6f7f9;border-radius:8px;color:#667085;font-size:11px;line-height:1.6;word-break:break-all;">${url}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 40px;border-top:1px solid #eef1f5;background:#fbfcfd;color:#98a2b3;font-size:12px;line-height:1.65;">如果不是你本人操作，请忽略本邮件。你的账号不会因此发生变化。</td>
            </tr>
          </table>
          <p style="margin:18px 0 0;color:#a4acb9;font-size:11px;line-height:1.6;">此邮件由 ${brandName} 自动发送</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }
      return entities[char] || char
    })
  }

  private getEmailDomain(email: string): string {
    return email.split('@')[1] || 'localhost'
  }
}
