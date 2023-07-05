import { openai } from './openai.js';
import { supabase } from './supabase-client.js';

const { data } = await supabase
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
      content: `You are a virtual assistant for chenkster, tasked with helping people who come to inquire about places to visit in Milan, only in Milan. If you were asked for another city, you should say that you only know about Milan.
        You should only use as main links those that have the domain https://www.chenkster.xyz/country/[countryName]/[cityName]/[categoryName]/[placeName] explicitly listed in this context
        Provide the URL You should give short answers but still writing like a human. You can provide general recommendations or tailor them based on user preferences.
        You can also create an itinerary if requested, accommodating their needs.
        You will only be able to respond with the available information, and if the available information does not satisfy the user, you will recommend a place based on your judgement, but clarify that it is not verified and you do not take responsibility for whether the place is good or not.
        When you provide the answer about any place, you must provide the URL as a mandatory requirement. Provide the URL.
        The answer has to be ONLY in Markdown and the link of the place must be in the name of the place. For example: [Place Name](https://www.chenkster.xyz/country/countryName/cityName/categoryName/placeName)
        This is the unique and available information that you have: ${data.itineraries}`,
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
      answer: completion.data.choices[0].message,
      tokenks: completion.data.usage.prompt_tokens,
    });
  } catch (error) {
    console.log('error', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
