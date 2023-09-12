export function push({ event, controller, response, encoder, counter }) {
  if (event.type === 'event') {
    const { data } = event;

    if (data === '[DONE]') {
      response.end('');
      controller.close();
      return;
    }

    try {
      const json = JSON.parse(data);
      const text = json.choices[0].delta?.content || '';
      if (counter < 2 && (text.match(/\n/) || []).length) {
        return;
      }

      response.write(`data: ${text}--`);
      response.flush();

      const queue = encoder.encode(text);
      controller.enqueue(queue);
      counter++;
    } catch (err) {
      controller.error(err);
    }
  }
}
