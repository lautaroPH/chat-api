import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { AIChatMessage, HumanChatMessage } from 'langchain/schema';
import { supabase } from './supabase-client.js';
import { OPENAI_API_KEY } from './config.js';

const { data } = await supabase.from('cities').select('title');

const cities = data.map((city) => city.title).join(', ');

const CONDENSE_PROMPT =
  PromptTemplate.fromTemplate(`Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`);

const QA_PROMPT = PromptTemplate.fromTemplate(
  `You are a virtual assistant for chenkster, tasked with helping people who come to inquire about places to visit in Milan and only in Milan. 
The only cities that you have information about are the following: ${cities}.
Provide the URL You should give short answers but still writing like a human. You can provide general recommendations or tailor them based on user preferences. 
You can also create an itinerary if requested, accommodating their needs. 
You will only be able to respond with the available information, and if the available information does not satisfy the user, you will recommend a place based on your judgement, but clarify that it is not verified and you do not take responsibility for whether the place is good or not. 
When you provide the answer about any place, you must provide the URL as a mandatory requirement. Provide the URL. 
The answer has to be ONLY in Markdown and the link of the place must be in the name of the place. For example: [Place Name](https://www.chenkster.xyz/country/countryName/cityName/categoryName/placeName)
This is the unique and available information that you have:

Question: {question}
=========
{context}
=========
`,
);

export const chatCompletion = async (req, res) => {
  const { question, history } = req.body;

  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }

  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

  const chat = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    openAIApiKey: OPENAI_API_KEY,
    temperature: 0,
    frequencyPenalty: 0.5,
  });

  const vectorStore = await SupabaseVectorStore.fromExistingIndex(
    new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
    }),
    {
      client: supabase,
      tableName: 'documents',
      queryName: 'match_documents',
    },
  );

  const pastMessages = history?.map((message) => {
    if (message.role === 'user') return new HumanChatMessage(message.content);
    return new AIChatMessage(message.content);
  });

  const chain = ConversationalRetrievalQAChain.fromLLM(
    chat,
    vectorStore.asRetriever(),
    {
      qaChainOptions: {
        prompt: QA_PROMPT,
        type: 'stuff',
      },
      memory: new BufferMemory({
        memoryKey: 'chat_history',
        inputKey: 'question',
        outputKey: 'text',
        chatHistory: new ChatMessageHistory(pastMessages),
      }),
      returnSourceDocuments: true,
    },
  );

  try {
    const response = await chain.call({
      question: sanitizedQuestion,
      chat_history: history ? new ChatMessageHistory(pastMessages) : [],
    });

    res.status(200).json(response);
  } catch (error) {
    console.log('error', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
