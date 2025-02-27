export default class ArchivedWebSocket {
  private archiveUrl: string;

  private listeners: Record<string, (this: ArchivedWebSocket, ev: Event) => any | null>;

  private chunksResponse: Record<string, string>;

  constructor(archiveUrl: string) {
    this.archiveUrl = archiveUrl;
    this.listeners = {
      open: null,
      close: null,
      error: null,
      message: null,
    };
    this.chunksResponse = {};
  }

  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: ArchivedWebSocket, ev: WebSocketEventMap[K]) => any,
  ): void {
    this.listeners[type] = listener;
    if (this.listeners.open !== null && this.listeners.message !== null) {
      this.listeners.open(new Event('open'));
    }
  }

  send(data: string): void {
    const message = JSON.parse(data) as {
      action: string,
      data: {
        type: string,
        [key: string]: unknown
      }
    };
    if (message.action !== 'sendmessage') {
      return;
    }
    switch (message.data.type) {
      case 'readChunk': {
        const chunkId = message.data.chunkId as number;
        if (this.chunksResponse[chunkId.toString()]) {
          const result = this.chunksResponse[chunkId.toString()];
          this.listeners.message(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'chunk',
              data: {
                chunkId,
                lastUpdatedAt: 0, // Since it's archived, we can just assume it is 0.
                colorIds: result,
              },
            }),
          }));
          return;
        }

        fetch(`${this.archiveUrl}chunks.csv`)
          .then((value: Response) => value.text())
          .then((csv: string) => {
            csv.split('\n').forEach((csvLine) => {
              const line = csvLine
                .split(',')
                .map((csvCell) => csvCell.replaceAll('"', ''));
              // eslint-disable-next-line prefer-destructuring
              this.chunksResponse[line[0]] = line[1];
            });
          })
          .then(() => {
            this.listeners.message(new MessageEvent('message', {
              data: JSON.stringify({
                type: 'chunk',
                data: {
                  chunkId,
                  lastUpdatedAt: 0, // Since it's archived, we can just assume it is 0.
                  colorIds: this.chunksResponse[chunkId],
                },
              }),
            }));
          });
        break;
      }
      case 'readQueue': {
        fetch(`${this.archiveUrl}chunk-queue.csv`)
          .then((value: Response) => value.text())
          .then((csv: string) => {
            const queueData = csv.split('\n')
              .slice(1) // To get rid of the header row
              .map(
                (csvLine) => csvLine
                  .split(',')
                  .map((csvCell) => Number.parseInt(csvCell.replaceAll('"', ''), 10)),
              );
            // Transpose the queueData
            const positions = queueData.map((line) => line[0]);
            const colorIds = queueData.map((line) => line[1]);
            const times = queueData.map((line) => line[2]);
            this.listeners.message(new MessageEvent('message', {
              data: JSON.stringify({
                type: 'queue',
                data: {
                  positions,
                  colorIds,
                  times,
                },
              }),
            }));
          });
        break;
      }
      case 'readChunkInfo': {
        // We can fake this easily by saying the timestamp for all chunks are just 0.
        const chunkInfo = [];
        for (let i = 0; i < 60; i += 1) {
          chunkInfo.push({ chunkId: i, lastUpdatedAt: 0 });
        }
        this.listeners.message(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'chunkInfo',
            data: chunkInfo,
          }),
        }));
        break;
      }
      case 'update': {
        // Do nothing, because this is an archived version, so no persistence is needed.
        break;
      }
      default: break;
    }
  }
}
