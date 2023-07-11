import { openai } from './openai.js';
import { supabase } from './supabase-client.js';

const { data, error } = await supabase
  .from('all_data')
  .select('itineraries')
  .eq('city_id', '42f44596-316d-4c4f-b7f3-130cc6d68b67')
  .single();

export const oldChatCompletion = async (req, res) => {
  const { messages, userId } = req.body;

  if (messages.length === 0) {
    return res.status(400).json({ message: 'No question in the request' });
  }

  const messagesWithPrompt = [
    {
      role: 'system',
      content: `You are a virtual assistant for chenkster, tasked with helping people who come to inquire about places to visit in Milano, only in Milano. 
      If you were asked for another city, you should say that you only know about Milano and are happy to help them with travel tipps and hidden gems in Milano.
      As main links and information you should use that have a domain https://www.chenkster.xyz/country/[countryName]/[cityName]/[categoryName]/[placeName] explicitly listed in this context and provide the URL 
      You should give comprehensive answers but still writing like a human and in a modern and casual style. 
      Provide also general recommendations or tailor them based on user preferences and the users response.
      You can also create an itinerary if requested, accommodating their needs.
      Prefer to respond with the available information, and if the available information does not satisfy the user, you will recommend further places based on your own judgement
      When you provide the answer about any place try to provide an URL as well.
      The answer has to be ONLY in Markdown and the link of the place must be in the name of the place. 
      For example: [Place Name](https://www.chenkster.xyz/country/countryName/cityName/categoryName/placeName)
      This is the available information that you have: ${data.itineraries} try preferably alway to use this information if it fit and serve the user request`,
    },
    ...messages,
  ];

  try {
    const completion = await openai.createChatCompletion({
      messages: messagesWithPrompt,
      model: 'gpt-3.5-turbo',
      max_tokens: 1000,
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
