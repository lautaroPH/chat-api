import { openai } from './openai.js';
import { supabase } from './supabase-client.js';

export const oldChatCompletion = async (req, res) => {
  const { messages, userId, city } = req.body;

  if (messages.length === 0) {
    return res.status(400).json({ message: 'No question in the request' });
  }

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
In case of you find the right information with the given data, use those who have a domain https://www.chenkster.xyz/[cityName]/categories/[categoryName]/itineraries/[placeName] explicitly listed in this context and provide the URL 
The answer has to be only in Markdown and the link of the place must be in the name of the place. 
For example: [Place Name](https://www.chenkster.xyz/[cityName]/categories/[categoryName]/itineraries/[placeName])
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
