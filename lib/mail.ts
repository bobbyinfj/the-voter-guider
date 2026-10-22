// Outgoing email (sign-in links only). Uses nodemailer with SMTP_URL, e.g.
//   SMTP_URL=smtps://user%40gmail.com:app-password@smtp.gmail.com:465
//   MAIL_FROM="The Voter Guider <user@gmail.com>"
// Without SMTP_URL, development prints the message to the server log instead of sending it,
// and production turns email sign-in off (the site still works anonymously).
import nodemailer from 'nodemailer'

export function emailEnabled(): boolean {
  return !!process.env.SMTP_URL || process.env.NODE_ENV !== 'production'
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const from = process.env.MAIL_FROM || 'The Voter Guider <no-reply@localhost>'
  if (!process.env.SMTP_URL) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email is not configured')
    console.log(`\n[dev mail] to ${to}: ${subject}\n${text}\n`)
    return
  }
  const transport = nodemailer.createTransport(process.env.SMTP_URL)
  await transport.sendMail({ from, to, subject, text })
}
