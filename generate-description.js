import { openai } from './openai.js';

export const generateDescription = async (req, res) => {
  const { description, userId } = req.body;

  if (!description) {
    return res.status(400).json({ message: 'No description in the request' });
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

  try {
    const completion = await openai.createChatCompletion({
      messages,
      model: 'gpt-3.5-turbo',
      max_tokens: 500,
      temperature: 0.2,
      top_p: 1,
      frequency_penalty: 1,
      presence_penalty: 1,
      user: userId,
    });

    res.status(200).json({
      answer: completion.data.choices[0].message.content,
      tokenks: completion.data.usage.prompt_tokens,
    });
  } catch (error) {
    console.log('error', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
