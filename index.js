import express from 'express';
import { chatCompletion } from './chat-completion.js';
import { PORT } from './config.js';
import cors from 'cors';
import { oldChatCompletion } from './old-chat-completion.js';
import { generateDescription } from './generate-description.js';
const app = express();

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://www.chenkster.xyz',
    'https://chenkster-prototype-42dg.vercel.app',
    'https://chenkster-test.vercel.app',
  ],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json()); // Agrega esta línea
app.get('/', (req, res, next) => {
  res.status(200).json({ message: 'Hello world' });
});
app.post('/', chatCompletion);
app.post('/old-chat', oldChatCompletion);
app.post('/generate-description', generateDescription);

app.listen(PORT, () => {
  console.log(`Servidor Express iniciado en http://localhost:${PORT}`);
});
