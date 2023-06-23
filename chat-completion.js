import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { AIChatMessage, HumanChatMessage } from 'langchain/schema';
import { supabase } from './supabase-client.js';
import { OPENAI_API_KEY } from './config.js';
import { StreamingTextResponse, LangChainStream } from 'ai';

const { data } = await supabase.from('cities').select('title');

const cities = data.map((city) => city.title).join(', ');

const CONDENSE_PROMPT =
  PromptTemplate.fromTemplate(`Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`);

const QA_PROMPT = PromptTemplate.fromTemplate(
  `You are an AI assistant and a travel advicer expert for chenkster. You are given the following places of a long document and a question. Provide a conversational answer based on the context provided. Give a good description for the places that you reccomend and always brind an hyperlink to see more information.
  You should only use as main links those that have the domain https://www.chenkster.xyz/country/[countryName]/[cityName]/[categoryName]/[placeName] explicitly listed in this context. the only special character that should change is the -, like for example Walking Tour - Citywalkers in the URL put it like this walking-tour%20-%20citywalkers. But any other should keep it like this for example Emporio Armani Caffe' e Ristorante put it like this emporio-armani-caffe'-e-ristorante. If necessary, or to provide additional information aside from the first, most important link, you can use a secondary link from another webpage that discusses the topic.
  The only cities that you have information about are the following: ${cities}. If the question is not related to any of these cities, simply say "Hmm, I'm not sure." Please do not make up an answer.
  Do NOT make up a hyperlink that is not listed below. If you can't find the answer in the context below, just say "Hmm, I'm not sure." Don't try to make up an answer.
  If the question is not related to travel, any place, the context provided, or a way to conclude the conversation (e.g., saying thank you, bye, etc.), politely inform the user that you are only able to answer questions related to travel.
  The answer has to be ONLY in Markdown and the link of the place must be in the name of the place. For example: [Place Name](https://www.chenkster.xyz/country/countryName/cityName/categoryName/placeName)
Choose the most relevant link that matches the context provided:

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

  const { stream, handlers } = LangChainStream();

  const chat = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    openAIApiKey: OPENAI_API_KEY,
    temperature: 0,
    frequencyPenalty: 0.5,
    streaming: true,
    callbackManager: CallbackManager.fromHandlers(handlers),
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

    return new StreamingTextResponse(stream);
    // res.status(200).json(response);
  } catch (error) {
    console.log('error', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
