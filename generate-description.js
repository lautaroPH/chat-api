import { OPENAI_API_KEY } from './config.js';
import { createParser } from 'eventsource-parser';
import { push } from './push.js';
if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API Key');

export const generateDescription = async (req, response) => {
  const { description, userId } = req.body;

  if (!description) {
    return response
      .status(400)
      .json({ message: 'No description in the request' });
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are an AI that is given a description of a place and you must return that description in a better way, without grammatical errors and with a coherent order of what is described',
    },
    {
      role: 'user',
      content: description,
    },
  ];

  const payload = {
    messages,
    model: 'gpt-3.5-turbo',
    max_tokens: 500,
    temperature: 0.2,
    top_p: 1,
    frequency_penalty: 1,
    presence_penalty: 1,
    user: userId,
    stream: true,
  };

  response.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    Connection: 'keep-alive',
    'Content-Encoding': 'none',
    'Cache-Control': 'no-cache, no-transform',
    'Content-Type': 'text/event-stream;charset=utf-8',
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY || ''}`,
      },
      body: JSON.stringify(payload),
    });

    let counter = 0;

    new ReadableStream({
      async start(controller) {
        const parser = createParser((event) =>
          push({
            controller,
            event,
            response,
            encoder,
            counter,
          }),
        );
        for await (const chunk of res.body) {
          parser.feed(decoder.decode(chunk));
        }
      },
    });
  } catch (error) {
    console.log(error);
  }
};
