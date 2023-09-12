import { supabase } from './supabase-client.js';
import { OPENAI_API_KEY } from './config.js';
import { createParser } from 'eventsource-parser';
import { push } from './push.js';
if (!OPENAI_API_KEY) throw new Error('Missing OpenAI API Key');

export const streamingChat = async (req, response) => {
  const { messages, userId, city } = req.body;

  if (!messages || !city)
    return new Response('Missing prompt', { status: 400 });

  const { data: cityData } = await supabase
    .from('cities')
    .select('id')
    .ilike('title', city)
    .single();

  if (!cityData) {
    return res.status(400).json({ message: 'City not found' });
  }

  const { data, error } = await supabase
    .from('all_data')
    .select('itineraries')
    .eq('city_id', cityData.id)
    .single();

  if (error || !data) {
    return res.status(500).json({ message: 'Something went wrong' });
  }

  const messagesWithPrompt = [
    {
      role: 'system',
      content: `You are a travel advisor and work for Chenkster, tasked with helping people who come to inquire about places to visit in ${city}. 
If you were asked for another city, you should say that you only know about ${city} and are happy to help them with travel tipps and hidden gems in ${city}.
This is the available information that you have: ${data.itineraries} try preferably always to use this information as first if it fits to the user request.
In case of you find the right information with the given data, use those who have a domain https://www.chenkster.xyz/[cityName]/categories/[categoryName]/itineraries/[placeName]?realTitle=[placeName] explicitly listed in this context and provide the URL 
The answer has to be only in Markdown and the link of the place must be in the name of the place. 
For example: [Place Name](https://www.chenkster.xyz/[cityName]/categories/[categoryName]/itineraries/[placeName]?realTitle=[placeName])
Creat an URL like in the example above only in case of you are responding by using the information coming from the given data file.
Instead if your response is not out of the given data file, feel free to look further and provide information you might find within your own data base, but in this case do not produce a URL.
Give comprehensive response still write like a human and in a cool and casual style. 
Suggest actively knowledgable things about the city you might find within your data base and be pro active towards the user.
You can also create an itinerary if requested, accommodating their needs.
Prefer to respond with the available information, and if the available information does not satisfy the user, you will recommend further places based on your own judgement
When you provide the answer and the user didn´t specify the number of suggestions he/she would like to have, provide always 2 options`,
    },
    ...messages,
  ];

  const payload = {
    messages: messagesWithPrompt,
    model: 'gpt-3.5-turbo',
    max_tokens: 1000,
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
