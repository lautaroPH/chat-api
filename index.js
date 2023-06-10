import express from 'express';
import { chatCompletion } from './chat-completion.js';
import cors from 'cors';

const app = express();
const port = 4000;

const whitelist = ['http://localhost:3000', 'https://www.chenkster.xyz'];

const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
  methods: 'POST',
};

app.use(cors(corsOptions));
app.use(express.json()); // Agrega esta línea
app.post('/', chatCompletion);

app.listen(port, () => {
  console.log(`Servidor Express iniciado en http://localhost:${port}`);
});
