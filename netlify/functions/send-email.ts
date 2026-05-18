import { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { to, subject, body } = JSON.parse(event.body || '{}');

    if (!process.env.RESEND_API_KEY) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Email simulation (API key missing in Netlify)',
          isSimulation: true 
        }),
      };
    }

    const data = await resend.emails.send({
      from: 'Vinayak Organic Farm <onboarding@resend.dev>',
      to: to,
      subject: subject,
      text: body,
    });

    if (data.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: data.error }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
    };
  }
};
